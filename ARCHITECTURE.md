# Architecture

Each part is marked **BUILT** or **PLANNED** (with the checkpoint or phase that builds it).

## Overview

```
 Browser (apps/web: React + Vite)
     │  HTTPS, JSON, httpOnly session cookie
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

| Part                                                                            | Status                                                | Notes                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Monorepo, Bun workspaces, shared tsconfig, ESLint, Prettier                     | **BUILT** (C1)                                        |                                                      |
| Fastify app, `GET /health`                                                      | **BUILT** (C2)                                        |                                                      |
| Response envelope `{ success, data }` / `{ success, error: { code, message } }` | **BUILT** (C2)                                        | single `AppError` class, one error handler           |
| Zod request-validation helper                                                   | **BUILT** (C2)                                        |                                                      |
| Env config validated with Zod at startup                                        | **BUILT** (C2)                                        | fail fast with clear message                         |
| Mongoose connection, `User` and `Course` models                                 | **BUILT** (C2)                                        |                                                      |
| Shared schemas `CourseOutline`, `DayContent`                                    | **BUILT** (C3)                                        |                                                      |
| `LlmProvider` interface, `GeminiProvider`, `FakeProvider`                       | **BUILT** (C3); Gemini [UNVERIFIED] until key         | retry once on invalid JSON with error fed back       |
| LLM daily cap + `llmCalls` collection                                           | **BUILT** (C3)                                        | one enforcement point                                |
| `gen:sample` script + cost report                                               | **BUILT** (C3), runs on fake; real samples need a key |                                                      |
| Google OAuth, magic link, sessions                                              | PLANNED (C4)                                          | hashed single-use tokens, 15 min expiry, rate limits |
| Web shell, router, Tailwind, shadcn/ui, tokens, `/styleguide`, login            | PLANNED (C5)                                          |                                                      |
| Course creation + daily loop                                                    | PLANNED (Phase 2)                                     |                                                      |
| Adaptive re-planning from quiz scores                                           | PLANNED (Phase 3)                                     |                                                      |
| Credits ledger + Razorpay                                                       | PLANNED (Phase 4)                                     | needs Mongo transactions                             |
| Deploy, observability, launch                                                   | PLANNED (Phase 5)                                     |                                                      |

## Key principles

- **One error shape.** Every route returns the envelope; errors are thrown as `AppError` and
  shaped in one place.
- **LLM behind an interface.** No code outside provider implementations touches an LLM SDK.
  Every call is capped and logged.
- **Validate at boundaries.** Env at startup, requests at the route, LLM output against Zod.
