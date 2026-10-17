# Ricfey

Tell Ricfey what you want to learn, how deep, and in how many weeks. It builds a personal
day-by-day course: each day is a short lesson, a practice task and a quiz. Your quiz scores
re-shape the rest of the plan. Any subject that can be taught and tested through text.
Pay-as-you-go credits in rupees.

Status: Phase 1 (foundations). See [PROGRESS.md](PROGRESS.md).

## Run it

Requires [Bun](https://bun.sh). Tested on 1.4.2.

```sh
bun install
cp .env.example .env   # then fill in values (see table)
bun run check          # typecheck + lint + format check + tests
```

Start the API (needs `MONGODB_URI` in `.env`):

```sh
bun run dev:api                     # http://127.0.0.1:4000
curl http://127.0.0.1:4000/health   # {"success":true,"data":{"status":"ok",...}}
```

Generate a sample course (outline + day 1) into `docs/samples/`, then the cost report:

```sh
bun run gen:sample -- --skill "Python" --depth working --weeks 4            # needs GEMINI_API_KEY + MONGODB_URI
bun run gen:sample -- --skill "Python" --model gemini-3.5-flash-lite        # compare another model
bun run gen:sample -- --skill "Python" --provider fake --out /tmp/samples   # offline, placeholder text
bun run cost:report                                                         # writes docs/phase-1-cost-report.md
```

Sign in without a browser (dev mode prints the link to the API console):

```sh
curl -X POST localhost:4000/auth/magic/request -H 'content-type: application/json' -d '{"email":"you@example.com"}'
# copy the token from the console line "[dev] Magic link for y***@example.com: ...?token=XXXX"
curl -c jar -X POST localhost:4000/auth/magic/verify -H 'content-type: application/json' -d '{"token":"XXXX"}'
curl -b jar localhost:4000/auth/me
```

The web app arrives at C5.

## Repo layout

| Path              | What                                |
| ----------------- | ----------------------------------- |
| `apps/api`        | Fastify API (Bun, TypeScript)       |
| `apps/web`        | React + Vite web app                |
| `packages/shared` | Zod schemas and types used by both  |
| `docs/`           | Phase scopes, samples, cost reports |

## Environment variables

Every variable lives in `.env.example`. Never commit `.env`.

| Variable               | Required           | Default                 | Purpose                                                                                                   |
| ---------------------- | ------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`             | no                 | `development`           | `development`, `test` or `production`                                                                     |
| `HOST`                 | no                 | `127.0.0.1`             | API bind address (`0.0.0.0` in containers)                                                                |
| `PORT`                 | no                 | `4000`                  | API port                                                                                                  |
| `LOG_LEVEL`            | no                 | `info`                  | `fatal` … `trace`                                                                                         |
| `MONGODB_URI`          | yes                |                         | Atlas connection string. Secret. Must be a replica set (Atlas always is)                                  |
| `MONGODB_URI_TEST`     | no                 |                         | Throwaway replica set for DB tests; skipped if empty. Tests drop this DB                                  |
| `GEMINI_API_KEY`       | for real LLM calls |                         | From https://aistudio.google.com/apikey. Secret                                                           |
| `GEMINI_MODEL`         | no                 | `gemini-3.8-flash`      | Model ID; `gen:sample --model` overrides it                                                               |
| `LLM_DAILY_CALL_CAP`   | no                 | `16`                    | Max LLM calls per UTC day, retries included                                                               |
| `LLM_DAILY_TOKEN_CAP`  | no                 | `1000000`               | Max tokens (in + out) per UTC day                                                                         |
| `WEB_URL`              | no                 | `http://localhost:5173` | Web origin for magic links and login redirects                                                            |
| `COOKIE_SECURE`        | no                 | `true`                  | Secure session cookie. Must be `true` in production. Safari won't keep Secure cookies on http://localhost |
| `TRUST_PROXY`          | no                 | `false`                 | `true` only behind a proxy that sets X-Forwarded-For                                                      |
| `SESSION_TTL_DAYS`     | no                 | `30`                    | Session lifetime                                                                                          |
| `GOOGLE_CLIENT_ID`     | no                 |                         | Google OAuth client ID. Set all three Google vars or none                                                 |
| `GOOGLE_CLIENT_SECRET` | no                 |                         | Google OAuth client secret. Secret                                                                        |
| `GOOGLE_REDIRECT_URI`  | no                 |                         | e.g. `http://localhost:4000/auth/google/callback`; must match the Google console                          |
| `RESEND_API_KEY`       | prod               |                         | Empty in dev: magic links print to the API console. Secret                                                |
| `EMAIL_FROM`           | prod               |                         | Sender, e.g. `Ricfey <login@yourdomain>`; domain must be verified in Resend                               |

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md): what exists and what is planned
- [DECISIONS.md](DECISIONS.md): why things are the way they are
- [TESTING.md](TESTING.md): how to verify each piece
- [LEARNING.md](LEARNING.md): concept log
