# Phase 5: Any course, bought once

## Goal

A learner signs up with free credits, tells the app what they want to learn, sees a roadmap and a
price, buys it once and keeps it. Completed courses become a gallery that others can buy cheaper.

## Owner's decisions (2026-10-28)

- Credits are money: 100 free at sign-up; a course costs a one-time price in credits and is the learner's forever.
- Price: `days × ⌈minutes ÷ 15⌉ × 4 × depth factor` (basic 1, intermediate 1.25, advanced 1.5), rounded to 10. Gallery courses: 60 %.
- Re-plan: next 7 upcoming days free, 2 credits per extra day (up to 28).
- Packs cheaper per credit as they grow: ₹99/100, ₹299/330, ₹499/575, ₹999/1,200, ₹1,999/2,500.
- No human creators: the AI writes every course, so no consent step and no creator rewards. Completed courses join the gallery automatically.

## Checkpoints

| Checkpoint | Delivers                                                                                   | Status  |
| ---------- | ------------------------------------------------------------------------------------------ | ------- |
| P5-C1      | Credits rework: gift, one-time purchase at approval, re-plan range and price, five packs   | built   |
| P5-C2      | Chat intake, basic / intermediate / advanced, topic safety, draft cap, gallery suggestions | planned |
| P5-C3      | Gallery: automatic publishing, search, filters, buying at 60 %                             | planned |
| P5-C4      | Close: e2e, docs                                                                           | planned |

## P5-C1: verified

`bun run check`: 180 tests. They cover:

- the gift is granted once, even when requested in parallel
- drafting costs nothing
- the price follows the version being bought
- five simultaneous Buy clicks make one charge
- 402 leaves a draft untouched, and a top-up then lets the purchase succeed
- re-plan pricing: 7 days free, then 2 per extra day, charged once on accept
- accepting without credits → 402
- another learner → 404
- a ledger-sum invariant after each money test

Mutation check: removing the balance guard fails two tests. `bun run e2e:learner` buys a course for exactly the gift (100) and then buys a pack, in Chrome, at 390px.

## P5-C1: not verified

Real Razorpay; the exchange rate and model-cost inputs of [../pricing.md](../pricing.md).

## P5-C2: verified

`bun run check`: 189 tests, 9 of them new for intake. They cover:

- a specific topic is accepted as typed
- a broad topic returns three options, and choosing one needs no new model call
- a refused topic gives a reason, and the course cannot be created through the API either (mutation check: removing the gate fails two tests)
- a direct `POST /courses` is checked once and the verdict remembered
- learner text is delimited in the prompt
- validation, plus a rejected model reply (broad without three options → 502, never shown)
- the 5-drafts-a-day cap, which buying a course relieves, and which is per learner

`bun run e2e:learner` now drives the chat: a refused topic, a broad topic with options, then the whole course at 390px.

## P5-C2: not verified

How well a real model judges topics (safety and specificity) and writes narrower options; only the fake responder was run. Check with `bun run smoke:real` and a few hand-typed topics at P7-C3.
