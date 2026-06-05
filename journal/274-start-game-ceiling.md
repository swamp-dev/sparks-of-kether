# Journal — #274: feat(server): raise player ceiling to 6, lower floor to 1 in start-game validation

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T07:00:00+00:00 — push 1 (TDD + review passes)

**Pushed:** Updated `validateAndBuildSetup` in `lib/start-game.ts` to accept 1–6 players (was 2–4), matching the engine's new range from #272.

**Changes:**
- `lib/start-game.ts`: lower bound `< 2` → `< 1`; upper bound `> 4` → `> 6`; JSDoc updated to `1..6`.
- `lib/__tests__/start-game.test.ts`: replaced stale "rejects 1 player" and "rejects 5+ players" tests; added 0-player (too-few), solo (accepts 1), 5-player, 6-player, and 7-player (too-many) tests. Count assertions added to both boundary error tests.
- `app/api/rooms/[code]/start/__tests__/route.test.ts`: updated too-few test to use 0 players; added solo-play test asserting `status 200`, `snapshotInserts.length === 1`, and `snapshot.activePlayerId === 'host-uid'`.

**Code review findings (two passes):**

**Significant (first pass) — fixed:**
- `too-few-players` and `too-many-players` tests only asserted `.kind`, not `.count`. Added discriminated-union narrowing guards and count assertions (0 and 7 respectively).

**Minor (first pass) — fixed:**
- Solo route test only asserted `status === 200` and `snapshotInserts.length === 1`, shallower than the existing happy-path test. Added `snapshot.activePlayerId` assertion.

**Second pass verdict: Ship.** No new findings.

**Pre-existing failure:** `scripts/music/__tests__/synth.test.ts` times out on both `main` and this branch — not caused by this PR.
