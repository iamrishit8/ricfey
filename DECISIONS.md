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

### 2026-10-18 · LLM layer: one base class does cap, log, validate, retry

- **Why:** the brief wants `generateStructured` on the provider interface and the cap in one
  place. `BaseLlmProvider` implements both; Gemini and Fake only implement `callModel`. So
  retry and logging can't drift between providers.
- **Rejected:** each provider implementing retry itself (duplicated, will diverge); a separate
  wrapper object around a "transport" (adds a type with no extra benefit right now).
- **Revisit:** if a provider needs a different retry policy (e.g. rate-limit backoff).

### 2026-10-18 · Gemini call: `models.generateContent` + `responseJsonSchema`, schema stripped

- **Why:** `@google/genai` 2.30 supports it; its type docs list the JSON-Schema keywords
  Gemini accepts. Zod's output includes others (`minLength`, `$schema`), so we strip to that
  allowlist and let Zod enforce the rest on the response.
- **Rejected:** the newer Interactions API shown in the structured-output docs (less familiar,
  no gain for single-shot calls).
- **Revisit:** when the key exists, if Gemini rejects or ignores the schema.

### 2026-10-18 · Cost model and prices

- **Why:** you asked for model comparison and 2027 prices. `pricing.ts` holds dated price
  periods per model (source URL and read date in the file); cost = f(model, tokens, date).
  The report's primary figure uses prices from 2027-01-01, today's beside. Thinking tokens
  count as output. Retries and failed attempts count because they are billed.
- **Rejected:** a single "current price" constant (silently wrong on 1 Jan 2027).
- **Revisit:** whenever the pricing page changes; re-read and update the read date.

### 2026-10-18 · Daily cap is per UTC day, global, and checked before every call

- **Why:** no users yet, so global. Retries are checked too. Google's free-tier RPD resets at
  midnight Pacific (rate-limits page), so keep `LLM_DAILY_CALL_CAP` below your RPD.
- **Known gap:** concurrent requests can both pass the check (read-then-call race). Harmless at
  script scale; needs an atomic counter before real traffic.
- **Revisit:** Phase 2, when users can trigger generation; add per-user caps then.

### 2026-10-18 · Default 5 learning days per week

- **Why:** the brief says "Z weeks" but not days per week. 5 is my pick (realistic for adults);
  `gen:sample --days-per-week` overrides it. The cost report uses per-course-day figures, so
  this choice doesn't distort the 30-day extrapolation.
- **Revisit:** when designing the intake form (Phase 2): probably the learner's choice.

### 2026-10-18 · Fake samples are never committed to docs/samples

- **Why:** placeholder text next to real samples is easy to mistake for real output.
  `cost:report` skips fake samples unless `--include-fake` (only for testing the script).

### 2026-10-18 · Autonomous mode adopted

- **Why:** you asked for the rest of Phase 1 and all of Phase 2 without check-ins. Rules are in
  CLAUDE.md "Autonomous mode"; anything needing you goes to NEEDS-FROM-ME.md.
- **Cost:** decisions you would have pushed back on get made without you. Every one is logged
  here so you can reverse it.

### 2026-10-18 · `LLM_DAILY_CALL_CAP` default lowered from 100 to 40

- **Why:** free-tier requests/day are only visible in AI Studio, which I can't read. 40 is a
  guess that is very likely under the real limit and enough for 6 samples with retries.
- **Revisit:** once you read your RPD (NEEDS-FROM-ME.md); set it just below the smaller one.

### 2026-10-18 · No item-count bounds on arrays of objects in the Gemini schema

- **Found:** the outline request failed with `400 INVALID_ARGUMENT`. Bisected with real calls:
  a single week (days 1..7) passes; weeks 1..12 of nested days fails; flat days 1..84 fails;
  the same arrays without bounds pass. Likely a schema-size limit in constrained decoding.
  [Inference: the error message gives no reason.]
- **Decision:** `toGeminiJsonSchema` drops `minItems`/`maxItems` on arrays whose items are
  objects. Zod still enforces the counts; the prompt states them; a miss triggers the retry.
- **Revisit:** if Gemini publishes schema limits, or retries for wrong counts become common.

### 2026-10-18 · Transient provider errors get a backoff retry (5 s, then 20 s)

- **Why:** `gemini-3.8-flash` returned `503 "high demand"` several times on the free tier,
  and the first call per process sometimes took ~2 minutes. These are not our fault and
  usually pass. 429/500/503 are retried twice, separately from the one schema-fix retry.
  Every try is cap-checked and logged as its own `llmCalls` row.
