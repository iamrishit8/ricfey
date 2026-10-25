# Walkthrough 6: Adaptive re-planning

**Goal.** Quiz scores reshape the next few days of a course: weak topics get more practice, strong ones less.
**Code:** `apps/api/src/replan/` (service, prompt), `routes/replan.ts`, `models/replan.ts`, `progress/service.ts` (`topicScores`); shared `schemas/replan.ts` (rules and constants). **Web:** `components/replan-panel.tsx` (course home), `pages/new-course.tsx` (mode choice).

## 1. Mastery

Every quiz question carries a topic tag from the outline. `topicScores` takes each day's **latest** quiz attempt and counts right/total per topic. `masteryStatus` labels each topic:

| Status     | Rule                                      |
| ---------- | ----------------------------------------- |
| weak       | at least 2 answers, under 60 % right      |
| strong     | at least 2 answers, 85 % or more          |
| developing | anything else (including too few answers) |

At most the 3 weakest topics are passed to a re-plan. `GET /courses/:id/mastery`.

## 2. What a re-plan may change

- **Only the future.** Days after the last day that was opened or finished, never generated, not finished. Content a learner has seen is never rewritten.
- **Horizon:** ⌈total days ÷ 4⌉, between 3 and 10 days (`replanHorizon`). A 20-day course looks 5 days ahead.
- **Only outline entries.** Titles, objectives and topics of those days. Lessons are generated later, lazily, from the new entries, so a re-plan costs one model call.

## 3. Two modes (chosen by the learner at intake; switchable on the course home)

```
manual:  learner clicks "Adapt days N–M" ─► generating ─► proposed ─► accept ─► applied
                                                               └──► reject ─► rejected
auto:    a day is newly finished AND a weak topic exists AND ≥3 days finished since the
         last applied re-plan ─► generating ─► proposed ─► applied immediately
```

Other end states: `failed` (model output never passed validation), `stale` (one of the days was opened between proposal and accept, so nothing changed).
Only one re-plan can be open (generating or proposed) per course: a unique index on `courseId` that covers only documents with `open: true`.

## 4. Generation and checks

`replanPrompt` gives the model the full outline (delimited), the days to rewrite, the per-topic scores, and weak/strong topics, all as data in a `<request>` block. The output (`ReplanOutputSchema`: `rationale` + `days`) must also pass two extra rules, or it is retried once with the errors and then marked `failed`:

1. Exactly the requested day numbers, in order.
2. Every weak topic appears as a topic tag of some rewritten day.

Stored with the proposal, for the learner and for evaluation: `quality.weakTopicCoverage`, `quality.topicsKept` (share of the old days' topics still present), `quality.daysChanged`.

## 5. Applying (one transaction)

`applyReplan` runs in a MongoDB transaction:

1. Re-check that every rewritten day is still unopened and that the course's approved outline is still the one the proposal was based on. If not → `stale`, nothing written, 409.
2. Mark the re-plan `applied` (conditional on `proposed`, so a double click applies once).
3. Write a new outline version with `source: "replanned"` and point `currentOutlineVersion` and `approvedOutlineVersion` at it.
4. Update the `courseDays` rows (title, objectives, topics) for the rewritten days.

Old outline versions stay readable (`GET /courses/:id/outline?version=N`), so "what was the plan when they took day 3" can always be answered.

## 6. Price

Free while the learner has finished fewer than 7 days (`REPLAN_FREE_DAYS`); after that `REPLAN_CREDITS` (2). The price is fixed when the re-plan is requested and charged when it is applied (see [07-credits-and-payments.md](07-credits-and-payments.md)).

## Try it (fake LLM)

Finish day 1 with a wrong quiz, open the course home, click **Adapt days**, then **Use the new plan**. Or with curl:

```sh
curl -b jar localhost:4000/courses/<id>/mastery
curl -b jar -X POST localhost:4000/courses/<id>/replan          # 202, generating
curl -b jar localhost:4000/courses/<id>/replan                  # proposed + policy
curl -b jar -X POST localhost:4000/courses/<id>/replan/<rid>/accept
```

Tests: `routes/replan.test.ts`, `packages/shared/src/schemas/replan.test.ts`; browser: the last steps of `bun run e2e:learner`.
Not verified: re-plan quality on the real model ([UNVERIFIED] until `bun run smoke:real` runs with its new re-plan step).
