import { Router } from 'express';
import { prisma } from '../db/prisma';
import { RentalService } from '../services/rental/rental.service';

const router = Router();

// Middleware to authenticate external API calls via `api_key` query parameter or header
const verifyApiKey = async (req: any, res: any, next: any) => {
  const apiKey = (req.query.api_key || req.query.key || req.headers['x-api-key']) as string;
  if (!apiKey) {
    return res.json({ status: 0, error: 'BAD_KEY' });
  }

  const user = await prisma.user.findUnique({
    where: { apiKey },
    include: { wallet: true },
  });

  if (!user || !user.isActive) {
    return res.json({ status: 0, error: 'BAD_KEY' });
  }

  req.apiUser = user;
  next();
};

/**
 * 1. Get Mail Activation
 * Endpoint: GET /api/mail/getActivation
 */
router.get('/getActivation', verifyApiKey, async (req: any, res) => {
  try {
    const user = req.apiUser;
    const { service, domain, maxPrice } = req.query;

    if (!service) {
      return res.json({ status: 0, error: 'BAD_SERVICE' });
    }

    const parsedMaxPrice = maxPrice ? parseFloat(maxPrice as string) : undefined;

    const result = await RentalService.createRental(
      user.id,
      service as string,
      domain as string,
      parsedMaxPrice
    );

    return res.json({
      status: 1,
      mail: result.mail,
      mailId: result.mailId,
    });
  } catch (error: any) {
    const msg = error.message.toLowerCase();
    if (msg.includes('insufficient balance')) {
      return res.json({ status: 0, error: 'Insufficient balance' });
    }
    if (msg.includes('no such domain')) {
      return res.json({ status: 0, error: 'No mails yet' });
    }
    return res.json({ status: 0, error: error.message });
  }
});

/**
 * 2. Get Mail Code
 * Endpoint: GET /api/mail/getCode
 */
router.get('/getCode', verifyApiKey, async (req: any, res) => {
  try {
    const mailId = parseInt(req.query.mailId as string, 10);
    if (isNaN(mailId)) {
      return res.json({ status: 0, error: 'Pass mail id' });
    }

    const result = await RentalService.getCode(mailId, req.apiUser.id);
    return res.json(result);
  } catch (error: any) {
    return res.json({ status: 0, error: error.message });
  }
});

/**
 * 3. Change Activation Status
 * Endpoint: GET /api/mail/setStatus
 */
router.get('/setStatus', verifyApiKey, async (req: any, res) => {
  try {
    const id = parseInt(req.query.id as string, 10);
    const status = parseInt(req.query.status as string, 10);

    if (isNaN(id) || isNaN(status)) {
      return res.json({ status: 0, error: 'Pass mail id and status' });
    }

    const result = await RentalService.setStatus(id, status, req.apiUser.id);
    return res.json(result);
  } catch (error: any) {
    return res.json({ status: 0, error: error.message });
  }
});

/**
 * 4. Get Mail Prices & Available Rests
 * Endpoint: GET /api/mail/getPriceRests
 */
router.get('/getPriceRests', verifyApiKey, async (req: any, res) => {
  try {
    const { service, domain } = req.query;
    const result = await RentalService.getPriceRests(service as string, domain as string);
    return res.json(result);
  } catch (error: any) {
    return res.json({ status: 0, error: error.message });
  }
});

/**
 * 5. Get List of Available Domains
 * Endpoint: GET /api/mail/getDomains
 */
router.get('/getDomains', verifyApiKey, async (req: any, res) => {
  try {
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      select: { domainName: true, defaultPrice: true },
    });

    return res.json({
      status: 1,
      domains: domains.map((d) => ({
        name: d.domainName,
        id: d.domainName,
        price: d.defaultPrice.toNumber(),
      })),
    });
  } catch (error: any) {
    return res.json({ status: 0, error: error.message });
  }
});

/**
 * 6. Get Account Balance
 * Endpoint: GET /api/mail/getBalance
 */
router.get('/getBalance', verifyApiKey, async (req: any, res) => {
  try {
    const balance = req.apiUser.wallet?.balance?.toNumber() || 0;
    return res.json({
      status: 1,
      balance,
      currency: 'USD',
    });
  } catch (error: any) {
    return res.json({ status: 0, error: error.message });
  }
});

export default router;
