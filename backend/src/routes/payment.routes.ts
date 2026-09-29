import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { BkashService } from '../services/payments/bkash.service';
import { NagadService } from '../services/payments/nagad.service';
import { PaymentoService } from '../services/payments/paymento.service';
import { MaxelpayService } from '../services/payments/maxelpay.service';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';

const router = Router();

// ==========================================
// 1. bKash Gateway
// ==========================================
router.post('/bkash/create', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body; // in BDT

    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'Minimum deposit amount is 10 BDT' });
    }

    const callbackUrl = `${ENV.BASE_URL}/api/payments/bkash/callback`;
    const result = await BkashService.createPayment(userId, parseFloat(amount), callbackUrl);

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/bkash/callback', async (req, res) => {
  try {
    const { paymentID, status } = req.query;

    if (status === 'cancel' || status === 'failure') {
      return res.redirect(`${ENV.BASE_URL}/?payment_status=cancelled`);
    }

    if (status === 'success' && paymentID) {
      const result = await BkashService.executePayment(paymentID as string);
      if (result.success) {
        return res.redirect(`${ENV.BASE_URL}/?payment_status=success&trxID=${result.trxID}`);
      }
    }

    return res.redirect(`${ENV.BASE_URL}/?payment_status=failed`);
  } catch (error: any) {
    return res.redirect(`${ENV.BASE_URL}/?payment_status=error&message=${encodeURIComponent(error.message)}`);
  }
});

// ==========================================
// 2. Nagad Gateway
// ==========================================
router.post('/nagad/create', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body;

    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'Minimum deposit amount is 10 BDT' });
    }

    const callbackUrl = `${ENV.BASE_URL}/api/payments/nagad/callback`;
    const result = await NagadService.createPayment(userId, parseFloat(amount), callbackUrl);

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/nagad/callback', async (req, res) => {
  try {
    const { payment_ref_id, status } = req.query;

    if (status === 'Success' && payment_ref_id) {
      const result = await NagadService.verifyPayment(payment_ref_id as string);
      if (result.success) {
        return res.redirect(`${ENV.BASE_URL}/?payment_status=success&ref=${payment_ref_id}`);
      }
    }

    return res.redirect(`${ENV.BASE_URL}/?payment_status=failed`);
  } catch (error: any) {
    return res.redirect(`${ENV.BASE_URL}/?payment_status=error`);
  }
});

// ==========================================
// 3. Paymento.io Gateway
// ==========================================
router.post('/paymento/create', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { amountUSD } = req.body;

    if (!amountUSD || amountUSD < 1) {
      return res.status(400).json({ error: 'Minimum deposit is $1.00 USD' });
    }

    const returnUrl = `${ENV.BASE_URL}/?payment_status=success`;
    const result = await PaymentoService.createInvoice(userId, parseFloat(amountUSD), returnUrl);

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/paymento/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const result = await PaymentoService.handleWebhook(req.body, signature);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4. Maxelpay.com Gateway
// ==========================================
router.post('/maxelpay/create', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { amountUSD } = req.body;

    if (!amountUSD || amountUSD < 1) {
      return res.status(400).json({ error: 'Minimum deposit is $1.00 USD' });
    }

    const returnUrl = `${ENV.BASE_URL}/?payment_status=success`;
    const result = await MaxelpayService.createInvoice(userId, parseFloat(amountUSD), returnUrl);

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/maxelpay/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const result = await MaxelpayService.handleWebhook(req.body, signature);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 5. Promo Code Redemption (Matching promo code.png)
// ==========================================
router.post('/redeem-promo', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Promo code is required' });

    const { PromoService } = await import('../services/promo/promo.service');
    const result = await PromoService.redeemPromoCode(userId, code);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 6. User Top-Up History (Matching user-topup history.png)
// ==========================================
router.get('/user-topups', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, paymentType, dateFrom, dateTo, page = '1', limit = '25' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 25;
    const skip = (pageNum - 1) * take;

    const whereClause: any = { userId };

    if (status && status !== 'all' && status !== 'Status') {
      whereClause.status = status;
    }

    if (paymentType && paymentType !== 'all' && paymentType !== 'Payment type') {
      whereClause.gateway = paymentType;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      prisma.paymentOrder.count({ where: whereClause }),
      prisma.paymentOrder.findMany({
        where: whereClause,
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
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. User Ledger Transactions & History
// ==========================================
router.get('/transactions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) return res.json({ items: [] });

    const transactions = await prisma.ledgerTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ items: transactions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
