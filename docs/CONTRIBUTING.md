# Contributing

## Stack (fixed; do not swap pieces)

Bun workspaces (`apps/api`, `apps/web`, `packages/shared`) · Fastify + Zod + Mongoose (MongoDB replica set) · React + Vite + Tailwind + shadcn/ui · Gemini behind `LlmProvider`.

## Working rules

- One checkpoint = one branch = one draft PR, stacked on the previous branch. Never push or merge to `main` directly.
- `bun run check` must be green before a PR.
- Every behaviour change ships with a `bun test` or exact manual steps in [../TESTING.md](../TESTING.md).
- Small diffs. No drive-by refactors.
- Every new dependency is listed in the PR with one line saying why.
- Every new env var goes in `.env.example` **and** the README table in the same commit.

## Hard rules in code

| Rule                                                           | Why                                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Throw `AppError` (safe message); never return a raw error      | One error handler shapes every response; stack traces and driver errors never reach a client. |
| Call an LLM only through `LlmProvider`                         | The base class enforces the daily cap, logs every call, validates output.                     |
| Validate model output with Zod before storing or showing it    | Models return malformed or off-spec JSON.                                                     |
| Learner text goes in prompts inside a delimited block, as data | Prompt-injection defence. See [walkthroughs/04-llm-layer.md](walkthroughs/04-llm-layer.md).   |
| Every course query is scoped by `userId`; other users get 404  | One learner must never see another's data. Each route has a test.                             |
| Never log or commit secrets or `.env*` (except `.env.example`) |                                                                                               |

## Closing a phase: documentation checklist

Documentation is updated **every time a phase closes**, before its last PR is opened.
Docs that do not match the code are a bug.

- [ ] [../README.md](../README.md): status line, run commands, env-var table.
- [ ] [../ARCHITECTURE.md](../ARCHITECTURE.md): flip BUILT/PLANNED marks, update diagrams and state machines.
- [ ] [API.md](API.md): every new or changed route (method, path, body, response, errors).
- [ ] [DATA-MODEL.md](DATA-MODEL.md): every new or changed collection, field, index.
- [ ] `walkthroughs/`: update the walkthrough for each area touched; add a new one for a new area and list it in [README.md](README.md).
- [ ] [../TESTING.md](../TESTING.md): automated coverage and manual steps for what shipped; update the test count.
- [ ] `phases/phase-N.md`: scope, what shipped, gate results, what was deferred.
- [ ] [GETTING-STARTED.md](GETTING-STARTED.md): still works from a clean checkout (actually try it).
- [ ] Private state files (gitignored, local): `private/PROGRESS.md`, `DECISIONS.md`, `LEARNING.md`, `NEEDS-FROM-ME.md`, `HANDOFF.md`.
- [ ] Mark anything not actually run as **[UNVERIFIED]**.

### Public vs private docs

Public (tracked): `README.md`, `ARCHITECTURE.md`, `TESTING.md`, everything in `docs/`.
Private (gitignored, in `private/` and `CLAUDE.md`): agent instructions, progress log, decision log, learning answers, owner to-do list, handoff notes. If you add a private doc, add it under `private/`; the folder is already ignored. Never `git add -f` it.
