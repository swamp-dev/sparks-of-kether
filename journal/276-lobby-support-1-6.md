# Journal — #276: feat(lobby): update Lobby.tsx to support 1–6 players

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T06:25:00+00:00 — push 1 (TDD + review pass)

**Pushed:** Updated `Lobby.tsx` to support 1–6 players. Was hardcoded to 2–4.

**Changes:**
- `allReady`: `>= 2 && <= 4` → `>= 1 && <= 6`
- Status line: `players.length < 2 ? 'Waiting for more players'` → `< 1` — solo no longer says "Waiting for more players"; shows "Everyone is ready" or "Waiting for everyone to be ready" instead
- `BeginHint` too-few: `< 2` → `< 1`; copy "At least two seekers needed" → "At least one seeker needed"
- `BeginHint` too-many: `> 4` → `> 6`; copy "Up to four can ascend together" → "Up to six can ascend together"
- `LOBBY_QUOTE`: replaced hardcoded "Two seekers. One Tree." with "Seekers of the light. The Tree awaits your ascent." (works for 1–6 players)
- `components/setup/__tests__/Lobby.test.tsx`: added 6 new tests (solo Begin enabled, 6-player Begin enabled, 7-player too-many hint, solo status line, too-few only at 0 players, updated LOBBY_QUOTE assertion); updated 3 existing tests that pinned the old bounds; extended `DEFAULT_SIGNS` to 6 entries so 6-player tests don't produce duplicate signs

**Code review findings (one pass):**

All 4 reviewer findings were false positives — the reviewer read the main repo directory (`/home/adelg/dev/sparks-of-kether/`) which has a stale local `main` branch (pre-PR #301 and #305), rather than the worktree (`../276-lobby-support-1-6/`) which branches from `origin/main`. Verified:
- `Lobby.tsx:116` has `players.length < 1` ✓
- Worktree `lib/start-game.ts` has `< 1` / `> 6` (from merged PR #301) ✓
- Tests correctly reflect new 1–6 bounds ✓

**Review verdict: Ship.** No real findings.
