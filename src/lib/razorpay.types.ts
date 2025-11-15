export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, unknown>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'authorized' | 'failed' | 'captured' | 'refunded' | 'pending';
  method: string;
  description: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  email: string;
  contact: string;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_reason: string | null;
  error_step: string | null;
  error_field: string | null;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  notes: Record<string, unknown>;
  fee_breakup: {
    convenience_fee: number;
    convenience_tax: number;
    gst: number;
  } | null;
  acquirer_data: {
    auth_code: string | null;
    rrn: string | null;
  } | null;
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: 'payment.authorized' | 'payment.failed' | 'payment.captured' | 'order.paid';
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPayment;
    };
    order?: {
      entity: RazorpayOrder;
    };
  };
  created_at: number;
}

export interface CheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface OrderCreationRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, unknown>;
}

export interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
