# Decisions

Newest at the bottom. Each entry: date, decision, why, alternatives rejected, revisit when.

---

### 2026-10-17 · Bun workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`)

- **Why:** one install, one lockfile, shared Zod schemas without publishing a package.
- **Rejected:** separate repos (schema drift); Turborepo/Nx (not needed at this size).
- **Revisit:** if CI gets slow enough to need task caching.

### 2026-10-17 · API on Bun + Fastify + TypeScript + Zod

- **Why:** Bun runs TypeScript directly and includes a test runner. Fastify is mature, fast,
  has a good plugin model. Zod gives runtime validation plus inferred types.
- **Rejected:** Express (weaker typing, older error handling); Hono (fine, but Fastify's
  ecosystem for cookies/OAuth/rate-limit is deeper).
- **Revisit:** if a Fastify plugin we need misbehaves on Bun.

### 2026-10-17 · MongoDB Atlas via Mongoose, replica set required

- **Why:** user already knows Mongoose. Credits need multi-document transactions, which
  MongoDB only supports on a replica set; every Atlas cluster, including free M0, is one.
- **Rejected:** Postgres + an ORM (stronger fit for a ledger, but a new tool to learn now).
- **Open check:** Mongoose on Bun is verified at C2, before we depend on it. [UNVERIFIED]
- **Revisit:** when the credits ledger is designed (Phase 4). Ledgers are relational by nature.

### 2026-10-17 · Auth: Google OAuth + email magic link, email via Resend

- **Why:** no passwords to store or reset. Google covers most Indian users; magic link covers the rest.
- **Rejected:** passwords (reset flows, breach liability); third-party auth SaaS (cost, lock-in).
- **Revisit:** if email deliverability in India is poor, or users ask for phone OTP.

### 2026-10-17 · AI: Gemini free tier behind an `LlmProvider` interface, model name in env

- **Why:** zero cost while validating. The interface keeps us free to switch providers.
- **Rejected:** calling the SDK directly from routes (lock-in, untestable).
- **Caveat:** free-tier limits and data-use terms are looked up at C3 from official docs.
- **Revisit:** after the C3 cost report, and before any real user traffic.

### 2026-10-17 · Web: React + Vite + Tailwind + shadcn/ui, tokens as CSS variables

- **Why:** shadcn components are copied into the repo (we own them) and are themed via CSS
  variables, which matches a light-first / dark-second token setup.
- **Rejected:** Next.js (SSR not needed for a logged-in app; adds a second server).
- **Revisit:** if SEO pages need server rendering (could be a separate static site).

### 2026-10-17 · Payments: credits in INR via Razorpay

- **Why:** India first; Razorpay supports UPI, cards, netbanking.
- **Rejected:** Stripe (its India availability for new merchants is restricted [UNVERIFIED], and Razorpay is the local default).
- **Revisit:** when expanding outside India.

### 2026-10-17 · Pin TypeScript to 6.0.x

- **Why:** `bun add typescript` installed 7.0.2, and typescript-eslint 8.71 refuses to load
  on it (peer range `>=4.8.4 <6.1.0`; error "typescript-eslint does not support TS 7.0").
- **Rejected:** dropping type-aware linting; ESLint without typescript-eslint.
- **Revisit:** when typescript-eslint supports TS 7.

### 2026-10-17 · ESLint flat config + Prettier, Prettier owns formatting

- **Why:** `eslint-config-prettier` turns off style rules, so the two never fight.
- **Rejected:** Biome (one tool, faster, but not in the locked stack).
- **Revisit:** if lint time becomes a problem.

### 2026-10-17 · Mongoose on Bun: verified

- **Why:** Bun's guide says Mongoose works with no extra configuration
  (https://bun.com/guides/ecosystem/mongoose). Checked locally too: Mongoose 9.11.2 on Bun
  1.4.2 against a MongoDB 7.0 single-node replica set connected, committed a transaction, and
  rolled back an aborted one.
- **Rejected:** switching to the raw `mongodb` driver (no need).
- **Revisit:** if a Mongoose or Bun upgrade breaks the DB tests.

### 2026-10-17 · DB tests run against a real replica set via `MONGODB_URI_TEST`, else skip

- **Why:** model tests (unique indexes, validation) only mean something against real MongoDB.
  No new dependency: point it at a local `mongod --replSet` or a throwaway Atlas database.
- **Rejected:** `mongodb-memory-server` (new dependency, downloads a mongod binary, Bun support
  unchecked); mocking Mongoose (would test the mock, not the indexes).
- **Cost:** skipped tests are easy to miss. `bun test` prints a warning when they skip.
- **Revisit:** at C4, when auth tests need a DB; CI will need a Mongo service container.

### 2026-10-17 · `/health` is liveness only

- **Why:** it returns 200 whenever the process is up and reports `db` state as data. A
  readiness check that fails when Mongo is down can be added when we have a deploy target.
- **Rejected:** returning 503 when the DB is down (a host would restart a healthy process
  during a brief Atlas blip).
- **Revisit:** Phase 5, when choosing a host and its health-check semantics.

### 2026-10-17 · Course depth is `intro | working | deep`, weeks 1 to 12

- **Why:** the brief uses `--depth working`; the other two values and the 12-week ceiling are
  my picks, kept in `packages/shared` so web and API agree.
- **Revisit:** at C3, after seeing how the outline prompt uses depth. Change before real data exists.

### 2026-10-17 · Error codes are a closed list in `packages/shared`

- **Why:** the web app can switch on `error.code` with type safety. `AppError` maps each code
  to one HTTP status, so routes can't invent mismatched pairs.
- **Revisit:** add codes as features need them, in the same PR as the feature.
