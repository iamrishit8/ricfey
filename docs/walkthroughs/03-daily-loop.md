# Walkthrough 3: The daily loop (unlock → generate → learn → grade → progress)

**Code:** `days/` (schedule, service, self-check-prompt), `grading/` (quiz, service, task-prompt), `progress/` (service, streak), `routes/days.ts`, `routes/grading.ts`. **Web:** `pages/today.tsx`, `pages/day.tsx`, `pages/progress.tsx`, `components/{lesson-card,quiz-card,markdown}.tsx`.

## 1. When does a day open?

All times are **India time** (UTC+5:30, no daylight saving). `days/schedule.ts`:

- Day _n_ has an `unlockAt` date. With 5 days per week: days 1–5 are start…start+4, day 6 is start+7 (weekends off).
- A day is open if **it is day 1, or the previous day is finished, or its date has arrived**. Finishing early therefore lets a learner move ahead; falling behind never blocks them.
- Opening a locked day → 403 with `unlockAt`.

## 2. Generation is lazy and idempotent

Nothing is generated until a learner opens a day (no spend on days never reached).
`openDay` does one conditional update: "set status `generating` **only if** `content` is null and the day is not already generating (or the claim is older than 5 min)". Only the request that wins the update starts the background job. Five simultaneous opens → one generation (there is a test, and it fails if the claim is removed).

The job (`generateAndCheck`):

```
generate day (main model) ─► self-check (cheaper model) ─► pass? ─► store, status ready
                                   │ fail
                                   └► regenerate once, feeding back the reviewer's issues
                                         └► check again ─► pass → ready
                                                         └► fail → store anyway, status flagged
```

- The **self-check** asks the cheaper model whether the lesson covers the outline's objectives and whether quiz answers are consistent with the lesson. If the checker itself is unavailable, the lesson is kept and flagged without regenerating.
- **A pass is not proof of correctness.** It is a cheap filter, not fact-checking. That is why learners can flag mistakes (§5).
- A `flagged` day (checks failed twice) is still shown, with its issues recorded in `selfCheck`. Output is Zod-validated (`DayContent`: Markdown lesson, task with rubric, quiz) before it is stored.

## 3. What the learner sees

`GET /courses/:id/days/:n` returns the day with **quiz answers and explanations stripped** (`toPublicContent`). The web app polls while `generating` (stops when done, on unmount, or after ~5 min). The lesson is rendered from Markdown with raw HTML disabled.

## 4. Grading

**Quiz** (`grading/quiz.ts`): `POST …/quiz {answers[]}`. Must answer every question. The server compares with the stored key and returns each question with `yourAnswer`, `answerIndex`, `correct`, `explanation`. Every attempt is stored (`quizAttempts`), retries allowed.

**Task** (`grading/service.ts`): `POST …/task {answer}` stores a `taskAttempts` row as `grading`, returns **202**, and grades in the background with the main model against the rubric. The grader returns `{score, feedback, missedCriteria}`; the schema is refined so `score ≤` the rubric total and `missedCriteria` are exact rubric names. The learner's answer is delimited as data and the grader is told embedded commands earn nothing (prompt structure is tested; how well a model obeys is **unverified**). Limits: 3 attempts per day, one grading at a time.

**Finished day.** A day is finished when a quiz **and** a task have been submitted (submitted, not passed). That sets `completedAt`, opens the next day, and when all days are finished the course becomes `completed`.

## 5. Progress and "Flag a mistake"

- `GET /courses/:id/progress`: days done/total; **topic scores** (percent correct per quiz topic, using the latest quiz attempt per day); **streak** = consecutive India calendar days with at least one day finished. The current streak counts back from today, or from yesterday if today has nothing yet, so it does not reset at midnight.
- `POST …/report` stores `{kind, message, excerpt?}` in `reports` (max 20 per day). Nothing reads reports automatically yet; they are the raw material for judging lesson quality.

## Failure modes to know

| Situation                         | Behaviour                                                                |
| --------------------------------- | ------------------------------------------------------------------------ |
| LLM daily cap or generation error | Day marked `failed`; opening it again re-claims and retries.             |
| Model returns invalid JSON        | One retry with the validation error fed back, then `LLM_INVALID_OUTPUT`. |
| Server restarts mid-generation    | Claim goes stale after 5 min and the next open re-claims it.             |
| Task grading fails                | Attempt marked `failed`; learner can resubmit (counts toward 3).         |

Tests: `routes/days.test.ts`, `days/schedule.test.ts`, `routes/grading.test.ts`, `progress/streak.test.ts`; browser: `bun run e2e:learner`.
