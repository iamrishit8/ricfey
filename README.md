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

There is no server or web app yet. Those arrive at checkpoints C2 and C5.

## Repo layout

| Path              | What                                |
| ----------------- | ----------------------------------- |
| `apps/api`        | Fastify API (Bun, TypeScript)       |
| `apps/web`        | React + Vite web app                |
| `packages/shared` | Zod schemas and types used by both  |
| `docs/`           | Phase scopes, samples, cost reports |

## Environment variables

Every variable lives in `.env.example`. Never commit `.env`.

| Variable   | Required | Used by | Purpose                               |
| ---------- | -------- | ------- | ------------------------------------- |
| `NODE_ENV` | yes      | all     | `development`, `test` or `production` |

More variables (MongoDB, Gemini, Google OAuth, Resend, session secret) are added at the
checkpoint that needs them.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md): what exists and what is planned
- [DECISIONS.md](DECISIONS.md): why things are the way they are
- [TESTING.md](TESTING.md): how to verify each piece
- [LEARNING.md](LEARNING.md): concept log
