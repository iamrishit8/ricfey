import type { CheckoutOrder, PaymentResult } from '@ricfey/shared';
import { post } from './api';

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
type RazorpayCheckout = new (options: Record<string, unknown>) => { open(): void };
declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

// https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
const CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckout(): Promise<RazorpayCheckout> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_JS;
    s.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Checkout did not load'));
    s.onerror = () => reject(new Error('Could not reach Razorpay. Check your connection.'));
    document.head.appendChild(s);
  });
}

/**
 * Take payment for an order and have the server verify it. Resolves with the server's result,
 * or null if the learner closed the payment window. Credits are added by the server only.
 */
export async function payForOrder(
  order: CheckoutOrder,
  prefill: { email?: string },
): Promise<PaymentResult | null> {
  if (order.gateway === 'fake') {
    // Test mode without Razorpay: the server signs a pretend payment, then verifies it the real way.
    const proof = await post<{ orderId: string; paymentId: string; signature: string }>(
      `/payments/orders/${order.orderId}/simulate`,
    );
    return (await post<{ payment: PaymentResult }>('/payments/verify', proof)).payment;
  }

  const Razorpay = await loadCheckout();
  const response = await new Promise<RazorpayResponse | null>((resolve) => {
    new Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: 'Ricfey',
      description: `${order.pack.credits} credits`,
      order_id: order.orderId,
      prefill,
      handler: (r: RazorpayResponse) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
    }).open();
  });
  if (!response) return null;
  return (
    await post<{ payment: PaymentResult }>('/payments/verify', {
      orderId: order.orderId,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature,
    })
  ).payment;
}
