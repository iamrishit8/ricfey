# Walkthrough 8: The gallery

**Idea.** Every course is written by the model for one learner. When that learner finishes it, the course is not wasted: it joins a gallery, and a later learner who wants the same thing can buy it ready-made, for 60 % of the price of a custom one, and start at once.
**Code:** `apps/api/src/gallery/service.ts`, `routes/gallery.ts`, models `GalleryCourse`, `GalleryDay`, hook in `grading/service.ts` (`maybeCompleteDay`), `scripts/seed-gallery.ts`; shared `gallery.ts`, `credits.ts` (`galleryPrice`). **Web:** `pages/gallery.tsx`, `pages/gallery-detail.tsx`, the gallery step in `pages/new-course.tsx`.

## 1. Publishing is automatic

When the last day of a learner's **custom** course is finished, the course becomes `completed` and a background job calls `publishToGallery`. It publishes only if every check passes (`galleryBlocker`):

| Check                                              | Why                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| the course is custom, not itself a gallery copy    | gallery copies would only duplicate                                               |
| every day has content and status `ready`           | a day the self-check flagged (it may contain mistakes) keeps the course out       |
| no open "Flag a mistake" report on the course      | a learner already said something is wrong                                         |
| the days match the outline                         | nothing is missing                                                                |
| no gallery course with the same **variant** exists | one course per skill + depth + weeks + minutes a day; the first to finish is kept |

What is stored: the final roadmap (re-validated with Zod), every day's lesson, task and quiz (re-validated), the skill, depth and length, and the price (60 % of the custom price, nearest 10, fixed at publish time). **Nothing about the learner** is stored: no id, email, answers or scores (tested). There are no human authors, so there is no consent step and no creator reward.

## 2. Finding a course

`GET /gallery?q=&depth=&minWeeks=&maxWeeks=`:

- No `q`: the most-completed first.
- With `q`: MongoDB text search over skill (weight 10), title (5), topic tags (3) and summary (1), then **an exact skill match is put first, then a skill that starts with the query**: "the most precise one". Ratings and more filters are future work.
- The chat intake also searches the gallery for the topic and offers matching ready-made courses **before** writing a custom one (cheaper for the learner, free for us).

## 3. Buying

`POST /gallery/:id/buy` runs one transaction: create the learner's own `Course` (`source: "gallery"`, active, their own schedule), charge the fixed price (key `gallery:<galleryId>:<userId>`), copy the roadmap as outline version 1, and create every day **with its content already in place** (status `ready`). So:

- Day 1 opens instantly; no model call writes a lesson.
- Quizzes are still graded on the server and tasks by the model against the rubric: the buyer has their own attempts, scores, streak and progress.
- **No re-plan**: the lessons exist and are fixed (`POST /replan` → 409; the panel is hidden).
- A learner can buy a given gallery course once (a unique partial index; five simultaneous clicks make one copy and one charge).
- When a buyer finishes it, the gallery course's `completions` goes up. It is never published again.

## 4. Seeding

The gallery starts empty. `bun run seed:gallery -- --skill "Music theory" --depth intermediate --weeks 2 --minutes 30` writes a whole course with the real model (or `--provider fake`) in-process, marks it finished and publishes it through the same checks. It costs model calls: about 1 for the outline plus 2 to 4 per day. A throwaway learner owns it and is deleted afterwards.

## Try it

Fake mode: `bun run seed:gallery -- --skill Knitting --depth basic --weeks 1 --minutes 20 --provider fake`, then in the app: Gallery → Knitting → Buy for 20 credits; or chat "Knitting" at **New course** and see the ready-made offer first.

Tests: `routes/gallery.test.ts`; browser: the last steps of `bun run e2e:learner`.
Not verified: ranking quality on a large gallery; how real courses fare at the quality gates; abuse (many accounts, near-duplicate variants).
