# Journal — #505: feat(tree): visual polish — Sefirah name legibility, hover glow, remove path numbers

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T00:05:26-04:00 — initial draft (impl + tests + baselines)

**Pushed:** TreeBoard polish lands as one PR per the ticket's "land
all three sub-items together" guidance. Three changes:
  1. Removed the `<g data-layer="path-labels">` block (22 numbered
     midpoint badges, plus `LABEL_OFFSETS` table). Each path's
     `aria-label` already carries the path number for AT, so visible
     removal does not degrade screen-reader access.
  2. Restored Sefirah name legibility via Option A — dropped
     `backgroundColor: sefirah.color` and `opacity: 0.85` from the
     breath-halo span. The halo's `shadow-glow-{key}` token still
     paints the outward halo via box-shadow; the dot itself is now
     transparent so it can't mix with the disc fill behind the
     `<text>`. Smallest diff that lands the readability fix.
  3. Added per-Sefirah hover/focus glow via a new `HOVER_GLOW_CLASS_BY_KEY`
     map (literal `peer-hover:shadow-glow-{key}` /
     `peer-focus-visible:shadow-glow-{key}` pairs for Tailwind JIT).
     A new hover-glow `<span>` sits AFTER the `.peer` button so the
     peer selectors resolve correctly; at rest no shadow, on hover
     or keyboard focus it stacks the per-Sefirah glow on top of the
     always-lit baseline halo as an intensity bump.
     `motion-reduce:transition-none` honours reduced-motion users
     (the glow is static — no animation on the hovered state).

**Why:** Playtest finding (#505 ticket): Tree didn't read as the
mystical centrepiece. Path numbers added noise without aiding play
decisions; Sefirah names looked faded "in the middle" because the
small coloured halo dot mixed with the disc fill behind the text;
discs were inert on hover with no per-Sefirah feedback even though
the `shadow-glow-{key}` palette had been ready for use since #311.

**Notes:**
- `GROUND` import was retained (still used elsewhere — Starfield bg,
  pawn token outlines, breath/clear-pulse halo of cleared discs).
- TreeBoard.test.tsx snapshot regenerated; layer-order and path-label
  contracts inverted in the matching tests
  (`TreeBoard.{breath,interactive}.test.tsx`).
- Visual-regression baselines regenerated for `demo-tree-{desktop,
  tablet,mobile}`, `play-{desktop,tablet,mobile}`, and `play-mid-game-
  {desktop,tablet,mobile}`. The `--update-snapshots` flag did NOT
  rewrite baselines whose diff was below the 0.025 ratio threshold —
  had to delete + regen to commit visually-current bytes. Ran against
  a worktree-local dev server on port 3010 (a stale main-repo server
  was holding port 3000).
- One sharp-edge to flag for review: the new hover-glow span is
  inside the `state ? (...) : null` overlay block, so the demo route
  (no state) doesn't get hover glow. That mirrors the breath-halo
  layer's existing scoping; the AC is in-game centric. Worth a
  reviewer eye in case demo hover affordance was assumed.

**Commit(s):** `0c8ac76`
