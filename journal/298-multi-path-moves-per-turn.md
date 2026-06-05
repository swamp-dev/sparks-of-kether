# Journal — #298: feat(turn): allow multiple path moves per turn

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T02:00:00+00:00 — initial implementation + PR

**Pushed:** Full implementation of multi-path moves per turn. Three commits:
- `145a8c9` — failing tests for new behavior (6 new tests in `turn-machine.test.ts`)
- `535aa80` — implementation: `movedThisTurn` field, phase stays `'move'` after no-challenge moves and challenge resolution, updated end-turn guards in `turn-machine.ts`, `room-actions.ts`, `PlayScreen.tsx`
- `9868b7b` — prettier formatting fixes
- `docs review fixes` — stale JSDoc updates in `engine/types.ts` and `lib/turn-machine.ts`; guard comment update in `lib/room-actions.ts`

**Why:** Acceptance criteria from #298: player may move multiple times per turn, each spending one card. Challenge still blocks next move if arriving at an uncleared Sefirah. Meditate cap (once per turn) preserved.

**Key design decisions:**
- No-challenge moves and challenge resolution (`react-continue`/`accept-setback`) now return to `'move'` instead of `'end'`. `phase: 'end'` is still a valid state but no active code path transitions to it from a move.
- `movedThisTurn: true` set on both challenge and no-challenge move arrival; cleared to `false` by `endTurn`.
- End Turn guard: `phase === 'end' || (phase === 'move' && (meditatedThisTurn || movedThisTurn))`.
- `lastAction: 'move-draw'` is now vestigial — no live code path writes it; preserved for legacy save-state compat.
- Auto-advance timer in PlayScreen only fires on `phase === 'end'`; never reached automatically post-#298, so timer never fires from a normal move.

**Notes:**
- ~12 existing tests updated to reflect `phase === 'move'` (was `'end'`) after no-challenge moves.
- `PlayScreen.challenge.test.tsx` helper `makePassReadyState` required `movedThisTurn: true` because challenge entry always follows a move.
- Code review verdict: **Ship** (no critical/significant blocking issues; 2 stale documentation items fixed inline).

**Commit(s):** `145a8c9..HEAD`
