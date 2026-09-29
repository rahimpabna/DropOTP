import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../../config/env';
import { prisma } from '../../db/prisma';
import { LedgerService } from '../wallet/ledger.service';
import { PaymentGateway, PaymentStatus } from '@prisma/client';

export class PaymentoService {
  /**
   * Create Paymento.io checkout invoice.
   */
  public static async createInvoice(userId: string, amountUSD: number, returnUrl: string) {
    const orderId = `PAYO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        gateway: PaymentGateway.PAYMENTO,
        amount: amountUSD,
        currency: 'USD',
        gatewayOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
    });

    // Paymento requires an HTTPS return URL
    const safeReturnUrl = returnUrl && returnUrl.startsWith('https://')
      ? returnUrl
      : `${ENV.BASE_URL}/?payment=success&orderId=${orderId}`;

    try {
      const response = await axios.post(
        'https://api.paymento.io/v1/payment/request',
        {
          fiatAmount: amountUSD.toFixed(2),
          fiatCurrency: 'USD',
          ReturnUrl: safeReturnUrl,
          orderId,
          RiskSpeed: 0,
          EmailAddress: user?.email || 'customer@dropotp.com',
        },
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Api-key': ENV.PAYMENTO_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      if (data?.success && data?.body) {
        const token = String(data.body).trim();
        return {
          invoiceId: token,
          paymentUrl: `https://app.paymento.io/gateway?token=${token}`,
          orderId,
        };
      }
    } catch (e: any) {
      console.error('[Paymento] Live API error:', e.response?.data || e.message);
      throw new Error(`Paymento error: ${e.response?.data?.message || e.message}`);
    }

    throw new Error('Failed to obtain Paymento gateway token');
  }

  /**
   * Webhook IPN validator for Paymento.io.
   */
  public static async handleWebhook(payload: any, signature?: string) {
    const orderId = payload.order_id || payload.custom_id;
    const status = payload.status; // e.g. 'paid' or 'confirmed'

    const order = await prisma.paymentOrder.findFirst({
      where: { gatewayOrderId: orderId },
    });

    if (!order) throw new Error('Order not found');

    if (status === 'paid' || status === 'confirmed' || status === 'COMPLETED') {
      if (order.status !== PaymentStatus.SUCCESS) {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: PaymentStatus.SUCCESS,
            transactionId: payload.id || payload.tx_hash || 'PAYO-TRX',
            rawPayload: JSON.stringify(payload),
            completedAt: new Date(),
          },
        });

        await LedgerService.creditBalance(
          order.userId,
          order.amount,
          'Paymento.io',
          orderId,
          `Paymento deposit: $${order.amount}`
        );
      }
      return { success: true };
    }

    return { success: false, status };
  }
}
