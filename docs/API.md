# HTTP API reference

Base URL in development: `http://127.0.0.1:4000` (the web app reaches it as `/api/*` via the Vite proxy).
Source of truth: `apps/api/src/routes/*.ts`. Request/response types: `packages/shared/src`.

## Conventions

- **Envelope.** Success: `{ "success": true, "data": … }`. Failure: `{ "success": false, "error": { "code", "message", "details"? } }`.
- **Auth.** A session cookie `ricfey_session` (httpOnly, SameSite=Lax, `Secure` by default). "Auth" below means that cookie is required; without it the route returns 401 `UNAUTHORIZED`.
- **Ownership.** Every `/courses/:id/…` route checks the course belongs to the caller. Someone else's course returns **404**, the same as a course that does not exist.
- **Validation.** Bodies and queries are validated with Zod; failures are 400 `VALIDATION_ERROR` with per-field `details`.
- **Error codes** (closed list, `packages/shared/src/api.ts`): `BAD_REQUEST`, `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `INSUFFICIENT_CREDITS` (402, `details: { needed, balance }`), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `LLM_CAP_REACHED`, `LLM_INVALID_OUTPUT`, `LLM_UNAVAILABLE`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`. Unknown errors become a generic `INTERNAL_ERROR`; internals are never leaked.
- **Slow work is asynchronous.** Placement bank, outline, day generation and task grading run in the background. The route returns at once with a status (`generating`, `grading`); clients poll the matching GET until it is `ready`/`graded`/`failed`.

## Health

| Method | Path      | Auth | Notes                                                        |
| ------ | --------- | ---- | ------------------------------------------------------------ |
| GET    | `/health` | no   | Liveness plus DB state: `{ status: "ok", db: "connected" }`. |

## Auth ([walkthrough](walkthroughs/01-auth.md))

| Method | Path                    | Auth | Body / notes                                                                                                           |
| ------ | ----------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/magic/request`   | no   | `{ email }`. Always `{ sent: true }` (no account enumeration). Rate limit: 5 per email and 20 per IP per 15 min → 429. |
| POST   | `/auth/magic/verify`    | no   | `{ token }`. Single use, 15 min expiry. Sets the session cookie, returns `{ user }`. Invalid/used/expired → 401.       |
| GET    | `/auth/google`          | no   | Redirects to Google (sets a `state` cookie). 503 if Google is not configured.                                          |
| GET    | `/auth/google/callback` | no   | Checks `state`, signs in, redirects to the web app (or `/login?error=…`).                                              |
| GET    | `/auth/me`              | yes  | `{ user }`.                                                                                                            |
| POST   | `/auth/logout`          | yes  | Deletes the session and clears the cookie.                                                                             |

## Courses and placement ([walkthrough](walkthroughs/02-course-creation.md))

| Method | Path                            | Body / notes                                                                                                                                                                                             |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/courses`                      | `{ skill (2–120 chars, one line), depth: "intro"\|"working"\|"deep", weeks 1–12, minutesPerDay 10–120 }` → 201 `{ course }`. `intro` skips placement and starts the outline; otherwise starts placement. |
| GET    | `/courses`                      | Your courses, newest first (max 100).                                                                                                                                                                    |
| GET    | `/courses/:id`                  | `{ course }` (status, placement result, outline status, `startedAt`).                                                                                                                                    |
| GET    | `/courses/:id/placement`        | `{ placement }`: `generating` / `ready` (with the current question, **no answer**) / `completed` / `failed`.                                                                                             |
| POST   | `/courses/:id/placement/answer` | `{ questionId, answerIndex }`. Returns the next question, or the final result and a `course` now in `outline`. Answering twice → 409. Not in placement → 409.                                            |
| POST   | `/courses/:id/placement/retry`  | Regenerate a failed placement bank.                                                                                                                                                                      |

## Outline ([walkthrough](walkthroughs/02-course-creation.md))

