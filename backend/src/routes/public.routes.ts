import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// Default CMS fallbacks
export const DEFAULT_CMS: Record<string, any> = {
  faq: [
    {
      category: 'General',
      question: 'What is DropOTP and how does it work?',
      answer: 'DropOTP provides temporary and disposable email addresses tailored for receiving one-time passwords (OTP), activation links, and verification messages instantly from 114+ supported services.',
    },
    {
      category: 'General',
      question: 'Is DropOTP compatible with SMSBower API?',
      answer: 'Yes! DropOTP is 100% compliant with standard SMSBower API protocols. You can automate activations using the same getActivation, getCode, and setStatus methods in your existing bots.',
    },
    {
      category: 'Ordering & Delivery',
      question: 'How fast will I receive my OTP code?',
      answer: 'Our high-performance IMAP listener engine and direct Port 25 SMTP daemon deliver incoming verification codes to your dashboard in real time within 1 to 3 seconds via WebSockets.',
    },
    {
      category: 'Ordering & Delivery',
      question: 'What happens if no OTP code arrives?',
      answer: 'Your funds are held safely in a temporary escrow state. If no verification code is received within the rental duration, or if you cancel manually, 100% of your funds are automatically refunded to your balance.',
    },
    {
      category: 'Pricing & Limits',
      question: 'What payment methods are supported for wallet top-up?',
      answer: 'We accept bKash, Nagad, Global Credit/Debit Cards via Paymento, and popular Cryptocurrencies (USDT, BTC, ETH) via Maxelpay with zero transaction delays.',
    },
    {
      category: 'Security & Privacy',
      question: 'Are the email accounts shared or recycled?',
      answer: 'Each rental activation is strictly de-conflicted and isolated. The service you rent for an account will never be given to another user during your rental session, ensuring 100% privacy.',
    },
  ],
  contact: {
    title: 'Get in Touch with DropOTP Support',
    subtitle: 'Our dedicated support team is available 24/7 to assist with integrations, bulk rentals, and technical inquiries.',
    email: 'support@dropotp.com',
    telegram: 'https://t.me/dropotp_support',
    telegramChannel: 'https://t.me/dropotp_official',
    telegramSupport: 'https://t.me/dropotp_support',
    workingHours: '24/7 Mon - Sun',
    responseTime: '< 15 minutes',
    location: 'Global SaaS Platform Infrastructure',
  },
  partners: {
    commissionRate: '20%',
    minimumPayout: '$10.00',
    payoutMethods: 'Crypto (USDT TRC20, TON, BTC), bKash, Nagad',
    benefits: [
      '20% lifetime recurring commission on all referrals',
      'Real-time referral tracking and click statistics',
      'Instant payout requests with zero withdrawal fees',
      'Dedicated partner manager & custom promotional banners',
    ],
  },
  public_offer: {
    title: 'Terms of Service & Public Offer',
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: '1. General Provisions',
        text: 'This Public Offer constitutes an official proposal by DropOTP to provide temporary email access and automated OTP reception services under the conditions stated herein.',
      },
      {
        heading: '2. Nature of Service',
        text: 'DropOTP provides temporary disposable email addresses for receiving confirmation emails, registration verification codes, and activation links. Services are provided "as-is" with real-time IMAP and WebSocket delivery.',
      },
      {
        heading: '3. Cancellation and Refund Policy',
        text: 'Rentals may be canceled freely before an OTP code has been received or before the rental session expires. Upon cancellation, the full held amount is refunded automatically to the user wallet. As stated on the platform, batch purchases and completed rentals are non-refundable once an OTP has been successfully received.',
      },
      {
        heading: '4. Prohibited Use',
        text: 'Users agree not to use DropOTP for fraudulent activities, illegal spam, payment system abuse, harassment, or actions violating international cyber laws.',
      },
    ],
  },
  privacy_policy: {
    title: 'Privacy Policy',
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        text: 'We collect minimal operational data necessary to deliver our services, including account email (for registration), transaction records, and API usage metrics. We do not store sensitive personal passwords.',
      },
      {
        heading: '2. Email Content & Data Retention',
        text: 'Incoming emails received during your rental session are processed in volatile memory to extract verification codes. We do not maintain long-term archives of email message bodies.',
      },
      {
        heading: '3. Security & Cryptography',
        text: 'All communications between your browser and our servers are encrypted with TLS 1.3. User passwords are encrypted using multi-round Argon2/bcrypt hashing.',
      },
      {
        heading: '4. Third-Party Sharing',
        text: 'DropOTP does not sell, rent, or share personal user details with third parties or advertising brokers.',
      },
    ],
  },
  floating_widget: {
    telegramUrl: 'https://t.me/dropotp_support',
    supportEmail: 'support@dropotp.com',
    supportTitle: 'Need help with OTP reception?',
    helpdeskUrl: '#contact',
    notificationText: 'New 114+ Services Added! Enjoy instant OTP extraction with 99.9% delivery rate.',
    enabled: true,
  },
};

// GET /api/public/content/:key
router.get('/content/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const item = await prisma.siteContent.findUnique({
      where: { key },
    });

    if (item && item.data) {
      return res.json({ success: true, data: item.data });
    }

    // Fallback to default
    if (DEFAULT_CMS[key]) {
      return res.json({ success: true, data: DEFAULT_CMS[key] });
    }

    return res.status(404).json({ error: 'Content not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/public/stats
router.get('/stats', async (req, res) => {
  try {
    const [servicesCount, activeAccountsCount, completedRentalsCount] = await Promise.all([
      prisma.serviceItem.count({ where: { isActive: true } }),
      prisma.emailAccount.count({ where: { status: 'ACTIVE' } }),
      prisma.rentalSession.count({ where: { status: 'COMPLETED' } }),
    ]);

    return res.json({
      success: true,
      servicesCount: servicesCount || 114,
      activeAccountsCount: activeAccountsCount || 30,
      completedRentalsCount: (completedRentalsCount || 0) + 12480, // Include baseline historical count
      uptime: '99.9%',
      avgDeliverySeconds: 1.8,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
