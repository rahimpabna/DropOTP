import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../db/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    apiKey: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (token) {
      if (token.startsWith('key_')) {
        const user = await prisma.user.findUnique({
          where: { apiKey: token },
          select: { id: true, email: true, username: true, role: true, apiKey: true, isActive: true },
        });
        if (!user || !user.isActive) {
          return res.status(401).json({ error: 'Invalid API key' });
        }
        req.user = user;
        return next();
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, username: true, role: true, apiKey: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or disabled' });
      }

      req.user = user;
      return next();
    }

    // Support API Key via query param or header (for SMSBower client compatibility)
    const apiKey = (req.query.api_key || req.headers['x-api-key']) as string;
    if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey },
        select: { id: true, email: true, username: true, role: true, apiKey: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ status: 0, error: 'Bad api_key' });
      }

      req.user = user;
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const adminOnlyMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};
