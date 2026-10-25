# Phase 2: Course creation and the daily loop

## Goal

A signed-in learner can create a course, get a level-appropriate outline they approve, and work
through it one day at a time (lesson, task, quiz) with progress and a streak.

## Delivered

| Checkpoint | Delivers                                                                   | Walkthrough                                 |
| ---------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| P2-C1      | Intake; adaptive placement (1 bank call + deterministic staircase)         | [02](../walkthroughs/02-course-creation.md) |
| P2-C2      | Versioned outline: edit, approve, credit quote                             | [02](../walkthroughs/02-course-creation.md) |
| P2-C3      | Daily unlock (India time), lazy idempotent generation, self-check and flag | [03](../walkthroughs/03-daily-loop.md)      |
| P2-C4      | Server-side quiz grading, model-graded tasks, progress, streak             | [03](../walkthroughs/03-daily-loop.md)      |
| P2-C5      | All learner screens, flag a mistake, browser e2e, real-LLM smoke           | [05](../walkthroughs/05-web-app.md)         |

## Rules that held for every checkpoint

Lazy and idempotent generation; Zod before store or show; learners reach only their own courses
(tested per route); learner text is delimited data in prompts; nothing charged yet.

## Verified

137 automated tests; the whole journey in headless Chrome (including 390px); every LLM step on real
Gemini once (`bun run smoke:real`, 2026-10-20; output in `docs/samples/smoke/`). See [../../TESTING.md](../../TESTING.md).

## Not verified

Lesson factual accuracy, real Google/Resend, Safari, model obedience to injected instructions, a
real phone.

## Gate (owner's)

- [ ] Take 7 days of a real course (`LLM_PROVIDER=gemini`) and flag every factual error.
- [ ] Read the generated samples in `docs/samples/` and decide whether they are good enough to learn from.

## Deferred to later phases

Re-planning from scores (Phase 3), credits and payments (Phase 4), deployment and a job queue (Phase 5).
