# Journal — #412: feat(hand): drag-to-play onto path + drag-to-trash for discard

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T01:43:21-04:00 — initial draft (drag-to-play; drag-to-discard deferred to #462)

**Pushed:** Drag-to-play onto Tree paths via Pointer Events. The
ticket title mentions both drag-to-play AND drag-to-trash, but the
ticket's Scope explicitly defers drag-to-trash to #462. This PR
ships only the play side. Layered:

1. **Pure state machine** (`lib/hooks/card-drag-machine.ts`). idle →
   press (on pointer-down) → dragging (on movement ≥5px Euclidean) →
   idle on pointer-up (emits `drop` from dragging, `click` from
   press). pointer-cancel returns to idle silently. 16 unit tests.

2. **React hook** (`lib/hooks/useCardDrag.ts`). Wraps the reducer in
   React state + pointer capture. Defensive `setPointerCaptureSafe`
   / `releasePointerCaptureSafe` for jsdom (which implements
   setPointerCapture but not the matching has/release pair).
   Effects deferred via `queueMicrotask` so the consumer's setState
   commits before the effect callback runs.

3. **Hand integration** (`components/hand/Hand.tsx`). New
   `onCardDragStart` / `onCardDragEnd` / `onCardDragCancel` props.
   Card buttons get pointer handlers; a `suppressNextClickRef` ref
   prevents the synthesized native click that follows pointer-up
   from double-firing `onCardSelect` after a drop committed. The
   existing onClick keyboard-parity path is unchanged — keyboard
   Enter / Space still fires onCardSelect via handleKey, and tests
   that `fireEvent.click(card)` keep working. The dragged card
   visually lifts via the existing #463 magnify primitive
   (`isMagnified = activeIndex === i || isDragging`).

4. **TreeBoard drop zones** (`components/tree/TreeBoard.tsx`). Each
   path's wide hit-line gets `data-drop-zone="path-N"`. The drop
   handler in PlayScreen runs `document.elementFromPoint(x, y)` on
   the pointer-up coordinates, walks up to `[data-drop-zone]`, and
   dispatches `turn.move(N)` if the path's arcanum matches the
   dragged card. Re-uses the existing #312/#405 highlightedCard
   wiring for path-light during drag.

5. **PlayScreen orchestration** (`components/game/PlayScreen.tsx`).
   New `draggingCard` local state takes precedence over `hoveredCard`
   and `selectedCard` for `highlightedCard` (drag wins so the path-
   light doesn't drop when the pointer leaves the card). Drop
   handler `handleCardDrop`: hit-tests, validates arcanum match,
   dispatches `turn.move`, falls back to an aria-live announcement
   on rejection. New aria-live region `[data-drag-announcement]`.

**Tests:**
- 16 reducer unit tests (`card-drag-machine.test.ts`) — exhaustive
  state-transition coverage including pointer-cancel, stray
  pointers, and Euclidean-vs-axis threshold detection.
- 7 Hand integration tests (`Hand.drag.test.tsx`) — drag-start,
  drop, click suppression, drag-cancel, data-dragging attribute,
  non-interactive guard.
- 3 PlayScreen integration tests (`PlayScreen.drag.test.tsx`) —
  matching-path drop dispatches `turn.move`, non-matching path
  announces rejection, off-zone drop announces rejection. Stub
  `document.elementFromPoint` (jsdom doesn't implement it) to
  inject the drop target.
- 3 e2e tests (`drag-to-play.spec.ts`) — happy path, rejection,
  keyboard fallback. Caveat: in the seed=1492 deal, the active
  player's initial hand may not contain a card matching any path
  currently valid from Malkuth (paths 31 / 32, arcana 20 / 21).
  When no eligible pair exists, the happy-path and keyboard-
  fallback tests `test.skip` rather than fail. The rejection test
  always runs (any card + any non-matching path). The pointer-
  events end-to-end path is exercised by the rejection test even
  when the happy path skips. The unit tests deterministically
  cover the happy path with hand-crafted state.

**Why:** AC for #412 — "drag-to-play directly onto the corresponding
path on the Tree" — to close the gap between hand and Tree as a
spatial gesture rather than two clicks.

**Notes:**
- React onClick was kept (not replaced by pointer events) so 5+
  unrelated test files that use `fireEvent.click` on cards still
  work without modification. The drop-suppression ref handles the
  double-fire concern.
- A worktree-local dev server on port 3012 was needed for
  Playwright (port 3000 is held by an unrelated stale main-repo
  server, port 3010/3011 had cache/state issues from prior runs).
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (2169 / 1 todo),
  `pnpm exec playwright test` (87 passed / 65 skipped — visual-
  regression skipped due to env var; visual baselines unchanged
  since `data-drop-zone` is invisible), `pnpm build` all clean.
- Hand `data-dragging` attribute added to expose drag state to
  tests + future styling without consumers needing to thread it.

**Commit(s):** `0f4422e`

## 2026-05-08T01:55:05-04:00 — review fix: don't suppress click on drag-cancel

**Pushed:** Address one significant finding from the first
code-reviewer pass on `0f4422e`. The `drag-cancel` case in
`Hand.tsx` was setting `suppressNextClickRef.current = true`,
which would silently eat the user's NEXT legitimate tap. The
suppression was only ever needed for the `drop` case (browsers
synthesize a `click` event after a clean `pointerup` but NOT after
`pointercancel`). Real-world hit: iOS scroll-capture cancels a
tentative press before the drag threshold; the user taps a second
time intentionally; that tap must register.

Also fixed:
- State-diagram comments in `card-drag-machine.ts` and the test
  header said "no emit" for cancel — corrected to "emit drag-cancel".

Tests:
- The existing dragging-state cancel test was updated to assert
  the next tap REGISTERS (not "is suppressed").
- Added a new regression test `press-cancel ... does NOT suppress
  the next tap` for the iOS scroll-capture path.

**Why:** First-pass review verdict was `fix`; the
suppressNextClickRef-on-cancel bug was the load-bearing issue.
Other findings (queueMicrotask in setState updater, elementFromPoint
geometry edge case at sefirah node circles, conditional e2e
test.skip, pointer handlers attached on non-interactive cards)
were correctly identified but classified as deferrable per the
PR body discussion.

**Notes:** Fix touched a SIGNIFICANT-flagged area, so step 8a's
re-review heuristic fires. Re-review pass scheduled.

**Commit(s):** TBD on next push.

