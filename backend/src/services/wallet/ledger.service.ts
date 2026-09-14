import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../../db/prisma';

export class LedgerService {
  /**
   * Ensure user has a wallet or create one.
   */
  public static async getOrCreateWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: new Prisma.Decimal(0),
          reservedBalance: new Prisma.Decimal(0),
        },
      });
    }
    return wallet;
  }

  /**
   * Hold balance when user creates a rental order.
   */
  public static async holdBalance(
    userId: string,
    amount: Prisma.Decimal | number,
    referenceId: string,
    description: string = 'Rental order reservation'
  ) {
    const decAmount = new Prisma.Decimal(amount);

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error('User wallet not found');
      }

      if (wallet.balance.lessThan(decAmount)) {
        throw new Error('Insufficient balance');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = wallet.balance.minus(decAmount);
      const reservedAfter = wallet.reservedBalance.plus(decAmount);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          reservedBalance: reservedAfter,
        },
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.HOLD,
          amount: decAmount,
          balanceBefore,
          balanceAfter,
          referenceType: 'RENTAL_HOLD',
          referenceId,
          description,
        },
      });

      return { wallet: updatedWallet, ledger };
    });
  }

  /**
   * Settle balance (deduct permanently from reserved funds) upon successful OTP reception.
   */
  public static async settleBalance(
    userId: string,
    amount: Prisma.Decimal | number,
    referenceId: string,
    description: string = 'Rental completed & OTP delivered'
  ) {
    const decAmount = new Prisma.Decimal(amount);

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) throw new Error('User wallet not found');

      const reservedAfter = wallet.reservedBalance.minus(decAmount);
      const safeReserved = reservedAfter.isNegative() ? new Prisma.Decimal(0) : reservedAfter;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: safeReserved,
        },
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.DEBIT,
          amount: decAmount,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance, // Main balance was deducted at HOLD
          referenceType: 'RENTAL_SETTLE',
          referenceId,
          description,
        },
      });

      return { wallet: updatedWallet, ledger };
    });
  }

  /**
   * Release reserved balance back to main balance if session cancelled or expired.
   */
  public static async releaseBalance(
    userId: string,
    amount: Prisma.Decimal | number,
    referenceId: string,
    description: string = 'Rental cancelled / expired refund'
  ) {
    const decAmount = new Prisma.Decimal(amount);

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) throw new Error('User wallet not found');

      const balanceBefore = wallet.balance;
      const balanceAfter = wallet.balance.plus(decAmount);
      const reservedAfter = wallet.reservedBalance.minus(decAmount);
      const safeReserved = reservedAfter.isNegative() ? new Prisma.Decimal(0) : reservedAfter;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          reservedBalance: safeReserved,
        },
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.RELEASE,
          amount: decAmount,
          balanceBefore,
          balanceAfter,
          referenceType: 'RENTAL_RELEASE',
          referenceId,
          description,
        },
      });

      return { wallet: updatedWallet, ledger };
    });
  }

  /**
   * Credit user balance when payment succeeds.
   */
  public static async creditBalance(
    userId: string,
    amount: Prisma.Decimal | number,
    gateway: string,
    referenceId: string,
    description?: string
  ) {
    const decAmount = new Prisma.Decimal(amount);

    return prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: new Prisma.Decimal(0),
            reservedBalance: new Prisma.Decimal(0),
          },
        });
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = wallet.balance.plus(decAmount);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.CREDIT,
          amount: decAmount,
          balanceBefore,
          balanceAfter,
          referenceType: `TOPUP_${gateway.toUpperCase()}`,
          referenceId,
          description: description || `Top up via ${gateway}`,
        },
      });

      return { wallet: updatedWallet, ledger };
    });
  }
}
