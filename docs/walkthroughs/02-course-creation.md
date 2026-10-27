# Walkthrough 2: Creating a course (intake → placement → outline)

**Goal.** Turn "learn X, to depth Y, in Z weeks" into an approved, editable day-by-day plan tuned to what the learner already knows.
**Code:** `routes/courses.ts`, `placement/` (service, adaptive, prompt), `outline/service.ts`, `llm/course-generator.ts`, `lib/background.ts`; shared schemas `intake`, `placement`, `course-outline`, `outline-edit`. **Web:** `pages/new-course.tsx`, `pages/course/{index,placement,outline,home}.tsx`.

```
 POST /courses
   ├─ depth = basic ────────────────────────────┐
   └─ depth = working | deep → status placement │
        placement bank (1 LLM call) → adaptive quiz (no LLM)
        └─ done → level + strong/weak topics ────┴─► status outline
                                                      outline generated in background (1 LLM call)
                                                      learner edits (new versions) → approve → status active
```

## Step 0: The chat

`/courses/new` is a conversation, not a form. Free text for the topic; chips for the rest.

```
"What do you want to learn?"  ─► POST /intake/topic   (one cheap model call, free for the learner)
     refuse → a polite reason, ask again
     broad  ("quantum physics") → three narrower options as chips | type your own | keep it broad
     specific → straight on
"How deep?" basic / intermediate / advanced  →  "How many weeks?"  →  "Minutes a day?"
  →  "Adapt your plan automatically or when you ask?"  →  summary with an estimated price
  →  "Design my roadmap" = POST /courses
```

- **Safety gate (server-side).** `POST /courses` runs the same topic check, so calling the API directly cannot skip the chat. Verdicts are remembered per learner for 24 hours (`topicChecks`), so a topic is never judged twice, and options the model itself offered count as approved. Refusals are for plainly harmful purposes or non-subjects; learning _about_ dangerous things is fine. See `intake/prompt.ts`.
- **Cost control.** Drafting is free for the learner but costs model calls (placement quiz, roadmap), so a learner can start at most 5 unbought courses in 24 hours and 30 topic checks an hour.
- **What the learner types is data.** It goes into the prompt only inside the escaped `<request>` block; the model is told to judge it, never obey it.
- **Depth names** are basic, intermediate, advanced (earlier versions used intro, working, deep; `bun run migrate:depth` renames them in an existing database).

## Step 1: Intake

`POST /courses` validates `{ skill, depth, weeks, minutesPerDay }` with Zod (`CreateCourseSchema`; skill is one line, 2–120 chars). A `Course` is created for the caller. Days per week default to 5.

## Step 2: Placement (skipped for `intro`)

- **One LLM call** (`placement_bank`) creates a bank of 15 multiple-choice questions: 3 at each difficulty 1–5, each with a topic. The call runs in the background; the web app polls `GET /placement` ("Writing…").
- **The quiz itself costs no model calls.** `placement/adaptive.ts` is a deterministic staircase: start at difficulty 3; harder after a correct answer, easier after a wrong one (clamped 1–5). It prefers the least-asked topic among equally suitable questions so the quiz covers the subject broadly.
- **Stopping.** It asks at least 8 and at most 12 questions. From question 8 on it stops when the last four targets stay within 1 of each other (the staircase has settled), at question 12, or when the bank runs out.
- **Result.** `ability` = where the staircase settled; mapped to `foundation | intermediate | advanced`; topics answered right/wrong become `strongTopics`/`weakTopics`. Stored on the course.
- **Secrecy.** Questions are sent without `answerIndex`. Answering the same question twice → 409. Another user → 404.

## Step 3: Outline

- Triggered automatically when placement finishes (or at once for `intro`). One job per course: starting it is an atomic claim, so double requests do not double-generate.
- The prompt carries level, strong/weak topics, weeks, minutes per day, and the skill. The model returns a `CourseOutline` (weeks → days with title, objectives, topics); it is Zod-validated plus extra checks (day numbering, count) before storage. Failure → `outlineStatus: failed` and a Retry button.
- **Versions.** Each save is a new row in `courseOutlines` (`generated`, then `edited`…). `GET …/outline?version=N` reads old ones.
- **What a learner may edit** (`PUT /outline`): rename days and week themes, remove days, reorder. They reference days by `fromDay`, so **topics and objectives cannot be edited**: later prompts are built from the stored text, not from learner-typed text. A stale `baseVersion` → 409.
- **Price (credit quote).** `days × ⌈minutesPerDay ÷ 15⌉ × 4 × depth factor`, shown with the roadmap and recomputed after every edit. See [../pricing.md](../pricing.md).
- **Approve = buy** (`POST …/approve {version}`, latest only): in one transaction the course becomes `active`, `startedAt` is set, the price is charged (402 if the learner can't pay, and nothing changes), and one `courseDays` row per outline day is created with its `unlockAt` date. A second click gets 409 and no second charge. See [07](07-credits-and-payments.md).

## Background work

Slow LLM calls run through `lib/background.ts`. The route returns immediately; the model call continues in-process, and clients poll. Stale claims (older than ~5 min) can be re-claimed. This is simple and fine for one API process; moving to a real job queue is a Phase 5 question.

## Prompt safety

Learner-provided values (skill, minutes…) are JSON-encoded in a `<request>` block with `<` escaped, so they cannot close the block, and each prompt states that tagged text is data and instructions inside it must be ignored. See [04-llm-layer.md](04-llm-layer.md).

Tests: `routes/courses.test.ts`, `placement/adaptive.test.ts`, `outline/service.test.ts`, `routes/outline.test.ts` (including 404 for other learners on every route).
