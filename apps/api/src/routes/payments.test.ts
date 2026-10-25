import { beforeEach, describe, expect, test } from 'bun:test';
import mongoose from 'mongoose';
import { buildApp } from '../app';
import { CreditEntryModel } from '../models/credit-entry';
import { PaymentModel } from '../models/payment';
import {
  FAKE_WEBHOOK_SECRET,
  FakeGateway,
  RazorpayGateway,
  hmacHex,
  type PaymentGateway,
} from '../payments/gateway';
import { signedInUser, TEST_DB_URI, useTestDb } from '../test/helpers';

describe('RazorpayGateway (no network)', () => {
  test('creates an order with Basic auth, amount in paise and a ≤40-char receipt', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchStub = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ id: 'order_123', amount: 14900, currency: 'INR' }));
    }) as unknown as typeof fetch;
    const g = new RazorpayGateway('rzp_test_key', 'secret', 'whsecret', fetchStub);
    const order = await g.createOrder({ amountPaise: 14900, receipt: 'rf_abc', notes: {} });
    expect(order).toEqual({ id: 'order_123', amount: 14900, currency: 'INR' });
    expect(seen!.url).toBe('https://api.razorpay.com/v1/orders');
    const headers = seen!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Basic ${btoa('rzp_test_key:secret')}`);
    expect(JSON.parse(seen!.init.body as string)).toMatchObject({
      amount: 14900,
      currency: 'INR',
      receipt: 'rf_abc',
    });
  });

  test('an error from Razorpay becomes a safe SERVICE_UNAVAILABLE', async () => {
    const fetchStub = (async () =>
      new Response('{"error":"bad key"}', { status: 401 })) as unknown as typeof fetch;
    const g = new RazorpayGateway('k', 's', 'w', fetchStub);
    const err = await g.createOrder({ amountPaise: 100, receipt: 'r', notes: {} }).catch((e) => e);
    expect(err).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(err.message).not.toContain('bad key');
  });

  test('signatures: HMAC-SHA256 of "order|payment" with the key secret; webhook over the raw body', () => {
    const g = new RazorpayGateway('k', 'key_secret', 'wh_secret');
    const sig = hmacHex('key_secret', 'order_1|pay_1');
    expect(g.verifyPaymentSignature('order_1', 'pay_1', sig)).toBe(true);
    expect(g.verifyPaymentSignature('order_2', 'pay_1', sig)).toBe(false);
    expect(
      g.verifyPaymentSignature('order_1', 'pay_1', hmacHex('other_secret', 'order_1|pay_1')),
    ).toBe(false);
    const body = '{"event":"order.paid"}';
    expect(g.verifyWebhookSignature(body, hmacHex('wh_secret', body))).toBe(true);
    expect(g.verifyWebhookSignature(body + ' ', hmacHex('wh_secret', body))).toBe(false);
  });
});

describe.skipIf(!TEST_DB_URI)('payments (needs MONGODB_URI_TEST)', () => {
  useTestDb();

  let payments: PaymentGateway;
  const app = () => buildApp({ deps: { payments } });

  beforeEach(async () => {
    payments = new FakeGateway();
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  });

  type Cookies = Record<string, string>;
  const post = (url: string, cookies: Cookies, payload: object = {}) =>
    app().inject({ method: 'POST', url, cookies, payload });
  const balance = async (cookies: Cookies) =>
    (await app().inject({ method: 'GET', url: '/credits', cookies })).json().data.credits.balance;

  async function order(cookies: Cookies, packId = 'starter') {
    const res = await post('/payments/orders', cookies, { packId });
    expect(res.statusCode).toBe(201);
    return res.json().data.order;
  }
  async function pay(cookies: Cookies, orderId: string) {
    const sim = (await post(`/payments/orders/${orderId}/simulate`, cookies)).json().data;
    return { orderId, paymentId: sim.paymentId, signature: sim.signature };
  }
  function webhook(body: object, opts: { eventId?: string; secret?: string } = {}) {
    const raw = JSON.stringify(body);
    return app().inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      payload: raw,
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': hmacHex(opts.secret ?? FAKE_WEBHOOK_SECRET, raw),
        ...(opts.eventId ? { 'x-razorpay-event-id': opts.eventId } : {}),
      },
    });
  }
  const paidEvent = (orderId: string, paymentId: string, amount = 14900) => ({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount } } },
  });

  test('packs are listed with prices in paise', async () => {
    const res = await app().inject({ method: 'GET', url: '/payments/packs' });
    expect(res.json().data.packs[0]).toMatchObject({
      id: 'starter',
      credits: 50,
      pricePaise: 14900,
    });
  });

  test('order → checkout verify credits the pack once; replaying the proof adds nothing', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const o = await order(cookies);
    expect(o).toMatchObject({ amountPaise: 14900, currency: 'INR', gateway: 'fake' });
    expect((await PaymentModel.findOne({ orderId: o.orderId }))!.status).toBe('created');

    const proof = await pay(cookies, o.orderId);
    const res = await post('/payments/verify', cookies, proof);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.payment).toMatchObject({ status: 'paid', credits: 50, balance: 80 });
    await post('/payments/verify', cookies, proof);
    expect(await balance(cookies)).toBe(80);
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'purchase' })).toBe(1);
    expect((await PaymentModel.findOne({ orderId: o.orderId }))!).toMatchObject({
      status: 'paid',
      paidVia: 'checkout',
    });
  });

  test('a tampered signature or a payment id from elsewhere is rejected; no credits', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const o = await order(cookies);
    const proof = await pay(cookies, o.orderId);
    const bad = await post('/payments/verify', cookies, { ...proof, paymentId: 'pay_other' });
    expect(bad.statusCode).toBe(400);
    const flipped = proof.signature.replace(/^(.)/, (c: string) => (c === 'a' ? 'b' : 'a'));
    expect(
      (await post('/payments/verify', cookies, { ...proof, signature: flipped })).statusCode,
    ).toBe(400);
    expect(await balance(cookies)).toBe(30);
  });

  test("another learner can't verify, simulate or see someone else's order", async () => {
    const a = await signedInUser('a@example.com');
    const b = await signedInUser('b@example.com');
    const o = await order(a.cookies);
    const proof = await pay(a.cookies, o.orderId);
    expect((await post('/payments/verify', b.cookies, proof)).statusCode).toBe(404);
    expect((await post(`/payments/orders/${o.orderId}/simulate`, b.cookies)).statusCode).toBe(404);
    expect(await balance(b.cookies)).toBe(30);
  });

  test('webhook credits the order; a redelivery and a later checkout add nothing', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const o = await order(cookies);
    const proof = await pay(cookies, o.orderId);
    const first = await webhook(paidEvent(o.orderId, proof.paymentId), { eventId: 'evt_1' });
    expect(first.statusCode).toBe(200);
    expect(await balance(cookies)).toBe(80);
    expect(
      (await webhook(paidEvent(o.orderId, proof.paymentId), { eventId: 'evt_1' })).statusCode,
    ).toBe(200);
    // A different event for the same order (e.g. order.paid after payment.captured).
    await webhook(
      {
        event: 'order.paid',
        payload: {
          order: { entity: { id: o.orderId, amount: 14900 } },
          payment: { entity: { id: proof.paymentId, order_id: o.orderId } },
        },
      },
      { eventId: 'evt_2' },
    );
    await post('/payments/verify', cookies, proof);
    expect(await balance(cookies)).toBe(80);
    expect((await PaymentModel.findOne({ orderId: o.orderId }))!.paidVia).toBe('webhook');
  });

  test('checkout and webhook arriving together credit exactly once', async () => {
    const { user, cookies } = await signedInUser('a@example.com');
    const o = await order(cookies);
    const proof = await pay(cookies, o.orderId);
    await Promise.all([
      post('/payments/verify', cookies, proof),
      webhook(paidEvent(o.orderId, proof.paymentId), { eventId: 'evt_9' }),
      post('/payments/verify', cookies, proof),
    ]);
    expect(await balance(cookies)).toBe(80);
    expect(await CreditEntryModel.countDocuments({ userId: user._id, reason: 'purchase' })).toBe(1);
  });

  test('webhook: bad signature → 401; wrong amount, unknown order, other events → no credits', async () => {
    const { cookies } = await signedInUser('a@example.com');
    const o = await order(cookies);
    expect((await webhook(paidEvent(o.orderId, 'pay_1'), { secret: 'wrong' })).statusCode).toBe(
      401,
    );
    expect((await webhook(paidEvent(o.orderId, 'pay_1', 100))).statusCode).toBe(200);
    expect((await webhook(paidEvent('order_unknown', 'pay_1'))).statusCode).toBe(200);
    expect((await webhook({ event: 'payment.failed', payload: {} })).statusCode).toBe(200);
    expect(await balance(cookies)).toBe(30);
    const notJson = await app().inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      payload: 'not json',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': hmacHex(FAKE_WEBHOOK_SECRET, 'not json'),
      },
    });
    expect(notJson.statusCode).toBe(400);
  });

  test('order creation: unknown pack → 400; sign-in required; at most 10 per hour', async () => {
    const { cookies } = await signedInUser('a@example.com');
    expect((await post('/payments/orders', cookies, { packId: 'free' })).statusCode).toBe(400);
    expect((await post('/payments/orders', {}, { packId: 'starter' })).statusCode).toBe(401);
    for (let i = 0; i < 9; i++) await order(cookies); // 1 rejected above didn't count
    expect((await post('/payments/orders', cookies, { packId: 'starter' })).statusCode).toBe(201);
    expect((await post('/payments/orders', cookies, { packId: 'starter' })).statusCode).toBe(429);
  });

  test('the simulate route does not exist with the real gateway', async () => {
    payments = new RazorpayGateway(
      'k',
      's',
      'w',
      (async () => new Response('{}')) as unknown as typeof fetch,
    );
    const { cookies } = await signedInUser('a@example.com');
    expect((await post('/payments/orders/order_x/simulate', cookies)).statusCode).toBe(404);
  });
});
