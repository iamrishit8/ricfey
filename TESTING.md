# Testing

How to verify everything that exists today. Updated at the end of each checkpoint.

## All-in-one

```sh
bun install
bun run check   # typecheck + lint + format:check + test; must exit 0
```

## C1. Skeleton

| What                              | Command                                                                                         | Expected                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Workspaces install                | `bun install`                                                                                   | no errors; `node_modules/@ricfey/shared` is a symlink |
| Every workspace typechecks        | `bun run typecheck`                                                                             | three lines, each `Exited with code 0`                |
| Typecheck actually catches errors | add `export const x: number = 'no';` to `packages/shared/src/index.ts`, run `bun run typecheck` | non-zero exit, error names the file. Then revert.     |
| Lint                              | `bun run lint`                                                                                  | exit 0, no output                                     |
| Formatting                        | `bun run format:check`                                                                          | "All matched files use Prettier code style!"          |
| Tests                             | `bun run test`                                                                                  | exit 0 (no test files yet)                            |
| `.env` is never committed         | `echo X=1 > .env && git status --short`                                                         | `.env` does **not** appear. Then `rm .env`.           |
