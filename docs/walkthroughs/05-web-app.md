# Walkthrough 5: The web app

**Stack.** React 19, Vite, TypeScript, React Router, Tailwind v4, shadcn/ui-style components (copied into `components/ui`, not installed from a CLI). `apps/web/src`.

## Routes (`router.tsx`)

| Path                    | Page             | Auth | What                                                                        |
| ----------------------- | ---------------- | ---- | --------------------------------------------------------------------------- |
| `/`                     | `home`           | no   | Landing page when signed out; the learner's course dashboard when signed in |
| `/login`, `/auth/magic` | `login`, `magic` | no   | Request link / redeem token                                                 |
| `/styleguide`           | `styleguide`     | no   | Live design tokens, type scale, accents, sample cards                       |
| `/courses/new`          | `new-course`     | yes  | Intake form                                                                 |
| `/courses/:id`          | `course/index`   | yes  | Switches by course status: placement → outline approval → home              |
| `/courses/:id/today`    | `today`          | yes  | Opens the right day                                                         |
| `/courses/:id/days/:n`  | `day`            | yes  | Lesson, task, quiz, flag a mistake                                          |
| `/courses/:id/progress` | `progress`       | yes  | Days done, topic scores, streak                                             |

## Talking to the API

`lib/api.ts` calls `/api/*` (the Vite dev server proxies to `:4000`, so cookies are same-origin and no CORS is needed), unwraps the `{success,data}` envelope and throws `ApiError(status, code, message)`. `lib/use-api.ts` is the data hook, including **polling** for background jobs (stops when finished, on unmount, or after ~5 minutes). Types come from `@ricfey/shared`, so the web app and API cannot drift apart silently.

## Design system

- **Tokens** live in `styles/tokens.css` as CSS variables; light first, dark second (`prefers-color-scheme` plus a manual toggle in `lib/theme.ts`). Components use tokens, never raw colours.
- **Accent**: `--brand` (currently "Vermilion"). Changing the whole brand colour is one line. `/styleguide` shows three options side by side.
- **Type**: Fraunces (display) and Inter (reading), from Google Fonts.
- **Markdown** from the model is rendered by `components/markdown.tsx` with raw HTML turned off.
- **Mobile**: every screen is checked at 390px with no horizontal overflow (`bun run shot -- <url> out.png 390` flags it).

## Browser tooling

`tools/browser/*.ts` drive a real Chrome through the DevTools protocol (no Playwright, by choice: fewer dependencies). `e2e:login` and `e2e:learner` need the API running with dev defaults; `shot` takes a screenshot.

## Adding a page

1. Add the route in `router.tsx` (wrap in `RequireAuth` if private). 2. Fetch with `api()`/`useApi`. 3. Build from `components/ui` and tokens. 4. Check it at 390px and in dark mode. 5. Extend `tools/browser/learner-e2e.ts` if it is part of the learner journey.
