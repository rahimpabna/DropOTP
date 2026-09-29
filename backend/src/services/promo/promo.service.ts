import { prisma } from '../../db/prisma';
import { LedgerService } from '../wallet/ledger.service';

export class PromoService {
  /**
   * Admin: List all promo codes.
   */
  public static async listPromoCodes() {
    return prisma.promoCode.findMany({
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: Create a new promo code matching promo add system.png.
   */
  public static async createPromoCode(data: {
    code: string;
    name: string;
    rewardType?: string;
    rewardValue: number;
    currency?: string;
    maxReward?: number;
    maxUses?: number;
    perUserLimit?: number;
    startAt?: string;
    endAt?: string;
  }) {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      throw new Error('Promo code already exists');
    }

    return prisma.promoCode.create({
      data: {
        code: cleanCode,
        name: data.name,
        rewardType: data.rewardType || 'CASH',
        rewardValue: data.rewardValue,
        currency: data.currency || 'USD',
        maxReward: data.maxReward,
        maxUses: data.maxUses || 0,
        perUserLimit: data.perUserLimit ?? 1,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        isActive: true,
      },
    });
  }

  /**
   * Admin: Delete promo code.
   */
  public static async deletePromoCode(id: string) {
    return prisma.promoCode.delete({
      where: { id },
    });
  }

  /**
   * User: Redeem a promotional code to add funds to wallet balance.
   */
  public static async redeemPromoCode(userId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();
    const promo = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (!promo || !promo.isActive) {
      throw new Error('Invalid or inactive promotional code');
    }

    const now = new Date();
    if (promo.startAt && now < promo.startAt) {
      throw new Error('Promotional code is not yet active');
    }
    if (promo.endAt && now > promo.endAt) {
      throw new Error('Promotional code has expired');
    }

    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      throw new Error('Promotional code maximum usage limit reached');
    }

    // Check per-user limit
    const userRedemptions = await prisma.promoRedemption.count({
      where: {
        promoCodeId: promo.id,
        userId,
      },
    });

    if (userRedemptions >= promo.perUserLimit) {
      throw new Error('You have already redeemed this promotional code');
    }

    const rewardAmount = Number(promo.rewardValue);

    // Record redemption
    await prisma.promoRedemption.create({
      data: {
        promoCodeId: promo.id,
        userId,
        amountCredited: rewardAmount,
      },
    });

    // Increment usedCount
    await prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    });

    // Credit user's wallet
    const updatedWallet = await LedgerService.creditBalance(
      userId,
      rewardAmount,
      'PROMO_CODE',
      promo.code,
      `Promo code bonus: ${promo.code}`
    );

    return {
      success: true,
      code: promo.code,
      amountCredited: rewardAmount,
      newBalance: Number(updatedWallet.wallet.balance),
    };
  }
}
