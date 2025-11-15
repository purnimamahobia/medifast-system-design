import { NextRequest, NextResponse } from 'next/server';
import { razorpayInstance } from '@/lib/razorpay-instance';
import type { RazorpayOrder, OrderCreationRequest } from '@/lib/razorpay.types';

export async function POST(request: NextRequest) {
  try {
    const body: OrderCreationRequest = await request.json();

    const { amount, currency = 'INR', receipt, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const orderOptions = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    const order: RazorpayOrder = await razorpayInstance.orders.create(orderOptions);

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}
