# Testing

How to verify everything that exists today. Updated at the end of each checkpoint.

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
