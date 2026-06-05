# Journal — #278: test: solo and 6-player path coverage — integration + E2E

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T04:00:00Z — push 1 integration + E2E specs for solo and 6-player paths

**Pushed:** Integration tests for `validateAndBuildSetup` + `initializeGame` at the 1- and 6-player count boundaries, two new E2E specs (solo play-flow + solo coda, 6-player lobby), and a solo fixture extension to the `/demo/final-threshold` demo route.

- `tests/integration/startGame.test.ts` — 4 new integration tests against real Supabase (beforeEach wipeAllTables):
  - Solo: `validateAndBuildSetup` succeeds for a 1-player room (previously gated at `< 2`).
  - Solo: `initializeGame` produces a 1-player GameState; pins deck size to `toBe(22 - 1*3)` = 19 (1 Major Arcana deck, 3 cards dealt).
  - 6-player: `validateAndBuildSetup` succeeds for a fully-seated room (previously gated at `> 4`); verifies all 6 zodiac signs are unique.
  - 6-player: `initializeGame` produces a 6-player GameState; pins deck size to `toBe(3*22 - 6*3)` = 48 (3 decks, 18 dealt).
  - Note: 6-player tests use service-role to set guest zodiac signs because `joinRoom` calls `signOut()` internally, which invalidates the guest anon client's userId after join.
- `e2e/solo-play.spec.ts` — 2 new E2E specs:
  - Full solo flow: home → count picker ("1") → sign pick → blessing ritual → lobby (Begin enabled) → play screen. Confirms `[data-play-screen]`, `[data-hand]`, `[data-stat-sheet]` render and `data-phase="move"`.
  - Solo coda via demo route: `/demo/final-threshold?count=1&subPhase=trial` → asserts `data-coda-mode="solo"`, no `[data-trial-order]` visible, Roll button present, no "Waiting for team" text (AC #2 from #277).
- `e2e/six-player-lobby.spec.ts` — 1 new E2E spec:
  - 6-player flow: home → count picker ("6") → all 6 players through sign pick + blessing ritual → lobby (Begin enabled) → play screen. Sign navigation uses documented click counts; discovered that the carousel Next button skips taken signs, requiring 1 click for Cancer (not 2).
- `app/demo/final-threshold/page.tsx` — extended with `?count=1` parameter to mount a solo trial fixture via `buildSoloTrialFixture()`. Only `subPhase=trial` is wired for solo; hold/close fall through to existing 2-player fixtures (out of scope for #278).

**Code review findings addressed:** Missing `roomRow.error` checks in tests 2–4 (would have produced opaque `!` failures instead of clean assertions); unused `guestPlayerIds` variable removed; solo deck assertion pinned to exact value; `[data-stat-sheet]` added to 6-player E2E; stale `#370` issue ref dropped from carousel comment.

**Why:** All implementation tickets (#274–#277) were merged without E2E coverage for the boundary player counts. These tests hold the line against regressions in `validateAndBuildSetup`'s player-count gates and confirm the 1- and 6-player paths traverse the full UI stack without crash.

**Commit(s):** `6575775`, `a45442e`, `4456b75`
