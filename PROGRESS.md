# Progress

## Now / Next / Blocked

- **Now:** P2-C3 done (PR open). P2-C4 grading next.
- **Next:** P2-C2 → P2-C5, then HANDOFF.md.
- **Blocked:** Atlas rejects this machine's IP (NEEDS-FROM-ME). Dev and tests use a local replica set: `MONGODB_URI=mongodb://127.0.0.1:27199/ricfey?replicaSet=rs0`.

---

## Phase 1: Foundations (detail in [docs/phases/phase-1.md](docs/phases/phase-1.md))

### C1. Guardrail files and skeleton

- [x] CLAUDE.md, README.md, ARCHITECTURE.md, DECISIONS.md, PROGRESS.md, LEARNING.md, TESTING.md
- [x] docs/phases/phase-1.md
- [x] .env.example, .gitignore, root package.json with workspaces, shared tsconfig, ESLint, Prettier
- [x] Empty workspaces apps/api, apps/web, packages/shared that install and typecheck

### C2. API skeleton and MongoDB

- [x] Fastify app with `GET /health`
- [x] Response envelope, single `AppError`, one error handler
- [x] Zod request-validation helper
- [x] Env config validated with Zod at startup, fail fast
- [x] Verify Mongoose runs on Bun
- [x] Mongoose connection (verified on a local replica set and on Atlas: `/health` reports `db: connected`, DB tests pass on `ricfey_test`)
- [x] `User` and `Course` models with indexes
- [x] `bun test` for `/health` and the error shape

### C3. LLM layer and cost test (the gate)

- [x] Look up current Gemini models and free-tier limits (cite URLs). Limits only in AI Studio; 3.8 Flash RPD = 20 learned from a 429
- [x] Shared Zod schemas: `CourseOutline`, `DayContent` (lesson, task + rubric, quiz)
- [x] `LlmProvider` interface, `FakeProvider`, `GeminiProvider` (verified live on both models)
- [x] Retry once on invalid JSON with the validation error, then `AppError`; backoff retry for 503/transient 429
- [x] Single daily cap on calls and tokens (default 16/day, below the 20/day free-tier RPD)
- [x] `llmCalls` collection: purpose, model, tokens in/out/thinking, latency, estimated cost (verified in Atlas)
- [x] Cost estimator by model and date (3.8 Flash vs 3.5 Flash-Lite; 2027 prices primary)
- [x] `bun run gen:sample` writes outline + day 1
- [~] Samples: 4 of 6 done. Missing: personal finance and music theory on `gemini-3.8-flash` (daily quota hit). Re-run after the quota resets (midnight Pacific).
- [x] docs/phase-1-cost-report.md generated from the 4 complete samples
- [ ] You read the samples (gate)

### C4. Auth

- [x] Google OAuth server-side flow with `state` check (tested with a fake Google client; real Google [UNVERIFIED], needs a client)
- [x] Magic link: single-use (atomic), hashed, 15 min expiry, rate limited per email (5/15 min) and IP (20/15 min)
- [x] httpOnly, secure, sameSite=lax session cookie; sessions stored hashed in Mongo with TTL
- [x] Routes: /auth/google, /auth/google/callback, /auth/magic/request, /auth/magic/verify, /auth/me, /auth/logout
- [x] Dev fallback: magic link printed to console (email masked) when no Resend key; verified manually
- [x] Tests: token reuse rejected (also concurrently), expired token rejected, /auth/me without cookie is 401, plus 18 more
- [ ] Resend email delivery [UNVERIFIED]: needs a key and a verified domain

### C5. Web shell and style sheet

- [x] Vite + React 19 + TypeScript, React Router 8, Tailwind v4, shadcn/ui-style components, CSS-variable tokens (light + dark)
- [x] /styleguide: type scale, colours, accent options, buttons/inputs, lesson card, interactive quiz card
- [x] Three accent options shown; option 1 (Vermilion) chosen, one token to change (`--brand` in tokens.css)
- [x] Login page (magic link + Google button) and `/auth/magic` landing page that POSTs the token
- [x] Verified in real headless Chrome: styleguide light/dark, 390px phone width (no overflow), full login flow (`bun run e2e:login`)
- [ ] Safari [UNVERIFIED]: Secure cookie on http://localhost is not kept by Safari; use Chrome/Firefox or `COOKIE_SECURE=false` in dev

