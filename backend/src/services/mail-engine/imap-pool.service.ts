import { ImapFlow } from 'imapflow';
import { prisma } from '../../db/prisma';
import { redis } from '../../db/redis';
import { OtpExtractor } from './otp-extractor';
import { EmailAccount, EmailAccountStatus, RentalSession } from '@prisma/client';
import axios from 'axios';
import { simpleParser } from 'mailparser';
import { LedgerService } from '../wallet/ledger.service';

interface ProviderConfig {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
}

export class ImapPoolService {
  // Active IMAP listener sessions: rentalId -> abort controller / interval
  private static activeListeners: Map<number, { stop: () => Promise<void> }> = new Map();

  /**
   * Automatically resolve standard IMAP configuration from an email domain.
   */
  public static detectProviderConfig(email: string): ProviderConfig {
    const domain = email.split('@')[1]?.toLowerCase().trim() || '';

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return { provider: 'GMAIL', host: 'imap.gmail.com', port: 993, secure: true };
    }
    if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'msn.com') {
      return { provider: 'OUTLOOK', host: 'outlook.office365.com', port: 993, secure: true };
    }
    if (domain === 'yahoo.com' || domain === 'ymail.com' || domain === 'rocketmail.com') {
      return { provider: 'YAHOO', host: 'imap.mail.yahoo.com', port: 993, secure: true };
    }
    if (domain === 'aol.com') {
      return { provider: 'AOL', host: 'imap.aol.com', port: 993, secure: true };
    }
    if (domain === 'gmx.com' || domain === 'gmx.net') {
      return { provider: 'GMX', host: 'imap.gmx.com', port: 993, secure: true };
    }
    if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
      return { provider: 'ICLOUD', host: 'imap.mail.me.com', port: 993, secure: true };
    }

    // Custom domain default
    return {
      provider: 'CUSTOM',
      host: `mail.${domain}`,
      port: 993,
      secure: true,
    };
  }

  /**
   * Create an ImapFlow client with optional proxy configuration.
   */
  private static createClient(account: EmailAccount): ImapFlow {
    const options: any = {
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: account.email,
        pass: account.password,
      },
      logger: false,
      connectionTimeout: 12000,
      greetingTimeout: 12000,
    };

    if (account.proxyUrl) {
      try {
        options.proxy = account.proxyUrl;
      } catch (e: any) {
        console.warn(`[IMAP] Failed to attach proxy for ${account.email}: ${e.message}`);
      }
    }

    return new ImapFlow(options);
  }

  /**
   * Health Check: Test IMAP login and mark ACTIVE or DEAD in the database.
   */
  public static async checkAccountHealth(account: EmailAccount): Promise<{ live: boolean; error?: string }> {
    const client = this.createClient(account);

    try {
      await client.connect();
      await client.logout();

      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          status: EmailAccountStatus.ACTIVE,
          lastCheckedAt: new Date(),
          checkError: null,
        },
      });

      console.log(`[IMAP Check] [LIVE] Account ${account.email} verified successfully`);
      return { live: true };
    } catch (err: any) {
      const errorMsg = err.message || 'IMAP connection failed';
      console.warn(`[IMAP Check] [DEAD] Account ${account.email} failed: ${errorMsg}`);

      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          status: EmailAccountStatus.DEAD,
          lastCheckedAt: new Date(),
          checkError: errorMsg,
        },
      });

      return { live: false, error: errorMsg };
    }
  }

  /**
   * Bulk Health Check: Verify all or selected accounts concurrently.
   */
  public static async checkAllAccounts(accountIds?: string[]): Promise<{ total: number; live: number; dead: number }> {
    const where = accountIds ? { id: { in: accountIds } } : {};
    const accounts = await prisma.emailAccount.findMany({ where });

    let liveCount = 0;
    let deadCount = 0;

    // Concurrency limit: 5 accounts at a time
    const chunkSize = 5;
    for (let i = 0; i < accounts.length; i += chunkSize) {
      const chunk = accounts.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (acc) => {
          const res = await this.checkAccountHealth(acc);
          if (res.live) liveCount++;
          else deadCount++;
        })
      );
    }

    return { total: accounts.length, live: liveCount, dead: deadCount };
  }

  /**
   * Start IMAP listener during the rental session to capture incoming OTP emails in real-time.
   */
  public static async startRentalListener(account: EmailAccount, rental: RentalSession, userWebhookUrl?: string | null): Promise<void> {
    const rentalId = rental.id;
    let isRunning = true;
    const sessionStartTime = new Date(rental.createdAt);
    const processedUids = new Set<number>();
    let minUid: number | null = null;
    let lastUid: number | null = (rental as any).lastProcessedUid || null;
    const previousCodesSet = new Set<string>((rental as any).previousCodes || []);
    if (rental.code) previousCodesSet.add(rental.code);

    console.log(`[IMAP Listener] Starting live inbox monitor for ${account.email} (Rental #${rentalId}, Service: ${rental.serviceCode}, lastUid: ${lastUid})`);

    const pollLoop = async () => {
      while (isRunning) {
        // Check if rental session expired or completed
        const currentRental = await prisma.rentalSession.findUnique({
          where: { id: rentalId },
          include: { serviceItem: true },
        });

        if (!currentRental || currentRental.status === 'COMPLETED' || currentRental.status === 'CANCELLED' || new Date() > currentRental.expiresAt) {
          console.log(`[IMAP Listener] Stopping monitor for rental #${rentalId} (Session ended)`);
          this.stopRentalListener(rentalId);
          break;
        }

        const client = this.createClient(account);
        try {
          await client.connect();
          const lock = await client.getMailboxLock('INBOX');

          try {
            const mb: any = client.mailbox;
            if (minUid === null) {
              if (lastUid !== null && lastUid > 0) {
                minUid = lastUid + 1;
              } else {
                minUid = (mb && typeof mb.uidNext === 'number') ? mb.uidNext : 1;
              }
              console.log(`[IMAP Listener] ${account.email} baseline minUid=${minUid}, lastUid=${lastUid}`);
            }

            // Search for messages with UID >= minUid
            let uids: number[] = [];
            try {
              const res = await client.search({ uid: `${minUid}:*` }, { uid: true });
              if (Array.isArray(res)) uids = res;
            } catch (searchErr) {
              try {
                const res = await client.search({ since: sessionStartTime }, { uid: true });
                if (Array.isArray(res)) uids = res;
              } catch (e) {}
            }

            if (uids && uids.length > 0) {
              for (const uid of uids) {
                // STRICT CHECK: Skip any UID that is <= lastUid or < minUid or already processed
                if (lastUid !== null && uid <= lastUid) {
                  processedUids.add(uid);
                  continue;
                }
                if (minUid !== null && uid < minUid) {
                  processedUids.add(uid);
                  continue;
                }
                if (processedUids.has(uid)) continue;

                const msgStream = client.fetch(uid.toString(), {
                  envelope: true,
                  source: true,
                  uid: true,
                }, { uid: true });

                for await (const msg of msgStream) {
                  const subject = msg.envelope?.subject || '';
                  const sender = (msg.envelope?.from || []).map((f: any) => f.address).join(', ') || 'unknown';
                  const rawSource = msg.source?.toString('utf8') || '';
                  let textContent = rawSource;
                  try {
                    const parsed = await simpleParser(msg.source || '');
                    textContent = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : rawSource);
                  } catch (parseErr) {
                    textContent = rawSource;
                  }

                  // 1. Verify that this incoming email is actually from/for the ordered service
                  const serviceName = (currentRental as any)?.serviceItem?.name || undefined;
                  const serviceMatches = OtpExtractor.isSenderMatchingService(
                    sender,
                    subject,
                    currentRental.serviceCode,
                    serviceName
                  );

                  if (!serviceMatches) {
                    console.log(`[IMAP Listener] Email from "${sender}" ("${subject}") does not match service "${currentRental.serviceCode}". Skipped.`);
                    processedUids.add(uid);
                    continue;
                  }

                  // 2. Check if service is "other" and matches blocked rules
                  let isBlocked = false;
                  if (currentRental.serviceCode === 'other' || currentRental.serviceCode === 'any') {
                    const blockedRules = await prisma.blockedServiceRule.findMany({ where: { isActive: true } });
                    const checkContent = `${sender} ${subject} ${textContent}`.toLowerCase();
                    for (const rule of blockedRules) {
                      if (checkContent.includes(rule.keyword.toLowerCase())) {
                        console.warn(`[IMAP Listener] Blocked rule triggered: "${rule.keyword}" for rental #${rentalId}`);
                        isBlocked = true;
                        break;
                      }
                    }
                  }

                  if (isBlocked) {
                    processedUids.add(uid);
                    continue;
                  }

                  // 3. Extract OTP code & URL
                  const customPattern = (currentRental as any)?.serviceItem?.otpPattern || undefined;
                  const extraction = OtpExtractor.extract(subject, textContent, currentRental.serviceCode, customPattern);

                  if (extraction.code) {
                    // STRICT CHECK: If this code was already received in this session, REJECT IT!
                    if (previousCodesSet.has(extraction.code)) {
                      console.log(`[IMAP Listener] Code "${extraction.code}" was already seen earlier on rental #${rentalId}. Skipping.`);
                      processedUids.add(uid);
                      lastUid = Math.max(lastUid || 0, uid);
                      continue;
                    }

                    console.log(`[IMAP Listener] Real NEW OTP extracted: "${extraction.code}" (URL: ${extraction.url || 'None'}) for ${account.email} on service ${currentRental.serviceCode}!`);

                    processedUids.add(uid);
                    previousCodesSet.add(extraction.code);
                    lastUid = uid;

                    // Extra OTP charge if user exceeded purchased countOfOtp
                    const purchasedCount = (currentRental as any).countOfOtp || 1;
                    if (currentRental.recodeCount >= purchasedCount) {
                      const extraPrice = (currentRental as any).serviceItem?.basePrice || currentRental.price;
                      try {
                        await LedgerService.settleBalance(
                          currentRental.userId,
                          extraPrice,
                          String(rentalId),
                          `Extra OTP charge on rental #${rentalId} (${account.email})`
                        );
                        console.log(`[Rental] Deducted $${extraPrice} for extra OTP on rental #${rentalId}`);
                      } catch (chargeErr: any) {
                        console.warn(`[Rental] Failed to charge extra OTP balance: ${chargeErr.message}`);
                      }
                    }

                    const currentOtps = Array.isArray(currentRental.receivedOtps) ? (currentRental.receivedOtps as any[]) : [];
                    if (!currentOtps.includes(extraction.code)) {
                      currentOtps.push(extraction.code);
                    }

                    // Update rental session with code, lastProcessedUid, and previousCodes
                    await prisma.rentalSession.update({
                      where: { id: rentalId },
                      data: {
                        code: extraction.code,
                        verificationUrl: extraction.url || currentRental.verificationUrl,
                        receivedOtps: currentOtps,
                        lastProcessedUid: uid,
                        previousCodes: { push: extraction.code },
                        receivedAt: new Date(),
                        status: 'WAITING_NEXT' as any,
                      },
                    });

                    // Save received email log
                    await prisma.receivedEmail.create({
                      data: {
                        rentalSessionId: rentalId,
                        recipientEmail: account.email,
                        senderEmail: sender,
                        subject,
                        textBody: rawSource.slice(0, 10000),
                        extractedCode: extraction.code,
                        extractedUrl: extraction.url,
                      },
                    });

                    // Publish real-time event to Redis Pub/Sub for WebSockets
                    const payload = {
                      event: 'otp:received',
                      rentalId: currentRental.id,
                      userId: currentRental.userId,
                      email: account.email,
                      service: currentRental.serviceCode,
                      code: extraction.code,
                      url: extraction.url,
                      subject,
                      receivedAt: new Date().toISOString(),
                    };

                    await redis.publish('email:otp:received', JSON.stringify(payload));

                    // Deliver to User Webhook if configured
                    if (userWebhookUrl) {
                      try {
                        axios.post(userWebhookUrl, payload, { timeout: 4000 }).catch(() => {});
                      } catch (e) {}
                    }

                    // Stop listening once valid real code is received
                    isRunning = false;
                    break;
                  }
                }
                if (!isRunning) break;
              }
            }
          } finally {
            lock.release();
          }

          await client.logout();
        } catch (pollErr: any) {
          console.warn(`[IMAP Listener] Poll error for ${account.email}: ${pollErr.message}`);
        }

        // Wait 3 seconds between poll cycles
        if (isRunning) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    };

    // Run poll loop in background
    pollLoop();

    this.activeListeners.set(rentalId, {
      stop: async () => {
        isRunning = false;
      },
    });
  }

  /**
   * Stop active listener for a rental session.
   */
  public static async stopRentalListener(rentalId: number): Promise<void> {
    const listener = this.activeListeners.get(rentalId);
    if (listener) {
      await listener.stop();
      this.activeListeners.delete(rentalId);
    }
  }

  /**
   * Start/Restart IMAP listener by rentalId (fetches account and rental from db).
   */
  public static async startRentalListenerById(rentalId: number): Promise<void> {
    await this.stopRentalListener(rentalId);
    const rental = await prisma.rentalSession.findUnique({
      where: { id: rentalId },
      include: { emailAccount: true, user: true, serviceItem: true },
    });
    if (!rental || !rental.emailAccount) return;
    return this.startRentalListener(rental.emailAccount, rental, rental.user?.webhookUrl);
  }

  /**
   * Parse bulk uploaded text lines.
   * Supports:
   *  - email,apppw,Proxy,block_service (CSV)
   *  - email:password:proxyUrl
   *  - email:password:imapHost:imapPort:proxyUrl
   *  - Pipe-separated blocked services (e.g. Biglion|Claude|Hinge)
   */
  public static parseBulkLines(rawText: string): Array<{
    email: string;
    password: string;
    provider: string;
    imapHost: string;
    imapPort: number;
    proxyUrl?: string;
    blockedServices: string[];
  }> {
    const lines = rawText.split(/\r?\n/);
    const parsedList: any[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Check and skip header lines
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.startsWith('email,') ||
        lowerLine.startsWith('email;') ||
        lowerLine.startsWith('email:') ||
        lowerLine.startsWith('email\t') ||
        lowerLine.includes('email,apppw') ||
        lowerLine.includes('email,password')
      ) {
        continue;
      }

      let email = '';
      let password = '';
      let proxyUrl: string | undefined = undefined;
      let rawBlocked = '';
      let customHost: string | undefined = undefined;
      let customPort: number | undefined = undefined;

      // 1. Comma-separated (CSV format: email,apppw,Proxy,block_service)
      if (line.includes(',')) {
        const parts = line.split(',');
        email = parts[0]?.trim().toLowerCase() || '';
        password = parts[1]?.trim() || '';
        if (parts[2]) {
          const p = parts[2].trim();
          if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('socks')) {
            proxyUrl = p;
          } else if (p.includes('.')) {
            customHost = p;
          }
        }
        if (parts.length > 3) {
          rawBlocked = parts.slice(3).join(',').trim();
        }
      } else if (line.includes('\t')) {
        // Tab-separated
        const parts = line.split('\t');
        email = parts[0]?.trim().toLowerCase() || '';
        password = parts[1]?.trim() || '';
        if (parts[2]) {
          const p = parts[2].trim();
          if (p.startsWith('http') || p.startsWith('socks')) proxyUrl = p;
          else if (p.includes('.')) customHost = p;
        }
        if (parts.length > 3) {
          rawBlocked = parts.slice(3).join('\t').trim();
        }
      } else {
        // Colon-separated
        const proxyMatch = line.match(/(https?:\/\/[^\s:]+:[^\s@]+@[^\s:]+:\d+|https?:\/\/[^\s]+|socks[45]?:\/\/[^\s]+)/i);
        if (proxyMatch) {
          proxyUrl = proxyMatch[0];
          const rest = line.replace(proxyUrl, '___PROXY___');
          const parts = rest.split(':');
          email = parts[0]?.trim().toLowerCase() || '';
          password = parts[1]?.trim() || '';
          const proxyIndex = parts.indexOf('___PROXY___');
          if (proxyIndex >= 0 && parts.length > proxyIndex + 1) {
            rawBlocked = parts.slice(proxyIndex + 1).join(':').trim();
          }
        } else {
          const parts = line.split(':');
          email = parts[0]?.trim().toLowerCase() || '';
          password = parts[1]?.trim() || '';
          if (parts.length === 3) {
            const third = parts[2].trim();
            if (third.startsWith('http') || third.startsWith('socks')) {
              proxyUrl = third;
            } else {
              rawBlocked = third;
            }
          } else if (parts.length === 4) {
            if (parts[2].includes('.')) {
              customHost = parts[2].trim();
              customPort = parseInt(parts[3].trim(), 10) || 993;
            } else {
              proxyUrl = parts[2].trim();
              rawBlocked = parts[3].trim();
            }
          } else if (parts.length >= 5) {
            if (parts[2].includes('.')) {
              customHost = parts[2].trim();
              customPort = parseInt(parts[3].trim(), 10) || 993;
              proxyUrl = parts[4].trim();
              if (parts[5]) rawBlocked = parts.slice(5).join(':').trim();
            }
          }
        }
      }

      if (!email || !email.includes('@') || !password) continue;

      const autoConfig = this.detectProviderConfig(email);
      const imapHost = customHost || autoConfig.host;
      const imapPort = customPort || autoConfig.port;

      // Parse blocked services (split by pipe | or comma ,)
      const blockedServices: string[] = rawBlocked
        ? rawBlocked
            .split(/[|,]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];

      parsedList.push({
        email,
        password,
        provider: autoConfig.provider,
        imapHost,
        imapPort,
        proxyUrl,
        blockedServices,
      });
    }

    return parsedList;
  }
}
