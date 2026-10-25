# Walkthrough 7: Credits and payments

**Goal.** Learners pay for what they use, in rupees, with no way to be charged twice or to get credits without paying.
**Code:** `apps/api/src/credits/service.ts`, `payments/` (gateway, service), `routes/credits.ts`, `routes/payments.ts`, models `CreditAccount`, `CreditEntry`, `Payment`, `WebhookEvent`; shared `credits.ts`, `payments.ts`. **Web:** `pages/credits.tsx`, `lib/checkout.ts`, `components/{credit-badge,no-credits}.tsx`. **Prices and reasoning:** [../pricing.md](../pricing.md).

## 1. The ledger

```
creditAccounts   { userId, balance }                       one per learner (a cache)
creditEntries    { userId, delta, balanceAfter, reason,     append-only, the truth
                   idempotencyKey (unique), note, courseId }
```

Every change goes through `applyEntry` inside `creditTransaction` (a MongoDB transaction):

1. If an entry with this `idempotencyKey` exists, do nothing (already applied).
2. Update the balance. A spend's filter includes `balance >= cost`, so it can never go negative. If nothing matched → `INSUFFICIENT_CREDITS` (HTTP 402, `{ needed, balance }`), and the whole transaction rolls back.
3. Insert the entry with `balanceAfter`.

The account row is created _before_ the transaction. Two concurrent transactions then both _update_ the same row, MongoDB reports a write conflict for one, and the driver retries it. On retry it sees step 1's entry and stops. (Two concurrent _inserts_ would raise a duplicate-key error instead, which is not retried.)

| Key                  | When                                                             | Delta           |
| -------------------- | ---------------------------------------------------------------- | --------------- |
| `welcome:<userId>`   | first time credits are touched                                   | +30             |
| `day:<courseId>:<n>` | a day is first opened (same transaction as the generation claim) | −⌈minutes ÷ 15⌉ |
| `replan:<replanId>`  | a priced re-plan is applied                                      | −2              |
| `payment:<orderId>`  | a pack is paid (checkout or webhook)                             | +pack credits   |

## 2. Spending

- **Days.** `openDay` claims the day for generation and charges it in one transaction. Can't pay → the claim is rolled back and the page shows "Get credits". A failed generation is retried free: the key already exists.
- **Re-plans.** Charged in `applyReplan`'s transaction. Auto mode that can't pay leaves the proposal `proposed`.
- **Approving an outline costs nothing.** The quote shows the total if every day is opened.

## 3. Buying a pack

```
Page                         API                                   Razorpay
 │ POST /payments/orders ───► create order (amount from pack) ───► POST /v1/orders
 │ ◄── orderId, keyId, amount   store Payment{status: created}     ◄── order_id
 │ open Checkout(order_id) ─────────────────────────────────────►  learner pays
 │ ◄── payment_id, signature ◄──────────────────────────────────────┘
 │ POST /payments/verify ───► HMAC_SHA256(our orderId|payment_id, key_secret) == signature?
 │                            fulfil(): Payment→paid + entry payment:<orderId>   (one transaction)
 │                                                                  Razorpay ─► POST /webhooks/razorpay
 │                            HMAC_SHA256(raw body, webhook_secret) == X-Razorpay-Signature?
 │                            event id seen? → ignore.  amount matches? → fulfil() (no-op if done)
```

- **Two messengers, one credit.** The page might close before it calls `verify`; the webhook covers that. Whichever arrives first credits; the other is a no-op (same ledger key). Tested with both at once.
- **Nothing from the browser is trusted for money.** The order is looked up for the signed-in learner; the amount is ours; the signature is checked with our stored order id.
- **Webhook body is read as raw text** (a scoped content-type parser) because the signature covers the exact bytes.

## 4. Fake and real gateways

`PAYMENTS_PROVIDER=fake` (default): `FakeGateway` signs with real HMAC and fixed fake secrets, so the same verification code runs. The page shows "Test mode" and `POST /payments/orders/:id/simulate` stands in for Checkout (registered only with the fake). No money exists in this path.

`PAYMENTS_PROVIDER=razorpay`: `RazorpayGateway` calls the Orders API with Basic auth; the page loads `checkout.razorpay.com/v1/checkout.js`. Use **test-mode keys** until launch (no money moves; test UPI id `success@razorpay`). Webhooks need a public HTTPS URL (use a tunnel in dev). Production requires `razorpay` (env rule).

## Try it

Fake mode: sign in → header shows `30` → open a day → `28` → **Credits** → **Buy for ₹149** → `78`. With curl: see [../../TESTING.md](../../TESTING.md#p4-c2-razorpay-fake-gateway-by-default).

Tests: `routes/credits.test.ts`, `routes/payments.test.ts`, `config/env.test.ts`; browser: the last step of `bun run e2e:learner`.
Not verified: real Razorpay calls, live webhook payload shape, refunds (none automated).
