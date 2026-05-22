# Journal — #37: fix(play): elementFromPoint blind spot at Sefirah-node overlay buttons

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T10:55:00Z — push 1 findDropZoneNear pixel probe

**Pushed:** Added `findDropZoneNear(cx, cy)` helper in `PlayScreen.tsx` that probes 16px and 24px offsets in each cardinal/diagonal direction when `document.elementFromPoint` returns a `[data-sefirah-link]` button (the 48×48 HTML overlay that sits above the SVG path hit-lines in z-order). In `handleCardDrop`, when the initial probe finds no `[data-drop-zone]` and the topmost element has `[data-sefirah-link]`, the fallback probe runs. Updated `performDragWithDropTarget` in the drag test file to accept a function stub `((x, y) => Element | null)` in addition to a fixed element, and added a test that simulates the blind-spot scenario: center coordinates return the Sefirah button, offset probes return the path.

**Why:** `#213` trimmed path hit-lines back by `NODE_RADIUS` so they don't overlap the node circles. But the 48px HTML buttons still fully cover the last few pixels before the trim point. A drag released on that boundary (≈24px ring around each node center) would announce "No path under the pointer" instead of dispatching the move.

**Commit(s):** `49d4a56`
