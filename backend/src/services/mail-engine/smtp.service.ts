import { SMTPServer } from 'smtp-server';
import { simpleParser, ParsedMail } from 'mailparser';
import { prisma } from '../../db/prisma';
import { redis } from '../../db/redis';
import { OtpExtractor } from './otp-extractor';
import { ENV } from '../../config/env';
import axios from 'axios';

export class InboundSmtpService {
  private server: SMTPServer | null = null;

  public start(): void {
    const port = ENV.SMTP_PORT;

    this.server = new SMTPServer({
      secure: false,
      authOptional: true,
      disabledCommands: ['AUTH'], // Open inbound relay for incoming MX deliveries
      size: 10 * 1024 * 1024, // Max 10MB email

      onRcptTo: async (address, session, callback) => {
        try {
          const recipient = address.address.toLowerCase();
          const domain = recipient.split('@')[1];

          if (!domain) {
            return callback(new Error('Invalid recipient format'));
          }

          // Allow official platform domain dropotp.com and all official addresses
          const isOfficialDomain = domain === 'dropotp.com';
          const isOfficialAddress = ['info@dropotp.com', 'admin@dropotp.com', 'support@dropotp.com'].includes(recipient);

          // Check if domain is registered in system or is official domain
          const domainExists = isOfficialDomain || await prisma.domain.findUnique({
            where: { domainName: domain },
          });

          if (!domainExists) {
            console.log(`[SMTP] Rejected recipient: ${recipient} (Domain ${domain} not hosted)`);
            return callback(new Error('Relay access denied for foreign domain'));
          }

          // Check if there is an active rental session for this address
          const rental = await prisma.rentalSession.findFirst({
            where: {
              emailAddress: recipient,
              status: { in: ['WAITING_CODE', 'WAITING_NEXT'] },
              expiresAt: { gt: new Date() },
            },
          });

          if (!rental) {
            console.log(`[SMTP] Recipient ${recipient} has no active rental session (or expired). Still accepting to catch-all.`);
          }

          return callback(); // Accept recipient
        } catch (error: any) {
          console.error('[SMTP] Error in onRcptTo:', error.message);
          return callback();
        }
      },

      onData: (stream, session, callback) => {
        simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
          if (err) {
            console.error('[SMTP] MIME parse error:', err.message);
            return callback(err);
          }

          try {
            await this.processIncomingEmail(parsed, session);
            return callback();
          } catch (processError: any) {
            console.error('[SMTP] Error processing email:', processError.message);
            return callback();
          }
        });
      },
    });

    this.server.listen(port, () => {
      console.log(`[SMTP Engine] Inbound Mail Server running on port ${port} (Catch-All enabled)`);
    });

    this.server.on('error', (err) => {
      console.error('[SMTP Engine] Server error:', err.message);
    });
  }

  private async processIncomingEmail(parsed: ParsedMail, session: any): Promise<void> {
    const recipients = (session.envelope?.rcptTo || []).map((r: any) => r.address.toLowerCase());
    const sender = parsed.from?.text || session.envelope?.mailFrom?.address || 'unknown@sender.com';
    const subject = parsed.subject || '(No Subject)';
    const textBody = parsed.text || '';
    const htmlBody = typeof parsed.html === 'string' ? parsed.html : '';

    console.log(`[SMTP Engine] Incoming email from ${sender} to [${recipients.join(', ')}] | Subject: "${subject}"`);

    for (const recipient of recipients) {
      // Find matching active rental session
      const rental = await prisma.rentalSession.findFirst({
        where: {
          emailAddress: recipient,
          status: { in: ['WAITING_CODE', 'WAITING_NEXT'] },
          expiresAt: { gt: new Date() },
        },
        include: { user: true, serviceItem: true },
      });

      // Check if service is "other" and matches any Global Blocked Service Rules
      let isBlocked = false;
      if (rental && rental.serviceCode === 'other') {
        const blockedRules = await prisma.blockedServiceRule.findMany({ where: { isActive: true } });
        const checkContent = `${sender} ${subject} ${textBody}`.toLowerCase();
        for (const rule of blockedRules) {
          if (checkContent.includes(rule.keyword.toLowerCase())) {
            console.warn(`[SMTP Engine] Blocked service rule triggered: "${rule.keyword}" for rental #${rental.id}`);
            isBlocked = true;
            break;
          }
        }
      }

      // Extract OTP code & URL using service hint and custom pattern
      const customPattern = rental?.serviceItem?.otpPattern || undefined;
      const extraction = isBlocked
        ? { code: null, url: null, confidence: 0 }
        : OtpExtractor.extract(subject, textBody, rental?.serviceCode, customPattern);
      const extractedCode = extraction.code;
      const extractedUrl = extraction.url;

      console.log(`[SMTP Engine] Recipient: ${recipient} | Extracted OTP: ${extractedCode || 'None'} | URL: ${extractedUrl || 'None'}`);

      // Save email log in database
      const receivedEmail = await prisma.receivedEmail.create({
        data: {
          rentalSessionId: rental ? rental.id : null,
          recipientEmail: recipient,
          senderEmail: sender,
          subject,
          textBody,
          htmlBody,
          extractedCode,
          extractedUrl,
          rawHeaders: parsed.headers ? JSON.parse(JSON.stringify(Object.fromEntries(parsed.headers))) : {},
        },
      });

      if (rental && !isBlocked) {
        // Build updated list of received OTPs for this rental session
        const currentOtps = Array.isArray(rental.receivedOtps) ? (rental.receivedOtps as any[]) : [];
        if (extractedCode && !currentOtps.includes(extractedCode)) {
          currentOtps.push(extractedCode);
        }

        // Update rental session with code, URL, and OTP history
        const updatedRental = await prisma.rentalSession.update({
          where: { id: rental.id },
          data: {
            code: extractedCode || rental.code,
            verificationUrl: extractedUrl || rental.verificationUrl,
            receivedOtps: currentOtps,
            receivedAt: new Date(),
          },
        });

        // Publish to Redis Pub/Sub for instant real-time WebSocket push
        const payload = {
          event: 'otp:received',
          rentalId: rental.id,
          userId: rental.userId,
          email: recipient,
          service: rental.serviceCode,
          code: extractedCode,
          url: extractedUrl,
          subject,
          receivedAt: new Date().toISOString(),
        };

        await redis.publish('email:otp:received', JSON.stringify(payload));
        console.log(`[SMTP Engine] Published Redis event for rental #${rental.id} (User: ${rental.userId})`);

        // If user configured a Webhook URL, deliver callback asynchronously
        if (rental.user.webhookUrl) {
          this.triggerUserWebhook(rental.user.webhookUrl, payload);
        }
      }
    }
  }

  private async triggerUserWebhook(url: string, payload: any): Promise<void> {
    try {
      await axios.post(url, payload, {
        timeout: 4000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'SaaS-OTP-Webhook/1.0' },
      });
      console.log(`[Webhook] Sent notification to ${url}`);
    } catch (e: any) {
      console.warn(`[Webhook] Failed sending to ${url}: ${e.message}`);
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

export const smtpService = new InboundSmtpService();
