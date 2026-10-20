# Architecture

Each part is marked **BUILT** or **PLANNED** (with the checkpoint or phase that builds it).

## Overview

```
 Browser (apps/web: React + Vite, React Router, Tailwind v4, shadcn/ui-style components)
     │  same origin: Vite proxies /api/* → API (dev); JSON + httpOnly session cookie
     ▼
 API (apps/api: Bun + Fastify)
     ├── auth      Google OAuth, magic link, sessions
     ├── courses   outline + day generation, re-planning
     ├── llm       LlmProvider ─► BaseLlmProvider (cap, log, validate, retry once)
     │                              ├─ GeminiProvider (@google/genai)
     │                              └─ FakeProvider (tests, offline)
     │             course-generator: prompts + extra checks; pricing: cost by model and date
     ├── credits   balance, ledger (transactions)
     └── payments  Razorpay orders + webhooks
     │
     ▼
 MongoDB Atlas (replica set)          Gemini API          Resend          Razorpay
```

`packages/shared` holds Zod schemas used on both sides, so the web app and API agree on shapes.

## Parts

| Part                                                                            | Status                                       | Notes                                                |
| ------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| Monorepo, Bun workspaces, shared tsconfig, ESLint, Prettier                     | **BUILT** (C1)                               |                                                      |
| Fastify app, `GET /health`                                                      | **BUILT** (C2)                               |                                                      |
| Response envelope `{ success, data }` / `{ success, error: { code, message } }` | **BUILT** (C2)                               | single `AppError` class, one error handler           |
| Zod request-validation helper                                                   | **BUILT** (C2)                               |                                                      |
| Env config validated with Zod at startup                                        | **BUILT** (C2)                               | fail fast with clear message                         |
| Mongoose connection, `User` and `Course` models                                 | **BUILT** (C2)                               |                                                      |
| Shared schemas `CourseOutline`, `DayContent`                                    | **BUILT** (C3)                               |                                                      |
| `LlmProvider` interface, `GeminiProvider`, `FakeProvider`                       | **BUILT** (C3); Gemini verified live         | retry once on invalid JSON with error fed back       |
| LLM daily cap + `llmCalls` collection                                           | **BUILT** (C3)                               | one enforcement point                                |
| `gen:sample` script + cost report                                               | **BUILT** (C3); 4 of 6 real samples          |                                                      |
| Google OAuth, magic link, sessions                                              | **BUILT** (C4); Google + Resend [UNVERIFIED] | hashed single-use tokens, 15 min expiry, rate limits |
| Web shell, router, Tailwind, shadcn/ui, tokens, `/styleguide`, login            | **BUILT** (C5)                               |                                                      |
| Intake + adaptive placement (P2-C1)                                             | **BUILT**                                    | one bank call, staircase 8–12 Qs                     |
| Versioned outline, edit/approve, credit quote (P2-C2)                           | **BUILT**                                    |                                                      |
| Lazy idempotent day generation, unlock rules, self-check + flag (P2-C3)         | **BUILT**                                    |                                                      |
| Quiz auto-grading, model task grading, progress + streak (P2-C4)                | **BUILT**                                    |                                                      |
| Web screens (P2-C5)                                                             | PLANNED (Phase 2)                            |                                                      |
| Adaptive re-planning from quiz scores                                           | PLANNED (Phase 3)                            |                                                      |
| Credits ledger + Razorpay                                                       | PLANNED (Phase 4)                            | needs Mongo transactions                             |
| Deploy, observability, launch                                                   | PLANNED (Phase 5)                            |                                                      |

## Key principles

- **One error shape.** Every route returns the envelope; errors are thrown as `AppError` and
  shaped in one place.
- **LLM behind an interface.** No code outside provider implementations touches an LLM SDK.
  Every call is capped and logged.
- **Validate at boundaries.** Env at startup, requests at the route, LLM output against Zod.
