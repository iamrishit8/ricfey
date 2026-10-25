import type { FastifyInstance } from 'fastify';
import { CREDIT_PACKS, CreateOrderSchema, VerifyPaymentSchema } from '@ricfey/shared';
import { requireUser } from '../auth/session';
import { AppError } from '../lib/errors';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';
import { PaymentModel } from '../models/payment';
import { FakeGateway } from '../payments/gateway';
import { createOrder, handleWebhook, verifyCheckout, type PaymentDeps } from '../payments/service';

export async function paymentRoutes(app: FastifyInstance, opts: PaymentDeps): Promise<void> {
  app.get('/payments/packs', async () => ok({ packs: CREDIT_PACKS }));

  app.post('/payments/orders', async (req, reply) => {
    const user = await requireUser(req, opts.now());
    const { packId } = validate(CreateOrderSchema, req.body);
    return reply.code(201).send(ok({ order: await createOrder(user._id, packId, opts) }));
  });

  /** Called by the page with Checkout's response. Credits are added once, here or by webhook. */
  app.post('/payments/verify', async (req) => {
    const user = await requireUser(req, opts.now());
    const input = validate(VerifyPaymentSchema, req.body);
    return ok({ payment: await verifyCheckout(user._id, input, opts) });
  });

  /**
   * Fake gateway only: plays the part of Razorpay Checkout and returns a signed payment for the
   * page to verify, exactly like the real flow. Not registered with the real gateway.
   */
  const gateway = opts.payments;
  if (gateway instanceof FakeGateway) {
    app.post('/payments/orders/:orderId/simulate', async (req) => {
      const user = await requireUser(req, opts.now());
      const { orderId } = req.params as { orderId: string };
      const payment = await PaymentModel.findOne({ orderId, userId: user._id });
      if (!payment) throw new AppError('NOT_FOUND', 'Order not found');
      return ok({ orderId, ...gateway.simulatePayment(orderId) });
    });
  }

  // The webhook needs the exact raw body to check the signature, so this scope parses JSON as text.
  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) =>
      done(null, body),
    );
    scope.post('/webhooks/razorpay', async (req) => {
      const raw = req.body as string;
      const signature = req.headers['x-razorpay-signature'];
      if (typeof signature !== 'string' || !opts.payments.verifyWebhookSignature(raw, signature)) {
        throw new AppError('UNAUTHORIZED', 'Invalid signature');
      }
      const eventId = req.headers['x-razorpay-event-id'];
      let outcome: string;
      try {
        outcome = await handleWebhook(raw, typeof eventId === 'string' ? eventId : undefined, opts);
      } catch (err) {
        if (err instanceof SyntaxError) throw new AppError('BAD_REQUEST', 'Malformed body');
        throw err;
      }
      req.log.info({ outcome }, 'razorpay webhook');
      return ok({ received: true });
    });
  });
}
