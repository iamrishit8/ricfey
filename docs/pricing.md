# Pricing: credits, courses and packs

Placeholder prices set from measured cost. The owner decides the final numbers; every number is
one constant in `packages/shared/src/credits.ts`, `schemas/replan.ts` or `payments.ts`.

## Model

Credits are the learner's money. A new account gets **100 free credits** once. A learner picks a
topic, depth and duration, the app designs the roadmap and shows its **one-time price in credits**.
Buying the roadmap deducts that price once and the learner keeps the course **forever**. Opening
days, quizzes and tasks cost nothing more.

| Thing                                       | Credits                                                                              | Constant                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| Welcome gift (once)                         | 100                                                                                  | `WELCOME_CREDITS`              |
| Course price                                | days × ⌈minutes per day ÷ 15⌉ × 4 × depth factor, rounded to the nearest 10 (min 10) | `coursePrice`                  |
| Depth factor                                | basic 1 · intermediate 1.25 · advanced 1.5                                           | `DEPTH_PRICE_FACTOR`           |
| Re-plan: next 7 upcoming days               | free                                                                                 | `REPLAN_FREE_AHEAD_DAYS`       |
| Re-plan: each day beyond 7 (up to 28 ahead) | 2                                                                                    | `REPLAN_CREDITS_PER_EXTRA_DAY` |
| Gallery course (Phase 5, P5-C3)             | 60 % of the custom price                                                             | planned                        |

Examples (price in credits):

| Course                              | Credits |
| ----------------------------------- | ------- |
| 2 weeks, 20 min a day, basic        | 80      |
| 4 weeks, 30 min a day, intermediate | 200     |
| 12 weeks, 60 min a day, advanced    | 1,440   |

## Packs (cheaper per credit the more you buy)

| Pack    | Credits | Price  | ₹ per credit |
| ------- | ------- | ------ | ------------ |
| Spark   | 100     | ₹99    | 0.99         |
| Starter | 330     | ₹299   | 0.91         |
| Regular | 575     | ₹499   | 0.87         |
| Big     | 1,200   | ₹999   | 0.83         |
| Mega    | 2,500   | ₹1,999 | 0.80         |

## What it costs us

From [phase-1-cost-report.md](phase-1-cost-report.md) (Gemini prices from 2027-01-01, outline share
plus one day, 30-minute days): about **$0.0276 per day on `gemini-3.8-flash`** and **$0.0056 on
`gemini-3.5-flash-lite`**. Not included: the self-check (about one cheaper call per day), task
grading (up to 3 calls per day), the placement quiz and re-plans. Estimate **≈ $0.035 per
30-minute day on 3.8 Flash** [UNVERIFIED: self-check and grading not yet measured; run
`bun run smoke:real` and read `llmCalls`].

At an **assumed ₹88 per US$** [UNVERIFIED: replace with a cited rate]:

| Course                        | Our cost (3.8 Flash) | Price (credits) | Revenue at ₹0.99 / ₹0.80 per credit | Margin at worst |
| ----------------------------- | -------------------- | --------------- | ----------------------------------- | --------------- |
| 20 days, 30 min, intermediate | ≈ ₹62                | 200             | ₹198 / ₹160                         | ≈ ₹98           |
| 10 days, 20 min, basic        | ≈ ₹31                | 80              | ₹79 / ₹64                           | ≈ ₹33           |

Razorpay takes **2 % plus 18 % GST on that fee** (2.36 % in total) per https://razorpay.com/pricing/
(read 2026-10-25), which leaves the worst-case margin above about 15 % lower.

## Risks to weigh

- **The welcome gift covers a whole short course** (≈ ₹31 of model cost for an 80-credit course).
  Anyone with many email addresses can farm it. Mitigations when it matters: a smaller gift, or
  granting it after email verification plus a cap per device.
- **Unpaid drafts cost model calls** (placement bank, outline) before anyone buys. P5-C2 caps drafts per learner per day.
- **Re-plans beyond 7 days are charged at 2 credits per day**, about the cost of the model call.
- **Free tier vs paid tier.** Real learners need the paid Gemini tier (free: 20 requests a day per model).
- **No automated refunds.** Razorpay needs a published refund policy before going live (Phase 7).
