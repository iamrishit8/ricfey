# Getting started

Goal: run the whole product on your machine and complete a course day, with no paid services.

## 1. What you need

| Tool                            | Why                                                                         | Check              |
| ------------------------------- | --------------------------------------------------------------------------- | ------------------ |
| [Bun](https://bun.sh)           | runtime, package manager, test runner (1.4+)                                | `bun --version`    |
| MongoDB 7+ **as a replica set** | the app uses transactions later; it refuses to start on a standalone server | `mongod --version` |
| Google Chrome                   | only for `shot` and `e2e:*` scripts                                         | optional           |

No Gemini key, Google client or email service is needed to start: the defaults use a fake LLM
and print sign-in links to the API console.

## 2. Install and configure

```sh
bun install
cp .env.example .env
```

Edit `.env`. The only value you must set is `MONGODB_URI` (next step). Every variable is
described in the table in [../README.md](../README.md#environment-variables).

## 3. Start a local database

A MongoDB **replica set** can have one member. Pick a free port (27199 below) and a data folder:

```sh
mkdir -p ~/ricfey-mongo
mongod --dbpath ~/ricfey-mongo --port 27199 --replSet rs0 --bind_ip 127.0.0.1 --fork --logpath ~/ricfey-mongo/log
mongosh --port 27199 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27199"}]})'   # first time only
```

In `.env`:

```
MONGODB_URI=mongodb://127.0.0.1:27199/ricfey?replicaSet=rs0
MONGODB_URI_TEST=mongodb://127.0.0.1:27199/ricfey_test?replicaSet=rs0
```

`MONGODB_URI_TEST` is wiped by the tests; never point it at data you care about.
Using Atlas instead? Paste its connection string into `MONGODB_URI` and add your IP in
Atlas → Network Access.

## 4. Run it

Two terminals:

```sh
bun run dev:api      # http://127.0.0.1:4000, reloads on change
bun run dev:web      # http://localhost:5173, proxies /api/* to the API
```

Check the API: `curl localhost:4000/health` should show `"db":"connected"`.

## 5. Sign in and learn something

1. Open http://localhost:5173/login (use Chrome or Firefox; Safari drops `Secure` cookies on http).
2. Enter any email. The API terminal prints `[dev] Magic link for y***@…: http://localhost:5173/auth/magic?token=…`. Open it.
3. **New course**: skill, depth, weeks, minutes a day. With `working` or `deep` depth you take a short placement quiz; `intro` skips it.
4. Review the outline (rename, reorder, remove days), then approve.
5. Open **Today**: lesson, practice task, quiz. Submit both to finish the day and open the next.

With `LLM_PROVIDER=fake` (the default) all text is placeholder, marked `[FAKE]`. That is correct:
it proves the plumbing without spending quota.

## 6. Credits

Every learner starts with 30 credits (header, top right). Opening a day costs ⌈minutes ÷ 15⌉.
**Credits → Buy** works offline: `PAYMENTS_PROVIDER=fake` simulates the payment, labelled "Test mode".
For real Razorpay test mode see [walkthroughs/07-credits-and-payments.md](walkthroughs/07-credits-and-payments.md).

## 7. Use the real model

```
LLM_PROVIDER=gemini
GEMINI_API_KEY=<from https://aistudio.google.com/apikey>
```

Restart the API. Expect 1 to 4 minutes per generation step on the free tier. The free tier
allows 20 requests per day per model; `LLM_DAILY_CALL_CAP` (default 16) stops the app before that.
Rough cost of a course in calls: 2 up front (placement bank, outline), then 2 to 4 per day, plus 1 per task submission.

## 8. Verify everything

```sh
bun run check            # typecheck + lint + format + tests (DB tests run if MONGODB_URI_TEST is set)
bun run dev:api > api.log 2>&1 &
bun run e2e:learner -- api.log shots/    # whole learner journey in real Chrome, with LLM_PROVIDER=fake
```

More in [../TESTING.md](../TESTING.md).

## Troubleshooting

| Symptom                                    | Cause and fix                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| API exits: `MongoDB must be a replica set` | You started `mongod` without `--replSet`, or never ran `rs.initiate`.                             |
| API exits: `MONGODB_URI: is required`      | `.env` is missing or empty. Env is validated at startup and all problems are listed.              |
| Login link opens but you are not signed in | Safari + http. Use Chrome/Firefox, or set `COOKIE_SECURE=false` (never in production).            |
| DB tests show as skipped                   | `MONGODB_URI_TEST` is empty.                                                                      |
| Generation stuck on "Writing…"             | Normal for 1–4 min on real Gemini. If it fails, use Retry; check `LLM_DAILY_CALL_CAP`.            |
| `LLM_CAP_REACHED`                          | Today's call or token budget (UTC day) is used. Wait for UTC midnight or raise the cap carefully. |
