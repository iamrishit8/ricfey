# CLAUDE.md

Ricfey turns "learn X, to depth Y, in Z weeks" into a day-by-day course (lesson, task, quiz) that re-plans from quiz scores. Credits, INR, Razorpay. India first.

## Stack (locked: never swap a piece)

- Bun workspaces monorepo: `apps/api`, `apps/web`, `packages/shared`
- API: Bun, Fastify, TypeScript, Zod. DB: MongoDB Atlas via Mongoose (replica set, for transactions)
- Web: React, Vite, TypeScript, Tailwind, shadcn/ui, CSS-variable tokens (light first, dark second)
- Auth: Google OAuth + email magic link (Resend). AI: Gemini via `LlmProvider` only; model from env

## Commands

```sh
bun install            # install all workspaces
bun run dev:api        # API on :4000 with watch (reads root .env)
bun run gen:sample -- --skill X --depth working --weeks 4 [--model M] [--provider fake]
bun run cost:report    # docs/phase-1-cost-report.md from docs/samples/*/*/usage.json
bun run check          # typecheck + lint + format:check + test; must be green before a PR
```

## Layout

```
apps/api/        Fastify: src/{app,server}.ts, config/, lib/, plugins/, routes/, db/, models/, llm/; scripts/
apps/web/        Vite React app
packages/shared/ Zod schemas + types shared by api and web
docs/            phases/, samples/ (real generated courses), cost report
```

State: PROGRESS.md · why: DECISIONS.md · BUILT/PLANNED: ARCHITECTURE.md · verify: TESTING.md ·
concepts: LEARNING.md · blocked on the user: NEEDS-FROM-ME.md

## Autonomous mode

- Do not ask me questions. Pick the reasonable default, say which in one line, log it in DECISIONS.md, keep going.
- Do not stop between checkpoints. Finish one, commit, push, open its draft PR stacked on the previous branch, update PROGRESS.md, start the next.
- Teaching mode never blocks. Write each checkpoint's concept questions into LEARNING.md and keep building. Do not reveal answers.
- When something needs me (an account, key, colour), do not stop. Build against a fake or dev-mode alternative, mark the real path [UNVERIFIED], and add one line to NEEDS-FROM-ME.md: what to create and which env var it fills.
- Hard limits: never merge or push to main, never commit secrets, no real payments, every new dependency listed in the PR with one line why, stay under the Gemini free-tier limits (set LLM_DAILY_CALL_CAP below the daily limit).
- Keep PROGRESS.md accurate after every checkpoint (Now / Next / Blocked, what was verified, what was not) so a fresh session can resume from it alone.

## Working rules

- One checkpoint = one branch = one draft PR, stacked on the previous branch.
- Brief before each checkpoint (what, why, risks). After: what was run, what was not; mark unchecked claims [UNVERIFIED].
- Plan first for anything touching more than 2 files. Small diffs. No drive-by refactors.
- Every behaviour change ships with a `bun test` or exact manual steps in TESTING.md.
- Look up external facts (model names, limits, prices) in official docs and cite the URL. Never from memory.
- Be direct. Flag weak decisions. Do not hide complexity.
- Update PROGRESS.md, ARCHITECTURE.md marks and TESTING.md at the end of every checkpoint.

## Never

- Never print, log or commit secrets. Never commit `.env*` (except `.env.example`).
- Never add an env var without adding it to `.env.example` and README.md in the same commit.
- Never return a raw error to the client: throw `AppError` (safe message); the one error handler shapes it.
- Never call an LLM SDK outside the `LlmProvider` implementations, bypass the daily cap, or skip the `llmCalls` record.
- Never store or show model output that has not passed Zod validation.
- Never put learner text in a prompt undelimited; it is data, never instructions.
- Never log or return one user's email or data to another user. Every course query is scoped by `userId`.
- Never call generated content "good". Show it to the user.

## Teaching mode

1. **Before:** brief (what we are building, why, what could go wrong).
2. **After:** what was verified and how, what was not, [UNVERIFIED] marks.
3. **Concepts:** 3 to 5 per checkpoint in LEARNING.md: 3-line first-principles explanation,
   one question, a blank `My answer:` line. Never fill in answers.
