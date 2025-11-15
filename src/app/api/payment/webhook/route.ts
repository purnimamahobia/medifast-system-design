import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import type { RazorpayWebhookPayload } from '@/lib/razorpay.types';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not configured');
    return false;
  }
  
  const hash = createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload: RazorpayWebhookPayload = JSON.parse(body);

    // Handle different webhook events
    switch (payload.event) {
      case 'payment.captured':
        console.log('Payment captured:', payload.payload.payment?.entity.id);
        // TODO: Update your database - mark order as paid
        break;

      case 'payment.failed':
        console.log('Payment failed:', payload.payload.payment?.entity.id);
        // TODO: Handle failed payment - notify user, update order status
        break;

      case 'order.paid':
        console.log('Order paid:', payload.payload.order?.entity.id);
        // TODO: Fulfill order - update inventory, send confirmation
        break;

      default:
        console.log('Unknown event:', payload.event);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
