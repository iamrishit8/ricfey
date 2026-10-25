# Phase 4: Credits and payments

## Goal

Learners pay for what they use, in rupees, safely: never charged twice, never credited without paying.

## Delivered

| Checkpoint | Delivers                                                                                                                          | Walkthrough                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P4-C1      | Credits ledger in transactions, 30 welcome credits, per-day charging on first open, priced re-plans, `INSUFFICIENT_CREDITS` (402) | [07](../walkthroughs/07-credits-and-payments.md)                           |
| P4-C2      | Packs, Razorpay orders, checkout verification, webhook, fake gateway, pricing doc                                                 | [07](../walkthroughs/07-credits-and-payments.md), [pricing](../pricing.md) |
| P4-C3      | Credits page (balance, packs, history), header balance, "Get credits" when short, e2e purchase, phase docs                        | [07](../walkthroughs/07-credits-and-payments.md)                           |

## Verified

`bun run check`: 175 tests. They cover:

- concurrent first opens charge once
- checkout and webhook together credit once
- tampered signatures and replays are rejected
- a ledger-sum invariant holds
- another learner gets 404

`bun run e2e:learner` buys a pack in Chrome (fake gateway), checked at 390px.

## Not verified

- Real Razorpay (no test keys yet).
- Live webhook payload paths.
- Exchange rate and grading cost in [pricing](../pricing.md).

## Gate (owner's)

- [ ] Create Razorpay test-mode keys and buy a pack with `success@razorpay` (no money).
- [ ] Confirm or change prices, the welcome grant and the re-plan price.

## Deferred

- Refunds and a refund policy (needed before live payments).
- Invoices and GST on our own sales.
- Credit expiry.
- Admin adjustments UI.
