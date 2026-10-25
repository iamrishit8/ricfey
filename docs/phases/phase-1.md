# Phase 1: Foundations

## Goal

Prove the two things that could kill Ricfey before building the product: (1) Gemini can
generate lessons worth learning from, and (2) it does so at a cost per course-day that
credits can cover. Around that, lay the skeleton: API, database, auth, design system.

## In scope

| Checkpoint | Delivers                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| C1         | Guardrail docs, monorepo skeleton, lint/format/typecheck                                                |
| C2         | Fastify API, `/health`, error envelope, env validation, Mongoose, `User` + `Course` models              |
| C3         | Shared schemas, `LlmProvider` + Gemini + Fake, daily cap, `llmCalls` log, 3 sample courses, cost report |
| C4         | Google OAuth, magic link, sessions, auth routes and tests                                               |
| C5         | Web shell, tokens, `/styleguide`, accent colour choice, login page                                      |

## Out of scope

Course creation UI, the daily loop, re-planning, credits, payments, deployment.

## Outcome (2026-10-25)

All five checkpoints built. Measured: a 30-day course costs about $0.16 on `gemini-3.5-flash-lite`
and $0.77 on `gemini-3.8-flash` at prices from 2027-01-01 ([cost report](../phase-1-cost-report.md);
covers outline + day 1 only). Real Gemini verified live. Not done: the human gate of reading the samples.
Deferred: real Google OAuth and Resend (no accounts yet; dev stand-ins used).

## Gate (all must be true to close the phase)

- [ ] Three generated courses (Python, personal finance, music theory) the user has read and
      would be happy to learn from
- [ ] A measured cost per course-day, from real `llmCalls` data, in docs/phase-1-cost-report.md
- [ ] Login (Google and magic link) works locally end to end
- [ ] `/styleguide` renders in light and dark
- [ ] `bun run check` green

## If the gate fails

- Lessons weak → iterate prompts, try a stronger model, or reconsider the provider before Phase 2.
- Cost too high → shorter lessons, cheaper model for quizzes, cache outlines; re-run the report.
