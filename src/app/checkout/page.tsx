'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { RazorpayCheckout } from '@/components/RazorpayCheckout';
import { useSession } from '@/lib/auth-client';
import type { CheckoutResponse } from '@/lib/razorpay.types';
import { ShoppingCart, Package, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<CheckoutResponse | null>(null);
  const [cartTotal, setCartTotal] = useState(499);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login?redirect=/checkout');
    }
  }, [session, isPending, router]);

  const handlePaymentSuccess = (data: CheckoutResponse) => {
    console.log('Payment successful:', data);
    setPaymentData(data);
    setPaymentSuccess(true);
    
    // TODO: Update order status in database
    // TODO: Clear cart
    // TODO: Send confirmation email
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  if (isPending) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 bg-background min-h-screen">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto text-center py-20">
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (paymentSuccess && paymentData) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 bg-background min-h-screen">
          <div className="container mx-auto">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-border">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-success-green/10 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success-green" />
                  </div>
                  <h1 className="text-3xl font-bold text-text-primary mb-2">
                    Payment Successful!
                  </h1>
                  <p className="text-text-secondary">
                    Your order has been confirmed and will be delivered soon.
                  </p>
                </div>

                <div className="bg-muted rounded-xl p-6 space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Payment ID</span>
                    <span className="text-text-primary font-mono text-xs">
                      {paymentData.razorpay_payment_id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Order ID</span>
                    <span className="text-text-primary font-mono text-xs">
                      {paymentData.razorpay_order_id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-border">
                    <span className="text-text-secondary font-medium">Amount Paid</span>
                    <span className="text-primary font-bold text-lg">₹{cartTotal}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/orders')}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-green-light transition-colors flex items-center justify-center gap-2"
                  >
                    <Package className="w-5 h-5" />
                    Track Your Order
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full px-6 py-3 bg-muted text-text-primary rounded-lg font-bold hover:bg-border transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 bg-background min-h-screen">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">Checkout</h1>
              <p className="text-text-secondary">Complete your purchase securely with Razorpay</p>
            </div>

            {/* Cart Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-border mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Order Summary</h2>
              </div>

              <div className="space-y-4 mb-6">
                {/* Sample cart items */}
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-16 h-16 bg-muted rounded-lg"></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-text-primary">Paracetamol 500mg</h3>
                    <p className="text-sm text-text-secondary">10 tablets</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-primary">₹25</p>
                    <p className="text-xs text-text-secondary">Qty: 2</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-16 h-16 bg-muted rounded-lg"></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-text-primary">Vitamin C 1000mg</h3>
                    <p className="text-sm text-text-secondary">30 tablets</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-primary">₹180</p>
                    <p className="text-xs text-text-secondary">Qty: 1</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span>₹230</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Delivery Fee</span>
                  <span>₹20</span>
                </div>
                <div className="flex justify-between text-success-green">
                  <span>Discount</span>
                  <span>-₹50</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between">
                  <span className="text-lg font-bold text-text-primary">Total</span>
                  <span className="text-2xl font-bold text-primary">₹{cartTotal}</span>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-accent-cyan/10 rounded-lg p-4 mb-6 border border-accent-cyan/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Delivery Information</h3>
                    <p className="text-sm text-text-secondary">
                      Expected delivery: <span className="font-medium text-accent-cyan">10-15 minutes</span>
                    </p>
                    <p className="text-sm text-text-secondary">
                      Delivery to: {session.user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <RazorpayCheckout
                amount={cartTotal}
                description="MediFast Order Payment"
                prefillName={session.user.name || ''}
                prefillEmail={session.user.email || ''}
                prefillContact=""
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>

            {/* Security Note */}
            <div className="text-center text-sm text-text-secondary">
              <p>🔒 Your payment is secured by Razorpay</p>
              <p className="mt-1">We accept UPI, Cards, Net Banking, and Wallets</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
