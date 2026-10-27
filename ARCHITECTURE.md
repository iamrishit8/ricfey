# Architecture

How Ricfey is put together, and which parts exist. Each part is marked **BUILT** or **PLANNED**.
Deeper explanations: [docs/walkthroughs/](docs/walkthroughs/). Routes: [docs/API.md](docs/API.md). Collections: [docs/DATA-MODEL.md](docs/DATA-MODEL.md).

## The product in one paragraph

A learner says what they want to learn, how deep, for how many weeks and minutes a day. For
non-beginners an adaptive quiz measures their level. An LLM drafts a day-by-day outline, which
the learner edits and approves. Each day then unlocks a lesson, a practice task graded by the
model against a rubric, and an auto-graded quiz. Progress, topic scores and a streak accumulate.
Quiz scores re-shape the next few days, on request or automatically. Learners buy each course once with
credits (100 free at sign-up; more in rupee packs through Razorpay) and keep it forever.

## System

```
 Browser  apps/web  React + Vite + Tailwind + shadcn/ui-style components
    │   same origin: Vite proxies /api/* → API in dev; JSON + httpOnly session cookie
    ▼
 API  apps/api  Bun + Fastify + TypeScript
    ├─ routes/        thin HTTP layer: auth, courses, outline, days, grading, health
    ├─ services       placement/, outline/, days/, grading/, progress/, replan/  (business rules)
    ├─ auth/          sessions, magic link, Google, rate limits, mailer
    ├─ credits/       ledger, transactions;  payments/  PaymentGateway ─► Razorpay | Fake
    ├─ llm/           LlmProvider ─► BaseLlmProvider (cap · validate · retry · log)
    │                     ├─ GeminiProvider (@google/genai)
    │                     └─ FakeProvider  (tests + offline dev)
    ├─ lib/           AppError, response envelope, validate(), background jobs
    └─ models/        Mongoose schemas
    │
    ▼
 MongoDB (replica set)     Gemini API     Resend (email)     Razorpay

 packages/shared   Zod schemas + types imported by both apps, so they cannot disagree
 tools/browser     Chrome DevTools-protocol scripts: screenshots, browser e2e
```

## Parts and status

| Part                                                                                                | Status            | Notes                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| Bun workspaces monorepo, shared tsconfig, ESLint, Prettier                                          | **BUILT** (P1-C1) |                                                         |
| Fastify app, `/health`, response envelope, single `AppError`, Zod validation helper, env validation | **BUILT** (P1-C2) | fail fast at startup                                    |
| Mongoose + `User`, `Course` models                                                                  | **BUILT** (P1-C2) | replica set enforced                                    |
| Shared `CourseOutline` / `DayContent` schemas                                                       | **BUILT** (P1-C3) |                                                         |
| `LlmProvider`, Gemini, Fake, daily cap, `llmCalls`, cost estimator                                  | **BUILT** (P1-C3) | Gemini verified live                                    |
| `gen:sample` + cost report                                                                          | **BUILT** (P1-C3) | 6 real samples in `docs/samples`                        |
| Magic-link auth, sessions, rate limits                                                              | **BUILT** (P1-C4) | Resend delivery **[UNVERIFIED]**                        |
| Google OAuth                                                                                        | **BUILT** (P1-C4) | tested with a fake Google; real Google **[UNVERIFIED]** |
| Web shell, tokens (light/dark), `/styleguide`, login                                                | **BUILT** (P1-C5) |                                                         |
| Intake + adaptive placement                                                                         | **BUILT** (P2-C1) | 1 LLM call, deterministic staircase                     |
| Versioned outline: edit, approve, credit quote                                                      | **BUILT** (P2-C2) |                                                         |
| Daily unlock, lazy idempotent generation, self-check                                                | **BUILT** (P2-C3) |                                                         |
| Quiz + task grading, progress, streak                                                               | **BUILT** (P2-C4) |                                                         |
| Learner web screens, flag a mistake, browser e2e, real-LLM smoke                                    | **BUILT** (P2-C5) |                                                         |
| Topic mastery + re-planning from scores                                                             | PLANNED (Phase 3) |                                                         |
| Credits ledger (Mongo transactions)                                                                 | PLANNED (Phase 4) | quote exists, nothing charged                           |
| Razorpay orders, webhooks, idempotency                                                              | PLANNED (Phase 4) |                                                         |
| Deploy, monitoring, spend alerts, legal pages                                                       | PLANNED (Phase 5) |                                                         |

## Lifecycles

**Course:** `placement → outline → active → completed` (`intro` depth starts at `outline`; `archived` is reserved).
**Day:** `locked → generating → ready | flagged | failed`; finished when a quiz and a task are both submitted.
**Re-plan:** `generating → proposed → applied | rejected | stale`, or `failed`.
**Payment:** `created → paid` (by checkout or webhook, once).
**Task attempt:** `grading → graded | failed`. **Placement:** `generating → ready → completed | failed`.

## Request flow (example: opening a day)

1. Browser `GET /api/courses/:id/days/3` → Vite proxy → Fastify.
2. `requireUser` resolves the session cookie → user. `loadOwnCourse(userId, id)` → 404 if not theirs.
3. `openDay`: unlocked? (else 403). Content missing? Atomic claim → background job → respond `generating`.
4. Browser polls; job generates, self-checks, validates with Zod, stores. Next poll returns the lesson (quiz answers stripped).

## Principles

- **One error shape.** Routes return `{success,data}` or `{success:false,error}`; everything throws `AppError` and one handler shapes it. Raw errors never reach a client.
- **LLM behind an interface.** Only `llm/` touches an SDK. Every call is capped and logged.
- **Validate at every boundary.** Env at startup, requests at routes, model output before store or display.
- **Learner text is data.** Delimited in prompts; the editable parts of an outline are limited so edited text never becomes instruction.
- **Ownership everywhere.** Every course-scoped query includes `userId`; other users get 404.
- **Lazy, idempotent expensive work.** Generate when asked; conditional updates make double-clicks and retries safe.
- **Offline by default.** `LLM_PROVIDER=fake` and the dev mailer mean the whole product runs with no external accounts.

## Known limits (be honest)

- Background jobs run in the API process; a restart abandons in-flight work (recovered by stale-claim re-claiming). Fine for one instance.
- Lesson correctness is not verified by the system. The self-check is a filter; learners can flag mistakes.
- Free-tier Gemini: 20 requests/day/model and 1–4 minutes per generation.