### Phase 1 gate

- [ ] Three generated courses the user is happy to learn from (6 samples ready for you to read)
- [x] Measured cost per course-day (docs/phase-1-cost-report.md)
- [x] Login works locally (magic link, dev mode; Google needs a client)
- [x] /styleguide renders
- [x] typecheck, lint, tests green (DB tests need a reachable replica set; see NEEDS-FROM-ME)

---

## Phase 2: Course creation and the daily loop

Rules for every Phase 2 checkpoint: lazy, idempotent day generation; cheaper self-check per
lesson (regenerate once, then flag); Zod before store/show; learners only reach their own
courses (tested); learner text is delimited data in prompts.

### P2-C1. Intake and placement

- [x] `POST /courses` (skill, depth intro/working/deep, weeks 1–12, minutes per day 10–120), `GET /courses`, `GET /courses/:id`
- [x] Intro depth skips placement; others get an adaptive 8–12 question quiz (harder after correct, easier after wrong)
- [x] One LLM call builds a 15-question bank (3 per difficulty); the staircase picks from it, no per-question calls
- [x] Stores starting level (foundation/intermediate/advanced), ability, strong and weak topics on the course
- [x] Questions sent without answers; double submits record once (409); another learner gets 404 on every route
- [x] `LLM_PROVIDER=fake` runs everything offline; prompts carry an escaped `<request>` block and a data rule
- [ ] Real Gemini placement bank [UNVERIFIED]: not run, to save quota (schema shape mirrors the verified day schema)

### P2-C2. Outline

- [x] Generated in the background from intake + placement (level, strong/weak topics, minutes per day); one job per course (atomic claim)
- [x] `GET/PUT /courses/:id/outline`, `POST …/approve`, `POST …/retry`; every edit is a new version, old versions readable (`?version=N`)
- [x] Edits: rename days and week themes, remove, reorder (days referenced by `fromDay`; topics/objectives can't be edited); stale base → 409
- [x] Approve the latest version → course `active`, `startedAt` set; no edits after approval
- [x] Credit quote from a fixed formula (⌈minutes ÷ 15⌉ × days); nothing charged
- [x] Another learner gets 404 on every outline route

### P2-C3. Daily unlock

- [x] `courseDays` created at approval; schedule in India time (5 days/week by default; day 6 = day 1 + 7)
- [x] A day opens when the previous day is finished or its date arrives; locked → 403 with `unlockAt`
- [x] Lazy: generated on first open; idempotent: 5 concurrent opens → one generation (tested, and the test fails without the claim)
- [x] Self-check with the cheaper model against the outline entry; fail → regenerate once with the issues → still failing → flagged (content kept)
- [x] Quiz answers and explanations never sent before the quiz; another learner gets 404 and can't trigger generation
- [ ] Real Gemini self-check [UNVERIFIED]: not run (quota)

### P2-C4. Grading

- [ ] Auto-graded quizzes; model-graded tasks (score, feedback, missed rubric lines); every attempt stored

### P2-C5. Web screens

- [ ] Intake, placement, outline approval, Today, task, quiz, progress (days, topic scores, streak), flag a mistake

## Phase 3: Adaptive re-planning (proposed)

- [ ] Topic mastery from quiz tags
- [ ] Re-cut remaining days from scores
- [ ] Re-plan quality evaluation

## Phase 4: Credits and payments (proposed)

- [ ] Credits ledger with Mongo transactions
- [ ] Razorpay orders, webhooks, idempotency
- [ ] Pricing from the measured cost per course-day

## Phase 5: Launch (proposed)

- [ ] Deploy API + web, production secrets
- [ ] Error monitoring, LLM spend alerts
- [ ] Privacy policy, terms, refund policy (needed for Razorpay)
