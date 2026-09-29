/**
 * Robust Regex OTP extraction patterns for popular services and generic OTP formats.
 * Strictly prevents false dates (e.g. 20260909), years (1990-2035), or unrelated email digits.
 */

interface ExtractionResult {
  code: string | null;
  url: string | null;
  confidence: number; // 0 to 1
  serviceDetected?: string;
}

export class OtpExtractor {
  private static servicePatterns: Record<string, RegExp[]> = {
    tg: [
      /Login code:\s*(\d{5,6})/i,
      /Telegram code:?\s*(\d{5,6})/i,
      /\b(\d{5,6})\b(?=.*(?:Telegram|login))/i,
    ],
    telegram: [
      /Login code:\s*(\d{5,6})/i,
      /Telegram code:?\s*(\d{5,6})/i,
      /\b(\d{5,6})\b(?=.*(?:Telegram|login))/i,
    ],
    google: [
      /G-(\d{6})/i,
      /(\d{6})\s+is your Google(?:\s+Account)?\s+verification code/i,
      /Google verification code:?\s*(\d{6})/i,
    ],
    gmail: [
      /G-(\d{6})/i,
      /(\d{6})\s+is your Google(?:\s+Account)?\s+verification code/i,
      /Google verification code:?\s*(\d{6})/i,
    ],
    fb: [
      /(\d{6,8})\s+is your Facebook(?:\s+confirmation)?\s+code/i,
      /Facebook code:?\s*(\d{6,8})/i,
    ],
    facebook: [
      /(\d{6,8})\s+is your Facebook(?:\s+confirmation)?\s+code/i,
      /Facebook code:?\s*(\d{6,8})/i,
    ],
    ig: [
      /(\d{6})\s+is your Instagram code/i,
      /Instagram code:?\s*(\d{6})/i,
    ],
    instagram: [
      /(\d{6})\s+is your Instagram code/i,
      /Instagram code:?\s*(\d{6})/i,
    ],
    tinder: [
      /Your Tinder code is\s*(\d{6})/i,
      /Tinder code:?\s*(\d{6})/i,
    ],
    ms: [
      /(\d{6,7})\s+is your Microsoft account security code/i,
      /Microsoft security code:?\s*(\d{6,7})/i,
    ],
    microsoft: [
      /(\d{6,7})\s+is your Microsoft account security code/i,
      /Microsoft security code:?\s*(\d{6,7})/i,
    ],
    wa: [
      /WhatsApp code:\s*(\d{3}-\d{3}|\d{6})/i,
      /(\d{3}-\d{3}|\d{6})\s+is your WhatsApp code/i,
    ],
    whatsapp: [
      /WhatsApp code:\s*(\d{3}-\d{3}|\d{6})/i,
      /(\d{3}-\d{3}|\d{6})\s+is your WhatsApp code/i,
    ],
    openai: [
      /(?:verification|security|login|confirm|one-time|auth)\s*(?:code|passcode)?[:\s\-#]+(\d{6})/i,
      /(\d{6})\s+(?:is your\s+)?(?:ChatGPT|OpenAI)\s+(?:verification|security|confirmation)?\s*code/i,
      /ChatGPT\s+(?:verification|security)?\s*code:?\s*(\d{6})/i,
      /OpenAI\s+(?:verification|security)?\s*code:?\s*(\d{6})/i,
      /(?:your|the)\s+code\s+is[:\s]+(\d{6})/i,
    ],
    chatgpt: [
      /(?:verification|security|login|confirm|one-time|auth)\s*(?:code|passcode)?[:\s\-#]+(\d{6})/i,
      /(\d{6})\s+(?:is your\s+)?(?:ChatGPT|OpenAI)\s+(?:verification|security|confirmation)?\s*code/i,
      /ChatGPT\s+(?:verification|security)?\s*code:?\s*(\d{6})/i,
      /OpenAI\s+(?:verification|security)?\s*code:?\s*(\d{6})/i,
      /(?:your|the)\s+code\s+is[:\s]+(\d{6})/i,
    ],
    amazon: [
      /(\d{6})\s+is your Amazon OTP/i,
      /Amazon verification code:?\s*(\d{6})/i,
      /(?:your|the)\s+OTP\s+is[:\s]+(\d{6})/i,
    ],
  };

  private static blacklistedWords = new Set([
    'code', 'here', 'your', 'chatgpt', 'openai', 'email', 'login', 'verify',
    'account', 'security', 'confirm', 'password', 'welcome', 'support', 'service',
    'verification', 'confirmation', 'number', 'access', 'token', 'request', 'status',
    'update', 'latest', 'notification', 'message'
  ]);

  /**
   * Validate that a candidate OTP string is legitimate.
   * Eliminates dates (YYYYMMDD), 4-digit years (1990-2035), timestamps, and generic words.
   */
  public static isValidCode(c: string | null | undefined): boolean {
    if (!c) return false;
    const clean = c.trim().toLowerCase();

    // Length check: OTP codes are between 3 and 8 chars
    if (clean.length < 3 || clean.length > 8) return false;

    // Check blacklist words
    if (this.blacklistedWords.has(clean)) return false;

    // Pure alphabetical words are rejected
    if (/^[a-z]+$/i.test(clean)) return false;

    // Reject 8-digit date formats: YYYYMMDD (e.g. 20260909, 20260912, 20251120)
    if (/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/.test(clean)) {
      return false;
    }

    // Reject 8-digit date formats: DDMMYYYY
    if (/^(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])(?:19|20)\d{2}$/.test(clean)) {
      return false;
    }

    // Reject 4-digit years (1990 to 2035) like 2002, 2024, 2025, 2026
    if (/^(?:199\d|20[0-3]\d)$/.test(clean)) {
      return false;
    }

    // Reject repetitive sequences like 0000, 1111, 000000
    if (/^(\d)\1+$/.test(clean)) {
      return false;
    }

    // Must have at least 3 digits
    const digits = (clean.match(/\d/g) || []).length;
    if (digits < 3) return false;

    return true;
  }

  /**
   * Check if the incoming email sender or subject matches the requested service.
   * Prevents spam or unrelated emails from triggering a false OTP.
   */
  public static isSenderMatchingService(
    senderEmail: string,
    subject: string,
    serviceCode: string,
    serviceName?: string
  ): boolean {
    const code = (serviceCode || '').toLowerCase().trim();
    if (!code || code === 'other' || code === 'any' || code === 'anyemail') {
      return true; // Generic allows all services
    }

    const checkText = `${senderEmail} ${subject}`.toLowerCase();

    const serviceSenderMap: Record<string, string[]> = {
      openai: ['openai.com', 'chatgpt', 'openai'],
      chatgpt: ['openai.com', 'chatgpt', 'openai'],
      tg: ['telegram.org', 'telegram'],
      telegram: ['telegram.org', 'telegram'],
      google: ['google.com', 'accounts.google', 'google'],
      gmail: ['google.com', 'accounts.google', 'gmail', 'google'],
      fb: ['facebookmail.com', 'facebook.com', 'facebook', 'fb.com'],
      facebook: ['facebookmail.com', 'facebook.com', 'facebook'],
      ig: ['instagram.com', 'mail.instagram.com', 'instagram'],
      instagram: ['instagram.com', 'mail.instagram.com', 'instagram'],
      ms: ['microsoft.com', 'live.com', 'outlook.com', 'microsoft'],
      microsoft: ['microsoft.com', 'live.com', 'outlook.com', 'microsoft'],
      outlook: ['microsoft.com', 'live.com', 'outlook.com', 'microsoft'],
      wa: ['whatsapp.com', 'whatsapp'],
      whatsapp: ['whatsapp.com', 'whatsapp'],
      amazon: ['amazon.com', 'amazon'],
      apple: ['apple.com', 'id.apple.com', 'apple'],
      tiktok: ['tiktok.com', 'tiktok'],
      tinder: ['gotinder.com', 'tinder.com', 'tinder'],
      x: ['x.com', 'twitter.com', 'twitter'],
      twitter: ['x.com', 'twitter.com', 'twitter'],
      github: ['github.com', 'github'],
      binance: ['binance.com', 'binance'],
      claude: ['anthropic.com', 'claude.ai', 'claude'],
      discord: ['discord.com', 'discord'],
      reddit: ['reddit.com', 'redditmail.com', 'reddit'],
      netflix: ['netflix.com', 'netflix'],
      steam: ['steampowered.com', 'steam'],
      viber: ['viber.com', 'viber'],
      ebay: ['ebay.com', 'ebay'],
    };

    if (serviceSenderMap[code]) {
      return serviceSenderMap[code].some((k) => checkText.includes(k));
    }

    // Default: Check if service code or service name is mentioned in sender or subject
    const name = (serviceName || '').toLowerCase().trim();
    return checkText.includes(code) || (name.length > 2 && checkText.includes(name));
  }

  /**
   * Generic patterns matching typical OTP/verification contexts.
   */
  private static genericContextPatterns: RegExp[] = [
    /(?:verification|security|confirm|confirmation|login|auth|activation|access|otp|pin|passcode|code)[\s\w]*?[:\s\-#]+(\b\d{4,8}\b)/i,
    /(\b\d{4,8}\b)[\s\w]*?(?:is your|as your|to verify|to confirm)/i,
    /enter\s+(?:the\s+)?(?:code\s+)?(\b\d{4,8}\b)/i,
    /(?:your|use)\s+(?:verification|confirmation|login|security|access)?\s*code\s+(?:is|:)\s*(\b\d{4,8}\b)/i,
    /(?:verification|security|confirm|confirmation|login|auth|activation|access|otp|pin|passcode)[\s\w]*?[:\s\-#]+(\b[A-Za-z0-9]{4,8}\b)/i,
  ];

  /**
   * Extract verification/magic URLs from email body.
   */
  public static extractUrl(text: string): string | null {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s<>"'`]+(?:verify|confirm|token|auth|activate|validation|magic|login)[^\s<>"'`]*)/gi;
    const match = text.match(urlRegex);
    if (match && match.length > 0) {
      return match[0].replace(/[.,;>)]+$/, '');
    }
    return null;
  }

  public static extract(
    subject: string,
    bodyText: string,
    serviceHint?: string,
    customPattern?: string
  ): ExtractionResult {
    const combinedContent = `${subject}\n${bodyText}`;
    const extractedUrl = this.extractUrl(bodyText);

    // 0. If a custom pattern/regex is configured for the service by admin, check it first!
    if (customPattern && customPattern.trim().length > 0) {
      try {
        const customRegex = new RegExp(customPattern.trim(), 'i');
        const match = combinedContent.match(customRegex);
        if (match) {
          const code = (match[1] || match[0]).trim();
          if (this.isValidCode(code)) {
            return {
              code,
              url: extractedUrl,
              confidence: 1.0,
              serviceDetected: serviceHint,
            };
          }
        }
      } catch (err) {
        console.warn('[OtpExtractor] Invalid custom pattern regex:', customPattern);
      }
    }

    // 1. Try service-specific patterns if serviceHint matches known services
    if (serviceHint && this.servicePatterns[serviceHint.toLowerCase()]) {
      const patterns = this.servicePatterns[serviceHint.toLowerCase()];
      for (const regex of patterns) {
        const match = combinedContent.match(regex);
        if (match && match[1]) {
          const cleanCode = match[1].replace('-', '').trim();
          if (this.isValidCode(cleanCode)) {
            return { code: cleanCode, url: extractedUrl, confidence: 0.95, serviceDetected: serviceHint };
          }
        }
      }
    }

    // 2. Check all service patterns in case the email matches another service
    for (const [service, patterns] of Object.entries(this.servicePatterns)) {
      for (const regex of patterns) {
        const match = combinedContent.match(regex);
        if (match && match[1]) {
          const cleanCode = match[1].replace('-', '').trim();
          if (this.isValidCode(cleanCode)) {
            return { code: cleanCode, url: extractedUrl, confidence: 0.9, serviceDetected: service };
          }
        }
      }
    }

    // 3. Try contextual patterns (e.g. "Your verification code is 492049")
    for (const regex of this.genericContextPatterns) {
      const match = combinedContent.match(regex);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (this.isValidCode(candidate)) {
          return { code: candidate, url: extractedUrl, confidence: 0.85 };
        }
      }
    }

    // 4. Standalone 4-8 digit numbers ONLY if in subject line (very high intent)
    const subjectDigits = subject.match(/\b\d{4,8}\b/);
    if (subjectDigits && this.isValidCode(subjectDigits[0])) {
      return { code: subjectDigits[0].trim(), url: extractedUrl, confidence: 0.75 };
    }

    // Notice: We deliberately DO NOT scan arbitrary digits from the body if no context matched!
    // This prevents extracting dates (20260909), phone numbers, or random numbers from spam!
    return { code: null, url: extractedUrl, confidence: extractedUrl ? 0.8 : 0 };
  }
}
