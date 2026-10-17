# Progress

## Now / Next / Blocked

- **Now:** C2 done, awaiting review (draft PR, stacked on C1).
- **Next:** C3, LLM layer and cost test.
- **Blocked:** Atlas cluster (you, for C2 sign-off); Gemini API key (C3 can start on FakeProvider).

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
- [x] Mongoose connection (verified on a local replica set; Atlas itself [UNVERIFIED] until you create it)
- [x] `User` and `Course` models with indexes
- [x] `bun test` for `/health` and the error shape

### C3. LLM layer and cost test (the gate)

- [ ] Look up current Gemini models and free-tier limits (cite URLs)
- [ ] Shared Zod schemas: `CourseOutline`, `DayContent` (lesson, task + rubric, quiz)
- [ ] `LlmProvider` interface, `GeminiProvider`, `FakeProvider`
- [ ] Retry once on invalid JSON with the validation error, then `AppError`
- [ ] Single daily cap on calls and tokens
- [ ] `llmCalls` collection: purpose, model, tokens in/out, latency, estimated cost
- [ ] `bun run gen:sample` writes outline + day 1 to docs/samples/
- [ ] Samples: Python, personal finance, music theory
- [ ] docs/phase-1-cost-report.md

### C4. Auth

- [ ] Google OAuth server-side flow
- [ ] Magic link: single-use, hashed, 15 min expiry, rate limited per email and IP
- [ ] httpOnly, secure, sameSite=lax session cookie
- [ ] Routes: /auth/google, /auth/google/callback, /auth/magic/request, /auth/magic/verify, /auth/me, /auth/logout
- [ ] Dev fallback: print magic link to console when no Resend key
- [ ] Tests: token reuse rejected, expired token rejected, /auth/me without cookie is 401

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
