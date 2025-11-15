import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { razorpayInstance } from '@/lib/razorpay-instance';
import type { PaymentVerificationRequest, RazorpayPayment } from '@/lib/razorpay.types';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentVerificationRequest = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Verify signature
    const body_string = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected_signature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body_string)
      .digest('hex');

    if (expected_signature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Step 2: Fetch payment to confirm status
    const payment: RazorpayPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return NextResponse.json(
        { error: `Payment not captured. Status: ${payment.status}` },
        { status: 400 }
      );
    }

    // Step 3: Fetch order to verify amount
    const order = await razorpayInstance.orders.fetch(razorpay_order_id);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      order: {
        id: order.id,
        status: order.status,
      },
    });
  } catch (error: unknown) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
