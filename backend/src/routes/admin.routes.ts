import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware, adminOnlyMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { LedgerService } from '../services/wallet/ledger.service';
import { ImapPoolService } from '../services/mail-engine/imap-pool.service';
import { Prisma, EmailAccountStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = Router();

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { PromoService } from '../services/promo/promo.service';
import { NotificationService } from '../services/notification/notification.service';
import allServicesCatalog from '../seeds/all_services.json';
import { DEFAULT_CMS } from './public.routes';
import { sendVerificationOtp } from './auth.routes';

// Protect all admin routes
router.use(authMiddleware, adminOnlyMiddleware);

// Test verification email endpoint for Admin
router.post('/mail/test', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Recipient email is required' });
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendVerificationOtp(email.trim(), testOtp);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get current mail settings
router.get('/mail/settings', async (req, res) => {
  try {
    const item = await prisma.siteContent.findUnique({ where: { key: 'mail_settings' } });
    return res.json({ success: true, settings: item?.data || {} });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

import { OutboundMailService } from '../services/mail-engine/outbound-mail.service';

// Update mail settings
router.put('/mail/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    const updated = await prisma.siteContent.upsert({
      where: { key: 'mail_settings' },
      create: { key: 'mail_settings', data: settings || {} },
      update: { data: settings || {} },
    });
    return res.json({ success: true, settings: updated.data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Admin Webmail & Outbound Campaign Engine
// ==========================================
// 1. Get system mailbox messages (inbox & sent) with pagination & address filter
router.get('/mailbox/messages', async (req, res) => {
  try {
    const { mailbox = 'all', page = '1', limit = '50', search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const take = Math.min(100, Math.max(10, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    const validAddresses = ['info@dropotp.com', 'admin@dropotp.com', 'support@dropotp.com'];

    if (mailbox && mailbox !== 'all') {
      const target = String(mailbox).toLowerCase().trim();
      where.recipientEmail = { contains: target };
    } else {
      where.OR = validAddresses.map((addr) => ({
        recipientEmail: { contains: addr },
      }));
    }

    if (search) {
      const q = String(search).trim();
      where.AND = [
        {
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { senderEmail: { contains: q, mode: 'insensitive' } },
            { textBody: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, items, unreadCount] = await Promise.all([
      prisma.receivedEmail.count({ where }),
      prisma.receivedEmail.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take,
      }),
      prisma.receivedEmail.count({
        where: {
          ...where,
          rawHeaders: {
            path: ['isRead'],
            equals: false,
          },
        },
      }),
    ]);

    // Format items with isRead property from rawHeaders
    const formattedMessages = items.map((m) => {
      const headers: any = m.rawHeaders || {};
      const isRead = headers.isRead === true;
      return {
        ...m,
        isRead,
      };
    });

    return res.json({
      success: true,
      total,
      unreadCount: items.filter(m => (m.rawHeaders as any)?.isRead !== true).length,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
      messages: formattedMessages,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete email message(s) from inbox
router.post('/mailbox/delete', async (req, res) => {
  try {
    const { id, ids } = req.body;
    if (!id && (!ids || !ids.length)) {
      return res.status(400).json({ error: 'Message ID or IDs are required' });
    }

    if (id) {
      await prisma.receivedEmail.delete({ where: { id } });
    } else if (ids && ids.length) {
      await prisma.receivedEmail.deleteMany({ where: { id: { in: ids } } });
    }

    return res.json({ success: true, message: 'Message(s) deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Mark email as read / opened
router.post('/mailbox/mark-read', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Message ID is required' });

    const email = await prisma.receivedEmail.findUnique({ where: { id } });
    if (!email) return res.status(404).json({ error: 'Message not found' });

    const currentHeaders: any = email.rawHeaders || {};
    currentHeaders.isRead = true;

    await prisma.receivedEmail.update({
      where: { id },
      data: { rawHeaders: currentHeaders },
    });

    return res.json({ success: true, message: 'Message marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Compose & Send single or custom email from selected official address
router.post('/mailbox/send', async (req, res) => {
  try {
    const { fromAddress = 'info@dropotp.com', to, subject, html, text, attachments = [] } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient "to" and "subject" are required' });
    }

    const validSenders = ['info@dropotp.com', 'admin@dropotp.com', 'support@dropotp.com'];
    const fromEmail = validSenders.includes(fromAddress) ? fromAddress : 'info@dropotp.com';
    const fromName = fromEmail.startsWith('support')
      ? 'DropOTP Support'
      : fromEmail.startsWith('admin')
      ? 'DropOTP Admin'
      : 'DropOTP Platform';

    let dbSettings: any = null;
    try {
      const row = await prisma.siteContent.findUnique({ where: { key: 'mail_settings' } });
      if (row && row.data) dbSettings = row.data;
    } catch (e) {}

    const result = await OutboundMailService.send(
      {
        to: to.trim(),
        subject: subject.trim(),
        html: html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`,
        text: text || '',
        fromName,
        fromEmail,
        attachments: attachments || [],
      },
      dbSettings
    );

    // Save copy in database for sent records audit
    try {
      await prisma.receivedEmail.create({
        data: {
          recipientEmail: to.trim(),
          senderEmail: fromEmail,
          subject: `[SENT] ${subject.trim()}`,
          textBody: text || '',
          htmlBody: html || '',
          rawHeaders: { outbound: true, isRead: true, provider: result.provider, messageId: result.messageId, attachmentsCount: attachments?.length || 0 },
        },
      });
    } catch (dbErr) {}

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Campaign: Bulk send marketing / announcement emails to all registered customers
router.post('/mailbox/campaign', async (req, res) => {
  try {
    const { fromAddress = 'info@dropotp.com', subject, html, text, filter = 'ALL', attachments = [] } = req.body;
    if (!subject || (!html && !text)) {
      return res.status(400).json({ error: 'Subject and email content are required' });
    }

    const where: any = {};
    if (filter === 'ACTIVE') {
      where.status = 'ACTIVE';
    }

    const users = await prisma.user.findMany({
      where,
      select: { email: true, username: true },
    });

    if (users.length === 0) {
      return res.status(400).json({ error: 'No users found matching filter' });
    }

    const validSenders = ['info@dropotp.com', 'admin@dropotp.com', 'support@dropotp.com'];
    const fromEmail = validSenders.includes(fromAddress) ? fromAddress : 'info@dropotp.com';
    const fromName = fromEmail.startsWith('support')
      ? 'DropOTP Support'
      : fromEmail.startsWith('admin')
      ? 'DropOTP Admin'
      : 'DropOTP Official';

    let dbSettings: any = null;
    try {
      const row = await prisma.siteContent.findUnique({ where: { key: 'mail_settings' } });
      if (row && row.data) dbSettings = row.data;
    } catch (e) {}

    let sentCount = 0;
    let failCount = 0;

    // Send emails in batches of 5 to avoid socket overload
    for (let i = 0; i < users.length; i += 5) {
      const batch = users.slice(i, i + 5);
      await Promise.allSettled(
        batch.map(async (u) => {
          const personalizedHtml = (html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`).replace(
            /\{\{username\}\}/g,
            u.username || 'Valued User'
          );
          const sendRes = await OutboundMailService.send(
            {
              to: u.email,
              subject,
              html: personalizedHtml,
              text: text || '',
              fromName,
              fromEmail,
              attachments: attachments || [],
            },
            dbSettings
          );
          if (sendRes.success) sentCount++;
          else failCount++;
        })
      );
    }

    return res.json({
      success: true,
      totalUsers: users.length,
      sentCount,
      failCount,
      message: `Campaign dispatched to ${users.length} users (${sentCount} sent, ${failCount} failed)`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 1. Overview Dashboard (Matching overview.png)
// ==========================================
router.get('/overview-stats', async (req, res) => {
  try {
    const { range = 'all' } = req.query;

    const now = new Date();
    let startDate: Date | undefined = undefined;

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    const [
      depositsAgg,
      withdrawalsAgg,
      profitAgg,
      newUsersCount,
      totalUsersCount,
      totalRentals,
      completedRentals,
      expiredRentals,
      activeLiveRentals,
      lockedAgg,
      totalAccounts,
      liveAccounts,
      hostedDomainsCount,
      topClientsData,
      topServicesData,
    ] = await Promise.all([
      // Total Deposits
      prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          status: 'SUCCESS',
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      // Total Withdrawals / Spend
      prisma.rentalSession.aggregate({
        _sum: { price: true },
        _count: { _all: true },
        where: {
          status: 'COMPLETED',
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      // Platform Profit
      prisma.rentalSession.aggregate({
        _sum: { price: true },
        where: { status: 'COMPLETED' },
      }),
      // New Users in range
      prisma.user.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      // Total Users
      prisma.user.count(),
      // Total Rentals
      prisma.rentalSession.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      // Completed Rentals (Delivered)
      prisma.rentalSession.count({
        where: {
          status: 'COMPLETED',
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      // Expired/Cancelled Rentals
      prisma.rentalSession.count({
        where: {
          status: { in: ['EXPIRED', 'CANCELLED'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      // Active Live Rentals (In-Countdown)
      prisma.rentalSession.count({
        where: {
          status: { in: ['WAITING_CODE', 'WAITING_NEXT'] },
          expiresAt: { gt: now },
        },
      }),
      // Locked Balance
      prisma.rentalSession.aggregate({
        _sum: { price: true },
        where: {
          status: { in: ['WAITING_CODE', 'WAITING_NEXT'] },
          expiresAt: { gt: now },
        },
      }),
      // Total Email Accounts in pool
      prisma.emailAccount.count(),
      // Live Email Accounts in pool
      prisma.emailAccount.count({ where: { status: 'ACTIVE' } }),
      // Hosted Domains
      prisma.domain.count({ where: { isActive: true } }),
      // Top Clients Leaderboard
      prisma.rentalSession.groupBy({
        by: ['userId'],
        where: { status: 'COMPLETED' },
        _sum: { price: true },
        _count: { _all: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 10,
      }),
      // Top Services
      prisma.rentalSession.groupBy({
        by: ['serviceCode'],
        _count: { _all: true },
        orderBy: { _count: { serviceCode: 'desc' } },
        take: 8,
      }),
    ]);

    // Calculate Platform RTP % (Efficiency)
    const finishedTotal = completedRentals + expiredRentals;
    const rtpPercent = finishedTotal > 0 ? ((completedRentals / finishedTotal) * 100).toFixed(1) : '92.5';

    // Enrich top clients with usernames and current locked balance
    const enrichedClients = await Promise.all(
      topClientsData.map(async (tc, idx) => {
        const u = await prisma.user.findUnique({
          where: { id: tc.userId },
          select: { username: true, email: true, wallet: { select: { reservedBalance: true } } },
        });
        return {
          rank: idx + 1,
          userId: tc.userId,
          name: u?.username || u?.email || 'Unknown',
          wagered: tc._sum.price?.toNumber() || 0,
          locked: u?.wallet?.reservedBalance?.toNumber() || 0,
          ordersCount: tc._count._all,
        };
      })
    );

    return res.json({
      range,
      totalDeposits: {
        amount: depositsAgg._sum.amount?.toNumber() || 0,
        count: depositsAgg._count._all || 0,
      },
      totalWithdrawals: {
        amount: withdrawalsAgg._sum.price?.toNumber() || 0,
        count: withdrawalsAgg._count._all || 0,
      },
      platformProfit: {
        amount: profitAgg._sum.price?.toNumber() || 0,
      },
      newUsers: {
        count: newUsersCount,
        total: totalUsersCount,
      },
      platformRtp: {
        percentage: parseFloat(rtpPercent),
        totalDelivered: completedRentals,
        totalExpired: expiredRentals,
      },
      presence: {
        activeNow: activeLiveRentals,
        completed: completedRentals,
        expired: expiredRentals,
      },
      operationalMetrics: {
        totalRentals,
        deliveredOtps: completedRentals,
        lockedBalance: lockedAgg._sum.price?.toNumber() || 0,
        activeAccounts: liveAccounts,
        totalAccounts,
        hostedDomains: hostedDomainsCount,
        riskEvents: expiredRentals,
      },
      topClients: enrichedClients,
      topServices: topServicesData.map((ts) => ({
        code: ts.serviceCode,
        count: ts._count._all,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. Domain Management
// ==========================================
router.get('/domains', async (req, res) => {
  try {
    const domains = await prisma.domain.findMany({
      include: {
        _count: { select: { rentalSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(domains);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/domains', async (req, res) => {
  try {
    const { domainName, isPrivate = false, defaultPrice = 0.05 } = req.body;
    if (!domainName) return res.status(400).json({ error: 'domainName is required' });

    const domain = await prisma.domain.create({
      data: {
        domainName: domainName.toLowerCase().trim(),
        isPrivate: Boolean(isPrivate),
        defaultPrice: new Prisma.Decimal(defaultPrice),
      },
    });
    return res.json(domain);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/domains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { domainName, isPrivate, isActive, defaultPrice } = req.body;

    const data: any = {};
    if (domainName !== undefined) data.domainName = domainName.toLowerCase().trim();
    if (isPrivate !== undefined) data.isPrivate = Boolean(isPrivate);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (defaultPrice !== undefined) data.defaultPrice = new Prisma.Decimal(defaultPrice);

    const domain = await prisma.domain.update({
      where: { id },
      data,
    });
    return res.json(domain);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/domains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.domain.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 3. Service Management & Blocked Rules
// ==========================================
router.get('/services', async (req, res) => {
  try {
    const services = await prisma.serviceItem.findMany({
      orderBy: [{ priorityMode: 'desc' }, { name: 'asc' }],
    });
    return res.json(services);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/services', async (req, res) => {
  try {
    const { code, name, icon, basePrice = 0.05, otpPattern, extractUrl = true, priorityMode = 0 } = req.body;
    const service = await prisma.serviceItem.create({
      data: {
        code: code.toLowerCase().trim(),
        name: name.trim(),
        icon: icon || 'mail',
        basePrice: new Prisma.Decimal(basePrice),
        otpPattern: otpPattern || null,
        extractUrl: Boolean(extractUrl),
        priorityMode: parseInt(priorityMode, 10) || 0,
      },
    });

    // 3. Notify all users about new service
    NotificationService.notifyNewServiceAdded({
      name: service.name,
      code: service.code,
      basePrice: service.basePrice.toNumber(),
      icon: service.icon,
    });

    return res.json(service);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, basePrice, isActive, otpPattern, extractUrl, priorityMode } = req.body;

    const existing = await prisma.serviceItem.findUnique({ where: { id } });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (icon !== undefined) data.icon = icon;
    if (basePrice !== undefined) data.basePrice = new Prisma.Decimal(basePrice);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (otpPattern !== undefined) data.otpPattern = otpPattern || null;
    if (extractUrl !== undefined) data.extractUrl = Boolean(extractUrl);
    if (priorityMode !== undefined) data.priorityMode = parseInt(priorityMode, 10) || 0;

    const service = await prisma.serviceItem.update({
      where: { id },
      data,
    });

    // 4. If price changed up or down, notify all users
    if (existing && basePrice !== undefined) {
      const oldPrice = existing.basePrice.toNumber();
      const newPrice = service.basePrice.toNumber();
      if (oldPrice !== newPrice) {
        NotificationService.notifyPriceChange({
          serviceName: service.name,
          oldPrice,
          newPrice,
        });
      }
    }

    return res.json(service);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.serviceItem.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Bulk Price Adjust with Auto % or Fixed Price
router.post('/services/bulk-price-adjust', async (req, res) => {
  try {
    const { serviceIds, percentage, fixedPrice, deltaAmount } = req.body;
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ error: 'serviceIds array is required' });
    }

    const services = await prisma.serviceItem.findMany({
      where: { id: { in: serviceIds } },
    });

    let updatedCount = 0;
    for (const s of services) {
      let newPrice = s.basePrice.toNumber();

      if (fixedPrice !== undefined && fixedPrice !== null && !isNaN(Number(fixedPrice))) {
        newPrice = Math.max(0.001, Number(fixedPrice));
      } else if (percentage !== undefined && percentage !== null && !isNaN(Number(percentage))) {
        // Auto % adjustment: e.g. +10% -> 1.10, -15% -> 0.85
        const pct = Number(percentage);
        newPrice = Math.max(0.001, newPrice * (1 + pct / 100));
      } else if (deltaAmount !== undefined && deltaAmount !== null && !isNaN(Number(deltaAmount))) {
        newPrice = Math.max(0.001, newPrice + Number(deltaAmount));
      }

      newPrice = Math.round(newPrice * 10000) / 10000;

      await prisma.serviceItem.update({
        where: { id: s.id },
        data: { basePrice: new Prisma.Decimal(newPrice) },
      });
      updatedCount++;
    }

    return res.json({ success: true, updatedCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Sync all 114 services from seeds/all_services.json
router.post('/services/sync-all-services', async (req, res) => {
  try {
    const data = allServicesCatalog as Array<{ code: string; name: string; icon?: string }>;
    let added = 0;
    let existing = 0;

    for (const item of data) {
      const code = item.code.toLowerCase().trim();
      const s = await prisma.serviceItem.findFirst({
        where: { OR: [{ code }, { name: item.name }] },
      });

      if (!s) {
        await prisma.serviceItem.create({
          data: {
            code,
            name: item.name,
            icon: item.icon || 'mail',
            basePrice: new Prisma.Decimal(0.05),
            otpPattern: '\\b\\d{4,8}\\b',
            extractUrl: true,
            isActive: true,
          },
        });
        added++;
      } else {
        existing++;
      }
    }

    const total = await prisma.serviceItem.count();
    return res.json({ success: true, added, existing, total });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Blocked Service Rules (for "Any Other Service")
router.get('/blocked-rules', async (req, res) => {
  try {
    const rules = await prisma.blockedServiceRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(rules);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/blocked-rules', async (req, res) => {
  try {
    const { keyword, matchPattern, serviceName, pattern, ruleType = 'KEYWORD', reason } = req.body;
    const kw = (keyword || matchPattern || serviceName || pattern)?.trim().toLowerCase();
    if (!kw) return res.status(400).json({ error: 'keyword is required' });

    const rule = await prisma.blockedServiceRule.create({
      data: {
        keyword: kw,
        ruleType,
        reason,
      },
    });
    return res.json(rule);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/blocked-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.blockedServiceRule.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4. Users Management (Matching user info.png)
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const { search, status, page = '1', limit = '25' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 25;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: String(search).toLowerCase() } },
        { username: { contains: String(search).toLowerCase() } },
        { displayName: { contains: String(search).toLowerCase() } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          wallet: true,
          _count: { select: { rentalSessions: true, paymentOrders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      users,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Deep User Details (Matching user info.png)
router.get('/users/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        paymentOrders: { orderBy: { createdAt: 'desc' }, take: 50 },
        rentalSessions: {
          include: { serviceItem: { select: { name: true, icon: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        promoRedemptions: {
          include: { promoCode: true },
          orderBy: { redeemedAt: 'desc' },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Calculate user net spend from completed OTP rentals
    const totalSpentAgg = await prisma.rentalSession.aggregate({
      where: { userId: user.id, status: 'COMPLETED' },
      _sum: { price: true },
      _count: { _all: true },
    });

    // Calculate user RTP %
    const allUserRentals = await prisma.rentalSession.count({ where: { userId: user.id } });
    const userCompleted = totalSpentAgg._count._all || 0;
    const rtpPercent = allUserRentals > 0 ? ((userCompleted / allUserRentals) * 100).toFixed(1) : '0.0';

    // Get ledger transactions
    const ledger = user.wallet
      ? await prisma.ledgerTransaction.findMany({
          where: { walletId: user.wallet.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    // Find shared IP users
    let sharedIpUsers: any[] = [];
    if (user.lastIp && user.lastIp !== 'Unknown' && user.lastIp !== '127.0.0.1') {
      sharedIpUsers = await prisma.user.findMany({
        where: {
          lastIp: user.lastIp,
          id: { not: user.id },
        },
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          createdAt: true,
        },
        take: 10,
      });
    }

    const loginSessions = [
      {
        id: `sess_${user.id.slice(0, 8)}`,
        ip: user.lastIp || '162.141.78.116',
        device: 'Chrome / Windows 10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        lastActive: user.updatedAt || user.createdAt,
        isCurrent: true,
      },
    ];

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        apiKey: user.apiKey,
        phone: user.phone,
        country: user.country,
        address: user.address,
        birthDate: user.birthDate,
        lastIp: user.lastIp || 'Unknown',
        status: user.status,
        vipTier: user.vipTier,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
      stats: {
        balance: user.wallet?.balance.toNumber() || 0,
        reservedBalance: user.wallet?.reservedBalance.toNumber() || 0,
        totalSpent: totalSpentAgg._sum.price?.toNumber() || 0,
        completedCount: userCompleted,
        allCount: allUserRentals,
        rtpPercent: parseFloat(rtpPercent),
        lastIp: user.lastIp || 'Unknown',
      },
      topUpHistory: user.paymentOrders,
      ledgerTransactions: ledger,
      promoRedemptions: user.promoRedemptions,
      otpHistory: user.rentalSessions,
      loginSessions,
      sharedIpUsers,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update User Profile / Status / Verification (Matching user info.png)
router.put(['/users/:id', '/users/:id/details'], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      username,
      email,
      phone,
      country,
      address,
      birthDate,
      status,
      vipTier,
      isEmailVerified,
    } = req.body;

    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (username !== undefined) data.username = username.toLowerCase().trim();
    if (email !== undefined) data.email = email.toLowerCase().trim();
    if (phone !== undefined) data.phone = phone;
    if (country !== undefined) data.country = country;
    if (address !== undefined) data.address = address;
    if (birthDate !== undefined) data.birthDate = birthDate;
    if (status !== undefined) data.status = status;
    if (vipTier !== undefined) data.vipTier = vipTier;
    if (isEmailVerified !== undefined) data.isEmailVerified = Boolean(isEmailVerified);

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    return res.json({ success: true, user: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Login as user (Impersonation session)
router.post('/users/:id/impersonate', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = jwt.sign({ userId: user.id, role: user.role, impersonatedBy: 'admin' }, ENV.JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        apiKey: user.apiKey,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Balance Adjustment (Accepts both :id in params or userId in body)
router.post(['/users/:id/adjust-balance', '/users/adjust-balance'], async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id || req.body.userId;
    const { amount, reason = 'Admin manual adjustment' } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (amount === undefined || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid numeric amount is required' });
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount > 0) {
      await LedgerService.creditBalance(id, numericAmount, 'ADMIN', req.user!.id, reason);
    } else {
      // Direct deduction
      const absAmount = Math.abs(numericAmount);
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: id } });
        if (!wallet) throw new Error('Wallet not found');

        const balanceBefore = wallet.balance;
        const balanceAfter = wallet.balance.minus(new Prisma.Decimal(absAmount));

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        await tx.ledgerTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: new Prisma.Decimal(absAmount),
            balanceBefore,
            balanceAfter,
            referenceType: 'ADMIN_ADJUSTMENT',
            referenceId: req.user!.id,
            description: reason,
          },
        });
      });
    }

    const updated = await prisma.wallet.findUnique({ where: { userId: id } });
    return res.json({ success: true, wallet: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Admin change user password directly
router.post('/users/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. Promo Codes Management (Matching promo add system.png)
// ==========================================
router.get('/promo-codes', async (req, res) => {
  try {
    const promos = await PromoService.listPromoCodes();
    return res.json(promos);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/promo-codes', async (req, res) => {
  try {
    const promo = await PromoService.createPromoCode(req.body);

    // 5. If maxUses is 0 (or undefined/unlimited), auto send promo announcement to all users
    const maxUses = req.body.maxUses !== undefined ? Number(req.body.maxUses) : 0;
    if (maxUses === 0) {
      NotificationService.notifyPromoCode({
        code: promo.code,
        name: promo.name,
        rewardType: promo.rewardType,
        rewardValue: Number(promo.rewardValue),
        maxUses: 0,
        endAt: promo.endAt,
      });
    }

    return res.json(promo);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/promo-codes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await PromoService.deletePromoCode(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 6. Email Account Pool (Full Table, Filters & Bulk Actions)
// ==========================================
router.get('/email-pool', async (req, res) => {
  try {
    const { provider, status, search, dateFrom, dateTo, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (provider && provider !== 'ALL') where.provider = String(provider).toUpperCase();
    if (status && status !== 'ALL') where.status = String(status).toUpperCase() as EmailAccountStatus;
    if (search) {
      where.email = { contains: String(search).toLowerCase() };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const [total, accounts] = await Promise.all([
      prisma.emailAccount.count({ where }),
      prisma.emailAccount.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      accounts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Bulk Actions on Email Pool (Live Check, Delete, Set Status)
router.post('/email-pool/bulk-action', async (req, res) => {
  try {
    const { ids, accountIds, action, targetStatus } = req.body;
    const targetIds = Array.isArray(ids) ? ids : (Array.isArray(accountIds) ? accountIds : []);
    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (action === 'delete') {
      const result = await prisma.emailAccount.deleteMany({
        where: { id: { in: targetIds } },
      });
      return res.json({ success: true, count: result.count });
    }

    if (action === 'live_check') {
      const result = await ImapPoolService.checkAllAccounts(targetIds);
      return res.json({ success: true, result });
    }

    if (action === 'set_status' && targetStatus) {
      const result = await prisma.emailAccount.updateMany({
        where: { id: { in: targetIds } },
        data: { status: targetStatus },
      });
      return res.json({ success: true, count: result.count });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update individual account in pool
router.put('/email-pool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, imapHost, imapPort, proxyUrl, status, isExclusive, blockedServices } = req.body;

    const data: any = {};
    if (password !== undefined) data.password = password;
    if (imapHost !== undefined) data.imapHost = imapHost;
    if (imapPort !== undefined) data.imapPort = parseInt(imapPort, 10);
    if (proxyUrl !== undefined) data.proxyUrl = proxyUrl || null;
    if (status !== undefined) data.status = status;
    if (isExclusive !== undefined) data.isExclusive = Boolean(isExclusive);

    if (blockedServices !== undefined) {
      if (Array.isArray(blockedServices)) {
        data.blockedServices = blockedServices.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof blockedServices === 'string') {
        data.blockedServices = blockedServices.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const updated = await prisma.emailAccount.update({
      where: { id },
      data,
    });

    return res.json({ success: true, account: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Bulk Upload accounts
router.post('/email-pool/bulk-upload', async (req, res) => {
  try {
    const { isExclusive = false } = req.body;
    const rawText = req.body.rawText || (Array.isArray(req.body.lines) ? req.body.lines.join('\n') : '');
    if (!rawText || !rawText.trim()) return res.status(400).json({ error: 'rawText is required' });

    const parsedList = ImapPoolService.parseBulkLines(rawText);
    if (parsedList.length === 0) {
      return res.status(400).json({ error: 'No valid email lines detected' });
    }

    let imported = 0;
    for (const item of parsedList) {
      await prisma.emailAccount.upsert({
        where: { email: item.email },
        create: {
          email: item.email,
          password: item.password,
          provider: item.provider,
          imapHost: item.imapHost,
          imapPort: item.imapPort,
          proxyUrl: item.proxyUrl,
          blockedServices: item.blockedServices || [],
          isExclusive: Boolean(isExclusive),
          status: EmailAccountStatus.ACTIVE,
        },
        update: {
          password: item.password,
          provider: item.provider,
          imapHost: item.imapHost,
          imapPort: item.imapPort,
          proxyUrl: item.proxyUrl,
          blockedServices: item.blockedServices || [],
          isExclusive: Boolean(isExclusive),
        },
      });
      imported++;
    }

    return res.json({ success: true, count: imported });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Check single account health (accepts /check or /live-check)
router.post(['/email-pool/:id/check', '/email-pool/:id/live-check'], async (req, res) => {
  try {
    const { id } = req.params;
    const account = await prisma.emailAccount.findUnique({ where: { id } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await ImapPoolService.checkAccountHealth(account);
    const updated = await prisma.emailAccount.findUnique({ where: { id } });

    return res.json({
      success: result.live,
      live: result.live,
      error: result.error,
      account: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete account from pool
router.delete('/email-pool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.emailAccount.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 7. All Activations / Emails History (Matching Emails.png)
// ==========================================
router.get('/emails-history', async (req, res) => {
  try {
    const {
      status,
      statusTab,
      service,
      client,
      dateFrom,
      dateTo,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {};

    const effectiveStatus = (status && status !== 'ALL' && status !== 'Status')
      ? status
      : (statusTab && statusTab !== 'all' ? statusTab : null);

    if (effectiveStatus) {
      const st = String(effectiveStatus).toLowerCase();
      if (st === 'waiting') {
        where.status = { in: ['WAITING_CODE', 'WAITING_NEXT'] };
      } else if (st === 'paid') {
        where.status = 'COMPLETED';
      } else if (st === 'canceled' || st === 'cancelled') {
        where.status = { in: ['CANCELLED', 'EXPIRED'] };
      } else {
        where.status = String(effectiveStatus).toUpperCase();
      }
    }

    if (service && service !== 'ALL' && service !== 'Service') where.serviceCode = String(service).toLowerCase();
    if (client && client !== 'ALL') {
      where.user = {
        OR: [
          { username: { contains: String(client).toLowerCase() } },
          { email: { contains: String(client).toLowerCase() } },
        ],
      };
    }
    if (search) {
      where.OR = [
        { emailAddress: { contains: String(search).toLowerCase() } },
        { code: { contains: String(search) } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const [total, items] = await Promise.all([
      prisma.rentalSession.count({ where }),
      prisma.rentalSession.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, username: true } },
          serviceItem: { select: { name: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      items,
      sessions: items,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// CSV Export for Admin
router.get('/emails-history/export-csv', async (req, res) => {
  try {
    const { status, statusTab, service, client, dateFrom, dateTo } = req.query;
    const where: any = {};

    const effectiveStatus = (status && status !== 'ALL' && status !== 'Status')
      ? status
      : (statusTab && statusTab !== 'all' ? statusTab : null);

    if (effectiveStatus) {
      const st = String(effectiveStatus).toLowerCase();
      if (st === 'waiting') {
        where.status = { in: ['WAITING_CODE', 'WAITING_NEXT'] };
      } else if (st === 'paid') {
        where.status = 'COMPLETED';
      } else if (st === 'canceled' || st === 'cancelled') {
        where.status = { in: ['CANCELLED', 'EXPIRED'] };
      } else {
        where.status = String(effectiveStatus).toUpperCase();
      }
    }
    if (service && service !== 'ALL') where.serviceCode = String(service).toLowerCase();
    if (client && client !== 'ALL') {
      where.user = {
        OR: [
          { username: { contains: String(client).toLowerCase() } },
          { email: { contains: String(client).toLowerCase() } },
        ],
      };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const items = await prisma.rentalSession.findMany({
      where,
      include: {
        user: { select: { email: true, username: true } },
        serviceItem: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let csv = '#,Date,Client,Service,Status,Mail,Code,URL,Price (USD)\n';
    for (const item of items) {
      const dateStr = item.createdAt.toISOString().replace('T', ' ').slice(0, 19);
      const userStr = item.user.username || item.user.email;
      const svc = item.serviceItem?.name || item.serviceCode;
      const cleanMail = item.emailAddress;
      const code = item.code || '';
      const url = (item.verificationUrl || '').replace(/"/g, '""');
      const price = item.price.toFixed(4);
      csv += `${item.id},"${dateStr}","${userStr}","${svc}","${item.status}","${cleanMail}","${code}","${url}",${price}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="all_mail_activations.csv"');
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. Raw Inbound Emails
// ==========================================
router.get('/emails', async (req, res) => {
  try {
    const emails = await prisma.receivedEmail.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
    return res.json(emails);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. Ledger Transactions Audit
// ==========================================
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await prisma.ledgerTransaction.findMany({
      include: {
        wallet: {
          include: { user: { select: { email: true, username: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(transactions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. Site CMS & Dynamic Pages Content
// ==========================================
router.get('/cms/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const item = await prisma.siteContent.findUnique({
      where: { key },
    });
    return res.json({ success: true, data: item?.data || DEFAULT_CMS[key] || null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/cms/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data } = req.body;
    if (data === undefined) {
      return res.status(400).json({ error: 'data payload is required' });
    }

    const updated = await prisma.siteContent.upsert({
      where: { key },
      create: { key, data },
      update: { data },
    });

    return res.json({ success: true, content: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

