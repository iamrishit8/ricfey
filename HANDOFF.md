# Handoff

Where Ricfey stands after Phase 1 and Phase 2 (2026-10-20), and what only you can do next.
For the current state, see [PROGRESS.md](PROGRESS.md). For why each decision was made, see [DECISIONS.md](DECISIONS.md).

## What is built

A learner signs in, says what they want to learn, how deep, for how many weeks and how many
minutes a day. Depending on depth, they take an adaptive placement quiz. They then review and
edit a generated outline, approve it, and work through one day at a time: a lesson, a practice
task graded by the model, and an auto-graded quiz. Progress shows days done, score per topic and
a streak. Any day's content can be flagged as wrong.

| Phase | Checkpoint | What                                                                     | PR                                                  |
| ----- | ---------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| 1     | C1         | Guardrail docs, Bun monorepo, lint/format/typecheck                      | [#1](https://github.com/iamrishit8/ricfey/pull/1)   |
| 1     | C2         | Fastify API, error envelope, env validation, Mongoose models             | [#2](https://github.com/iamrishit8/ricfey/pull/2)   |
| 1     | C3         | LLM layer (Gemini + fake), daily cap, `llmCalls`, 6 samples, cost report | [#3](https://github.com/iamrishit8/ricfey/pull/3)   |
| 1     | C4         | Auth: Google OAuth, magic link, sessions, rate limits                    | [#4](https://github.com/iamrishit8/ricfey/pull/4)   |
| 1     | C5         | Web shell, design tokens, `/styleguide`, login                           | [#5](https://github.com/iamrishit8/ricfey/pull/5)   |
| 2     | P2-C1      | Intake + adaptive placement                                              | [#6](https://github.com/iamrishit8/ricfey/pull/6)   |
| 2     | P2-C2      | Versioned outline: edit, approve, credit quote                           | [#7](https://github.com/iamrishit8/ricfey/pull/7)   |
| 2     | P2-C3      | Daily unlock, lazy idempotent generation, self-check + flag              | [#8](https://github.com/iamrishit8/ricfey/pull/8)   |
| 2     | P2-C4      | Quiz and task grading, progress, streak                                  | [#9](https://github.com/iamrishit8/ricfey/pull/9)   |
| 2     | P2-C5      | All learner screens, flag a mistake, browser e2e, real-LLM smoke         | [#10](https://github.com/iamrishit8/ricfey/pull/10) |

The PRs are drafts, **stacked**: each targets the branch before it. Review and merge them in
order (#1 first). After each merge, GitHub retargets the next PR to `main`. Nothing has been merged
or pushed to `main` except the empty first commit you approved.

## Run it locally, end to end

**You need:**

- Bun (tested on 1.4.2).
- MongoDB as a replica set: either Atlas, or a local `mongod`.
- Google Chrome, but only for the browser scripts.

```sh
bun install
cp .env.example .env          # first time only; fill GEMINI_API_KEY etc. (see README table)
```

**Database.** Atlas currently rejects this machine's IP (see "Needs from you" below). Until you
fix that, run a local replica set and point the app at it. Port 27099 is taken by your
whispernet project's mongod, so use 27199:

```sh
mkdir -p ~/ricfey-mongo
mongod --dbpath ~/ricfey-mongo --port 27199 --replSet rs0 --bind_ip 127.0.0.1 --fork --logpath ~/ricfey-mongo/log
mongosh --port 27199 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27199"}]})'   # once
```

Then set `MONGODB_URI=mongodb://127.0.0.1:27199/ricfey?replicaSet=rs0` and
`MONGODB_URI_TEST=mongodb://127.0.0.1:27199/ricfey_test?replicaSet=rs0` in `.env`, or pass them on
the command line.

**Start it** (two terminals):

```sh
bun run dev:api      # :4000. LLM_PROVIDER=fake by default: placeholder [FAKE] content, no quota used
bun run dev:web      # http://localhost:5173
```

Open http://localhost:5173/login and enter any email. With no Resend key, the API terminal
prints `[dev] Magic link for y***@…: http://localhost:5173/auth/magic?token=…`. Open that link.
Use Chrome or Firefox: Safari won't keep the Secure cookie on http://localhost.

**Real lessons:** set `LLM_PROVIDER=gemini` in `.env` and restart the API.

- Each course costs about 2 calls up front (placement bank, outline) plus 2 to 4 per day (lesson + self-check) plus 1 per task submission.
- The free tier allows **20 requests per day per model**, and `LLM_DAILY_CALL_CAP` (default 16) is the app's own ceiling.
- Expect 1 to 4 minutes of "Writing…" per step on the free tier.

**Checks:**

```sh
bun run check                          # typecheck + lint + format + 137 tests (DB tests need MONGODB_URI_TEST)
bun run dev:api > api.log 2>&1 &       # then, with dev:web running:
bun run e2e:learner -- api.log shots/  # the whole learner journey in Chrome, every screen at 390px too
bun run smoke:real                     # every Phase 2 LLM step on real Gemini (~6 calls of quota)
```

## What was verified, and what was not

**Verified**

- `bun run check`: typecheck, lint and format clean; **137 tests pass**, 0 fail, against a local MongoDB replica set.
- **Auth:**
  - A magic token works exactly once, including 5 concurrent attempts.
  - An expired token is rejected; `/auth/me` without a cookie returns 401.
  - Tokens and sessions are stored hashed only; per-email and per-IP rate limits work.
  - Google's `state` is checked, tested with a fake Google client.
- **Ownership:** another learner gets **404 on every course, outline, day, quiz, task, progress and report route** (tested per route).
- **Day generation is idempotent:** 5 concurrent opens produce exactly one generation. The test fails if the claim is removed.
- **Answers never leave the server early:** quiz answers aren't sent before the quiz (API tests and a browser check), and neither are placement answers.
- **Learner text in prompts is delimited data.** Injected closing tags are neutralised (tests on the prompts).
- **Real Gemini, every Phase 2 step** (`bun run smoke:real`, 2026-10-20): placement bank, placement, outline, day 1 with a self-check pass, and task grading. The output is in `docs/samples/smoke/`.
- **Real Gemini, C3 samples:** 6 samples (3 skills × 2 models). An outline-schema rejection was found by bisection and fixed. The free-tier limit (20/day/model) was learned from a 429.
- **Real browser (headless Chrome):**
  - Login: the cookie is httpOnly, Secure and SameSite=Lax, and invisible to JavaScript.
  - The full learner journey works.
  - Styleguide in light and dark.
  - No horizontal overflow at 390px on any screen.
- **Atlas:** worked on 2026-10-17 (C2, C3).

**Not verified** [UNVERIFIED]

- **Google sign-in against real Google:** no OAuth client exists yet.
- **Email delivery through Resend:** no key or verified domain yet.
- **Atlas since 2026-10-20:** the IP access list blocks this machine. All later work ran on a local replica set.
- **Safari:** not tested; the Secure cookie on localhost is known not to work there.
- **Whether a model obeys injected instructions in a task answer:** only the prompt structure is tested, not the model's behaviour.
- **Lesson quality and factual accuracy.** That's your gate, below. A self-check "pass" is not proof of correctness.
- **Free-tier limits for `gemini-3.5-flash-lite`:** shown only in AI Studio.
- **Mobile layout:** checked in Chrome's mobile emulation, not on a real phone.

## Needs from you

These are copied from [NEEDS-FROM-ME.md](NEEDS-FROM-ME.md).

1. **Atlas IP access list.** Atlas → Network Access → Add IP `122.167.114.111` (your IP on 2026-10-20; it changes, so consider your ISP's range). This unblocks `MONGODB_URI` and `MONGODB_URI_TEST`.
2. **Read the samples** (Phase 1 gate). Paths below.
3. **AI Studio → rate limits:** read RPM, TPM and RPD for `gemini-3.5-flash-lite`. Add them to `KNOWN_RPD` in `apps/api/scripts/cost-report.ts`, and keep `LLM_DAILY_CALL_CAP` below the smallest RPD.
4. **Google OAuth client:**
   - Set up the app at https://console.developers.google.com/auth/branding.
   - Then at https://console.developers.google.com/auth/clients: Create client → Web application, with redirect URI `http://localhost:4000/auth/google/callback`.
   - This fills `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI`.
5. **Resend:** create an account, verify a domain you own, and create an API key. This fills `RESEND_API_KEY` and `EMAIL_FROM`.

## Samples and the cost report

- **C3 samples:** `docs/samples/<skill>/<model>/` for Python, personal finance and music theory, each on `gemini-3.8-flash` and `gemini-3.5-flash-lite`. Read `outline.md` and `day-01.md`; `usage.json` has the token counts.
- **Phase 2 smoke course:** `docs/samples/smoke/2026-10-20-personal-finance.json`. It holds the placement bank, outline, day 1 with its self-check, and a graded task. The task scored 0/10 because the smoke script's generic answer didn't address the task.
- **Cost report:** `docs/phase-1-cost-report.md`. A 30-day course costs about **$0.16 on Flash-Lite** and **$0.77 on 3.8 Flash** at the prices that apply from 1 Jan 2027 ($0.39 on 3.8 Flash at today's prices).
  - These figures cover one outline plus day 1, not placement, self-check or grading. Phase 2 adds roughly one cheap check call per day, plus grading per task.
- **Facts from the samples that you should weigh:** the Flash-Lite lessons ran shorter than asked, and their quiz answers clustered at option B.

## What you must do to pass the gates

**Phase 1 gate: read the samples.** Read the six `day-01.md` files and their outlines. Decide
whether you'd learn from them and which model. Note anything wrong. Nothing in this repo calls
them good; that judgement is yours.

**Phase 2 gate: take 7 days of a real course, and log every factual error.**

1. Fix the Atlas IP, or keep using the local replica set. Set `LLM_PROVIDER=gemini` and restart `bun run dev:api`.
2. Start a course on a subject you know well enough to spot errors. A 2-week course at 20 to 30 minutes a day is enough.
3. Each day, read the lesson, do the task and the quiz.
   - You don't need to wait a calendar day: finishing a day (quiz + task submitted) opens the next.
   - Quota: a day costs 2 to 4 generation calls plus 1 per task submission. The free tier allows 20 per model per day, and the app caps at 16, so plan about 3 days per sitting.
   - Placement and outline take 2 more calls on the first day.
4. **For every factual error, wrong quiz answer or unclear passage, press "⚑ Flag a mistake"** on that day and say what's wrong.
5. Afterwards, list what you logged:

   ```sh
   mongosh "$MONGODB_URI" --eval 'db.reports.find({}, {day:1, kind:1, message:1, createdAt:1}).sort({createdAt:1}).forEach(printjson)'
   ```

6. Note which days were marked "flagged" by the automatic self-check (shown as a banner). Did those match the errors you found?

That list is the input for deciding the model, the prompts and whether the self-check earns its cost.

## Known limitations

- **Background generation is in-process.** A restart mid-generation loses the job; the day retries when it's opened again after 5 minutes. Running more than one API process needs a real job queue.
- **The daily cap is global and checked before each call.** Concurrent requests can overshoot it slightly; there are no per-user caps yet.
- **Schedules and streaks use India time** for everyone.
- **Placement uses one 15-question bank,** so its level estimates are coarse.
- **The web bundle is about 500 kB,** mostly the Markdown renderer. Lazy-loading the day page would fix it.
- **No re-planning from scores yet** (Phase 3), **no credits or payments** (Phase 4), **no deployment** (Phase 5).

## Where things are

| Path                                                      | What                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/api/src/routes/`                                    | HTTP routes: auth, courses (+ placement, outline), days, grading                       |
| `apps/api/src/{placement,outline,days,grading,progress}/` | The logic behind each step, mostly pure functions plus services                        |
| `apps/api/src/llm/`                                       | Provider interface, the one cap + log + retry point, prompts, pricing, the dev fake    |
| `apps/api/scripts/`                                       | `gen-sample`, `cost-report`, `smoke-real`                                              |
| `apps/web/src/pages/`                                     | Screens; `pages/course/` switches between placement, outline and course home by status |
| `apps/web/src/styles/tokens.css`                          | Design tokens; `--brand` picks the accent                                              |
| `tools/browser/`                                          | Chrome DevTools-protocol scripts: `shot`, `e2e:login`, `e2e:learner`                   |
| `packages/shared/src/`                                    | Zod schemas and types shared by API and web                                            |
| `LEARNING.md`                                             | Concept questions for every checkpoint. Your answers are still blank.                  |
