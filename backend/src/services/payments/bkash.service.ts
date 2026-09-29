import axios from 'axios';
import { ENV } from '../../config/env';
import { prisma } from '../../db/prisma';
import { LedgerService } from '../wallet/ledger.service';
import { PaymentGateway, PaymentStatus } from '@prisma/client';

export class BkashService {
  private static token: string | null = null;
  private static tokenExpiresAt: number = 0;

  private static async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    const response = await axios.post(
      `${ENV.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
      {
        app_key: ENV.BKASH_APP_KEY,
        app_secret: ENV.BKASH_APP_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          username: ENV.BKASH_USERNAME,
          password: ENV.BKASH_PASSWORD,
        },
      }
    );

    if (response.data?.id_token) {
      this.token = response.data.id_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 120) * 1000;
      return this.token as string;
    }

    throw new Error('Failed to obtain bKash token');
  }

  public static async createPayment(userId: string, amount: number, callbackUrl: string) {
    const token = await this.getToken();
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create PaymentOrder record in PENDING status
    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        gateway: PaymentGateway.BKASH,
        amount,
        currency: 'BDT',
        gatewayOrderId: invoiceNumber,
        status: PaymentStatus.PENDING,
      },
    });

    const response = await axios.post(
      `${ENV.BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: '0011',
        payerReference: userId,
        callbackURL: callbackUrl,
        amount: amount.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoiceNumber,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': ENV.BKASH_APP_KEY,
        },
      }
    );

    const data = response.data;
    if (data?.paymentID && data?.bkashURL) {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { transactionId: data.paymentID },
      });

      return {
        paymentID: data.paymentID,
        bkashURL: data.bkashURL,
        orderId: order.id,
      };
    }

    throw new Error(data?.statusMessage || 'bKash create payment failed');
  }

  public static async executePayment(paymentID: string) {
    const token = await this.getToken();

    const response = await axios.post(
      `${ENV.BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': ENV.BKASH_APP_KEY,
        },
      }
    );

    const data = response.data;
    const order = await prisma.paymentOrder.findFirst({
      where: { transactionId: paymentID },
    });

    if (!order) throw new Error('Order not found');

    if (data?.statusCode === '0000') {
      // Success! Credit user wallet (convert BDT to USD, e.g. 1 USD = 120 BDT or 1:1 depending on config)
      const usdAmount = (order.amount.toNumber() / 120.0).toFixed(4);

      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentStatus.SUCCESS,
          rawPayload: JSON.stringify(data),
          completedAt: new Date(),
        },
      });

      await LedgerService.creditBalance(
        order.userId,
        parseFloat(usdAmount),
        'bKash',
        paymentID,
        `bKash deposit: ${data.trxID} (${order.amount} BDT = $${usdAmount})`
      );

      return { success: true, trxID: data.trxID, creditedUSD: usdAmount };
    } else {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentStatus.FAILED,
          rawPayload: JSON.stringify(data),
        },
      });
      return { success: false, message: data?.statusMessage };
    }
  }
}
