import dns from 'dns';
import nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: string; // Base64 encoded string or raw string
  encoding?: string; // 'base64'
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  attachments?: MailAttachment[];
}

export interface SendMailResult {
  success: boolean;
  provider: 'DIRECT_MX' | 'CUSTOM_SMTP' | 'BREVO' | 'RESEND' | 'FALLBACK';
  messageId?: string;
  error?: string;
}

/**
 * Robust Outbound Mail Delivery Service
 * 1. Checks custom SMTP / API configurations (if provided)
 * 2. Directly resolves destination MX records and sends via Port 25 SMTP with STARTTLS (HOSTKEY unblocked port 25)
 */
export class OutboundMailService {
  private static defaultFromName = 'DropOTP Support';
  private static defaultFromEmail = 'info@dropotp.com';

  /**
   * Resolves MX records sorted by priority for a given domain
   */
  static async resolveMxRecords(domain: string): Promise<string[]> {
    try {
      const records = await dns.promises.resolveMx(domain);
      if (!records || records.length === 0) return [];
      records.sort((a, b) => a.priority - b.priority);
      return records.map((r) => r.exchange);
    } catch (err: any) {
      console.warn(`[OutboundMail] MX resolution failed for ${domain}:`, err.message);
      return [];
    }
  }

  /**
   * Send mail directly to recipient's MX server via SMTP port 25
   */
  static async sendDirectMx(options: SendMailOptions): Promise<SendMailResult> {
    const to = options.to.trim();
    const parts = to.split('@');
    if (parts.length !== 2) {
      return { success: false, provider: 'DIRECT_MX', error: `Invalid recipient email address: ${to}` };
    }

    const domain = parts[1].toLowerCase();
    let mxList = await this.resolveMxRecords(domain);
    mxList = mxList.map(h => (h || '').trim().replace(/\.$/, '')).filter(h => h.length > 0 && h !== '.');

    if (mxList.length === 0) {
      // If no valid MX record found, recipient server cannot accept mail
      console.warn(`[OutboundMail] No valid MX servers found for domain "${domain}"`);
      return {
        success: false,
        provider: 'DIRECT_MX',
        error: `No valid MX mail exchanger found for recipient domain: ${domain}`,
      };
    }

    const fromEmail = options.fromEmail || this.defaultFromEmail;
    const fromName = options.fromName || this.defaultFromName;

    let lastError: string | undefined;

    for (const mxHost of mxList) {
      try {
        console.log(`[OutboundMail] Attempting direct MX delivery to ${to} via ${mxHost}:25...`);
        
        const dkimPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCcUykJWy7N9hjb
Z/YqDcNbKA4OrbsT1Tj6pzbraw5fmS1bELhxcz7H0Q7dV7JIjPI66apKz2Go2Htl
Oj5BG13J6pcKYkIwhbxuNQvRWikELB37jDG9Da2XhsNCmDRAxmJ++xehmrGcKyNb
qKrRz2F1b+1nd+GzNsvY04qz5tTyJAzNae2MMR+WiUHP/9QZtutHA1nODa+la5S5
iK6zIAF3atzo/to7DTyaqacvoNqTsVNTS5x8AjhI2JAgMXqNbSwRvOPWVUkFBfnQ
Gnw+Jev1yng4EByRdYOb7ScaogY5KOUjI9kBKSr5k9jeQJSBHcpvlOGGemKuKjK9
S+3aQHUxAgMBAAECggEALq4eiO6zkUk1rv7iYThu55+UYwm53XhEZYTdP3tedWmW
Q6VAjpAtZRmmaK4xTLzZ8IGqGmDG9tZ+MoIr6OE1JoBoze79eOPWmso4VzGnIdnS
sjTw/VVCSwcw84fjwpv6+ZQdQGKjOtEe49X//FsC7UCZEdaYjR2FzZ+NwZ7iY9Os
M9JMC8l9Oanz0s9+CX3ujRPceEC1NMuBb2qdwl6DXI7gJ4nmwtMFtFI2j+iXjTdX
wgNBLSe3GOioLVnw2b2Q5YCaVMpD5nsXkAolxXwFIPi9IEkeJfgvaie2EgS0Z+Aq
NZY+39Y6x889nSNDggMAfxHgHUNjbUoO/ZZZE8RSqQKBgQC5TI81dRFOPRTxn8WD
xEF1NFdod+EhjGksLVZPvSgfdjc/M8U75U3srmBRGErXGQBTY0+s6egcsnMRyEWo
hrNYxav5v9+xBOGq+q7jmDhlJdkwsgFm29ALrzc7b/HkKXxZ92wUfUA5DZdUwt4J
fiilSKhyeRChPp99+HNBmhCsMwKBgQDX+H0p7BfTMR9ezaFbVdoHfz2YYfU6fSZu
Xqxgn1CGXp/yE5erMokSB/er7b+qMG44Z49Edm/Crd4P8AdDIYLFasLftYuxKLuo
S2q8QpdxqPZNIpxSWzlzmneZO3YL+PUeBiswxkvArvmlTV63AAwBJsmzX7oQwGQC
FW99rhO1CwKBgA+qpm0JodXwmiW3sXZrkHE9ZKqDgDha68V9a8/AGXVXhGJGmUVw
JL9/GsugdytqhLmIKwNen25VtB7rxN/zy5QU2m56R4pq9D2FhmXdx97dbViNpEqz
CQsD3HKdC2GUFFxy6+Nrl5N7T7Et7KH21a7rzrom/D310nxPFkeUpBY7AoGANFWR
tvvwFgw8RtPbeu+F4vUxbuCl9SNokaw9ZziT4cvCRH387c5UKttlZ/M307ziqKZn
sDZnBKzvN7t5dwoCz2X8jQtIK4jsWG7WEYKtgixoau6tJMPYWyweOTKQe3w7oafr
BWm355w/AJCMGBpZzlmg3OeghfipA1xAZRsuyVsCgYAychwp/wCuv3CYvX50cSnX
ShWJAfP5we3IxTTj49wbo1SvKJoPBOAznaIAo29ujnOpcpcL9XZ92D1vWBwT1UO4
q4VErPqfFBGQ9cxUiwmmk857Ygqpao9iHcib1CRfZwmg/RCGwnKTGGe1TJS4TDBa
nVx+Ab9/YM7sSzetfeaE+g==
-----END PRIVATE KEY-----`;

        const transporter = nodemailer.createTransport({
          host: mxHost,
          port: 25,
          secure: false, // opportunistic STARTTLS
          name: 'dropotp.com',
          tls: {
            rejectUnauthorized: false, // allow servers with self-signed or wildcard TLS
          },
          dkim: {
            domainName: 'dropotp.com',
            keySelector: 'default',
            privateKey: dkimPrivateKey,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });

        const mailPayload: any = {
          from: `"${fromName}" <${fromEmail}>`,
          to: to,
          subject: options.subject,
          text: options.text || (options.html ? options.html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : ''),
          html: options.html,
          headers: {
            'X-Mailer': 'DropOTP Mail Engine',
            'Precedence': 'bulk',
          },
        };

        if (options.attachments && options.attachments.length > 0) {
          mailPayload.attachments = options.attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content, att.encoding === 'base64' ? 'base64' : 'utf-8'),
            contentType: att.contentType,
          }));
        }

        const info = await transporter.sendMail(mailPayload);

        console.log(`[OutboundMail] Successfully delivered email to ${to} via ${mxHost} (MessageId: ${info.messageId})`);
        return {
          success: true,
          provider: 'DIRECT_MX',
          messageId: info.messageId,
        };
      } catch (err: any) {
        lastError = err.message || String(err);
        console.warn(`[OutboundMail] Failed delivery via ${mxHost}:`, lastError);
      }
    }

    return {
      success: false,
      provider: 'DIRECT_MX',
      error: lastError || 'All MX servers failed',
    };
  }

  /**
   * Main send method with fallback strategy
   */
  static async send(options: SendMailOptions, dbSettings?: any): Promise<SendMailResult> {
    // Explicit options.fromEmail/fromName passed in take priority (e.g. admin@dropotp.com, support@dropotp.com)
    const fromEmail = options.fromEmail || dbSettings?.fromEmail || process.env.SMTP_FROM || this.defaultFromEmail;
    const fromName = options.fromName || dbSettings?.fromName || process.env.SMTP_FROM_NAME || this.defaultFromName;

    const chosenProvider = (dbSettings?.provider || 'DIRECT_MX').toUpperCase();

    // 1. If Brevo selected and real key exists
    const brevoKey = dbSettings?.brevoApiKey || process.env.BREVO_API_KEY;
    if (chosenProvider === 'BREVO' && brevoKey && !brevoKey.includes('sample')) {
      try {
        const axios = (await import('axios')).default;
        const res = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: fromName, email: fromEmail },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text,
            attachment: options.attachments?.map(a => ({
              name: a.filename,
              content: a.content,
            })),
          },
          {
            headers: {
              'api-key': brevoKey.trim(),
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: 8000,
          }
        );
        console.log(`[OutboundMail] Delivered via Brevo API to ${options.to} (MessageId: ${res.data?.messageId})`);
        return { success: true, provider: 'BREVO', messageId: res.data?.messageId };
      } catch (err: any) {
        console.warn(`[OutboundMail] Brevo API failed:`, err.response?.data?.message || err.message);
      }
    }

    // 2. If Resend selected and real key exists
    const resendKey = dbSettings?.resendApiKey || process.env.RESEND_API_KEY;
    if (chosenProvider === 'RESEND' && resendKey && !resendKey.includes('sample') && !resendKey.includes('test')) {
      try {
        const axios = (await import('axios')).default;
        const res = await axios.post(
          'https://api.resend.com/emails',
          {
            from: `${fromName} <${fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            attachments: options.attachments?.map(a => ({
              filename: a.filename,
              content: a.content,
            })),
          },
          {
            headers: {
              Authorization: `Bearer ${resendKey.trim()}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          }
        );
        console.log(`[OutboundMail] Delivered via Resend API to ${options.to} (Id: ${res.data?.id})`);
        return { success: true, provider: 'RESEND', messageId: res.data?.id };
      } catch (err: any) {
        console.warn(`[OutboundMail] Resend API failed:`, err.response?.data?.message || err.message);
      }
    }

    // 3. If Custom SMTP selected or configured
    const smtpHost = dbSettings?.smtpHost || process.env.SMTP_HOST;
    const smtpUser = dbSettings?.smtpUser || process.env.SMTP_USER;
    const smtpPass = dbSettings?.smtpPass || process.env.SMTP_PASS;
    const smtpPort = Number(dbSettings?.smtpPort || process.env.SMTP_PORT) || 587;

    if (chosenProvider === 'CUSTOM_SMTP' && smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 8000,
        });

        const mailPayload: any = {
          from: `"${fromName}" <${fromEmail}>`,
          to: options.to,
          subject: options.subject,
          text: options.text || '',
          html: options.html,
        };

        if (options.attachments && options.attachments.length > 0) {
          mailPayload.attachments = options.attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content, att.encoding === 'base64' ? 'base64' : 'utf-8'),
            contentType: att.contentType,
          }));
        }

        const info = await transporter.sendMail(mailPayload);

        console.log(`[OutboundMail] Delivered via Custom SMTP to ${options.to}`);
        return { success: true, provider: 'CUSTOM_SMTP', messageId: info.messageId };
      } catch (e: any) {
        console.warn(`[OutboundMail] Custom SMTP failed, falling back to direct MX:`, e.message);
      }
    }

    // 4. Direct MX outbound delivery (Uses unlocked port 25)
    return await this.sendDirectMx({
      ...options,
      fromEmail,
      fromName,
    });
  }
}
