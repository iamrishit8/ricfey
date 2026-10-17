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
