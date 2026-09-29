import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { LedgerService } from '../services/wallet/ledger.service';

const router = Router();

// Helper to send registration verification OTP from info@dropotp.com
async function sendVerificationOtp(email: string, otp: string) {
  console.log(`[Email Sender] Sending Verification OTP [${otp}] to ${email} from info@dropotp.com`);
  // Try sending via local SMTP port 25 if available
  try {
    const net = await import('net');
    const client = net.createConnection({ port: 25, host: '127.0.0.1' }, () => {
      client.write(`HELO dropotp.com\r\n`);
      client.write(`MAIL FROM:<info@dropotp.com>\r\n`);
      client.write(`RCPT TO:<${email}>\r\n`);
      client.write(`DATA\r\n`);
      client.write(`From: "DropOTP Security" <info@dropotp.com>\r\n`);
      client.write(`To: <${email}>\r\n`);
      client.write(`Subject: Your DropOTP Verification Code: ${otp}\r\n\r\n`);
      client.write(`Welcome to DropOTP!\r\n\r\nYour verification code is: ${otp}\r\n\r\nThis code will expire in 15 minutes.\r\n.\r\n`);
      client.write(`QUIT\r\n`);
      client.end();
    });
    client.on('error', () => {
      // Ignored if local loopback fails
    });
  } catch (err: any) {
    console.warn('[Email Sender] Local SMTP send notice:', err.message);
  }
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

// Regenerate API Key
router.post('/api-key/regenerate', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const newApiKey = `key_${crypto.randomUUID().replace(/-/g, '')}`;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { apiKey: newApiKey },
      select: { apiKey: true },
    });

    return res.json({ apiKey: updated.apiKey });
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
