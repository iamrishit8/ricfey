# Progress

## Now / Next / Blocked

- **Now:** C4 done (PR open). C5 web shell next.
- **Next:** at each checkpoint start, if the Gemini quota has reset, run the 2 missing 3.8 Flash samples and `bun run cost:report`.
- **Blocked:** nothing hard. Google OAuth and Resend run in dev mode until NEEDS-FROM-ME.md items are done.

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

- [ ] Vite React app, router, Tailwind, shadcn/ui, CSS-variable tokens (light + dark)
- [ ] /styleguide: type scale, colours, buttons, lesson card, quiz card
- [ ] Three accent colour options, user picks one
- [ ] Login page working against the API

### Phase 1 gate

- [ ] Three generated courses the user is happy to learn from
- [ ] Measured cost per course-day
- [ ] Login works locally
- [ ] /styleguide renders
- [ ] typecheck, lint, tests green

---

## Phase 2: Course creation and the daily loop (proposed, not yet agreed)

- [ ] Course intake form → outline → user confirms
- [ ] Day generation on demand, lesson/task/quiz screens
- [ ] Quiz submission and scoring, task self-check against rubric

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
