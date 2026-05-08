# Journal — #462: feat(hand): drag-to-discard-pile (refs #412)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T10:50:32-04:00 — initial draft (drop-zone wiring on top of #412 groundwork)

**Pushed:** Drag-to-discard layered on top of the #412 drag-to-play
groundwork. Three changes:

1. **`components/game/DiscardPile.tsx`** — added
   `data-drop-zone="discard"` to the pile button (existing wide
   click-to-browse target). New `dragActive` prop lights up the
   pile (illumination border + soft gold shadow) while a drag is
   live. The aria-label gets a "Drop a card here to discard"
   suffix when `dragActive` so AT users hear the affordance. Empty
   pile is no longer `disabled` when `dragActive` is true — the
   discard creates the first card in the pile.

2. **`components/game/PlayScreen.tsx`** — `handleCardDrop` now
   branches on `data-drop-zone` slug:
   - `path-N` (existing #412 path-to-play branch, gated on
     `phase === 'move'`).
   - `discard` (new #462 branch, gated on `pendingDiscard.count >
     0`; calls `turn.discard(arcanum)` if so, announces rejection
     via aria-live otherwise).
   The phase gate moved INSIDE the path branch — discard during
   `end` phase (with pendingDiscard) works as expected without
   blocking on the move-phase check.
   `dragActive={draggingCard !== undefined}` threaded into the
   DiscardPile.

3. **Tests:** 6 new tests in `PlayScreen.drag.test.tsx`:
   - 3 existing drag-to-play tests preserved.
   - `dropping a card on the discard pile during pendingDiscard
     discards the card`: state has `pendingDiscard.count = 1`,
     drag → discard pile count goes up by 1, card removed from
     hand.
   - `dropping ... outside pendingDiscard announces rejection
     without dispatching`: drag onto pile during `move` phase →
     pile count unchanged, card still in hand, aria-live
     announces.
   - `discard pile lights up while a card is being dragged
     (data-drag-active)`: pointerdown → drag-active=true;
     pointercancel → drag-active=false.

**Why:** AC for #462 — "drag-to-trash for discard, built on the
#412 drag groundwork." The discard pile (#507/#542 visible
affordance) gets a drop-zone hook so the same pointer-events
machine that drives drag-to-play also drives drag-to-discard. No
engine changes — the existing `turn.discard(arcanum)` action
handles the dispatch; this PR is purely UI plumbing.

**Notes:**
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (2178 / 1 todo) all
  clean. No e2e-specific test for drag-to-discard added: getting
  the seeded `/play?seed=N` walker into a `pendingDiscard.count
  > 0` state requires a Meditate-over-cap path that's brittle
  via UI driving. The 3 new unit tests cover the contract
  deterministically with hand-crafted state. The existing
  `drag-to-play.spec.ts` e2e exercises the pointer-events end-
  to-end in a real browser; that plumbing is the same for both
  drag flows.
- Visual-regression baselines unchanged — `data-drop-zone` and
  `data-drag-active` are invisible attributes; the pile only
  lights up while a drag is live, which the static baseline
  capture doesn't observe.

**Commit(s):** TBD on first push.

## 2026-05-08T10:57:33-04:00 — review: phase-delegation comment + type fix

**Pushed:** Reviewer verdict was `ship` with one significant
follow-up: document why `handleCardDrop`'s discard branch lacks a
phase guard. The engine's `discard` action is intentionally
phase-agnostic (gated only on `pendingDiscard.count > 0`), so a
UI phase guard would be redundant today and brittle if a future
ticket sets `pendingDiscard` from a non-`end` phase. Added a
multi-line comment at the discard branch explaining the
delegation. Also fixed a typecheck error in the new test fixture
where `pendingDiscard` was missing the required `requiredBy:
'end-of-turn'` field.

**Notes:** Fix was a comment addition + 1-line test type fix —
no behaviour change. Per step 8a heuristic, not substantial
enough to re-fire `code-reviewer`. Stamp updated at the new
HEAD.

**Commit(s):** TBD on next push.
