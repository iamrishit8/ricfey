# Testing

How to verify everything that exists today. Updated at the end of each checkpoint and each phase.

**Snapshot (2026-10-28, P5-C1):** `bun run check` green: typecheck, lint, format, **180 tests, 0 fail**
(26 files) against a local MongoDB replica set. Without `MONGODB_URI_TEST` the DB-backed tests are skipped,
so a green run without it proves less. Browser e2e and `smoke:real` are run by hand (they need Chrome / a
Gemini key) and are not part of `check`.

**Not covered by any test (verify manually when the dependency exists):** Resend delivery, real Google
OAuth, real Razorpay and its live webhook payloads, Safari cookies, whether a real model obeys injected instructions, lesson factual accuracy,
real-phone layout.

## All-in-one

```sh
bun install
bun run check   # typecheck + lint + format:check + test; must exit 0
```

## C1. Skeleton

| What                              | Command                                                                                         | Expected                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Workspaces install                | `bun install`                                                                                   | no errors; `node_modules/@ricfey/shared` is a symlink |
| Every workspace typechecks        | `bun run typecheck`                                                                             | three lines, each `Exited with code 0`                |
| Typecheck actually catches errors | add `export const x: number = 'no';` to `packages/shared/src/index.ts`, run `bun run typecheck` | non-zero exit, error names the file. Then revert.     |
| Lint                              | `bun run lint`                                                                                  | exit 0, no output                                     |
| Formatting                        | `bun run format:check`                                                                          | "All matched files use Prettier code style!"          |
| Tests                             | `bun run test`                                                                                  | exit 0 (no test files yet)                            |
| `.env` is never committed         | `echo X=1 > .env && git status --short`                                                         | `.env` does **not** appear. Then `rm .env`.           |

## C2. API skeleton and MongoDB

Automated (`bun run test`):

| File                                 | Covers                                                                                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/app.test.ts`           | `/health` envelope; 404 shape; `AppError` code and status; unknown error → generic 500 with no leaked message; malformed JSON → 400; `validate()` per-field issues          |
| `apps/api/src/config/env.test.ts`    | defaults and coercion; missing `MONGODB_URI`; all problems listed at once; values never echoed; credential redaction                                                        |
| `apps/api/src/models/models.test.ts` | email unique ignoring case and whitespace; `googleId` unique only when set; course enum and range validation; default status. **Skipped unless `MONGODB_URI_TEST` is set.** |

Run the DB tests against a throwaway local replica set (needs `brew install mongodb-community`):

```sh
mkdir -p /tmp/ricfey-mongo
mongod --dbpath /tmp/ricfey-mongo --port 27099 --replSet rs0 --bind_ip 127.0.0.1 --fork --logpath /tmp/ricfey-mongo/log
mongosh --port 27099 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27099"}]})'   # once
MONGODB_URI_TEST='mongodb://127.0.0.1:27099/ricfey_test?replicaSet=rs0' bun test   # expect 0 skip
mongosh --port 27099 --eval 'db.adminCommand({shutdown:1})'   # stop it
```

Manual:

| What                        | Steps                                                                                   | Expected                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Fail fast on bad env        | remove `MONGODB_URI` from `.env`, `bun run dev:api`                                     | prints `MONGODB_URI: is required`, exits 1                                             |
| Clear DB error, no password | set `MONGODB_URI=mongodb://u:s3cret@127.0.0.1:1/x?serverSelectionTimeoutMS=1500`, start | "Could not connect to MongoDB (MongooseServerSelectionError)…"; `s3cret` not in output |
| Replica-set guard           | point `MONGODB_URI` at a standalone mongod (no `--replSet`)                             | "MongoDB must be a replica set", exits 1                                               |
| Health against Atlas        | real `MONGODB_URI`, `bun run dev:api`, `curl localhost:4000/health`                     | `"db":"connected"`                                                                     |
| Graceful shutdown           | Ctrl+C the server                                                                       | log line `SIGINT received, shutting down`                                              |

## C3. LLM layer and cost test

Automated (`bun run test`):

