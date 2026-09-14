import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RentalService } from '../services/rental/rental.service';
import { RentalStatus } from '@prisma/client';

const router = Router();

// Get list of all active services
router.get('/services', async (req, res) => {
  try {
    const services = await prisma.serviceItem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return res.json(services);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get list of all available domains
router.get('/domains', async (req, res) => {
  try {
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      include: {
        servicePrices: true,
      },
      orderBy: { domainName: 'asc' },
    });
    return res.json(domains);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get list of active pool providers & hosted domains for order panel
router.get('/provider-domains', async (req, res) => {
  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { status: 'ACTIVE' },
      select: { provider: true },
    });

    const counts: Record<string, number> = {};
    for (const a of accounts) {
      const p = (a.provider || 'OTHER').toUpperCase();
      counts[p] = (counts[p] || 0) + 1;
    }

    const providerConfigs: Record<string, { name: string; icon: string; price: number }> = {
      GMAIL: { name: 'Gmail', icon: 'google', price: 0.0090 },
      OUTLOOK: { name: 'Outlook', icon: 'microsoft', price: 0.0085 },
      YAHOO: { name: 'Yahoo', icon: 'yahoo', price: 0.0088 },
      ICLOUD: { name: 'Icloud', icon: 'apple', price: 0.0081 },
      MAILRU: { name: 'Mail.ru', icon: 'mail', price: 0.0078 },
      OTHER: { name: 'Others', icon: 'other', price: 0.0075 },
    };

    const providers = Object.keys(providerConfigs).map((key) => {
      const cfg = providerConfigs[key];
      const count = counts[key] || 0;
      return {
        id: `provider_${key.toLowerCase()}`,
        key: key.toLowerCase(),
        provider: key,
        name: cfg.name,
        icon: cfg.icon,
        price: cfg.price,
        count,
        inStock: count > 0,
      };
    });

    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { domainName: 'asc' },
    });

    return res.json({
      success: true,
      providers,
      domains,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Buy/Order temporary email
router.post('/order', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { service, domain, count = 1, maxPrice, time, smsCount } = req.body;

    if (!service) {
      return res.status(400).json({ error: 'Service code is required' });
    }

    const orderCount = Math.min(Math.max(parseInt(count, 10) || 1, 1), 10);
    const results = [];

    for (let i = 0; i < orderCount; i++) {
      const order = await RentalService.createRental(userId, service, domain, maxPrice, time, smsCount);
      results.push(order);
    }

    return res.json({
      success: true,
      orders: results,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get active activations for the current user
router.get('/active', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    await RentalService.cleanupExpiredSessions(userId);

    const activeRentals = await prisma.rentalSession.findMany({
      where: {
        userId,
        status: { in: [RentalStatus.WAITING_CODE, RentalStatus.WAITING_NEXT] },
        expiresAt: { gt: new Date() },
      },
      include: {
        domain: { select: { domainName: true } },
        serviceItem: { select: { name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(activeRentals);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get real-time stock availability (pcs count, no fake domains)
router.get('/stock', async (req, res) => {
  try {
    const serviceCode = req.query.service as string | undefined;
    const stock = await RentalService.getStockAvailability(serviceCode);
    return res.json(stock);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Request re-code on active rental (free of charge within countdown window)
router.post('/recode/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id, 10);
    const result = await RentalService.recode(mailId, userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get history of activations with enhanced SMSBower filters (Matching Emails.png)
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Run auto-cleanup for expired sessions:
    // If expired & has code -> mark COMPLETED & settle
    // If expired & no code -> mark CANCELLED & refund held balance
    await RentalService.cleanupExpiredSessions(userId);

    const {
      tab,
      statusTab,
      service,
      status,
      dateFrom,
      dateTo,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const activeTab = (statusTab || tab || 'all') as string;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const whereClause: any = { userId };

    // Status / Tab filter
    if (status && status !== 'all' && status !== 'Status') {
      whereClause.status = status as RentalStatus;
    } else if (activeTab === 'paid') {
      whereClause.status = RentalStatus.COMPLETED;
    } else if (activeTab === 'canceled') {
      whereClause.status = { in: [RentalStatus.CANCELLED, RentalStatus.EXPIRED] };
    } else if (activeTab === 'waiting') {
      whereClause.status = { in: [RentalStatus.WAITING_CODE, RentalStatus.WAITING_NEXT] };
    }

    // Service filter
    if (service && service !== 'all' && service !== 'Service') {
      whereClause.serviceCode = (service as string).toLowerCase();
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    // Email or code search
    if (search) {
      whereClause.OR = [
        { emailAddress: { contains: (search as string).toLowerCase() } },
        { code: { contains: search as string } },
      ];
    }

    const [total, items, stats] = await Promise.all([
      prisma.rentalSession.count({ where: whereClause }),
      prisma.rentalSession.findMany({
        where: whereClause,
        include: {
          domain: { select: { domainName: true } },
          serviceItem: { select: { name: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.rentalSession.aggregate({
        where: {
          userId,
          status: { in: [RentalStatus.WAITING_CODE, RentalStatus.WAITING_NEXT] },
        },
        _count: { _all: true },
        _sum: { price: true },
      }),
    ]);

    return res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      waitingCount: stats._count._all || 0,
      lockedSum: stats._sum.price?.toNumber() || 0,
      items,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Export CSV of Activations (Matching Emails.png)
router.get('/history/export-csv', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { tab, service, status, dateFrom, dateTo } = req.query;

    const whereClause: any = { userId };
    if (status && status !== 'all') whereClause.status = status as RentalStatus;
    else if (tab === 'paid') whereClause.status = RentalStatus.COMPLETED;
    else if (tab === 'canceled') whereClause.status = { in: [RentalStatus.CANCELLED, RentalStatus.EXPIRED] };
    else if (tab === 'waiting') whereClause.status = { in: [RentalStatus.WAITING_CODE, RentalStatus.WAITING_NEXT] };

    if (service && service !== 'all') whereClause.serviceCode = (service as string).toLowerCase();
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
    }

    const items = await prisma.rentalSession.findMany({
      where: whereClause,
      include: { serviceItem: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let csv = '#,Date,Service,Status,Mail,Code,URL,Price (USD)\n';
    for (const item of items) {
      const dateStr = item.createdAt.toISOString().replace('T', ' ').slice(0, 19);
      const svc = item.serviceItem?.name || item.serviceCode;
      const cleanMail = item.emailAddress;
      const code = item.code || '';
      const url = (item.verificationUrl || '').replace(/"/g, '""');
      const price = item.price.toFixed(4);
      csv += `${item.id},"${dateStr}","${svc}","${item.status}","${cleanMail}","${code}","${url}",${price}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mail_activations.csv"');
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cancel activation
router.post('/cancel/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id, 10);

    const result = await RentalService.setStatus(mailId, 2, userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Complete activation (mark finished & settle)
router.post('/complete/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id, 10);

    const result = await RentalService.setStatus(mailId, 3, userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
