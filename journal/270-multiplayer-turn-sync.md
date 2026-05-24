# Journal — #270: fix(multiplayer): endTurn never dispatches to server

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-24 — first push: failing unit test + full fix + E2E spec

**Commits:** `1d237f2` → `24ab0c9` → `4386f03` → `b0c55a8`

**Root cause (two missing pieces):**

1. `endTurn` in `lib/use-turn.ts` applied the turn-advance locally only — no
   call to `opts.dispatchClientAction`, unlike every Kether ritual method below
   it (lines 666-813) which correctly dispatches. The method predated the
   dispatch pattern and was never updated.

2. `PlayScreen.tsx` called `useTurn({ initialState, rng })` with no
   `dispatchClientAction` or `selfPlayerId`, so even if endTurn tried to
   dispatch, the callback would have been `undefined`.

**TDZ pitfall:** First attempt put `dispatch = opts.dispatchClientAction` at
line 645 but `endTurn` useCallback is at line 607 — ReferenceError at runtime.
Fix: extract `endTurnDispatch` and `endTurnPlayerId` as local consts immediately
before the callback, matching the Kether methods' own pattern.

**What was added:**
- `lib/__tests__/use-turn.test.ts`: two tests in `'useTurn — endTurn multiplayer dispatch (#270)'`
- `lib/use-turn.ts:607-617`: `endTurn` now dispatches `{ kind: 'end-turn', playerId }` after `setSnapshot`
- `components/game/PlayScreen.tsx`: fire-and-forget `dispatchClientAction` callback, passed to `useTurn` when `roomCode + currentPlayerId` are both set
- `components/game/__tests__/PlayScreen.dispatch.test.tsx`: fetch-spy component tests (POST to `/api/rooms/ABCD/events`; hot-seat no-op)
- `e2e/multiplayer-turn.spec.ts`: two-browser Playwright spec — P1 ends turn, P2's screen must update within 5 s (Realtime roundtrip)

**Tests:** 3299 passing, 1 todo. No regressions.