| File                                          | Covers                                                                                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/schemas/schemas.test.ts` | outline day numbering; depth enum; quiz `answerIndex` in range; rubric and lesson length required                                                                                                                                  |
| `apps/api/src/llm/pricing.test.ts`            | 3.8 Flash price doubles on 2027-01-01; Flash-Lite single price; cost formula; unknown model → `null`                                                                                                                               |
| `apps/api/src/llm/json-schema.test.ts`        | unsupported JSON-Schema keywords stripped; structure, required, bounds kept                                                                                                                                                        |
| `apps/api/src/llm/base-provider.test.ts`      | success logs one call; retry once with the error fed back; invalid twice → `LLM_INVALID_OUTPUT`, no third call; provider error → `LLM_UNAVAILABLE`; call cap, token cap, cap on retry; UTC day boundary; no internals in `details` |
| `apps/api/src/llm/course-generator.test.ts`   | wrong days per week and off-outline quiz topics trigger the retry; prompts contain the request                                                                                                                                     |
| `apps/api/src/llm/cost.test.ts`               | per course-day and 30-day math; today = half of 2027 for 3.8 Flash; retries counted; unpriced model fails                                                                                                                          |
| `apps/api/src/llm/usage-store.test.ts`        | writes to `llmCalls`; sums only today. **Needs `MONGODB_URI_TEST`.**                                                                                                                                                               |
| `apps/api/scripts/gen-sample.test.ts`         | `gen:sample --provider fake` end to end: files written, parse against the schemas                                                                                                                                                  |

Manual:

| What                     | Steps                                                                    | Expected                                                                                         |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Offline pipeline         | `bun run gen:sample -- --skill "Python" --provider fake --out /tmp/s`    | 5 files in `/tmp/s/python/fake/`, all text marked `[FAKE]`                                       |
| Report pipeline          | `bun run cost:report -- --samples /tmp/s --out /tmp/r.md --include-fake` | `/tmp/r.md` has tables with `$0.00000`                                                           |
| Missing key is clear     | `GEMINI_API_KEY= bun run gen:sample -- --skill "Python"`                 | one line: "GEMINI_API_KEY is not set…", exit 1                                                   |
| Bad args                 | `bun run gen:sample -- --skill X --depth guru --weeks 40`                | lists both problems, exit 2                                                                      |
| **Real run (needs key)** | `bun run gen:sample -- --skill "Python" --depth working --weeks 4`       | outline + day 1 in `docs/samples/python/gemini-3-8-flash/`; one `llmCalls` doc per call in Atlas |
| **Cap (needs key)**      | `LLM_DAILY_CALL_CAP=1 bun run gen:sample -- --skill "Python"`            | outline succeeds, day 1 fails "Daily AI usage limit reached"                                     |

## C4. Auth

Automated: `apps/api/src/routes/auth.test.ts` (the DB parts need `MONGODB_URI_TEST`) and the
auth env rules in `apps/api/src/config/env.test.ts`. Covers: `/auth/me` without a cookie → 401;
magic link request → verify → cookie flags (HttpOnly, Secure, SameSite=Lax) → `/auth/me`;
**token reuse rejected**, also with 5 concurrent verifies; **expired token (15 min + 1 ms)
rejected**, 14:59 accepted; tokens and sessions stored hashed only; per-email (6th → 429) and
per-IP (21st → 429) limits, window reset; bad email → 400; each user sees only themselves;
forged and expired sessions → 401; logout; Google state match, mismatch, missing cookie,
unverified email, account linking, failed exchange.

Manual (dev mode, no Resend key):

| What                            | Steps                                                                                                               | Expected                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Magic link end to end           | run the three `curl` lines in README "Sign in without a browser"                                                    | console prints `[dev] Magic link for y***@…`; verify returns your user; `/auth/me` returns it |
| Single use                      | repeat the verify `curl` with the same token                                                                        | 401 "This sign-in link is invalid or has expired."                                            |
| Logout                          | `curl -b jar -c jar -X POST localhost:4000/auth/logout -H 'content-type: application/json' -d '{}'` then `/auth/me` | 401                                                                                           |
| **Google (needs client)**       | open `http://localhost:4000/auth/google` in a browser                                                               | Google account chooser → back to `WEB_URL/` with a session                                    |
| **Resend (needs key + domain)** | set `RESEND_API_KEY`, `EMAIL_FROM`, request a link to your inbox                                                    | email arrives with the link                                                                   |

## C5. Web shell and style sheet

