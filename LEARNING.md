# Learning log

Per checkpoint, 3 to 5 concepts: a short first-principles explanation, one question, and a
line for your answer. Write your answer, then ask Claude to check it.

---

## C1. Guardrails and skeleton

### 1. Monorepo workspaces

One repository holds several packages that each have their own `package.json`. The package
manager links them to each other locally (`"@ricfey/shared": "workspace:*"`), so the API and
web app import shared code as if it were published, without publishing it.

**Q:** If `apps/web` imports a Zod schema from `@ricfey/shared` and you change that schema,
what happens to `apps/api` without you touching it, and why is that the point?

My answer:

### 2. Typecheck is not build

`tsc` with `noEmit` only checks that types line up. It produces no output. Bun (API) and Vite
(web) strip types and run the code without checking them. So type errors never block a run;
only `bun run typecheck` catches them, which is why it must be in the "green before PR" list.

**Q:** Bun happily runs a file containing `const n: number = "hi"`. Why does that design
choice make sense for a runtime, and what would you lose if CI skipped typecheck?

My answer:

### 3. Linter vs formatter

A formatter (Prettier) rewrites layout: quotes, line breaks, commas. It never changes meaning.
A linter (ESLint) looks for code that is probably wrong (unused variables, unsafe patterns).
`eslint-config-prettier` switches off ESLint's style rules so they don't contradict Prettier.

**Q:** Name one bug ESLint can catch that Prettier never could, and explain why Prettier can't.

My answer:

### 4. Why `.env` is ignored and `.env.example` is not

Secrets in git live forever in history; deleting the file later does not remove them.
`.env.example` lists variable names with no real values, so a new machine knows what to fill.
Our `.gitignore` ignores `.env.*` and then un-ignores `.env.example` with `!`.

**Q:** You accidentally committed and pushed a real Gemini key. Is deleting it in the next
commit enough? What must you actually do?

My answer:

### 5. Peer dependencies

A peer dependency says "I plug into your copy of X, within this version range" instead of
bringing its own X. typescript-eslint declares TypeScript as a peer (`<6.1.0`), so when we got
TypeScript 7 it refused to run. That is why TypeScript is pinned to 6.0.x (see DECISIONS.md).

**Q:** Why would typescript-eslint want to use _your_ TypeScript instead of bundling its own?

My answer:

---

## C2. API skeleton and MongoDB

### 1. One error shape, one place

If every route formats its own errors, the client gets ten slightly different shapes and
someone eventually returns a stack trace. Instead, routes `throw new AppError(code, message)`
and one handler converts any error into `{ success: false, error }`. Unknown errors become 500.

**Q:** Why does the handler send "Something went wrong" for unknown errors instead of
`err.message`? Give a concrete example of what could leak.

My answer:

### 2. Validate at the boundary, trust inside

TypeScript types vanish at runtime, so a request body typed `{ age: number }` can still hold
`"old"`. Zod checks the real value once, where it enters (env at startup, body at the route),
and hands back data that really matches the type. Code past that point can trust it.

**Q:** Why fail at _startup_ when `MONGODB_URI` is missing, rather than when the first
request tries to use the database?

My answer:

### 3. Indexes and uniqueness

An index is a sorted lookup structure, so queries don't scan every document. A _unique_
index also makes the database refuse duplicates, even when two requests race. Checking
"does this email exist?" in code first can't do that, because both requests see "no".

**Q:** Our email index is unique, and Mongoose lowercases emails before saving. What bug
would you get if we dropped `lowercase: true` but kept the unique index?

My answer:

### 4. Replica sets and transactions

A replica set is several MongoDB servers holding copies of the same data, one primary
taking writes. Multi-document transactions rely on the oplog (the replication log), which
only replica sets have. Atlas is always a replica set; a plain local `mongod` is not.

**Q:** Buying credits means "add ₹ to the ledger AND increase the balance". What goes wrong
without a transaction if the server crashes between the two writes?

My answer:

### 5. Liveness vs readiness

Liveness asks "is this process alive, or should it be restarted?" Readiness asks "can it
serve traffic right now?" Our `/health` is liveness: it stays 200 while Mongo is down and
reports `db` as data, so a host won't restart a healthy process during a DB blip.

**Q:** In what situation would you _want_ a health check to fail because the DB is down?

My answer:

---

## C3. LLM layer and the cost test

**Brief**

1. **What:** shared Zod schemas for `CourseOutline` and `DayContent`; an `LlmProvider` interface
   with Gemini and Fake implementations; a daily cap; an `llmCalls` log; `gen:sample`; a cost report.
2. **Why:** this is the phase gate. If lessons are weak or a course-day costs more than credits
   can cover, the product doesn't work, and we want to know before building auth and UI.
3. **Risk:** Gemini returns JSON that parses but is wrong (thin lessons, a quiz answer index
   pointing at the wrong option). Zod catches shape errors, not quality. You read the samples.
4. **Risk:** free-tier limits are not published in the docs, only shown inside AI Studio,
   so the cost report needs you to read them off your account.
5. **Risk:** prices change. Gemini 3.8 Flash paid pricing doubles on 1 Jan 2027, so the
   report must show both prices and keep prices in one config file.

### 1. Why a fake provider?

The FakeProvider returns canned responses through the same `LlmProvider` interface as Gemini.

**Q:** What can tests prove using the FakeProvider that would be slow, flaky or expensive with
the real one? And what can they never prove, however many fake tests we write?

My answer:

### 2. Schema in the request, Zod on the response

Gemini can be given a JSON schema and asked to follow it. We still validate the response with
Zod, and on failure retry once with the validation error in the prompt.

**Q:** If the model is already told the schema, why validate again? And why retry exactly
once rather than zero times or until it succeeds?

My answer:

### 3. Tokens are the unit of cost

Models bill per token (roughly ¾ of an English word), and output tokens cost more than input:
on Gemini 3.8 Flash, $0.75 vs $3.75 per million (pricing page, until 31 Dec 2026).

**Q:** One call that generates lesson + task + quiz together, or three separate calls: which
costs more in tokens, and what do you gain by paying it?

My answer:

### 4. Enforcing a daily cap

The cap is checked in one place before every call: "if today's calls or tokens ≥ limit, refuse".

**Q:** Two requests arrive at the same instant when we are one call under the cap. Both read
the counter, both see "under", both call Gemini. How could we stop that, and does it matter
much at our scale?

My answer:

### 5. Free tier data terms

Gemini's pricing page says free-tier content is "used to improve our products"; paid-tier
content is not.

**Q:** What does that mean for what we may send to Gemini in Phase 1, and what must change
before real users type their own goals and answers into Ricfey?

My answer:
