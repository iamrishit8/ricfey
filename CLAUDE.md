# CLAUDE.md

Ricfey turns "learn X, to depth Y, in Z weeks" into a day-by-day course (lesson, task, quiz) that re-plans from quiz scores. Credits, INR, Razorpay. India first.

## Stack (locked: ask before swapping anything)

- Bun workspaces monorepo: `apps/api`, `apps/web`, `packages/shared`
- API: Bun, Fastify, TypeScript, Zod. DB: MongoDB Atlas via Mongoose (replica set, for transactions)
- Web: React, Vite, TypeScript, Tailwind, shadcn/ui, CSS-variable tokens (light first, dark second)
- Auth: Google OAuth + email magic link (Resend)
- AI: Gemini via the `LlmProvider` interface only. Model name comes from an env var

## Commands

```sh
bun install            # install all workspaces
bun run dev:api        # API on :4000 with watch (reads root .env)
bun run gen:sample -- --skill X --depth working --weeks 4 [--model M] [--provider fake]
bun run cost:report    # docs/phase-1-cost-report.md from docs/samples/*/*/usage.json
bun run typecheck      # tsc in every workspace
bun run lint           # eslint, whole repo
bun run format         # prettier --write
bun run test           # bun test
bun run check          # all of the above; must be green before a PR
```

## Layout

```
apps/api/        Fastify server: src/{app,server}.ts, config/, lib/, plugins/, routes/, db/, models/
                 src/llm/ provider interface, cap + llmCalls log, prompts, pricing; scripts/
apps/web/        Vite React app (C5)
packages/shared/ Zod schemas + types shared by api and web
docs/phases/     scope and gate per phase
docs/samples/    generated sample courses (C3)
```

Tracking docs: PROGRESS.md (state), DECISIONS.md (why), ARCHITECTURE.md (BUILT/PLANNED),
TESTING.md (how to verify), LEARNING.md (concepts).

## Working rules

- Work in checkpoints. One checkpoint = one branch = one draft PR. Stop after each and wait for "continue".
- Never push to or merge into `main`.
- Brief before every checkpoint (5 lines: what, why, risks). After it: what was run, what was not. Mark unchecked claims [UNVERIFIED].
- Plan first for anything touching more than 2 files. Small diffs. No drive-by refactors.
- Every behaviour change ships with a `bun test` or exact manual steps in TESTING.md.
- Every new dependency is listed in the PR description with one line of why. Add no others.
- Look up external facts (model names, limits, prices) in official docs and cite the URL. Never from memory.
- When a human must create an account or key: stop, say exactly what/where/which env var. Use a fake provider meanwhile.
- Be direct. Flag weak decisions before agreeing. Do not hide complexity.
- Update PROGRESS.md, ARCHITECTURE.md marks and TESTING.md at the end of every checkpoint.

## Never

- Never print, log or commit secrets. Never commit `.env*` (except `.env.example`).
- Never add an env var without adding it to `.env.example` and README.md in the same commit.
- Never return a raw error to the client: throw `AppError` (safe message) and let the one error handler shape it.
- Never call an LLM SDK outside the `LlmProvider` implementations.
- Never bypass the LLM daily cap or skip writing the `llmCalls` record.
- Never log or return one user's email or data to another user.
- Never call generated content "good". Show it to the user.
- Never swap stack pieces or add unlisted dependencies without asking.

## Teaching mode

The user is learning. For every checkpoint:

1. **Before:** 5-line brief (what we are building, why, what could go wrong).
2. **After:** what was verified and how, what was not, [UNVERIFIED] marks.
3. **Concepts:** add 3 to 5 concepts to LEARNING.md. Each: 3-line first-principles explanation,
   one question, and a blank `My answer:` line. Do not fill in the answer.
