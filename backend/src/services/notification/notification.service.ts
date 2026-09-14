import { prisma } from '../../db/prisma';
import { OutboundMailService } from '../mail-engine/outbound-mail.service';

/**
 * Common HTML wrapper with Brand Header and Footer
 */
export function renderEmailTemplate(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 10px; color: #1e293b; }
    .email-container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 10px 0 0 0; }
    .brand-sub { font-size: 12px; color: #a7f3d0; margin-top: 4px; font-weight: 500; }
    .email-body { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #334155; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-val { color: #0f172a; font-weight: 700; text-align: right; }
    .btn-action { display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin: 16px 0; box-shadow: 0 4px 12px rgba(5,150,105,0.25); text-align: center; }
    .badge-success { background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-danger { background: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-warning { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .email-footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
    .footer-links a { color: #059669; text-decoration: none; margin: 0 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header with logo and branding -->
    <div class="email-header">
      <div style="text-align: center;">
        <img src="https://dropotp.com/logo-transparent.png" alt="DropOTP Logo" style="height: 46px; max-width: 180px; object-fit: contain;" />
      </div>
      <div class="brand-title">DropOTP Platform</div>
      <div class="brand-sub">Temporary & Dedicated Cloud OTP & SMS Service</div>
    </div>

    <!-- Body Content -->
    <div class="email-body">
      ${contentHtml}
    </div>

    <!-- Footer with contact info and website links -->
    <div class="email-footer">
      <div style="margin-bottom: 12px;" class="footer-links">
        <a href="https://dropotp.com" target="_blank">Website</a> •
        <a href="https://dropotp.com/#topups" target="_blank">Add Funds</a> •
        <a href="https://dropotp.com/#services" target="_blank">Services</a> •
        <a href="mailto:support@dropotp.com">Support Contact</a>
      </div>
      <div style="color: #94a3b8; font-size: 11px; line-height: 1.5;">
        Need help? Contact us anytime at <a href="mailto:support@dropotp.com" style="color: #059669; text-decoration: none;">support@dropotp.com</a> or via Telegram.<br/>
        © ${new Date().getFullYear()} DropOTP.com • All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export class NotificationService {
  /**
   * Helper to dispatch mail via OutboundMailService
   */
  private static async dispatch(to: string, subject: string, html: string, fromName = 'DropOTP Notification') {
    try {
      let dbSettings: any = null;
      try {
        const row = await prisma.siteContent.findUnique({ where: { key: 'mail_settings' } });
        if (row && row.data) dbSettings = row.data;
      } catch (e) {}

      await OutboundMailService.send(
        {
          to,
          subject,
          html,
          fromName,
          fromEmail: 'info@dropotp.com',
        },
        dbSettings
      );
    } catch (err: any) {
      console.warn(`[NotificationService] Failed sending to ${to}:`, err.message);
    }
  }

  /**
   * 1. Deposit Request Created
   * Triggered when a user initiates a deposit request
   */
  public static async notifyDepositCreated(data: {
    userId: string;
    gateway: string;
    amount: number;
    currency: string;
    orderId: string;
    paymentUrl?: string;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, username: true },
      });
      if (!user || !user.email) return;

      const dateStr = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka',
      });

      const payButton = data.paymentUrl
        ? `<div style="text-align: center; margin: 24px 0;">
             <a href="${data.paymentUrl}" class="btn-action" target="_blank">Complete Deposit Payment &rarr;</a>
           </div>`
        : '';

      const content = `
        <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Deposit Request Initiated 💳</h2>
        <p>Hello <strong>${user.username || 'Valued Customer'}</strong>,</p>
        <p>Your deposit order has been generated. Please proceed with payment using the details below:</p>

        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Order Reference:</span>
            <span class="info-val">${data.orderId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Gateway:</span>
            <span class="info-val">${data.gateway.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deposit Amount:</span>
            <span class="info-val" style="color: #059669; font-size: 16px;">${data.amount} ${data.currency}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Order Date & Time:</span>
            <span class="info-val">${dateStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Current Status:</span>
            <span class="info-val"><span class="badge-warning">Pending Payment</span></span>
          </div>
        </div>

        ${payButton}

        <p style="font-size: 13px; color: #64748b;">
          Once your payment is confirmed by the gateway, your account balance will be automatically credited instantly.
        </p>
      `;

      const html = renderEmailTemplate('Deposit Request Initiated - DropOTP', content);
      await this.dispatch(user.email, `Deposit Request Initiated: ${data.amount} ${data.currency} [#${data.orderId}]`, html);
    } catch (e: any) {
      console.warn('[NotificationService] notifyDepositCreated error:', e.message);
    }
  }

  /**
   * 2. Deposit Result: Successful or Failed
   */
  public static async notifyDepositStatus(data: {
    userId: string;
    gateway: string;
    amount: number;
    currency: string;
    orderId: string;
    transactionId?: string;
    status: 'SUCCESS' | 'FAILED';
    creditedUSD?: number | string;
    errorMessage?: string;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, username: true },
      });
      if (!user || !user.email) return;

      const dateStr = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka',
      });

      const isSuccess = data.status === 'SUCCESS';

      const content = `
        <h2 style="margin-top: 0; font-size: 20px; color: ${isSuccess ? '#059669' : '#dc2626'};">
          ${isSuccess ? 'Payment Successful! 🎉' : 'Deposit Payment Failed ⚠️'}
        </h2>
        <p>Hello <strong>${user.username || 'Valued Customer'}</strong>,</p>
        <p>
          ${
            isSuccess
              ? `Great news! Your deposit of <strong>${data.amount} ${data.currency}</strong> was confirmed and added to your wallet balance.`
              : `Unfortunately, your deposit payment of <strong>${data.amount} ${data.currency}</strong> could not be processed.`
          }
        </p>

        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Order ID:</span>
            <span class="info-val">${data.orderId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Gateway:</span>
            <span class="info-val">${data.gateway.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Deposit Amount:</span>
            <span class="info-val">${data.amount} ${data.currency}</span>
          </div>
          ${
            data.creditedUSD
              ? `<div class="info-row">
                  <span class="info-label">Credited Balance (USD):</span>
                  <span class="info-val" style="color: #059669;">+$${data.creditedUSD}</span>
                </div>`
              : ''
          }
          ${
            data.transactionId
              ? `<div class="info-row">
                  <span class="info-label">Transaction ID:</span>
                  <span class="info-val">${data.transactionId}</span>
                </div>`
              : ''
          }
          <div class="info-row">
            <span class="info-label">Time:</span>
            <span class="info-val">${dateStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-val">
              <span class="${isSuccess ? 'badge-success' : 'badge-danger'}">
                ${isSuccess ? 'COMPLETED / PAID' : 'FAILED'}
              </span>
            </span>
          </div>
          ${
            !isSuccess && data.errorMessage
              ? `<div class="info-row">
                  <span class="info-label">Reason:</span>
                  <span class="info-val" style="color: #dc2626;">${data.errorMessage}</span>
                </div>`
              : ''
          }
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://dropotp.com/#topups" class="btn-action" target="_blank">
            ${isSuccess ? 'View Wallet & Services &rarr;' : 'Try Deposit Again &rarr;'}
          </a>
        </div>
      `;

      const subject = isSuccess
        ? `Deposit Confirmed: +$${data.creditedUSD || data.amount} added to your account`
        : `Deposit Payment Unsuccessful [#${data.orderId}]`;

      const html = renderEmailTemplate(subject, content);
      await this.dispatch(user.email, subject, html);
    } catch (e: any) {
      console.warn('[NotificationService] notifyDepositStatus error:', e.message);
    }
  }

  /**
   * Helper to broadcast email to all registered active users in batches
   */
  private static async broadcastToAllUsers(subject: string, contentHtml: string) {
    try {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { email: true, username: true },
      });

      if (!users.length) return;
      console.log(`[NotificationService] Broadcasting "${subject}" to ${users.length} users...`);

      const fullHtml = renderEmailTemplate(subject, contentHtml);

      let dbSettings: any = null;
      try {
        const row = await prisma.siteContent.findUnique({ where: { key: 'mail_settings' } });
        if (row && row.data) dbSettings = row.data;
      } catch (e) {}

      // Batch 5 users at a time asynchronously
      for (let i = 0; i < users.length; i += 5) {
        const batch = users.slice(i, i + 5);
        await Promise.allSettled(
          batch.map((u) =>
            OutboundMailService.send(
              {
                to: u.email,
                subject,
                html: fullHtml,
                fromName: 'DropOTP Official',
                fromEmail: 'info@dropotp.com',
              },
              dbSettings
            )
          )
        );
        // Small delay between batches to avoid spamming
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (e: any) {
      console.warn('[NotificationService] broadcastToAllUsers error:', e.message);
    }
  }

  /**
   * 3. New Service Added Alert
   * Auto email all users when admin creates a new service
   */
  public static async notifyNewServiceAdded(service: {
    name: string;
    code: string;
    basePrice: number | string;
    icon?: string;
  }) {
    const content = `
      <h2 style="margin-top: 0; font-size: 22px; color: #0f172a;">🚀 New Service Available: ${service.name}</h2>
      <p>Hello,</p>
      <p>We are excited to announce that a brand new service has been added to the <strong>DropOTP Platform</strong>!</p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Service Name:</span>
          <span class="info-val">${service.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Service Code:</span>
          <span class="info-val"><code>${service.code}</code></span>
        </div>
        <div class="info-row">
          <span class="info-label">Starting Price:</span>
          <span class="info-val" style="color: #059669; font-size: 16px;">$${service.basePrice} / activation</span>
        </div>
        <div class="info-row">
          <span class="info-label">Availability:</span>
          <span class="info-val"><span class="badge-success">Live Now</span></span>
        </div>
      </div>

      <p>You can now instantly rent temporary numbers and receive OTP verification codes for <strong>${service.name}</strong> 24/7 with zero waiting.</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://dropotp.com/#services" class="btn-action" target="_blank">Order ${service.name} Now &rarr;</a>
      </div>
    `;

    // Run in background without blocking response
    setImmediate(() => {
      this.broadcastToAllUsers(`New Service Added: ${service.name} is now available!`, content);
    });
  }

  /**
   * 4. Service Price Update Alert (Up or Down)
   * Auto email all users when pricing changes
   */
  public static async notifyPriceChange(data: {
    serviceName: string;
    oldPrice: number;
    newPrice: number;
  }) {
    const isPriceDrop = data.newPrice < data.oldPrice;
    const diff = Math.abs(data.newPrice - data.oldPrice).toFixed(4);

    const content = `
      <h2 style="margin-top: 0; font-size: 20px; color: ${isPriceDrop ? '#059669' : '#0f172a'};">
        ${isPriceDrop ? '🔥 Price Reduced on ' : '📢 Price Update on '}${data.serviceName}
      </h2>
      <p>Hello,</p>
      <p>Please note that the activation rate for <strong>${data.serviceName}</strong> has been updated on DropOTP.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Service:</span>
          <span class="info-val">${data.serviceName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Previous Rate:</span>
          <span class="info-val" style="text-decoration: line-through; color: #94a3b8;">$${data.oldPrice}</span>
        </div>
        <div class="info-row">
          <span class="info-label">New Rate:</span>
          <span class="info-val" style="color: ${isPriceDrop ? '#059669' : '#0f172a'}; font-size: 16px;">$${data.newPrice}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Adjustment:</span>
          <span class="info-val">
            <span class="${isPriceDrop ? 'badge-success' : 'badge-warning'}">
              ${isPriceDrop ? `Reduced by $${diff}` : `Adjusted by +$${diff}`}
            </span>
          </span>
        </div>
      </div>

      <p>Log in now to manage your rentals and take advantage of our live stock.</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://dropotp.com" class="btn-action" target="_blank">Go to DropOTP Dashboard &rarr;</a>
      </div>
    `;

    const subject = isPriceDrop
      ? `Price Drop Alert: ${data.serviceName} is now just $${data.newPrice}!`
      : `Price Notice: ${data.serviceName} rate updated to $${data.newPrice}`;

    setImmediate(() => {
      this.broadcastToAllUsers(subject, content);
    });
  }

  /**
   * 5. Promo Code Announcement (When maxUses is 0 = Unlimited for all users)
   */
  public static async notifyPromoCode(promo: {
    code: string;
    name: string;
    rewardType: string;
    rewardValue: number;
    maxUses?: number;
    endAt?: Date | null;
  }) {
    // Only broadcast if maxUses === 0 (or null/undefined), meaning unlimited for all users
    if (promo.maxUses !== 0 && promo.maxUses !== undefined && promo.maxUses !== null) {
      return;
    }

    const expiryStr = promo.endAt
      ? new Date(promo.endAt).toLocaleDateString('en-US', { dateStyle: 'medium' })
      : 'Limited Time Offer';

    const content = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 40px;">🎁</span>
        <h2 style="margin: 8px 0; font-size: 24px; color: #0f172a;">Special Promo Code Announcement!</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Claim your <strong>${promo.name}</strong> reward today</p>
      </div>

      <p>Hello,</p>
      <p>We are delighted to share an exclusive promotion with all our valued members!</p>

      <!-- Promo Box -->
      <div style="background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 13px; color: #047857; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Use Promo Code:</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #047857; margin: 10px 0;">
          ${promo.code}
        </div>
        <div style="display: inline-block; background: #059669; color: #ffffff; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 20px;">
          Reward: ${promo.rewardType} ${promo.rewardValue}${promo.rewardType === 'DISCOUNT' ? '%' : '$'}
        </div>
      </div>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Promotion:</span>
          <span class="info-val">${promo.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Who Can Redeem:</span>
          <span class="info-val"><span class="badge-success">All Users (Unlimited)</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Valid Until:</span>
          <span class="info-val">${expiryStr}</span>
        </div>
      </div>

      <p style="font-size: 14px;"><strong>How to claim:</strong> Go to the Add Funds section on DropOTP, click <em>Redeem Promo Code</em>, enter <strong>${promo.code}</strong> and enjoy your bonus!</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://dropotp.com/#topups" class="btn-action" target="_blank">Redeem Promo Code Now &rarr;</a>
      </div>
    `;

    const subject = `🎁 Special Gift: Use code ${promo.code} for ${promo.rewardValue}${promo.rewardType === 'DISCOUNT' ? '%' : '$'} Reward!`;

    setImmediate(() => {
      this.broadcastToAllUsers(subject, content);
    });
  }
}
