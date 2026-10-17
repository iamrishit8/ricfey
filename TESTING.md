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

## C2. API skeleton and MongoDB

Automated (`bun run test`):

| File                                 | Covers                                                                                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/app.test.ts`           | `/health` envelope; 404 shape; `AppError` code and status; unknown error → generic 500 with no leaked message; malformed JSON → 400; `validate()` per-field issues          |
| `apps/api/src/config/env.test.ts`    | defaults and coercion; missing `MONGODB_URI`; all problems listed at once; values never echoed; credential redaction                                                        |
| `apps/api/src/models/models.test.ts` | email unique ignoring case and whitespace; `googleId` unique only when set; course enum and range validation; default status. **Skipped unless `MONGODB_URI_TEST` is set.** |

Run the DB tests against a throwaway local replica set (needs `brew install mongodb-community`):

```sh
mkdir -p /tmp/ricfey-mongo
mongod --dbpath /tmp/ricfey-mongo --port 27099 --replSet rs0 --bind_ip 127.0.0.1 --fork --logpath /tmp/ricfey-mongo/log
mongosh --port 27099 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27099"}]})'   # once
MONGODB_URI_TEST='mongodb://127.0.0.1:27099/ricfey_test?replicaSet=rs0' bun test   # expect 0 skip
mongosh --port 27099 --eval 'db.adminCommand({shutdown:1})'   # stop it
```

Manual:

| What                        | Steps                                                                                   | Expected                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Fail fast on bad env        | remove `MONGODB_URI` from `.env`, `bun run dev:api`                                     | prints `MONGODB_URI: is required`, exits 1                                             |
| Clear DB error, no password | set `MONGODB_URI=mongodb://u:s3cret@127.0.0.1:1/x?serverSelectionTimeoutMS=1500`, start | "Could not connect to MongoDB (MongooseServerSelectionError)…"; `s3cret` not in output |
| Replica-set guard           | point `MONGODB_URI` at a standalone mongod (no `--replSet`)                             | "MongoDB must be a replica set", exits 1                                               |
| Health against Atlas        | real `MONGODB_URI`, `bun run dev:api`, `curl localhost:4000/health`                     | `"db":"connected"`                                                                     |
| Graceful shutdown           | Ctrl+C the server                                                                       | log line `SIGINT received, shutting down`                                              |
