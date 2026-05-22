# Journal — #37: fix(play): elementFromPoint blind spot at Sefirah-node overlay buttons

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T10:55:00Z — push 1 findDropZoneNear pixel probe

**Pushed:** Added `findDropZoneNear(cx, cy)` helper in `PlayScreen.tsx` that probes 16px and 24px offsets in each cardinal/diagonal direction when `document.elementFromPoint` returns a `[data-sefirah-link]` button (the 48×48 HTML overlay that sits above the SVG path hit-lines in z-order). In `handleCardDrop`, when the initial probe finds no `[data-drop-zone]` and the topmost element has `[data-sefirah-link]`, the fallback probe runs. Updated `performDragWithDropTarget` in the drag test file to accept a function stub `((x, y) => Element | null)` in addition to a fixed element, and added a test that simulates the blind-spot scenario: center coordinates return the Sefirah button, offset probes return the path.

**Why:** `#213` trimmed path hit-lines back by `NODE_RADIUS` so they don't overlap the node circles. But the 48px HTML buttons still fully cover the last few pixels before the trim point. A drag released on that boundary (≈24px ring around each node center) would announce "No path under the pointer" instead of dispatching the move.

**Commit(s):** `49d4a56`

---

## 2026-05-22T11:50:00Z — push 2 scale-aware probe + NODE_RADIUS export

**Pushed:** Code review of push 1 found CRITICAL: hardcoded 16/24px probe offsets are too small at 1080p. The tree SVG renders ~529px wide at that viewport, making NODE_RADIUS ≈ 37px in screen pixels — the maximum diagonal reach of the 16/24px offsets is 33.9px, so all 16 probes still land inside the blind spot. Additionally SIGNIFICANT: the `!== null` guard on `target?.closest('[data-sefirah-link]')` misses `undefined` (optional chaining returns `undefined` when `target` is null); changed to `!= null` (loose inequality).

Scale-aware fix: `findDropZoneNear` now reads `[data-tree-root] svg` `getBoundingClientRect().width`, computes `scale = width / TREE_VIEW_W` (TREE_VIEW_W = 400), and sets `step = Math.ceil(NODE_RADIUS * scale) + 4`. At 1080p this gives step ≈ 41px, safely past the ~37px gap. In jsdom (svgWidth = 0) falls back to scale = 1 → step = 32px. Also exported `NODE_RADIUS = 28` from `data/tree-layout.ts` and updated `TreeBoard.tsx` to import it instead of redeclaring locally — eliminates the prior drift risk.

**Commit(s):** `361b5b5`, `c28ed8d` — second code review found diagonal probes used the same step as cardinal probes (√2 × further from node center); fixed with separate `stepD = ceil(NODE_RADIUS * scale / √2) + 4`. Test stub tightened to use `Math.hypot(x-220, y-300) <= NODE_RADIUS` so a step regression fails rather than passing silently.
