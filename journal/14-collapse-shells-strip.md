# #14 — Collapse dormant Shells to compact strip

## Push 1 — 2026-05-21

**What shipped:** `ShellStrip` component replacing `ShellPanel` in `PlayScreen`.

Active Shells render at full panel size (icon + keyword + effect copy with halo and wobble animation). Dormant and banished Shells collapse to a compact icon strip; each marker is a button that expands a detail panel below the strip on click, Enter, or Space. One panel at a time. Esc collapses and returns focus to the trigger button.

**Key decisions:**
- New `ShellStrip.tsx` rather than adding another prop to `ShellPanel` — the interaction model (expand/collapse state, keyboard handler, focus refs) is substantial enough that mixing it into `ShellPanel`'s already-large surface would obscure both components.
- Colour maps (`HALO_GLOW`, `SEFIRAH_TEXT`, `COMPACT_ICON_CLASS`) duplicated from `ShellPanel` rather than exported and imported — avoids coupling to `ShellPanel` internals; the maps are 10-line lookup tables and the duplication is intentional.
- `aria-controls` only wired when the panel is actually expanded (avoids a dangling IDREF pointing at a non-existent element in the DOM).
- `ExpandPanel` carries `role="region"` with `aria-label={copy.title}` — axe-clean across all three render states (all dormant, one active, one expanded).

**Tests:** 18 unit tests (RTL + axe × 3), 4 e2e tests (shell-strip.spec.ts — compact strip renders, click to expand, click to collapse, second slot closes first).

**Files changed:**
- `components/shells/ShellStrip.tsx` — new component
- `components/shells/__tests__/ShellStrip.test.tsx` — new test file
- `components/game/PlayScreen.tsx` — swap `ShellPanel` import + JSX for `ShellStrip`
- `e2e/shell-strip.spec.ts` — new e2e spec
