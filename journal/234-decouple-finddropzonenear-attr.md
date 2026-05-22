# 234 — refactor(play): decouple findDropZoneNear from [data-tree-root] attribute

## Push 1 — 4aaf160

**What**: Extracted the CSS selector string `'[data-tree-root] svg'` into a named
constant `TREE_ROOT_SVG_SELECTOR` in `data/tree-layout.ts`, co-located with the
other tree geometry constants (`TREE_VIEW_W`, `NODE_RADIUS`). Updated
`findDropZoneNear` in `PlayScreen.tsx` to use the constant.

**Why**: The literal selector coupled `findDropZoneNear` to an attribute name
defined in `TreeBoard.tsx`. A rename of `data-tree-root` would silently degrade
the drag-to-play scale calculation (fall back to scale=1) with no type error.
The constant makes the coupling explicit and a rename a one-line change.

**Scope**: "at minimum" option from the ticket — no architecture change, just the
named constant. The `ref`-forwarding and `ResizeObserver` alternatives remain
open for a future ticket if the coupling ever needs to be truly severed.
