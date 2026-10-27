# Walkthrough 7: Credits and payments

**Goal.** Learners pay for what they use, in rupees, with no way to be charged twice or to get credits without paying.
**Code:** `apps/api/src/credits/service.ts`, `outline/service.ts` (`approveOutline` = the purchase), `payments/` (gateway, service), `routes/credits.ts`, `routes/payments.ts`, models `CreditAccount`, `CreditEntry`, `Payment`, `WebhookEvent`; shared `credits.ts`, `payments.ts`. **Web:** `pages/credits.tsx`, `lib/checkout.ts`, `components/{credit-badge,no-credits}.tsx`. **Prices and reasoning:** [../pricing.md](../pricing.md).

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

| Key                 | When                                                 | Delta                                       |
| ------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `welcome:<userId>`  | first time credits are touched (sign-up in practice) | +100                                        |
| `course:<courseId>` | the learner buys the roadmap                         | −price (see [../pricing.md](../pricing.md)) |
| `replan:<replanId>` | a re-plan beyond the free 7 days is applied          | −2 per extra day                            |
| `payment:<orderId>` | a pack is paid (checkout or webhook)                 | +pack credits                               |

## 2. Spending

- **Buying a course.** `POST /courses/:id/outline/approve` is the purchase. In **one transaction** it approves that outline version, charges its price (`coursePrice` of the version's days, minutes per day and depth), and creates the day rows. If the learner can't pay, nothing changes and the course stays a draft (402). Five simultaneous clicks make one charge and one set of days. The price is also stored on the course (`creditsPaid`).
- **After buying, days are free.** Opening a day, taking quizzes and submitting tasks never charge. The course is the learner's forever. Days still open on their schedule (see [03](03-daily-loop.md)).
- **Drafts are free.** Placement and the roadmap cost the learner nothing; they pay only if they buy.
- **Re-plans.** The next 7 upcoming days are free; each extra day (up to 28 ahead) costs 2 credits, charged in `applyReplan`'s transaction when the learner accepts. Auto mode always looks 7 days ahead, so it is always free. Auto mode never spends credits.

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

Fake mode: sign in → header shows `100` → create a 2-week working course → **Buy for 100 credits** → `0` → **Credits** → **Buy for ₹99** → `100`. With curl: see [../../TESTING.md](../../TESTING.md#p4-c2-razorpay-fake-gateway-by-default).

Tests: `routes/credits.test.ts`, `routes/payments.test.ts`, `config/env.test.ts`; browser: the last step of `bun run e2e:learner`.
Not verified: real Razorpay calls, live webhook payload shape, refunds (none automated).