| What             | Steps                                                                        | Expected                                                                                          |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Build            | `cd apps/web && bun run build`                                               | builds, no errors                                                                                 |
| Styleguide       | `bun run dev:api` + `bun run dev:web`, open http://localhost:5173/styleguide | type scale, 10 colour swatches, 3 accent cards (1 marked Chosen), buttons, lesson card, quiz card |
| Quiz card        | pick an answer, Check answer                                                 | right answer turns green, a wrong pick turns red, explanation shown                               |
| Dark mode        | click ☾ Dark, or open `/styleguide?theme=dark`                               | dark token set; choice remembered after reload                                                    |
| Phone width      | `bun run shot -- http://localhost:5173/styleguide out.png 390`               | "no horizontal overflow"                                                                          |
| Login (browser)  | `/login`, enter an email, open the link from the API console                 | lands on `/` with "Signed in as …"                                                                |
| Login (scripted) | `bun run dev:api > api.log 2>&1 &` then `bun run e2e:login -- api.log`       | 7 ✓ lines: submit, link, signed in, cookie flags, JS can't read cookie, reuse rejected, sign-out  |
| Change accent    | edit `--brand: var(--accent-2)` in tokens.css                                | whole app switches to Cobalt                                                                      |

## P2-C1. Intake and placement

Automated: `apps/api/src/placement/adaptive.test.ts` (staircase, 8–12 questions, simulated
learners of skill 0–5 land in the right level, topic spread, strong/weak topics);
`apps/api/src/routes/courses.test.ts` (intake validation, intro skips placement with no LLM
call, questions carry no answers, all-correct → advanced and all-wrong → foundation,
concurrent double submit records once, **another learner gets 404 on every course route**,
failed bank → retry, skill passed as escaped data); `apps/api/src/llm/request-block.test.ts`.

Manual (dev mode, `LLM_PROVIDER=fake`): sign in with the README curl lines, then
`curl -b jar -X POST localhost:4000/courses -H 'content-type: application/json' -d '{"skill":"Music theory","depth":"working","weeks":3,"minutesPerDay":25}'`
then `curl -b jar localhost:4000/courses/<id>/placement`: a `[FAKE]` question with id and
options, no answer. Answer with `POST /courses/<id>/placement/answer {"questionId":"q7","answerIndex":0}`.

## P2-C2. Outline

Automated: `apps/api/src/outline/service.test.ts` (rename/remove/reorder and renumbering,
emptied week dropped, unknown/duplicate days refused, credit formula) and
`apps/api/src/routes/outline.test.ts` (generated once as v1 with quote; a retry while
generating starts no second job; placement level/weak topics/minutes reach the prompt; edit →
v2, v1 still readable, stale base → 409; approve latest → active, then edits refused;
**another learner gets 404 on every outline route**; failure → retry → ready).

Manual (dev mode): create an intro course, then `curl -b jar localhost:4000/courses/<id>/outline`
→ `[FAKE]` outline, `version: 1`, `quote`. Approve with
`curl -b jar -X POST localhost:4000/courses/<id>/outline/approve -H 'content-type: application/json' -d '{"version":1}'`.

## P2-C3. Daily unlock

Automated: `apps/api/src/days/schedule.test.ts` (India-time day boundaries, 5/week and 7/week
schedules, unlock rule) and `apps/api/src/routes/days.test.ts` (approval creates scheduled days
and generates nothing; open → generating → ready, answers stripped; **5 concurrent opens → one
generation**; locked day → 403 with `unlockAt`, opens by date and by completing the previous day;
self-check fail → regenerate with issues → ready; fail twice → flagged with content; contradictory
"pass" → flagged; generation failure → retry; needs approval; bad day numbers → 404; **another
learner → 404 and no generation**).

Manual (dev mode): approve an outline, then `curl -b jar localhost:4000/courses/<id>/days` and
`curl -b jar localhost:4000/courses/<id>/days/1` twice (first `generating`, then `ready` with a
`[FAKE]` lesson and a quiz without answers). Day 2 → 403 until tomorrow in India.

## P2-C4. Grading and progress

Automated: `apps/api/src/progress/streak.test.ts` (streak rules, India midnight boundary) and
`apps/api/src/routes/grading.test.ts` (quiz graded server-side, answers revealed only after
submitting; wrong count/option → 400, ungenerated day → 409, locked → 403; task 202 → graded with
rubric names; **answer delimited, injected closing tag neutralised**; impossible score twice →
failed; one in flight until stale, max 3; quiz+task finish the day and open the next; finishing
all days completes the course; progress days/topics/streak; retake updates topic scores;
**another learner → 404**).

