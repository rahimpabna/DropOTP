import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { ENV } from './config/env';
import { prisma } from './db/prisma';
import { smtpService } from './services/mail-engine/smtp.service';
import { WebSocketService } from './services/socket/websocket.service';
import { LedgerService } from './services/wallet/ledger.service';

import authRoutes from './routes/auth.routes';
import rentalRoutes from './routes/rental.routes';
import apiCompatRoutes from './routes/api-compat.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import publicRoutes from './routes/public.routes';

const app = express();
const server = http.createServer(app);

// Basic Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes);              // Aliased for API documentation: /api/user/balance
app.use('/api/rentals', rentalRoutes);
app.use('/api/mail', apiCompatRoutes);     // Standard SMSBower: /api/mail/getActivation
app.use('/api', apiCompatRoutes);          // Aliased: /api/getActivation
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Seed Initial Data (Admin user, Popular Services, Default Domains)
async function seedInitialData() {
  try {
    // 1. Admin User
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(ENV.ADMIN_PASSWORD, 10);
      const admin = await prisma.user.create({
        data: {
          email: ENV.ADMIN_EMAIL,
          username: 'admin',
          passwordHash,
          role: 'ADMIN',
          apiKey: `key_admin_${crypto.randomUUID().replace(/-/g, '')}`,
        },
      });
      await LedgerService.getOrCreateWallet(admin.id);
      console.log(`[Seed] Created initial Admin: ${ENV.ADMIN_EMAIL}`);
    }

    // 2. Default Domains
    const domainCount = await prisma.domain.count();
    if (domainCount === 0) {
      const defaultDomains = [
        { domainName: 'dropotp.com', isPrivate: false, defaultPrice: 0.050 },
        { domainName: 'mailnestpro.com', isPrivate: false, defaultPrice: 0.045 },
        { domainName: 'hihinail.com', isPrivate: false, defaultPrice: 0.040 },
        { domainName: 'flytempbox.com', isPrivate: false, defaultPrice: 0.050 },
        { domainName: 'mailburstx.com', isPrivate: true, defaultPrice: 0.090 },
      ];

      for (const d of defaultDomains) {
        await prisma.domain.create({ data: d });
      }
      console.log('[Seed] Created default domain catalog.');
    }

    // 3. Default Services
    const serviceCount = await prisma.serviceItem.count();
    if (serviceCount === 0) {
      const defaultServices = [
        { code: 'tg', name: 'Telegram', icon: 'telegram', basePrice: 0.045 },
        { code: 'google', name: 'Gmail / Google', icon: 'google', basePrice: 0.050 },
        { code: 'ig', name: 'Instagram', icon: 'instagram', basePrice: 0.040 },
        { code: 'fb', name: 'Facebook', icon: 'facebook', basePrice: 0.040 },
        { code: 'tinder', name: 'Tinder', icon: 'tinder', basePrice: 0.060 },
        { code: 'ms', name: 'Microsoft / Outlook', icon: 'microsoft', basePrice: 0.035 },
        { code: 'wa', name: 'WhatsApp', icon: 'whatsapp', basePrice: 0.065 },
        { code: 'x', name: 'Twitter / X', icon: 'twitter', basePrice: 0.040 },
        { code: 'amazon', name: 'Amazon', icon: 'amazon', basePrice: 0.050 },
        { code: 'openai', name: 'ChatGPT / OpenAI', icon: 'openai', basePrice: 0.055 },
        { code: 'other', name: 'Any Other Service', icon: 'mail', basePrice: 0.030 },
      ];

      for (const s of defaultServices) {
        await prisma.serviceItem.create({ data: s });
      }
      console.log('[Seed] Created default service catalog.');
    }

    // 4. Default Blocked Service Rules (Protects 'Any Other Service' from cheap misuse)
    const ruleCount = await prisma.blockedServiceRule.count();
    if (ruleCount === 0) {
      const defaultRules = [
        {
          keyword: 'google',
          ruleType: 'KEYWORD',
          reason: 'High value Google service protected from generic other selection',
        },
        {
          keyword: 'telegram',
          ruleType: 'KEYWORD',
          reason: 'High value Telegram service protected from generic other selection',
        },
        {
          keyword: 'whatsapp',
          ruleType: 'KEYWORD',
          reason: 'High value WhatsApp service protected from generic other selection',
        },
        {
          keyword: 'openai',
          ruleType: 'KEYWORD',
          reason: 'High value OpenAI service protected from generic other selection',
        },
      ];

      for (const r of defaultRules) {
        await prisma.blockedServiceRule.create({ data: r });
      }
      console.log('[Seed] Created default anti-abuse blocked service rules.');
    }

    // 5. Default Promo Code for User Top-Up
    const promoCount = await prisma.promoCode.count();
    if (promoCount === 0) {
      await prisma.promoCode.create({
        data: {
          name: 'Welcome Bonus $5',
          code: 'WELCOME5',
          rewardType: 'CASH',
          rewardValue: 5.0,
          currency: 'USD',
          maxReward: 5.0,
          maxUses: 1000,
          perUserLimit: 1,
          isActive: true,
        },
      });
      console.log('[Seed] Created welcome promo code: WELCOME5');
    }
  } catch (err: any) {
    console.error('[Seed] Initial data seeding error:', err.message);
  }
}

// Start Server
async function startServer() {
  try {
    // 1. Initialize Real-Time WebSockets
    WebSocketService.init(server);

    // 2. Start HTTP & WebSocket Server
    server.listen(ENV.PORT, async () => {
      console.log(`[Backend API] Running on http://localhost:${ENV.PORT}`);
      await seedInitialData();
    });

    // 3. Start Inbound Catch-All SMTP Server on Port 25
    smtpService.start();

    // 4. Start Background Expiration & Auto-Refund Worker (every 30s)
    const { RentalService } = await import('./services/rental/rental.service');
    setInterval(async () => {
      try {
        await RentalService.cleanupExpiredSessions();
      } catch (e: any) {
        console.error('[Background Worker] Expiration cleanup error:', e.message);
      }
    }, 30 * 1000);
  } catch (error: any) {
    console.error('[Fatal] Server failed to start:', error.message);
    process.exit(1);
  }
}

startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing servers...');
  smtpService.stop();
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
