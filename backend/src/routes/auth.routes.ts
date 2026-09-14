import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { LedgerService } from '../services/wallet/ledger.service';

import { OutboundMailService } from '../services/mail-engine/outbound-mail.service';

const router = Router();

// Helper to send registration verification OTP from info@dropotp.com
export async function sendVerificationOtp(email: string, otp: string): Promise<{ success: boolean; provider?: string; error?: string }> {
  console.log(`[Email Sender] Sending Verification OTP [${otp}] to ${email} from info@dropotp.com`);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 6px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 28px 24px; color: #334155; line-height: 1.6; }
        .otp-card { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #047857; margin: 0; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 10px; }
        .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="text-align: center; margin-bottom: 12px;">
            <img src="https://dropotp.com/logo-transparent.png" alt="DropOTP" style="height: 48px; max-width: 180px; object-fit: contain;" />
          </div>
          <div style="font-size: 15px; font-weight: 800; opacity: 0.95; letter-spacing: 0.5px;">⚡ DropOTP Platform</div>
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p style="font-size: 14px; margin-top: 0;">Hello,</p>
          <p style="font-size: 14px; color: #475569;">Welcome to <strong>DropOTP</strong>. Please enter the following 6-digit confirmation code to verify your account:</p>
          
          <div class="otp-card">
            <div class="otp-code">${otp}</div>
            <div class="badge">⏱ Valid for 15 minutes</div>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">If you did not register for an account at DropOTP, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          © 2026 DropOTP.com • Temporary & Dedicated OTP SaaS Platform
        </div>
      </div>
    </body>
    </html>
  `;

  let dbSettings: any = null;
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: 'mail_settings' } });
    if (row && row.data) {
      dbSettings = row.data;
    }
  } catch (e) {}

  return await OutboundMailService.send({
    to: email,
    subject: `Your DropOTP Verification Code: ${otp}`,
    text: `Welcome to DropOTP!\n\nYour 6-digit confirmation code is: ${otp}\n\nThis code expires in 15 minutes.\n\nDropOTP Team`,
    html: htmlContent,
    fromName: 'DropOTP Support',
    fromEmail: 'info@dropotp.com',
  }, dbSettings);
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Email or username already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const apiKey = `key_${crypto.randomUUID().replace(/-/g, '')}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName: username,
        passwordHash,
        apiKey,
        isEmailVerified: false,
        emailVerificationOtp: otp,
        otpExpiresAt,
      },
    });

    // Create initial wallet
    await LedgerService.getOrCreateWallet(user.id);

    // Send verification email OTP
    await sendVerificationOtp(user.email, otp);

    return res.json({
      success: true,
      requireVerification: true,
      email: user.email,
      message: 'Account created! Please enter the 6-digit OTP code sent to your email to verify your account.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Verify Email OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      const token = jwt.sign({ userId: user.id, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user, message: 'Email already verified' });
    }

    if (user.emailVerificationOtp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOtp: null,
        otpExpiresAt: null,
      },
    });

    const token = jwt.sign({ userId: updatedUser.id, role: updatedUser.role }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        apiKey: updatedUser.apiKey,
        isEmailVerified: true,
      },
      message: 'Email successfully verified!',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Resend Email OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otp,
        otpExpiresAt,
      },
    });

    await sendVerificationOtp(user.email, otp);

    return res.json({ success: true, message: 'New verification code sent!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email verification for standard users
    if (!user.isEmailVerified && user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message: 'Please verify your email address before logging in.',
      });
    }

    // Check account status
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      return res.status(403).json({ error: `Account is ${user.status.toLowerCase()}` });
    }

    // Update last IP
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await prisma.user.update({
      where: { id: user.id },
      data: { lastIp: clientIp.split(',')[0].trim() },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        apiKey: user.apiKey,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Current User Profile & Balance
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
      apiKey: user.apiKey,
      webhookUrl: user.webhookUrl,
      phone: user.phone,
      country: user.country,
      address: user.address,
      birthDate: user.birthDate,
      isEmailVerified: user.isEmailVerified,
      vipTier: user.vipTier,
      status: user.status,
      wallet: {
        balance: user.wallet?.balance.toNumber() || 0,
        reservedBalance: user.wallet?.reservedBalance.toNumber() || 0,
        currency: user.wallet?.currency || 'USD',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update Profile Details (Matching Screenshot_8.png)
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { displayName, phone, country, address, birthDate } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName || undefined,
        phone: phone || undefined,
        country: country || undefined,
        address: address || undefined,
        birthDate: birthDate || undefined,
      },
    });

    return res.json({ success: true, user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Change Password (Matching Change a password.png)
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Regenerate / Rotate API Key (Supporting both routes)
const handleRegenerateKey = async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user!.id;
    const newApiKey = `key_${crypto.randomUUID().replace(/-/g, '')}`;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { apiKey: newApiKey },
      select: { apiKey: true },
    });

    return res.json({ success: true, apiKey: updated.apiKey });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

router.post('/api-key/regenerate', authMiddleware, handleRegenerateKey);
router.post('/rotate-api-key', authMiddleware, handleRegenerateKey);

// Dedicated balance endpoint for ApiDocs sandbox and user integrations
router.get('/balance', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    return res.json({
      success: true,
      balance: user?.wallet?.balance.toNumber() || 0,
      reservedBalance: user?.wallet?.reservedBalance.toNumber() || 0,
      currency: user?.wallet?.currency || 'USD',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update Webhook URL
router.post('/webhook/update', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { webhookUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { webhookUrl: webhookUrl || null },
      select: { webhookUrl: true },
    });

    return res.json({ webhookUrl: updated.webhookUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