Manual (dev mode): on an open, generated day:
`curl -b jar -X POST localhost:4000/courses/<id>/days/1/quiz -H 'content-type: application/json' -d '{"answers":[0,1,2,3,0]}'`
→ score and revealed answers. `curl -b jar -X POST …/days/1/task -d '{"answer":"…at least 20 chars…"}'`
→ 202; then `GET …/days/1` shows `progress.latestTask` graded. `GET /courses/<id>/progress`.

## P2-C5. Web screens

| What                     | Steps                                                                                                                                                                   | Expected                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Whole journey (scripted) | `bun run dev:api > api.log 2>&1 &`, `bun run dev:web &`, then `bun run e2e:learner -- api.log shots/`                                                                   | 10 ✓ lines; screenshots in `shots/` at desktop and 390px; fails on any horizontal overflow |
| Whole journey (by hand)  | sign in → Start a new course (Working) → answer placement → rename/move a day, Save, Approve → Start → read, submit task, check quiz → Flag a mistake → Scores by topic | each step as named; flagged reports in the `reports` collection                            |
| Locked day               | open `/courses/<id>/days/2` before finishing day 1                                                                                                                      | "Not open yet" with the date                                                               |
| Real LLM path            | `bun run smoke:real` (uses quota)                                                                                                                                       | every step prints a status; output in `docs/samples/smoke/`                                |
| Report API               | `apps/api/src/routes/grading.test.ts` → "flag a mistake"                                                                                                                | stored, validated, other learners 404                                                      |

## P3-C1. Re-planning backend

Automated: `packages/shared/src/schemas/replan.test.ts` (mastery thresholds, horizon, price, quality
metrics) and `apps/api/src/routes/replan.test.ts` (weak/strong mastery; no re-plan before a finished
day; propose → accept rewrites only unopened days within the horizon as outline version
`replanned`, and later generation uses it; prompt carries scores as delimited data; one open re-plan
per course; reject; a day opened after the proposal makes it **stale** with nothing changed; a model
that omits the weak topic twice → `failed`; auto mode applies by itself and waits 3 days before the
next; auto without weak topics and manual mode never re-plan; price 0 until 7 finished days, then 2;
settings; **another learner → 404 on every route**). Mutation check: disabling the weak-topic rule
makes the "omits the weak topic" test fail.

Manual (dev mode, fake LLM): finish day 1 with a wrong quiz, then
`curl -b jar localhost:4000/courses/<id>/mastery`, `curl -b jar -X POST localhost:4000/courses/<id>/replan`,
`curl -b jar localhost:4000/courses/<id>/replan` (→ `proposed`), then `POST …/replan/<rid>/accept`.

Real model: `bun run smoke:real` now ends with a re-plan step (~1 extra call).

## P3-C2. Re-planning screens

| What                | Steps                                                          | Expected                                                                                                         |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Scripted            | `bun run e2e:learner -- api.log shots/` (fake LLM)             | ends with "re-plan proposed" and "re-plan accepted; the day list shows the rewritten days"; no overflow at 390px |
| Mode at intake      | New course → choose "Automatically" → create                   | `GET /courses/<id>` shows `replanMode: "auto"`                                                                   |
| Propose and compare | Finish day 1 with a poor quiz → course home → "Adapt days N–M" | "Rethinking…", then changed days highlighted with the old title struck through                                   |
| Accept / reject     | "Use the new plan" or "Keep my plan"                           | day list updates / nothing changes; a short status line explains                                                 |
| Stale               | Propose, open the first proposed day, then accept              | error: the proposal expired                                                                                      |
| Switch mode         | Toggle "When I ask" / "Automatically" on the course home       | persists after reload                                                                                            |

## P4-C1. Credits ledger

Automated: `apps/api/src/routes/credits.test.ts`: welcome credits granted once (also under parallel
calls); approval charges nothing; opening a day charges ⌈minutes ÷ 15⌉ once; **5 concurrent first
opens by a brand-new learner → one charge, one generation**; not enough credits → 402
`INSUFFICIENT_CREDITS` with `{needed, balance}` and the day is not claimed; a failed generation is
retried free; a priced re-plan is charged once on accept, never on reject or a second accept;
accepting without credits → 402, still proposed, outline unchanged; auto mode without credits stays
proposed; each learner sees only their own ledger. Every test checks the ledger invariant: the sum of
entries equals the balance and each `balanceAfter` chains.

