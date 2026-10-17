# Needs from me

Things only you can do. One line each: what to create or decide, and which env var it fills.
Everything here has a fake or dev-mode stand-in, so nothing is blocked; the real path is [UNVERIFIED] until done.

- [ ] Read the samples in `docs/samples/*/*/outline.md` and `day-01.md` and decide whether you'd learn from them (Phase 1 gate). No env var.
- [ ] In AI Studio → rate limits, read RPM, TPM and RPD for `gemini-3.5-flash-lite` (3.8 Flash RPD is 20, already known), and add them to the table in `apps/api/scripts/cost-report.ts` (`KNOWN_RPD`). Fills `LLM_DAILY_CALL_CAP` (keep it below the smallest RPD you use).
