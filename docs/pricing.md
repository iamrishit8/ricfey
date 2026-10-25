# Pricing: credits and packs

Placeholder prices, set from measured cost. The owner decides the final numbers; every number
below is one constant in `packages/shared/src/credits.ts` or `packages/shared/src/payments.ts`.

## What a learner pays

| Thing                          | Credits                             | Where set          |
| ------------------------------ | ----------------------------------- | ------------------ |
| One course day, first opened   | ⌈minutes per day ÷ 15⌉ (30 min → 2) | `creditsPerDay`    |
| Re-plan, first 7 finished days | 0                                   | `REPLAN_FREE_DAYS` |
| Re-plan, after that            | 2                                   | `REPLAN_CREDITS`   |
| Welcome grant (once)           | +30                                 | `WELCOME_CREDITS`  |

| Pack    | Credits | Price | ₹ per credit | A 4-week, 30-min course (40 credits) |
| ------- | ------- | ----- | ------------ | ------------------------------------ |
| Starter | 50      | ₹149  | 2.98         | ₹119                                 |
| Regular | 120     | ₹299  | 2.49         | ₹100                                 |
| Big     | 300     | ₹599  | 2.00         | ₹80                                  |

## What it costs us

From [phase-1-cost-report.md](phase-1-cost-report.md) (Gemini prices from 2027-01-01, outline share + one day):

| Model                   | $ per course-day (measured) |
| ----------------------- | --------------------------- |
| `gemini-3.5-flash-lite` | $0.0056                     |
| `gemini-3.8-flash`      | $0.0276                     |

Not in that figure: the self-check (cheaper model, about one call per day) and task grading (one
call per submission, up to 3). Estimate **≈ $0.035 per 30-minute day on 3.8 Flash**, i.e. about
**$0.0175 per credit** [UNVERIFIED: grading and self-check cost not yet measured; run
`bun run smoke:real` and read `llmCalls`].

Converted at an **assumed ₹88 per US$** [UNVERIFIED: replace with a cited rate], one credit costs
about **₹1.54** to serve on 3.8 Flash, about ₹0.31 on Flash-Lite.

Razorpay takes **2 % per successful domestic transaction plus 18 % GST on that fee** (2.36 % of the
price) per https://razorpay.com/pricing/ (read 2026-10-25).

| Pack    | Net per credit after Razorpay | Margin per credit on 3.8 Flash |
| ------- | ----------------------------- | ------------------------------ |
| Starter | ₹2.91                         | ₹1.37                          |
| Regular | ₹2.43                         | ₹0.89                          |
| Big     | ₹1.95                         | ₹0.41                          |

## Risks to weigh

- **Welcome credits cost ≈ ₹46 per sign-up** on 3.8 Flash. Anyone with many email addresses can
  farm them. Mitigations when it matters: smaller grant, or grant after a first purchase.
- **Free re-plans and retries** are not charged; task grading is not charged separately. Heavy
  users cost more than the estimate.
- **Paid tier vs free tier.** Real learners need the paid Gemini tier (the free tier allows 20
  requests per day per model, and free-tier content may be used by Google). Costs above are paid-tier.
- **No refunds are automated.** Razorpay requires a published refund policy before going live (Phase 5).
