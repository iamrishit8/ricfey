# Phase 3: Adaptive re-planning

## Goal

Make the course respond to the learner: quiz scores decide what the next few days teach.

## Owner's decisions (2026-10-25) and how they were implemented

| Question                             | Owner's answer                   | Implementation                                        |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| How far ahead may a re-plan rewrite? | A rough estimate from the course | ⌈days ÷ 4⌉, 3–10 days; only never-opened days         |
| Does it cost credits?                | First 7 days free, then credits  | Free until 7 finished days, then 2 credits (constant) |
| Automatic or on request?             | Let the learner choose           | `replanMode` asked at intake, switchable later        |

## Delivered

| Checkpoint | Delivers                                                                                                                                | Walkthrough                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| P3-C1      | Mastery, re-plan service and routes, modes, quality checks, transaction, tests                                                          | [06](../walkthroughs/06-replanning.md) |
| P3-C2      | Intake mode choice, "Adapt your plan" panel (weak/strong topics, propose, compare, accept/reject, mode switch), browser e2e, phase docs | [06](../walkthroughs/06-replanning.md) |

## Verified

`bun run check` (153 tests, 16 of them new for re-planning; another learner gets 404 on every route; mutation check on the weak-topic rule). `bun run e2e:learner` now ends with propose → accept in Chrome, checked at 390px.

## Not verified

Re-plan quality on real Gemini (step added to `smoke:real`, not yet run). Whether 60 % / 85 % thresholds feel right to real learners.

## Gate

- [ ] Owner reads one real re-plan (from `smoke:real` or a real course) and judges whether it helps.
