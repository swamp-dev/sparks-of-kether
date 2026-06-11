# Journal — #334: fix(setup): "Failed to fetch" auth error gives no actionable guidance

Append-only. Never edit or delete past entries. One entry per `git push` on this branch.

---

## 2026-06-11T01:15:00+00:00 — push 1: implementation + tests + review fix

**Pushed:** Three commits: failing tests for the network-error branch, the implementation (`isNetworkError` helper + export `formatCreateError`/`formatJoinError`), and a review-driven fix tightening Safari's "Load failed" check from `.includes()` to `=== `.

**Why:** Production Vercel deploy was showing raw "Failed to fetch" (ERR_NAME_NOT_RESOLVED) to players when Supabase is unreachable. The error gave no guidance. This PR replaces it with "Can't reach the game server — please check your connection and try again." for network-level failures, while leaving Supabase-level errors (e.g. anon sign-ins disabled) passed through unchanged.

**Notes:** Root cause in production is almost certainly Vercel env vars (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) pointing at a deleted or paused Supabase project. This code change improves the UX when it happens; the underlying config issue still needs to be fixed in the Vercel dashboard. Local `.env.local` was also missing both Supabase vars — fixed in the same session (not tracked in this branch since it's gitignored).

The synth test in `scripts/music/__tests__/synth.test.ts` showed one flaky failure during the initial full-suite run (19s timeout) but passed on every subsequent run. Pre-existing flakiness, unrelated to this change.

**Commit(s):** `7230670..8c2a227`
