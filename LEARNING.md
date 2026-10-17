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
