# Needs from me

Things only you can do. One line each: what to create or decide, and which env var it fills.
Everything here has a fake or dev-mode stand-in, so nothing is blocked; the real path is [UNVERIFIED] until done.

- [ ] Read the samples in `docs/samples/*/*/outline.md` and `day-01.md` and decide whether you'd learn from them (Phase 1 gate). No env var.
- [ ] In AI Studio → rate limits, read RPM, TPM and RPD for `gemini-3.5-flash-lite` (3.8 Flash RPD is 20, already known), and add them to the table in `apps/api/scripts/cost-report.ts` (`KNOWN_RPD`). Fills `LLM_DAILY_CALL_CAP` (keep it below the smallest RPD you use).
- [ ] Google OAuth client: at https://console.developers.google.com/auth/branding set up the app (name, support email), then at https://console.developers.google.com/auth/clients → Create client → Web application, Authorized redirect URI `http://localhost:4000/auth/google/callback`. Fills `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (the secret is shown only once).
- [ ] Resend: create an account at https://resend.com, add and verify a domain you own, create an API key. Fills `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Ricfey <login@yourdomain>`). Until then dev mode prints magic links to the API console.
- [ ] **Atlas IP access list:** since ~2026-10-20 Atlas rejects this machine (TLS alert = IP not allowed). Atlas → Network Access → Add IP `122.167.114.111` (your current IP; it changes, so consider your ISP's range). Unblocks `MONGODB_URI`. Meanwhile dev and tests run on a local replica set.
