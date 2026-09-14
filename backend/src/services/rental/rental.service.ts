import { Prisma, RentalStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { LedgerService } from '../wallet/ledger.service';
import { ImapPoolService } from '../mail-engine/imap-pool.service';

export class RentalService {
  /**
   * Automatically process expired rental sessions:
   * 1. If code was received at least once (or code is present) -> complete session and settle balance.
   * 2. If NO code was ever received -> cancel session and release held balance back to user.
   */
  public static async cleanupExpiredSessions(userId?: string): Promise<number> {
    try {
      const now = new Date();
      const expiredList = await prisma.rentalSession.findMany({
        where: {
          ...(userId ? { userId } : {}),
          status: { in: [RentalStatus.WAITING_CODE, RentalStatus.WAITING_NEXT] },
          expiresAt: { lte: now },
        },
      });

      for (const session of expiredList) {
        const hasReceivedOtp =
          !!session.code ||
          (Array.isArray(session.receivedOtps) && (session.receivedOtps as any[]).length > 0) ||
          (Array.isArray(session.previousCodes) && (session.previousCodes as any[]).length > 0);

        if (hasReceivedOtp) {
          // User already got an OTP code, so activation is COMPLETED (Paid Only in history)
          await prisma.rentalSession.update({
            where: { id: session.id },
            data: { status: RentalStatus.COMPLETED },
          });

          await ImapPoolService.stopRentalListener(session.id);

          await LedgerService.settleBalance(
            session.userId,
            session.price,
            String(session.id),
            `Completed rental #${session.id} (Auto-settled on expiration)`
          ).catch((e) => console.warn(`[Auto-Settle] Failed for #${session.id}:`, e.message));
        } else {
          // User never received any code, so activation is CANCELLED and funds refunded
          await prisma.rentalSession.update({
            where: { id: session.id },
            data: { status: RentalStatus.CANCELLED },
          });

          await ImapPoolService.stopRentalListener(session.id);

          await LedgerService.releaseBalance(
            session.userId,
            session.price,
            String(session.id),
            `Cancelled rental #${session.id} (Auto-refund on expiration)`
          ).catch((e) => console.warn(`[Auto-Release] Failed for #${session.id}:`, e.message));
        }
      }

      return expiredList.length;
    } catch (err: any) {
      console.error('[RentalService] cleanupExpiredSessions error:', err.message);
      return 0;
    }
  }

  /**
   * Generates a random realistic email local-part for catch-all domains.
   */
  private static generateLocalPart(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = 8;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new rental activation session.
   * Priority:
   *  1. External live email accounts pool (Gmail, Outlook, Yahoo, AOL, etc.) with pre-allocation live check.
   *  2. Inbound catch-all domain mailboxes.
   */
  public static async createRental(
    userId: string,
    serviceCode: string,
    domainParam?: string,
    maxPrice?: number,
    timeParam?: string,
    smsCountParam?: number
  ) {
    const cleanService = serviceCode.toLowerCase().trim();

    // 1. Resolve user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // 2. Resolve service
    const service = await prisma.serviceItem.findUnique({
      where: { code: cleanService },
    });

    // 3. Check for available account in the Email Account Pool
    let providerFilter: string | undefined = undefined;
    if (domainParam) {
      const lower = domainParam.toLowerCase();
      if (lower.includes('gmail')) providerFilter = 'GMAIL';
      else if (lower.includes('outlook') || lower.includes('hotmail')) providerFilter = 'OUTLOOK';
      else if (lower.includes('yahoo')) providerFilter = 'YAHOO';
      else if (lower.includes('aol')) providerFilter = 'AOL';
      else if (lower.includes('gmx')) providerFilter = 'GMX';
      else if (lower.includes('icloud')) providerFilter = 'ICLOUD';
    }

    const candidateAccounts = await prisma.emailAccount.findMany({
      where: {
        status: 'ACTIVE',
        ...(providerFilter ? { provider: providerFilter } : {}),
      },
      orderBy: { updatedAt: 'asc' },
      take: 15,
    });

    let selectedPoolAccount = null;

    // Filter candidate accounts for service deconfliction and run pre-allocation live ping
    for (const candidate of candidateAccounts) {
      if (candidate.usedServices && candidate.usedServices.includes(cleanService)) {
        continue; // Account was already used for this specific service
      }

      // Check if candidate account has this service in blockedServices (e.g. Biglion|Claude|Hinge)
      if (candidate.blockedServices && candidate.blockedServices.length > 0) {
        const isBlocked = candidate.blockedServices.some((b: string) => {
          const cleanB = b.trim().toLowerCase();
          return (
            cleanB === cleanService ||
            (service && cleanB === service.name.toLowerCase()) ||
            (service && cleanB === service.code.toLowerCase())
          );
        });
        if (isBlocked) {
          continue; // Account is explicitly blocked for this service!
        }
      }

      // Pre-allocation live ping to ensure 100% active account
      const health = await ImapPoolService.checkAccountHealth(candidate);
      if (health.live) {
        selectedPoolAccount = candidate;
        break;
      }
    }

    let emailAddress = '';
    let domainId: string | null = null;
    let price = service ? service.basePrice : new Prisma.Decimal(0.045);

    if (selectedPoolAccount) {
      // Allocated from external email pool
      emailAddress = selectedPoolAccount.email;
    } else {
      // Fallback to Inbound Catch-All Domain
      let domain;
      if (domainParam) {
        domain = await prisma.domain.findFirst({
          where: {
            OR: [{ id: domainParam }, { domainName: domainParam.toLowerCase() }],
            isActive: true,
          },
        });
      } else {
        domain = await prisma.domain.findFirst({
          where: { isActive: true, isPrivate: false },
        });
      }

      if (!domain) {
        throw new Error('No available email accounts or hosted domains for this service');
      }

      domainId = domain.id;
      price = domain.defaultPrice;

      if (service) {
        const override = await prisma.domainServicePrice.findUnique({
          where: {
            domainId_serviceItemId: {
              domainId: domain.id,
              serviceItemId: service.id,
            },
          },
        });
        if (override) {
          price = override.price;
        } else if (service.basePrice.greaterThan(price)) {
          price = service.basePrice;
        }
      }

      // Generate unique address on hosted catch-all domain
      let isUnique = false;
      while (!isUnique) {
        const local = this.generateLocalPart();
        emailAddress = `${local}@${domain.domainName}`;
        const existing = await prisma.rentalSession.findUnique({
          where: { emailAddress },
        });
        if (!existing) isUnique = true;
      }
    }

    // Calculate dynamic pricing based on duration & sms count
    let durationMultiplier = 1.0;
    let durationMinutes = 20;
    if (timeParam) {
      const lowerTime = timeParam.toLowerCase();
      if (lowerTime.includes('1 hour') || lowerTime.includes('1hour') || lowerTime.includes('60')) {
        durationMultiplier = 1.25;
        durationMinutes = 60;
      } else if (lowerTime.includes('24 hour') || lowerTime.includes('24hour') || lowerTime.includes('1440')) {
        durationMultiplier = 1.5;
        durationMinutes = 24 * 60;
      }
    }

    const smsCount = Math.max(1, parseInt(smsCountParam?.toString() || '1', 10) || 1);
    const smsMultiplier = smsCount > 1 ? smsCount : 1;

    // Apply multipliers to final unit price
    price = price.mul(new Prisma.Decimal(durationMultiplier)).mul(new Prisma.Decimal(smsMultiplier));

    if (maxPrice !== undefined && price.greaterThan(new Prisma.Decimal(maxPrice))) {
      throw new Error('Price exceeds maxPrice');
    }

    // 4. Reserve funds in user's wallet
    await LedgerService.holdBalance(
      userId,
      price,
      `rental-temp`,
      `Order email for ${cleanService} (${emailAddress})`
    );

    // 5. Create rental session record with calculated expiration
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const rentalSession = await prisma.rentalSession.create({
      data: {
        userId,
        emailAddress,
        domainId,
        emailAccountId: selectedPoolAccount ? selectedPoolAccount.id : null,
        serviceCode: cleanService,
        price,
        countOfOtp: smsCountParam ? Math.max(1, parseInt(smsCountParam as any, 10)) : 1,
        status: RentalStatus.WAITING_CODE,
        expiresAt,
      },
    });

    // 6. If allocated from external pool, start IMAP listener
    if (selectedPoolAccount) {
      ImapPoolService.startRentalListener(selectedPoolAccount, rentalSession, user.webhookUrl).catch((err) => {
        console.error(`[IMAP] Failed to start listener for ${selectedPoolAccount.email}:`, err.message);
      });
    }

    return {
      status: 1,
      mail: emailAddress,
      mailId: rentalSession.id,
      expiresAt: rentalSession.expiresAt,
      price: rentalSession.price.toNumber(),
    };
  }

  /**
   * Retrieve extracted code for a rental session.
   */
  public static async getCode(mailId: number, userId?: string) {
    const session = await prisma.rentalSession.findUnique({
      where: { id: mailId },
    });

    if (!session) {
      return { status: 0, error: 'Pass mail id' };
    }

    if (userId && session.userId !== userId) {
      return { status: 0, error: 'Unauthorized mail access' };
    }

    if (session.status === RentalStatus.CANCELLED) {
      return { status: 0, error: 'Activation is already canceled' };
    }

    if (session.status === RentalStatus.EXPIRED || new Date() > session.expiresAt) {
      return { status: 0, error: 'Activation has expired' };
    }

    if (!session.code) {
      return {
        status: 0,
        error: 'Code has not been received yet, please try again later',
      };
    }

    return {
      status: 1,
      code: session.code,
    };
  }

  /**
   * Change activation status (SMSBower compatible).
   * status 2 = Cancel
   * status 3 = Successfully close activation after code received & settle money
   * status 5 = Waiting for next code
   */
  public static async setStatus(mailId: number, status: number, userId?: string) {
    const session = await prisma.rentalSession.findUnique({
      where: { id: mailId },
    });

    if (!session) {
      return { status: 0, error: 'Invalid mail id' };
    }

    if (userId && session.userId !== userId) {
      return { status: 0, error: 'Unauthorized mail access' };
    }

    if (status === 2) {
      // Cancel
      if (session.status === RentalStatus.COMPLETED) {
        return { status: 0, error: 'Cannot cancel already completed activation' };
      }

      await prisma.rentalSession.update({
        where: { id: mailId },
        data: { status: RentalStatus.CANCELLED },
      });

      // Stop IMAP listener
      await ImapPoolService.stopRentalListener(mailId);

      // Refund reserved funds
      await LedgerService.releaseBalance(
        session.userId,
        session.price,
        String(mailId),
        `Cancelled rental #${mailId}`
      );

      return { status: 1, message: 'Success' };
    } else if (status === 3) {
      // Complete & deduct funds
      if (session.status === RentalStatus.CANCELLED) {
        return { status: 0, error: 'Activation is already canceled' };
      }

      await prisma.rentalSession.update({
        where: { id: mailId },
        data: { status: RentalStatus.COMPLETED },
      });

      // Stop IMAP listener
      await ImapPoolService.stopRentalListener(mailId);

      // Record service in account usedServices for deconfliction
      if (session.emailAccountId) {
        const acc = await prisma.emailAccount.findUnique({ where: { id: session.emailAccountId } });
        if (acc && !acc.usedServices.includes(session.serviceCode)) {
          await prisma.emailAccount.update({
            where: { id: acc.id },
            data: {
              usedServices: { push: session.serviceCode },
            },
          });
        }
      }

      await LedgerService.settleBalance(
        session.userId,
        session.price,
        String(mailId),
        `Completed rental #${mailId}`
      );

      return { status: 1, message: 'Success' };
    } else if (status === 5) {
      // Wait next code (re-code) - clear previous code and extend by 10 minutes
      const extendedExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.rentalSession.update({
        where: { id: mailId },
        data: {
          code: null,
          verificationUrl: null,
          status: RentalStatus.WAITING_NEXT,
          expiresAt: extendedExpiry,
        },
      });

      // Restart live IMAP listener to capture the next code
      ImapPoolService.startRentalListenerById(mailId).catch((err) => {
        console.error(`[RentalService] Failed to restart IMAP listener for rental #${mailId}:`, err);
      });

      return { status: 1, message: 'Success' };
    }

    return { status: 0, error: 'Unknown status code' };
  }

  /**
   * Price & rest statistics for SMSBower API.
   */
  public static async getPriceRests(serviceCode?: string, domainParam?: string) {
    const services = await prisma.serviceItem.findMany({
      where: { isActive: true, ...(serviceCode ? { code: serviceCode.toLowerCase() } : {}) },
    });

    const domains = await prisma.domain.findMany({
      where: { isActive: true, ...(domainParam ? { domainName: domainParam.toLowerCase() } : {}) },
    });

    // Count active pool accounts by provider taking blocked services into account
    const allActiveAccounts = await prisma.emailAccount.findMany({
      where: { status: 'ACTIVE' },
      select: { provider: true, usedServices: true, blockedServices: true },
    });

    const result: Record<string, Record<string, { price: number; count: number }>> = {};

    for (const s of services) {
      result[s.code] = {};

      const cleanCode = s.code.toLowerCase();
      const cleanName = s.name.toLowerCase();

      // Filter accounts eligible for this specific service
      const eligibleAccounts = allActiveAccounts.filter((acc) => {
        if (acc.usedServices && acc.usedServices.includes(cleanCode)) return false;
        if (acc.blockedServices && acc.blockedServices.length > 0) {
          const isBlocked = acc.blockedServices.some((b) => {
            const cleanB = b.trim().toLowerCase();
            return cleanB === cleanCode || cleanB === cleanName;
          });
          if (isBlocked) return false;
        }
        return true;
      });

      const gmailCount = eligibleAccounts.filter((a) => a.provider.toUpperCase() === 'GMAIL').length;
      const outlookCount = eligibleAccounts.filter((a) => a.provider.toUpperCase() === 'OUTLOOK').length;

      // Add pool providers (gmail, outlook, etc.)
      result[s.code]['gmail.com'] = {
        price: Number(s.basePrice),
        count: gmailCount,
      };
      result[s.code]['outlook.com'] = {
        price: Number(s.basePrice),
        count: outlookCount,
      };

      for (const d of domains) {
        result[s.code][d.domainName] = {
          price: d.defaultPrice.toNumber(),
          count: 9999,
        };
      }
    }

    return {
      status: 1,
      data: result,
    };
  }

  /**
   * Return real available stock counts for services & domains/providers.
   * Only real counts are returned (no fake domains).
   */
  public static async getStockAvailability(serviceCode?: string) {
    const cleanService = serviceCode ? serviceCode.toLowerCase().trim() : undefined;

    let serviceItem: any = null;
    if (cleanService) {
      serviceItem = await prisma.serviceItem.findFirst({
        where: { OR: [{ code: cleanService }, { name: { equals: cleanService, mode: 'insensitive' } }] },
      });
    }

    // 1. External pool stock count by provider
    const activeAccounts = await prisma.emailAccount.findMany({
      where: { status: 'ACTIVE' },
      select: { provider: true, usedServices: true, blockedServices: true },
    });

    const poolCounts: Record<string, number> = {
      GMAIL: 0,
      OUTLOOK: 0,
      YAHOO: 0,
      AOL: 0,
      GMX: 0,
      CUSTOM: 0,
    };

    for (const acc of activeAccounts) {
      if (cleanService) {
        if (acc.usedServices && acc.usedServices.includes(cleanService)) {
          continue;
        }
        if (acc.blockedServices && acc.blockedServices.length > 0) {
          const isBlocked = acc.blockedServices.some((b: string) => {
            const cleanB = b.trim().toLowerCase();
            return (
              cleanB === cleanService ||
              (serviceItem && cleanB === serviceItem.name.toLowerCase()) ||
              (serviceItem && cleanB === serviceItem.code.toLowerCase())
            );
          });
          if (isBlocked) continue;
        }
      }
      const prov = acc.provider.toUpperCase();
      poolCounts[prov] = (poolCounts[prov] || 0) + 1;
    }

    // 2. Hosted Domains (dropotp.com, etc.)
    const hostedDomains = await prisma.domain.findMany({
      where: { isActive: true },
    });

    const stockList: any[] = [];

    // Add External Providers with stock
    const providerDefs = [
      { id: 'gmail', name: 'Gmail', provider: 'GMAIL', basePrice: 0.05 },
      { id: 'outlook', name: 'Outlook / Hotmail', provider: 'OUTLOOK', basePrice: 0.04 },
      { id: 'yahoo', name: 'Yahoo Mail', provider: 'YAHOO', basePrice: 0.045 },
      { id: 'icloud', name: 'iCloud', provider: 'CUSTOM', basePrice: 0.06 },
      { id: 'custom', name: 'Other Mailbox', provider: 'CUSTOM', basePrice: 0.035 },
    ];

    for (const p of providerDefs) {
      const count = poolCounts[p.provider] || 0;
      stockList.push({
        id: p.id,
        name: p.name,
        isPool: true,
        count,
        price: p.basePrice,
        available: count > 0,
      });
    }

    // Add Hosted Catch-All Domains (e.g. dropotp.com)
    for (const d of hostedDomains) {
      stockList.push({
        id: d.domainName,
        name: d.domainName,
        isPool: false,
        count: 9999,
        price: Number(d.defaultPrice),
        available: true,
        isPrivate: d.isPrivate,
      });
    }

    return stockList;
  }

  /**
   * Request another code (re-code) for the same rental during the active countdown window.
   * Zero extra cost!
   */
  public static async recode(rentalId: number, userId: string) {
    const rental = await prisma.rentalSession.findUnique({
      where: { id: rentalId },
      include: { user: true, emailAccount: true },
    });

    if (!rental) throw new Error('Rental session not found');
    if (rental.userId !== userId) throw new Error('Unauthorized');

    if (new Date() > rental.expiresAt) {
      throw new Error('Rental session has expired. Please order a new email address.');
    }

    // Record existing code to previousCodes so it can never be returned again
    const previousCodes = rental.previousCodes || [];
    if (rental.code && !previousCodes.includes(rental.code)) {
      previousCodes.push(rental.code);
    }

    const extendedExpiry = new Date(Math.max(Date.now() + 10 * 60 * 1000, rental.expiresAt.getTime()));

    // Set status to WAITING_NEXT (SMSBower status 5), increment recodeCount, clear code
    const updated = await prisma.rentalSession.update({
      where: { id: rental.id },
      data: {
        status: RentalStatus.WAITING_NEXT,
        recodeCount: { increment: 1 },
        code: null,
        verificationUrl: null,
        previousCodes: { set: previousCodes },
        expiresAt: extendedExpiry,
      },
    });

    // If this session is backed by an external IMAP pool account, re-launch listener
    if (rental.emailAccountId) {
      ImapPoolService.startRentalListenerById(updated.id).catch((err: any) => {
        console.warn(`[RentalService] Failed to restart IMAP listener on recode: ${err.message}`);
      });
    }

    return {
      status: 1,
      mailId: updated.id,
      recodeCount: updated.recodeCount,
      message: 'Listening for next OTP code on the same email',
    };
  }
}
