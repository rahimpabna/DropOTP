import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../../config/env';
import { prisma } from '../../db/prisma';
import { LedgerService } from '../wallet/ledger.service';
import { PaymentGateway, PaymentStatus } from '@prisma/client';

export class MaxelpayService {
  /**
   * Create Maxelpay invoice (Crypto / Multi-currency).
   */
  public static async createInvoice(userId: string, amountUSD: number, returnUrl: string) {
    const orderId = `MAXEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        gateway: PaymentGateway.MAXELPAY,
        amount: amountUSD,
        currency: 'USD',
        gatewayOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
    });

    try {
      const response = await axios.post(
        'https://api.maxelpay.com/api/v1/payments/sessions',
        {
          orderId,
          order_id: orderId,
          amount: amountUSD,
          currency: 'USD',
          description: `DropOTP Top-up $${amountUSD}`,
          customerEmail: user?.email || 'customer@dropotp.com',
          customerName: user?.username || user?.displayName || 'DropOTP User',
          successUrl: returnUrl || `${ENV.BASE_URL}/#topups?payment_status=success`,
          returnUrl: returnUrl || `${ENV.BASE_URL}/#topups?payment_status=success`,
          redirectUrl: returnUrl || `${ENV.BASE_URL}/#topups?payment_status=success`,
          cancelUrl: `${ENV.BASE_URL}/#topups?payment_status=cancelled`,
          callbackUrl: `${ENV.BASE_URL}/api/payments/maxelpay/webhook`,
          webhookUrl: `${ENV.BASE_URL}/api/payments/maxelpay/webhook`,
          autoRedirect: true,
        },
        {
          headers: {
            'X-API-KEY': ENV.MAXELPAY_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const resData = response.data;
      if (resData?.success && resData?.data?.paymentUrl) {
        return {
          invoiceId: resData.data.sessionId || orderId,
          paymentUrl: resData.data.paymentUrl,
          orderId,
        };
      }
    } catch (e: any) {
      console.error('[Maxelpay] Live API error:', e.response?.data || e.message);
      throw new Error(`Maxelpay error: ${e.response?.data?.message || e.message}`);
    }

    throw new Error('Failed to obtain Maxelpay checkout URL');
  }

  /**
   * Webhook IPN validator for Maxelpay.com.
   */
  public static async handleWebhook(payload: any, signature?: string) {
    const orderId = payload.order_id || payload.orderId || payload.data?.orderId;
    const rawStatus = (payload.status || payload.data?.status || '').toString().toLowerCase();

    const order = await prisma.paymentOrder.findFirst({
      where: { gatewayOrderId: orderId },
    });

    if (!order) throw new Error('Order not found');

    if (rawStatus === 'success' || rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'confirmed') {
      if (order.status !== PaymentStatus.SUCCESS) {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: PaymentStatus.SUCCESS,
            transactionId: payload.tx_id || payload.hash || 'MAXEL-TRX',
            rawPayload: JSON.stringify(payload),
            completedAt: new Date(),
          },
        });

        await LedgerService.creditBalance(
          order.userId,
          order.amount,
          'Maxelpay',
          orderId,
          `Maxelpay crypto deposit: $${order.amount}`
        );
      }
      return { success: true };
    }

    return { success: false, status };
  }
}
