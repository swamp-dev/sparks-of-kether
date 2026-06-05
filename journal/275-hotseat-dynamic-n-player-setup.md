# Journal — #275: feat(hotseat): dynamic N-player (1–6) setup flow in app/play/page.tsx

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T09:00:00+00:00 — push 1 (TDD + two review passes)

**Pushed:** Made `app/play/page.tsx` dynamic for 1–6 players. Was hardcoded to 2-player tuple.

**Changes:**
- `app/play/page.tsx`: Added `{ kind: 'count' }` phase; widened `playerIndex: 0 | 1` → `number`; replaced `[SetupSlot, SetupSlot]` tuple with `SetupSlot[]`; replaced fixed 2-element `ritualRngs` with 6 pre-allocated RNGs (`seed+0..seed+5`); `playRng` moves to `seed+6`; `finishRitual` generalizes `idx === 0` check to `idx + 1 < slots.length`; added `CountPickerScreen` with 1–6 segmented button group.
- `app/play/__tests__/page.test.tsx`: New test file. Count picker tests (renders 1–6 buttons, accessible group label, click advances, keyboard-triggerable). Integration tests: 1-player solo flow (count→sign→ritual→lobby with ready=true assertion); 6-player flow (6×sign+ritual pairs → lobby with 6 ready players). Sub-components mocked at boundaries.

**Code review findings (two passes):**

**Significant (first pass) — fixed:**
- `playerCount` state is redundant (`slots.length` is always equal); risk of future divergence. Removed state; use `slots.length` in `finishRitual`.
- JSDoc on `PlayPage` still described hardcoded 2-player flow. Updated to describe N-player count-picker flow.

**Minor (first pass) — deferred to tech-debt:**
- `capturedLobbyPlayers` should reset in `beforeEach` (currently manual per describe). Filed #303.
- Count-picker buttons use bare numerals; `aria-label="N player(s)"` would be more self-describing. Filed #304.
- `finishCount` has no defensive range validation (1–6); deckCountFor throws at initializeGame if OOB anyway.

**Second pass verdict: Ship.** No new findings.

**Branch rebased** on `origin/main` (which had #297 squash-merged between worktree creation and push) before opening PR.
