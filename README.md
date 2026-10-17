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

| Variable              | Required           | Default            | Purpose                                                                  |
| --------------------- | ------------------ | ------------------ | ------------------------------------------------------------------------ |
| `NODE_ENV`            | no                 | `development`      | `development`, `test` or `production`                                    |
| `HOST`                | no                 | `127.0.0.1`        | API bind address (`0.0.0.0` in containers)                               |
| `PORT`                | no                 | `4000`             | API port                                                                 |
| `LOG_LEVEL`           | no                 | `info`             | `fatal` … `trace`                                                        |
| `MONGODB_URI`         | yes                |                    | Atlas connection string. Secret. Must be a replica set (Atlas always is) |
| `MONGODB_URI_TEST`    | no                 |                    | Throwaway replica set for DB tests; skipped if empty. Tests drop this DB |
| `GEMINI_API_KEY`      | for real LLM calls |                    | From https://aistudio.google.com/apikey. Secret                          |
| `GEMINI_MODEL`        | no                 | `gemini-3.8-flash` | Model ID; `gen:sample --model` overrides it                              |
| `LLM_DAILY_CALL_CAP`  | no                 | `16`               | Max LLM calls per UTC day, retries included                              |
| `LLM_DAILY_TOKEN_CAP` | no                 | `1000000`          | Max tokens (in + out) per UTC day                                        |

More variables (Google OAuth, Resend, session secret) are added at the checkpoint that
needs them.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md): what exists and what is planned
- [DECISIONS.md](DECISIONS.md): why things are the way they are
- [TESTING.md](TESTING.md): how to verify each piece
- [LEARNING.md](LEARNING.md): concept log
