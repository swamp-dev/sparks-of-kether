# Journal — #502 + #503: turn flow rework (start-of-turn draw + Meditate stays in move)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T18:43:00-04:00 — push 1: design + engine + UI + tests, draft 1

**Pushed:** Bundled implementation of #502 (move draw to start-of-turn) and
#503 (Meditate stays in move, once-per-turn cap). Source-of-truth design
edit lands first in a separate commit; this push adds the engine, wire
layer, UI, and test churn together.

- `engine/types.ts`: dropped `'draw'` from `TurnPhase` (the discrete draw
  phase is gone; refill folded into `end-turn`). Added `meditatedThisTurn`
  to `GameState`; narrowed `lastAction`'s union to `'move-draw' | undefined`
  (the `'meditate'` literal is unreachable in `'end'` post-#503).
- `engine/turn.ts`: `endTurn` clears `meditatedThisTurn` on seat rotation
  alongside the existing `pendingDiscard` / `lastAction` clears. JSDoc
  notes the refill is layered on top by callers (rng-free here).
- `engine/draws.ts`: lifted `drawToHand` from `lib/turn-machine.ts` so
  both hot-seat and multiplayer dispatchers can share it.
- `lib/turn-machine.ts`: removed the `'draw'` case + event variant.
  `'move'`, `'react-continue'`, `'accept-setback'` now transition straight
  to `'end'` and tag `lastAction: 'move-draw'`. `'meditate'` keeps phase
  `'move'` and sets `meditatedThisTurn`; a second `'meditate'` returns
  `{ kind: 'already-meditated' }`. `'end-turn'` now allowed from `'move'`
  when meditatedThisTurn (so a player who meditates without moving can
  end the turn). `'end-turn'` calls `drawToHand` for the new active
  player (start-of-turn refill).
- `lib/room-actions.ts`: mirrored the engine changes in lockstep —
  `padPhaseAfterMove` lands in `'end'`, `meditate` stays in `'move'`
  with the same `already-meditated` rejection, `end-turn` calls
  `drawToHand` for the new active player, `accept-setback` lands in
  `'end'` directly. `ApplyActionRejection` extended to carry the new
  `'already-meditated'` cause for the `meditate` arm.
- `lib/use-turn.ts`: dropped the `draw` action wrapper (no manual draw
  any more). JSDoc updated for new transitions.
- `components/game/PlayScreen.tsx`: removed Draw button. End-turn button
  now reachable from `'move'` when meditatedThisTurn (so the player who
  meditates and finds nothing usable can still end the turn). Meditate
  button gets a `disabled` prop driven by `meditatedThisTurn`. Post-
  Meditate aria-live callout fires from `'move'` (was `'end'`); copy
  reworded to "You drew 2 cards. You may still play a card, or End your
  turn." Auto-advance gate dropped the `lastAction === 'meditate'`
  suppression (unreachable now). `phaseHint` lost its `'draw'` case.
- `design/mechanics.md`: Turn flow renumbered with Draw as step 1
  (automatic). Drawing & gift-handling prose rewritten for start-of-turn
  semantics + once-per-turn Meditate framing. (This edit shipped in its
  own commit ahead of this push, per the plan.)
- Test churn: ~20 tests across `lib/__tests__/turn-machine.test.ts`,
  `lib/__tests__/use-turn.test.ts`, `lib/__tests__/room-actions.test.ts`,
  `app/api/__tests__/multiplayer-flow.test.ts`,
  `components/game/__tests__/PlayScreen.autoAdvance.test.tsx`,
  `components/game/__tests__/PlayScreen.challenge.test.tsx`. Updated
  `'draw'`-phase assertions → `'end'`. New tests added for: second
  Meditate is rejected, post-Meditate the player can still play a card
  to move, `end-turn` from `'move'` is allowed when meditatedThisTurn,
  start-of-turn refill fires for the new active player on `end-turn`,
  turn-1 hand stays at 4 (no double-draw).

**Why:** Two long-standing UX rough edges. (#502) End-of-turn draw split
the new card's evaluation moment from the player's decision moment by an
entire seat rotation — drew cards then rotated past several other turns
before the new card became actionable. (#503) Meditate-drawn cards
landed in hand but were unusable the same turn because Meditate
transitioned past `'move'` to `'end'`, so the player saw the cards but
couldn't play them. Bundled because both reshape the same turn-phase
graph; the design surface is shared.

**Notes:** All 2023 unit tests pass. Local CI verify+build pending at
push time (the run is in progress; will note CI status on the next
push entry). The `'meditate'` literal is gone from `lastAction`'s union;
PlayScreen now reads `meditatedThisTurn` for both the post-Meditate
callout and the Meditate-button disable state. The companion #501
(cancel-Meditate-before-commit) is intentionally out of scope.

**Commit(s):** `9aecca7` (design doc) + bundled engine/UI/test commit (this push HEAD)

## 2026-05-07T19:11:00-04:00 — push 2: review fixes

**Pushed:** code-reviewer first-pass `ship` verdict with 2 SIGNIFICANT
findings + 4 stale-comment minors; this push addresses all six.

- **PlayScreen draw-chime** (SIGNIFICANT): the `lastAction === 'move-draw'`
  branch in the sound `useEffect` is dead code post-#502 — the seat
  rotation triggers the `prevTurnIndexRef.current !== turnIndex`
  early-return *before* the chime gate evaluates, so start-of-turn
  refill never produced a chime in the first place. Removed the dead
  branch; the chime is now correctly Meditate-only (player-initiated
  draw warrants the cue, automatic-on-rotation refill does not).
  Removed the now-unused `handLastAction` local. Comment rewritten to
  document the intentional behaviour.
- **room-actions meditate test gap** (SIGNIFICANT): the multiplayer
  dispatcher's meditate happy-path test asserted hand contents but not
  `phase === 'move'` or `meditatedThisTurn === true`. Added those
  assertions plus a new test for the `'already-meditated'` rejection
  path. The two paths (`turnReducer` in `lib/turn-machine.ts` and
  `applyClientAction` in `lib/room-actions.ts`) re-implement meditate
  independently — divergence here would silently break the multiplayer
  flow integration test.
- **Stale comments** (MINOR x4): updated `lib/turn-machine.ts:1409-1414`
  ("meditate-at-cap which lands in `'end'`" → `'move'`),
  `lib/turn-machine.ts:1436-1438` (DiscardPrompt "over an `end` phase"
  → over the current phase), `components/game/PlayScreen.tsx:342-353`
  ("transitions phase → 'draw'" → `'end'`), `components/game/PlayScreen.tsx:358`
  ("phase to 'draw'" → `'end'`).

**Why:** Honest assessment of reviewer findings — both SIGNIFICANT items
were real (dead code that misled future readers; coverage gap that
risks silent multiplayer divergence). Minors fixed inline rather than
deferred because they're trivial and the file blast radius is the same.
Re-review fires per the per-PR-checklist Step 5 heuristic: fixes
landed in an area flagged SIGNIFICANT, even though the diff is small.

**Notes:** All 2027 tests pass (4 new vs. push 1: the 2 new room-actions
tests, plus the existing meditate test now asserts more fields). Lint
clean. Typecheck clean. Re-review verdict will be appended to the
push-2 entry once it lands; if the second review fires another
SIGNIFICANT finding the cycle repeats.

**Commit(s):** `9a8a550` (fix push)

## 2026-05-07T19:20:00-04:00 — push 3: re-review minor fixes + final stamp

**Pushed:** Re-review (push 2's `823ea3c` HEAD) verdict was `ship` with
one MINOR finding (at-cap meditate test in `lib/__tests__/room-actions.test.ts`
missing the same `phase === 'move'` and `meditatedThisTurn === true`
assertions added to the happy-path test) and one trivial readability
nit on a comment. Both fixed inline:

- `lib/__tests__/room-actions.test.ts:809-813`: added the two missing
  assertions to the at-cap meditate test for parity with the happy path.
- `components/game/PlayScreen.tsx:358-362`: untangled the inline
  `(#502)` ticket tag mid-sentence.

**Why:** Closing every reviewer-flagged item before opening the PR.
The at-cap test gap was real (a regression flipping the at-cap branch
to `phase: 'end'` would have silently passed); the readability nit was
trivial. Both fall under MINOR severity, so per Step 8a the re-review
heuristic does NOT fire again — fixes did not land in a CRITICAL or
SIGNIFICANT-flagged area, and the diff is < 50 lines net.

**Notes:** code-reviewer second pass returned `ship` (re-review marker
on push 2's commit `823ea3c`); this push completes the per-PR checklist
(review → fix → re-review on substantial fixes → fix → ready). All
2027 tests pass. Local CI verify (typecheck, lint, vitest) clean;
`pnpm build` succeeded earlier in the session against push 1's HEAD
and the only changes since then are test-only / comment-only — no
build-relevant surface.

**Commit(s):** `9bc2363` (final minor-fix push)

## 2026-05-07T19:39:00-04:00 — push 4: cap check moves from Meditate to end-turn (user direction)

**Pushed:** Behavioral change requested mid-review by the user:
discarding cards should happen at end-of-turn (when the player tries
to advance), not immediately upon Meditate-over-cap. The original
implementation set `pendingDiscard` inside the `meditate` reducer
arm; this push removes that and adds a cap check inside the `end-turn`
arm instead.

- `lib/turn-machine.ts`: `meditate` no longer sets `pendingDiscard`
  (it only draws and flips `meditatedThisTurn`). `end-turn` now checks
  `activePlayer.hand.length > HAND_CAP` *before* `endTurnReducer`
  runs; if over cap and no `pendingDiscard` already pending, it sets
  `pendingDiscard.count = excess` and returns the state without
  rotating the seat.
- `lib/room-actions.ts`: mirrored — `meditate` arm drops the
  `pendingDiscard` set; `end-turn` arm gains the cap check above
  `endTurn(state)`.
- `design/mechanics.md`: Drawing & gift-handling Meditate clause
  rewritten to make the new "cap check fires on end-turn, not on
  Meditate" explicit, including the user's motivating example
  (Meditate-then-Move-back-under-cap → no prompt).
- Tests: 6 existing tests asserted "pendingDiscard set immediately on
  Meditate-over-cap" — all updated to assert "pendingDiscard
  undefined after Meditate, set on end-turn." Added 3 new tests:
    - turn-machine: end-turn after over-cap meditate sets
      pendingDiscard and refuses to advance
    - turn-machine: meditate-then-move that drops back to cap
      rotates without any prompt (the user's acceptance scenario)
    - room-actions: same end-turn-after-over-cap-meditate, dispatcher
      side
- Multiplayer-flow integration test: extended to walk Meditate
  followed by end-turn through the events route, verifying the wire
  layer mirrors the engine.
- Stale comment fix: `lib/room-actions.ts:230` ("anything else lands
  in 'draw'" → "'end'") flagged by review-pass-3.

**Why:** The prior contract had a real UX bug — a player who Meditated
from 5 → 7 cards and then played a Move card (dropping back to 6) was
*still* prompted to discard, even though they no longer needed to.
The cap check belongs at the moment the turn would end, not at the
moment cards were drawn. The fix is local: remove the immediate set
in Meditate, add a check at end-turn entry.

**Notes:** All 2030 tests pass (3 new vs. push 3). Typecheck, lint,
build all clean. This push touches a SIGNIFICANT-flagged area
(Meditate-cap behaviour) AND adds a new behavioural branch (end-turn
cap check), so re-review fires per Step 8a heuristic.

**Commit(s):** `47575ab` (cap-check shift)
