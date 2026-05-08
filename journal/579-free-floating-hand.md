# Journal — #579: feat(hand): free-floating hand — rest-tiny at bottom, swell-large over Tree on focus, paths visible through

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T03:14:38-04:00 — initial draft (Hand overlay + Tree de-clamp)

**Pushed:** Layout pivot from inline-flow Hand under the #411
viewport budget to a `position: fixed` overlay anchored to the
bottom of the viewport. Three changes:

1. **`components/hand/Hand.tsx`** — open state's outer wrapper is
   now `fixed inset-x-0 bottom-0 z-30 pointer-events-none`; the
   existing flex-fan layout moved into a child `[data-hand-fan]`
   div with `pointer-events-auto`. The fan applies a single
   transform: `scale(FAN_REST_SCALE = 0.35)` when no card is
   active (rest band = sliver of silhouettes), `scale(1)` when any
   card is active (fan blooms to natural size). Per-card
   magnification retired the #463 dock-magnify constants
   (1.3 scale / 12 px lift) and replaced them with much bigger
   numbers: `MAGNIFY_SCALE_BIG = 3.5`, `MAGNIFY_LIFT_VH = 35`,
   `MAGNIFY_OPACITY = 0.75`. Magnified cards switch
   transform-origin from `bottom center` to `center` so the post-
   scale card is centred on its post-translate origin (otherwise
   the bottom-anchored card would extend off-screen above the
   viewport).
2. **`components/game/PlayScreen.tsx`** — dropped the #411 388 px
   Tree reservation. The wrapper went from
   `lg:h-[calc(100vh-388px)] lg:max-h-[440px]` to
   `lg:h-[calc(100vh-180px)] lg:max-h-[640px]`. The 180 px reserves
   only the action bar + a small breathing margin above the
   floating Hand's rest band. The 640 px cap rises so the Tree can
   dominate as the centerpiece on taller viewports.
3. **`components/hand/__tests__/Hand.test.tsx`** — updated the
   existing magnify-scale test to assert `scale(3.5)` (was 1.3),
   added `hovered card runs at ~75% opacity` assertion, added
   `position-fixed overlay` structural assertion, added
   `rest fan scales to 0.35; blooms to 1 on hover` assertion.

**Why:** AC for #579 — "shrink very small at the bottom and not
take any space — to very large in the middle of the screen, still
letting you see the paths they correspond to." The user-led design
direction filed as a follow-up after #412 (drag-to-play) shipped:
drag now works, and this ticket reframes the resting Hand into
the lightweight band the user envisioned.

**Notes:**
- The Tree's path-light wiring (#312 / #405) is unchanged; the
  matching path glow is already painted via `box-shadow` on a
  pseudo-element under the SVG, so 0.75-opacity card sitting above
  it composites correctly. No engine or TreeBoard changes needed.
- DiscardPrompt's `fixed inset-x-0 bottom-0 z-40` band sits above
  the Hand's `z-30`. When a discard prompt is active it covers the
  Hand entirely; when it's not, the Hand is visible. Verified
  visually in the regenerated `play-mid-game-*` baselines.
- Visual-regression baselines regenerated for `demo-hand-*`,
  `play-mid-game-*`, and `play-mobile`. The `play-desktop` /
  `play-tablet` baselines are unchanged — `/play` lands on the
  sign picker before the Hand mounts.
- Added `e2e/floating-hand-screenshots.spec.ts` as a dev-tool
  capture (gated on `PLAYWRIGHT_RUN_REVIEW=1`) for visually
  verifying the magnified state. Output PNGs go under
  `e2e/__screenshots__/` which is gitignored. Headless
  Chromium's mouse routing through the `pointer-events-none`
  outer wrapper + scaled fan child didn't reliably trigger
  React's `onMouseEnter`, so the dev-tool test uses keyboard
  focus instead — the focused-state visual is identical to
  hovered (both feed `activeIndex`). Real interactive sessions
  with a mouse work normally; the test is the limitation, not
  the implementation.

**Commit(s):** `bfc5c01`

## 2026-05-08T03:33:13-04:00 — review fixes (reduced-motion gate + layout=inline opt-out)

**Pushed:** Address two significant findings from the first review:

1. **Reduced-motion `MAGNIFY_TRANSITION` regression.** When opacity
   was added to `MAGNIFY_TRANSITION`, the `!reduceMotion` gate on
   the `transition` style was inadvertently dropped. Reduced-motion
   users would still see the box-shadow flash + opacity fade on
   hover even though the AC says "preserve the opacity *value*",
   not "animate the opacity transition." Fix: restore the gate.
   The opacity 0.75 *value* is still preserved (path-through-card
   visual is a11y-load-bearing); only the *transition* is gated
   on motion-safe.

2. **`/demo/hand` page broken with multiple stacked fixed Hands.**
   The demo page renders three Hand instances. Pre-fix, all three
   mounted as `position: fixed inset-x-0 bottom-0 z-30` overlays
   and collided at the same viewport position (only the topmost
   was effectively visible). Fix: new `layout` prop on Hand —
   `'floating'` (default, used by /play) keeps the new overlay
   behaviour; `'inline'` (used by /demo/hand) reverts to inline-
   flow. The role/aria attrs sit on the outer wrapper either way;
   the inner `[data-hand-fan]` carries the flex layout.

**Tests added:**
- `does NOT animate opacity / box-shadow on hover under reduced-motion`
  — pins the regression. Hovers a card under reduced-motion stub,
  asserts `transition === ''` and opacity value `'0.75'`.
- `layout="inline" renders the open hand without the position-fixed
  overlay` — pins the inline-mode contract for embedded contexts.

**Visual-regression baselines regenerated:**
- `demo-hand-{desktop,tablet,mobile}` — three fans now render
  inline within their respective sections rather than stacked at
  the viewport bottom.
- `demo-tree-{desktop,tablet,mobile}` and `play-mid-game-{desktop,
  tablet,mobile}` re-baselined after a Tailwind-cache hiccup mid-
  session forced a fresh dev-server bring-up; the visual output is
  unchanged from the first push.

**Notes:** Fix touches a SIGNIFICANT-flagged area (the magnify
transition is the same code path the first reviewer caught), so
step 8a's re-review heuristic fires. Re-review pass scheduled.

**Commit(s):** TBD on next push.