| Method | Path                           | Body / notes                                                                                                                                                                                         |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/courses/:id/outline`         | Query `?version=N` for an older version. Returns `{ status, version, approvedVersion, outline, quote, versions[] }`.                                                                                 |
| PUT    | `/courses/:id/outline`         | `{ baseVersion, weeks: [{ theme, days: [{ fromDay, title }] }] }`. Creates a new version. Omit a day to remove it; order gives the new order. Stale `baseVersion` → 409. Not allowed after approval. |
| POST   | `/courses/:id/outline/approve` | `{ version }`. Latest version only. Course becomes `active`, `startedAt` is set, day rows are created.                                                                                               |
| POST   | `/courses/:id/outline/retry`   | Regenerate a failed outline.                                                                                                                                                                         |

## Days, quiz, task, progress ([walkthrough](walkthroughs/03-daily-loop.md))

| Method | Path                          | Body / notes                                                                                                                                                                                                                         |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/courses/:id/days`           | One summary per day: `status`, `unlocked`, `unlockAt`, `completedAt`, `flagged`.                                                                                                                                                     |
| GET    | `/courses/:id/days/:n`        | Opens day _n_. **Locked → 403** with `unlockAt`. First open of an unlocked day starts generation (status `generating`; poll). When ready: lesson, task + rubric, quiz **without answers**, plus the learner's progress for that day. |
| POST   | `/courses/:id/days/:n/quiz`   | `{ answers: number[] }`. Graded on the server; returns the score and, now, each answer with its explanation. Every attempt is stored.                                                                                                |
| POST   | `/courses/:id/days/:n/task`   | `{ answer (20–5000 chars) }` → **202** `{ attempt }` with status `grading`. Poll `GET …/days/:n` for the grade. Max 3 attempts per day, one grading at a time.                                                                       |
| POST   | `/courses/:id/days/:n/report` | "Flag a mistake": `{ kind: "factual_error"\|"wrong_quiz_answer"\|"unclear"\|"other", message, excerpt? }`. Max 20 per day.                                                                                                           |
| GET    | `/courses/:id/progress`       | `{ daysTotal, daysCompleted, topicScores[], streak: { current, longest } }`.                                                                                                                                                         |

## Re-planning ([walkthrough](walkthroughs/06-replanning.md))

| Method | Path                              | Body / notes                                                                                                                                                                                                                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/courses/:id/mastery`            | `{ mastery: { topics: [{ topic, correct, total, percent, status }], weakTopics, strongTopics } }`.                                                                                                                                                           |
| GET    | `/courses/:id/replan`             | `{ replan, policy }`. `replan`: latest one or null (`status`, `trigger`, `before`, `after`, `rationale`, `weakTopics`, `quality`, `priceCredits`). `policy`: `{ mode, freeAheadDays, maxAheadDays, pricePerExtraDay, replannableDays }`.                     |
| POST   | `/courses/:id/replan`             | `{ ahead?: 1–28 }` (default 7) → **202** `generating`; poll the GET. The first 7 days are free, each extra costs 2 (`priceCredits`, charged on accept). 400 if `ahead` > 28; 409 if no day is finished yet, no upcoming day is left, or one is already open. |
| POST   | `/courses/:id/replan/:rid/accept` | Apply a `proposed` re-plan (transaction). 409 if not proposed or now **stale**.                                                                                                                                                                              |
| POST   | `/courses/:id/replan/:rid/reject` | Close a `proposed` re-plan without changes.                                                                                                                                                                                                                  |
| PATCH  | `/courses/:id/settings`           | `{ replanMode: "manual" \| "auto" }` → `{ course }`.                                                                                                                                                                                                         |

`POST /courses` also accepts `replanMode` (default `manual`).

A day counts as finished when a quiz **and** a task have been submitted (not necessarily passed). Finishing day _n_ opens day _n+1_ immediately; otherwise it opens on its scheduled date (India time).

## Credits and payments ([walkthrough](walkthroughs/07-credits-and-payments.md))

| Method | Path                                 | Auth      | Body / notes                                                                                                                                                             |
| ------ | ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/credits`                           | yes       | `{ credits: { balance, entries[] } }` (latest 50). Grants 100 welcome credits on first use.                                                                              |
| GET    | `/payments/packs`                    | no        | `{ packs: [{ id, credits, pricePaise, label }] }`.                                                                                                                       |
| POST   | `/payments/orders`                   | yes       | `{ packId }` → 201 `{ order: { orderId, amountPaise, currency, keyId, gateway, pack } }`. 10 per hour.                                                                   |
| POST   | `/payments/verify`                   | yes       | `{ orderId, paymentId, signature }` from Checkout. Bad signature → 400; someone else's order → 404. → `{ payment: { status, credits, balance } }`. Idempotent.           |
| POST   | `/payments/orders/:orderId/simulate` | yes       | **Fake gateway only.** Returns a signed pretend payment to pass to `verify`.                                                                                             |
| POST   | `/webhooks/razorpay`                 | signature | Raw JSON body; `X-Razorpay-Signature` required (401 if wrong), `X-Razorpay-Event-Id` deduplicates. Credits on `order.paid` / `payment.captured` when the amount matches. |
