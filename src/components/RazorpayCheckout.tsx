'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { CheckoutResponse } from '@/lib/razorpay.types';
import { toast } from 'sonner';

interface RazorpayCheckoutProps {
  amount: number;
  orderId?: string;
  onSuccess?: (data: CheckoutResponse) => void;
  onError?: (error: string) => void;
  description?: string;
  prefillEmail?: string;
  prefillContact?: string;
  prefillName?: string;
  buttonText?: string;
  buttonClassName?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function RazorpayCheckout({
  amount,
  orderId,
  onSuccess,
  onError,
  description = 'Payment for your order',
  prefillEmail = '',
  prefillContact = '',
  prefillName = '',
  buttonText,
  buttonClassName,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }, []);

  const handlePayment = useCallback(async () => {
    try {
      setLoading(true);

      // Load Razorpay script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order on server
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            orderId: orderId || 'web-checkout',
          },
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        name: 'MediFast',
        description,
        image: '/logo.svg',
        order_id: orderData.orderId,
        handler: async (response: CheckoutResponse) => {
          try {
            // Verify payment on server
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verifyData = await verifyResponse.json();
            
            toast.success('Payment successful!');
            
            if (onSuccess) {
              onSuccess(response);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Verification failed';
            toast.error(message);
            if (onError) onError(message);
          }
        },
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillContact,
        },
        theme: {
          color: '#0c831f',
        },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            toast.error('Payment cancelled');
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
        if (onError) onError(response.error.description);
      });
      
      razorpay.open();
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      toast.error(message);
      if (onError) onError(message);
      setLoading(false);
    }
  }, [amount, orderId, onSuccess, onError, description, prefillEmail, prefillContact, prefillName, loadRazorpayScript]);

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={
        buttonClassName ||
        'w-full px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </>
      ) : (
        buttonText || `Pay ₹${amount}`
      )}
    </button>
  );
}
