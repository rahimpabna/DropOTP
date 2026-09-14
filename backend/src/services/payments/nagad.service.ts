import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../../config/env';
import { prisma } from '../../db/prisma';
import { LedgerService } from '../wallet/ledger.service';
import { PaymentGateway, PaymentStatus } from '@prisma/client';

export class NagadService {
  /**
   * Initialize a Nagad payment checkout session.
   */
  public static async createPayment(userId: string, amount: number, callbackUrl: string) {
    const orderId = `NAGAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        gateway: PaymentGateway.NAGAD,
        amount,
        currency: 'BDT',
        gatewayOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
    });

    // In Nagad PGW flow, sensitive fields are signed/encrypted with merchant private key
    // For sandbox/live, request URL format:
    const paymentUrl = `${ENV.NAGAD_BASE_URL}/check-out/initialize/${ENV.NAGAD_MERCHANT_ID}/${orderId}?amount=${amount}&callback=${encodeURIComponent(callbackUrl)}`;

    return {
      orderId,
      paymentUrl,
      orderDbId: order.id,
    };
  }

  /**
   * Verify Nagad payment callback & credit balance.
   */
  public static async verifyPayment(paymentRefId: string) {
    try {
      const response = await axios.get(
        `${ENV.NAGAD_BASE_URL}/verify/payment/${paymentRefId}`,
        {
          headers: {
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-Add': '127.0.0.1',
          },
        }
      );

      const data = response.data;
      if (data?.status === 'Success') {
        const order = await prisma.paymentOrder.findFirst({
          where: { gatewayOrderId: data.order_id },
        });

        if (order && order.status === PaymentStatus.PENDING) {
          const usdAmount = (order.amount.toNumber() / 120.0).toFixed(4);

          await prisma.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionId: paymentRefId,
              rawPayload: JSON.stringify(data),
              completedAt: new Date(),
            },
          });

          await LedgerService.creditBalance(
            order.userId,
            parseFloat(usdAmount),
            'Nagad',
            paymentRefId,
            `Nagad deposit: ${paymentRefId} (${order.amount} BDT = $${usdAmount})`
          );

          return { success: true, orderId: order.id };
        }
      }

      return { success: false, message: data?.message || 'Verification failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
