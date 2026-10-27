# Walkthrough 1: Authentication

**Goal.** Know who is calling, without storing anything an attacker could replay.
**Code:** `apps/api/src/routes/auth.ts`, `auth/` (session, mailer, google, rate-limit, users), models `User`, `Session`, `MagicToken`, `RateLimit`. **Web:** `pages/login.tsx`, `pages/magic.tsx`, `lib/auth.tsx`, `components/require-auth.tsx`. **Reference:** [../API.md](../API.md#auth-walkthrough).

## Magic-link sign-in, step by step

1. **Request.** The learner types an email on `/login`. The web app calls `POST /auth/magic/request`.
2. **Throttle.** Two counters are bumped atomically in MongoDB (`rateLimits`): per IP (20) and per email hash (5), in fixed 15-minute windows. Over the limit → 429. Counters live in the database, not process memory, so they hold across restarts and several API processes.
3. **Token.** The server makes a random token, stores only its **SHA-256 hash** with the email and a 15-minute expiry, and emails the link `WEB_URL/auth/magic?token=…`.
4. **Same answer always.** The response is `{ sent: true }` whether or not the email has an account, so the endpoint cannot be used to discover who is registered.
5. **Open the link.** It lands on a _web page_ (`/auth/magic`), which then `POST`s the token to `/auth/magic/verify`. This is deliberate: email security scanners often `GET` links; if the GET consumed the token, the learner's click would fail.
6. **Redeem.** One atomic `findOneAndUpdate` flips `usedAt` from `null` to now, only if the token is unexpired. Two simultaneous clicks: exactly one wins (tested with 5 concurrent attempts).
7. **Session.** The user row is created or found (email lowercased), a random session token is generated, its hash is stored in `sessions`, and the raw value goes to the browser in the cookie `ricfey_session` (httpOnly, SameSite=Lax, Secure). JavaScript cannot read it.

In development with no `RESEND_API_KEY`, step 3 prints the link (email masked) to the API console instead of sending mail.

## Google sign-in

`GET /auth/google` sets a random `state` cookie and redirects to Google. On the callback the server checks `state` matches before exchanging the code, fetches the profile from Google's userinfo endpoint, finds or creates the user (matching by `googleId`, then by email, which links the Google account to an existing magic-link user), starts a session and redirects to the web app. Errors redirect to `/login?error=…` rather than showing raw errors. Needs `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` (all three or none). Tested with a fake Google client; **real Google is unverified** until a client exists.

## Every other route

Routes call `requireUser(req, now)`: read the cookie, hash it, look up a non-expired session, load the user, or throw 401. The web app wraps private pages in `RequireAuth`, which asks `/auth/me` and redirects to `/login` if it fails.

## Why these choices

| Choice                             | Reason                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| Hash tokens and sessions at rest   | A leaked database dump cannot be replayed as logins.   |
| Opaque session tokens (not JWTs)   | Logout and revocation are just "delete the row".       |
| Token redeemed by POST from a page | Defeats link scanners.                                 |
| Rate limits in MongoDB             | No extra infrastructure; survives restarts.            |
| Request logs omit query strings    | The magic token is in the URL; it must not reach logs. |

## Try it

```sh
curl -X POST localhost:4000/auth/magic/request -H 'content-type: application/json' -d '{"email":"you@example.com"}'
# copy TOKEN from the API console
curl -c jar -X POST localhost:4000/auth/magic/verify -H 'content-type: application/json' -d '{"token":"TOKEN"}'
curl -b jar localhost:4000/auth/me                # your user
curl localhost:4000/auth/me                       # 401
```

Tests: `apps/api/src/routes/auth.test.ts` (single use, concurrent use, expiry, rate limits, 401 without cookie, Google state). Not verified: Resend delivery, real Google, Safari.