- **Rejected:** retrying forever (could burn the daily cap); no retry (samples fail randomly).
- **Revisit:** before real traffic: a user should not wait 25 s. Generation should move to a
  background job (Phase 2 unlock is async-friendly).

### 2026-10-18 · Thinking tokens dominate output

- **Found:** on trivial prompts `gemini-3.8-flash` reported ~95% of output tokens as thinking
  (e.g. 186 of 192). Thinking is billed as output, so it drives cost. The cost report shows the
  share per sample. A thinking budget/level is a possible cost lever, not applied yet.
- **Revisit:** after the cost report, if cost per course-day is too high.

### 2026-10-18 · Free-tier RPD for gemini-3.8-flash is 20; cap default 16; daily 429s not retried

- **Found:** a 429 named `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit 20, retry in
  ~4.5 h. Bisection probes plus samples used it up. Flash-Lite's limit is still unknown.
- **Decision:** `LLM_DAILY_CALL_CAP` default 16 (global, so it also stays under each model's 20).
  A 429 whose message names a per-day quota is not backoff-retried.
- **Implication:** on the free tier, 3.8 Flash can produce about 10 course-days a day for the
  whole app. The free tier can't serve real users; Phase 2 runs on Flash-Lite or the fake.
- **Revisit:** when billing is enabled (Phase 4/5), or if Flash-Lite's RPD is also tiny.

### 2026-10-18 · Generated cost report is excluded from Prettier

- **Why:** it is rewritten by `cost:report`; hand-formatting would be overwritten.

### 2026-10-18 · Sessions: opaque random token in a cookie, SHA-256 hash in Mongo

- **Why:** revocable (logout deletes the row), nothing secret at rest, no signing key to manage.
  Plain SHA-256 suffices because tokens are 256-bit random, not passwords. No `SESSION_SECRET`
  is needed after all (it was listed as a future var in C1).
- **Rejected:** JWTs in cookies (can't be revoked before expiry without a denylist, i.e. a DB anyway).
- **Revisit:** if session lookups become a hot path (add a cache).

### 2026-10-18 · Magic link opens a web page that POSTs the token

- **Why:** email security scanners often GET every link in an email; a GET-verify would burn
  the single-use token before the person clicks. `/auth/magic/verify` is POST only; the email
  link points at `${WEB_URL}/auth/magic?token=…` (page built in C5).
- **Rejected:** GET verify with redirect (simpler, breaks for Outlook/corporate users).

### 2026-10-18 · Rate limits in MongoDB, fixed 15-minute windows: 5/email, 20/IP

- **Why:** atomic upsert + `$inc`, shared across processes, testable with an injected clock; no
  new dependency. Email keys are SHA-256 hashed so the collection holds no addresses.
- **Rejected:** `@fastify/rate-limit` (in-memory by default, per route not per email).
- **Known gap:** fixed windows allow a burst of up to 2× at a window boundary. Fine for login.
- **Revisit:** behind a proxy, set `TRUST_PROXY=true` or every user shares one IP bucket.

### 2026-10-18 · Google: state cookie, no PKCE; profile from the userinfo endpoint

- **Why:** Google's web-server flow page documents `state` but not PKCE (the discovery doc does
  list S256). Adding an undocumented parameter to an unverifiable flow risks breaking it. The
  profile comes from the userinfo endpoint over HTTPS with the access token, so no ID-token
  signature check (and no JWT library) is needed.
- **Account linking:** a Google login whose verified email matches an existing magic-link user
  links to that user (you didn't answer the C1 question; this is the default I proposed).
- **Revisit:** add PKCE once the real client is verified.

### 2026-10-18 · `COOKIE_SECURE` defaults to true, may be false only outside production

- **Why:** the brief says secure. Chrome and Firefox keep Secure cookies on http://localhost;
  Safari doesn't, so `COOKIE_SECURE=false` exists for Safari dev. Env rules reject it in production.

### 2026-10-18 · Request logs omit query strings

- **Why:** the Google callback URL carries `code` and `state`. Logging paths only keeps them out.

### 2026-10-20 · Accent: option 1 (Vermilion) chosen, switchable with one token

- **Why:** you asked me to pick option 1. `--brand` in `apps/web/src/styles/tokens.css` points at
  `--accent-1`; change it to `--accent-2` (Cobalt) or `--accent-3` (Forest). Each option has a
  dark-mode variant and a contrasting foreground.

### 2026-10-20 · Fonts: Fraunces (display) + Inter (reading), from Google Fonts

- **Why:** Fraunces is a variable serif with "soft" and "wonky" axes: expressive and editorial,
  which suits the playful btay.ca brief. Inter is plain and highly readable for long lessons.
- **Rejected:** self-hosting via @fontsource packages (two more dependencies for no gain yet).
- **Revisit:** before launch: self-host to avoid a third-party request and for privacy.

### 2026-10-20 · shadcn/ui components copied by hand, not via the CLI

- **Why:** the CLI is interactive; shadcn's model is "copy the code into your repo" anyway.
  `components.json` is present so the CLI can add more components later. Deps that shadcn
  components need: `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`.

### 2026-10-20 · Same-origin dev setup: Vite proxies /api → API

- **Why:** the browser only talks to :5173, so the session cookie needs no CORS or
  cross-site settings. Production will need the same shape (one domain, path-routed).
- **Revisit:** at deploy (Phase 5).

### 2026-10-20 · Browser checks via a small Chrome DevTools-protocol script, not Playwright

- **Why:** no new dependency; Chrome is installed. `bun run shot` and `bun run e2e:login` give
  screenshots at exact widths and a real-browser login test. Headless Chrome's minimum window
  width is 500px, so plain `--screenshot` at 390 crops a 500px layout (it looked like a bug).
  The script sets the viewport through the protocol instead.
- **Rejected:** Playwright (large dependency + browser downloads) for now.
- **Revisit:** when browser tests should run in CI.

### 2026-10-20 · Local replica set while Atlas rejects this machine

- **Why:** autonomous mode says don't wait. A local `mongod --replSet` on port 27199 stands in
  (27099 belongs to another project's mongod). `.env` is unchanged; commands override
  `MONGODB_URI`/`MONGODB_URI_TEST`. The last two C3 samples logged `llmCalls` there.

### 2026-10-20 · Placement: one LLM call per placement, a staircase over a question bank

- **Why:** the free tier allows 20 requests/day per model. One call per question (8–12) would
  burn a day's quota on one learner. One call generates 15 questions (3 per difficulty 1–5);
  the server picks each next question from the bank. Start at 3; +1 after correct, −1 after
  wrong. Stop at 12, or from 8 once the last 4 targets span ≤ 1 step.
- **Ability** = mean of the next target after each of the last 4 answers (where the staircase
  settled), not the asked difficulty: with 3 questions per level the bank runs dry and asks
  neighbouring levels, which mis-placed everyone as intermediate until a test caught it.
  Levels: < 2.5 foundation, < 3.75 intermediate, else advanced. Strong topic: ≥ 2 answers and
  ≥ 75% right; weak: ≤ 50% right.
- **"Beginners skip placement"** is read as depth = intro (the brief has no separate flag).
- **Revisit:** if placement results feel wrong in use; a bigger bank costs no extra calls.

### 2026-10-20 · Slow LLM work runs in the background; clients poll

- **Why:** real Gemini calls took up to ~2.5 minutes. Holding an HTTP request that long is
  fragile. Routes save a "generating" state, start the work in-process, and return at once.
  A stale-lock window (5 min) lets a retry recover work lost to a restart.
- **Rejected:** a job queue (Redis/BullMQ: new infrastructure) for now.
- **Revisit:** before running more than one API process, or when restarts lose work in practice.

### 2026-10-20 · `LLM_PROVIDER=fake` by default; prompts carry a `<request>` block

- **Why:** development and tests must not spend the 20/day quota. The dev fake answers every
  purpose with schema-valid `[FAKE]` content. Each prompt ends with its parameters as JSON in
  `<request>` tags, which helps the real model too. `<` inside is escaped so learner text can't
  close the block; every prompt states that tagged text is data, not instructions.
  Production refuses `fake`.

### 2026-10-20 · Course statuses: placement → outline → active → completed

- **Why:** replaces C2's `draft`. No real courses existed, so no migration.

### 2026-10-20 · Outline edits reference days; only titles and themes are free text

- **Why:** an edit sends weeks of `{ fromDay, title }` plus week themes. Remove = omit, reorder
  = position, rename = title. Topics and objectives are copied from the stored outline, so a
  learner can't write new objectives that later flow into lesson prompts as instructions.
  Titles still reach prompts, inside the data-tagged block.
- **Concurrency:** edits name `baseVersion`; the course's version bump is conditional on it,
  backed by a unique (courseId, version) index. A stale page gets 409.
- **Not supported:** adding new days. **Revisit:** if learners ask; it would need a generation step.

### 2026-10-20 · Credit quote: ⌈minutes per day ÷ 15⌉ × days

- **Why:** you asked for a fixed formula, shown and not charged. Cost scales with lesson
  length, so minutes per day is the lever. At C3's measured Flash-Lite cost (~$0.005 per
  course-day) a 30-minute day = 2 credits, which leaves room to price credits later.
- **Revisit:** Phase 4, when credits get a rupee price and real costs from `llmCalls`.

### 2026-10-20 · Outline prompt keeps learner text out of the prose

- **Why:** the skill used to be interpolated into the instruction sentence. It now appears only
  inside the escaped `<request>` block. The C3 samples were made with the earlier wording.

### 2026-10-20 · A day opens when the previous day is finished OR its date arrives

- **Why:** the brief's rule. Dates are India calendar days (UTC+5:30, no daylight saving), so a
  day opens at midnight in India. With `daysPerWeek` (default 5) learning days run in a row and
  the next week starts 7 days after the previous: day 6 = day 1 + 7. "Finished" is set in P2-C4
  (quiz and task both submitted).
- **Consequence:** a learner who falls behind still gets each day on its date; one who races
  ahead can do several days in one sitting.
- **Revisit:** a per-learner timezone once users outside India arrive.

### 2026-10-20 · Lazy, idempotent day generation via a conditional claim

- **Why:** generate only days that learners reach (quota), exactly once. Opening a day runs one
  `findOneAndUpdate` whose filter requires `content: null` and a non-generating status; only one
  request can win. A 5-minute stale window lets a crashed job be retried.
- **Self-check:** the cheaper model (`GEMINI_CHECK_MODEL`) reviews the draft against its outline
  entry. A "pass" whose own flags say otherwise counts as a fail. Fail → regenerate once with the
  reviewer's issues in the prompt → fail again → keep the second draft, mark the day `flagged`
  (shown to the learner with a warning), store the issues. If the reviewer itself errors, the day
  is flagged without regenerating.
- **Cost:** 2 calls per day normally, 4 at worst.

### 2026-10-20 · Day finished = quiz submitted and task submitted (not passed)

- **Why:** "finished" gates the next day. Requiring a pass would trap learners on a hard day;
  their scores already feed the per-topic view (and Phase 3 re-planning). A task whose grading
  fails still counts as submitted.
- **Revisit:** Phase 3, if weak scores should trigger review days instead of moving on.

### 2026-10-20 · 3 task attempts per course-day, one grading at a time

- **Why:** each grade is an LLM call against a 20/day free-tier quota shared by everyone.
  A grading attempt older than 5 minutes no longer blocks (crash recovery). Staleness uses the
  attempt's own `gradingStartedAt` (from the app clock), not Mongo's `createdAt`.
- **Revisit:** on the paid tier; credits may pay for extra attempts (Phase 4).

### 2026-10-20 · Topic scores use the latest quiz attempt per day; streak counts India days

- **Why:** retaking a quiz after reviewing should update the picture. A streak day is any India
  calendar day on which a course day was finished; the current streak survives until the end of
  the next day (it counts back from yesterday if nothing is done yet today).

### 2026-10-20 · Lessons rendered with react-markdown, raw HTML off

- **Why:** lessons are model output. react-markdown builds React elements and ignores raw HTML
  unless a plugin enables it; we enable only `remark-gfm` (tables, strikethrough). No
  `dangerouslySetInnerHTML` anywhere.
- **Cost:** the bundle is ~500 kB (Vite warns). **Revisit:** lazy-load the day page.

### 2026-10-20 · Fake provider is not held to the daily cap on the server

- **Why:** fake calls cost nothing, but they were counted toward the 16/day cap and blocked a
  browser test after a few runs. In `LLM_PROVIDER=fake` mode the providers get an effectively
  unlimited cap; calls are still logged. In `gemini` mode the real cap applies as before.

### 2026-10-20 · `bun run smoke:real` instead of real calls in tests

- **Why:** tests must not spend quota or depend on the network. One script drives a course
  through placement bank → outline → day + self-check → grading with real Gemini (~6 calls)
  and writes the result to docs/samples/smoke/. First run passed every step. Latencies on the
  free tier: bank ~3.5 min, outline ~3 min, day ~50 s, grading ~50 s.
