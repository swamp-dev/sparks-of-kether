# Journal — #522: fix(end-turn): mirror turnReducer phase-gate in room-actions dispatcher

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T12:40:57-04:00 — push 1: dispatcher gate + cascading test updates

**Pushed:** test(end-turn): pin wrong-phase rejection in dispatcher (#522); fix(end-turn): close move-without-meditate skip-turn bypass in applyClientAction (#522)

**Why:** Ticket #522 describes an HTTP-level skip-turn bypass — a
fresh-`'move'` player who hasn't meditated could POST `end-turn` to
the events route and have `endTurn()` rotate the seat (since the
dispatcher had no phase gate, only the reducer did). The fix adds a
guard in `lib/room-actions.ts` `'end-turn'` arm that mirrors the
relevant slice of the reducer's `allowEndTurn` rule
(`lib/turn-machine.ts:1423`) and extends `ApplyActionRejection` with
a new `{ kind: 'end-turn'; cause: { kind: 'wrong-phase'; expected;
actual } }` shape.

**Notes:**

- **Scope choice — narrow gate**, not a full mirror. The reducer's
  `allowEndTurn` rejects every phase except `'end'` and
  `'move'+meditatedThisTurn`; mirroring it exactly would also reject
  `'challenge'` and `'kether'` end-turns at the dispatcher. The
  ticket's concrete defense-in-depth concern is move-without-
  meditate, so the gate is scoped to that case. The broader
  mirror would surface that the playthrough scenario harness has
  trailing-`endTurn` calls after the Kether ritual fires which
  are no-ops in real production gameplay (kether seat rotation is
  internal to the move arm of `turnReducer` — clients never legit
  dispatch end-turn from `'kether'`). Tightening to a full mirror
  + dropping those trailing endTurns is a clean follow-up but is
  out of scope here.
- **Cascading test updates.** Five tests on main were sending
  `end-turn` from the default-`'move'` phase without
  `meditatedThisTurn` — exactly the bug case. Updated each to seed
  a legitimate `phase: 'end'` state:
  - `test/__tests__/fixtures.test.ts` (2 tests) — `{ ...base, phase: 'end' }` override at scenario seed.
  - `app/api/rooms/[code]/events/__tests__/route.test.ts` (2 tests) — per-test snapshot override and `phase: 'end'` on the corrupt-state fixture.
  - `app/api/__tests__/multiplayer-flow.test.ts` (2 tests) — added a `forceSnapshotPhaseEnd()` helper that rewrites the in-memory `game_states` row's `snapshot.phase` to `'end'` between `callStart` and the next `end-turn` event (the dispatcher resets phase to `'move'` on rotation, so the helper fires once per rotation).
- **Type extension** uses an inline narrow `wrong-phase` shape
  rather than the broader `TurnReducerError`. The dispatcher's
  end-turn arm doesn't route through `turnReducer`, so signalling
  "any reducer-shaped reason" overstates the surface.
- Local gate green: `pnpm typecheck`, `pnpm lint`, full vitest
  suite (132 files, 2186 passed, 1 todo).

**Commit(s):** `481038b..8eeb37c`

## 2026-05-08T12:53:26-04:00 — push 2: address review feedback

**Pushed:** test(end-turn): add route-level 422 and meditate→end-turn integration coverage; docs: correct kether scope rationale (#522)

**Why:** Code-reviewer pass 1 returned `Ship` but flagged two
SIGNIFICANT items worth addressing pre-merge:
- Missing route-level 422 test for the new wrong-phase rejection
  (gate was tested only at the `applyClientAction` level).
- Missing integration coverage for the legitimate
  `meditate → end-turn` move-phase exit path (the previous tests
  used `forceSnapshotPhaseEnd`, which bypasses the only realistic
  flow that exits move-phase via end-turn).

Plus two MINORs:
- Misleading kether claim in the journal entry / `room-actions.test.ts`
  scope-note comment ("load-bearing playthrough" was wrong; kether
  seat rotation is internal to the move arm of `turnReducer`).
- Wrong commit hash range in the journal (push 1 entry pointed at
  `7b5e98b`, the actual HEAD after the SHA-amend was `8eeb37c`).

**Notes:**
- Added `it('returns 422 with action-rejected when end-turn fires from move-without-meditate (#522)')` in `app/api/rooms/[code]/events/__tests__/route.test.ts`. Pins the route surface: 422 + `{ error: 'action-rejected', detail: { kind: 'end-turn', cause: { kind: 'wrong-phase', expected: 'end', actual: 'move' } } }`, and that the service-role client is never constructed (no snapshot mutation).
- Added `it('meditate then end-turn rotates the seat (real move-phase exit, #522)')` in `app/api/__tests__/multiplayer-flow.test.ts`. End-to-end pipeline test: `seedLobby → callStart → callEvent(meditate) → assert phase='move' && meditatedThisTurn=true → callEvent(end-turn) → assert seat rotated`. No `forceSnapshotPhaseEnd` use.
- Rewrote the kether sentence in this journal entry and in the trailing comment in `room-actions.test.ts` to accurately describe the broader-mirror tradeoff (the playthrough scenario harness's trailing-`endTurn` calls fire after the Kether ritual and are no-ops in real production).
- Local gate green: `pnpm typecheck`, full vitest suite (2188 passed | 1 todo, 132 files).

**Commit(s):** `29ddb0b`