Manual: `curl -b jar localhost:4000/credits` → `{ balance: 30, entries: [welcome] }`; open a day →
balance drops by ⌈minutes ÷ 15⌉; open it again → unchanged.

## P4-C2. Razorpay (fake gateway by default)

Automated: `apps/api/src/routes/payments.test.ts`: the real `RazorpayGateway` builds the documented
request (Basic auth, amount in paise, receipt) against a stubbed `fetch`, hides Razorpay's error
body, and checks both signature schemes; packs listed; order → checkout verify credits the pack once,
a replayed proof adds nothing; tampered signature or foreign payment id → 400, no credits; another
learner → 404 on verify and simulate; webhook credits once, redelivery (same event id) and a later
checkout add nothing; **checkout and webhook at the same time → exactly one purchase entry**; bad
webhook signature → 401; wrong amount, unknown order, other events → no credits; malformed body →
400; unknown pack → 400; 10 orders per hour; the simulate route doesn't exist with the real gateway.
`config/env.test.ts`: razorpay needs all three keys; production needs `PAYMENTS_PROVIDER=razorpay`.

Manual (fake gateway):

```sh
curl -b jar -X POST localhost:4000/payments/orders -H 'content-type: application/json' -d '{"packId":"starter"}'
curl -b jar -X POST localhost:4000/payments/orders/<orderId>/simulate          # → paymentId, signature
curl -b jar -X POST localhost:4000/payments/verify -H 'content-type: application/json' \
  -d '{"orderId":"<orderId>","paymentId":"<paymentId>","signature":"<signature>"}'   # → paid, balance +50
```

Real Razorpay [UNVERIFIED]: needs test-mode keys (NEEDS-FROM-ME). Then `PAYMENTS_PROVIDER=razorpay`,
buy a pack with UPI id `success@razorpay` (test mode, no money). Webhooks need a public HTTPS URL
(Razorpay does not call localhost); use a tunnel.

## P4-C3. Credits screens

| What                             | Steps                                                                                    | Expected                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Scripted                         | `bun run e2e:learner -- api.log shots/` (fake LLM, fake payments)                        | ends with "credits: 28 after day 1; bought the Starter pack (test mode) → 78"; no overflow at 390px |
| Header balance                   | Sign in                                                                                  | header shows `30`; after opening a new day it drops by ⌈minutes ÷ 15⌉                               |
| Out of credits                   | Spend down (or set the balance low in the DB with an `adjustment` entry), open a new day | "You’re out of credits for this" with needed/balance and **Get credits →**                          |
| Buy (fake)                       | Credits → Buy for ₹149                                                                   | "Test mode" note; "Added 50 credits"; history shows `Bought … +50`                                  |
| Buy (Razorpay test) [UNVERIFIED] | `PAYMENTS_PROVIDER=razorpay` + test keys; Buy → Checkout → UPI `success@razorpay`        | credited once; closing Checkout adds nothing                                                        |

## P5-C1. Credits rework (buy a course once)

Automated: `apps/api/src/routes/credits.test.ts` and `packages/shared/src/credits.test.ts`: price formula and
packs; 100 welcome credits once (also under parallel calls); drafting is free; **buying charges once, opening
days is free**; **five simultaneous Buy clicks → one charge, one set of days**; 402 with `{needed, balance}`,
the course stays a draft, and the purchase succeeds after a top-up; the price follows the version bought;
re-plan 7 days free, extra days 2 credits each, charged once on accept, reject free, accept without credits →
402 and still proposed, `ahead` > 28 → 400, auto mode 7 days free; another learner → 404. Every money test
checks the ledger invariant (sum of entries = balance, `balanceAfter` chains). Mutation: removing the balance
guard in `credits/service.ts` fails the 402 tests.

Manual (fake LLM, fake payments): sign in → header `100 credits` → new course (working, 2 weeks, 30 min) → roadmap
shows `Buy for 100 credits →` → buy → header `0` → open days freely → course home "Adapt days 2–8" is free →
Credits → Buy for ₹99 → `100`. With less than the price the button reads "Get N more credits →".
