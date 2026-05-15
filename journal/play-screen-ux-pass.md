# Journal — play-screen-ux-pass (no-ticket polish branch)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

This branch has no associated GitHub issue — user-directed interactive
polish session against the play screen. Branched from
`feat/636-hand-peek-shelf-2`; rebased onto `origin/main` after #638
(peek-shelf) squash-merged so this PR's diff is only the polish work.

---

## 2026-05-14T22:09:42-04:00 — push 1: play-screen UX pass + orrery backdrop

**Pushed:** Single-commit polish PR covering: drop the gold valid-move
preview on Tree paths (player figures out their own path keys); remove
the hand's close button + `defaultOpen` / `open` state (hand is always
open, peek-shelf is the rest state); bump card overlap 55% → 48% for
more breathing room; expand the Tree container at lg+ (`max-w-xl→2xl`,
`100vh-180→120px`, `max-h-640→820`); add a viewport-wide `OrreryBackdrop`
atmosphere — gold sun anchored at the bottom-left corner, six
monochrome veil planets gliding diagonally up + right across the
screen on `xMinYMax slice` rings (cadences 24s/42s/70s/110s/170s/240s
with alternating directions); dissolve the Tree's own background `<rect>`
+ `<radialGradient>` so Sefirot + paths float directly on the orrery;
bump default path `strokeOpacity` 0.35 → 0.45 for legibility against
the cosmic backdrop. Body `background-color` made transparent so the
negative-z-index atmosphere stack is no longer occluded — the Substrate
component still carries the deep indigo `bg-void` at `-z-20`.

**Why:** Iterative interactive polish session. User goals across the
session: (1) less hand-holding on path validity, (2) a simpler hand
that's always present, (3) a cosmic atmosphere that doesn't compete
with the foreground Tree, (4) the Tree dissolving into the void rather
than sitting in a visible panel.

**Notes:** Lots of iteration during the session — recursive Trees →
orrery → bottom-left anchor → larger arcs → monochrome → drop the
Tree's panel rect. Final form: orrery anchored bottom-left,
outermost orbit at radius 1980 reaches past the viewport diagonal on
widescreen. Body bg removal was the load-bearing fix that finally
made the orrery visible (opaque `theme('colors.void')` was occluding
all `-z-10` atmosphere). Tailwind animations `fractal-spin-*` removed,
`orrery-orbit-1` through `-6` added — keyed off the existing
`rotate-360` keyframe.

**Commit(s):** `ce12a2b`

## 2026-05-14T22:25:00-04:00 — push 2: address code-reviewer findings

**Pushed:** Fixes from the first code-review pass. Two SIGNIFICANT:
(1) OrreryBackdrop docstring claimed `xMidYMid slice` while the
implementation used `xMinYMax slice` — doc corrected. (2) OrreryBackdrop
and Starfield previously shared `-z-10`, so painting order depended on
DOM order; orrery moved to `-z-[15]` (distinct tier between Substrate
`-z-20` and Starfield `-z-10`). Plus two MINORs: trimmed the stale
"stay below the parent's z-10 close button" comment in `Hand.tsx`
(close button is gone in this PR); bumped Tailwind's
`path-travel-pulse` keyframe rest opacity 0.35 → 0.45 so the pulse
no longer dims the path before brightening (matches the new TreeBoard
at-rest stroke opacity).

**Why:** Code-reviewer verdict was `fix`. Two surgical fixes to
correctness-or-docs and two stylistic cleanups.

**Notes:** One MINOR finding deferred (className concatenation style —
`.trim()` is defensive but functional). Will file as tech-debt
follow-up.

**Commit(s):** `e0290b4`

## 2026-05-15T12:07:30-04:00 — push 3: visual-regression baselines

**Pushed:** Updated baseline screenshots for
`play-mid-game-{desktop,tablet}-chromium-linux.png`. Hosted CI's
Playwright e2e job failed on `ce12a2b` with a pixel-diff against the
old baselines — expected, since this PR intentionally changes the
play-screen visuals (orrery backdrop appearing behind the Tree,
dissolved Tree-bg rect, transparent body). Re-generated via
`PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e visual-regression
--update-snapshots --grep play-mid-game`. Mobile (375x667) didn't
require regeneration — at that viewport size the orrery's
bottom-left anchor renders below the screenshotted region.

**Why:** Bring hosted CI to green so the merge gate is satisfied.

**Notes:** Only `play-mid-game` baselines changed; the other 85
visual-regression frames passed unchanged (orrery is below the
pixel-diff threshold at most routes, or the page bg is opaque
enough to occlude it).

**Commit(s):** to be filled by the commit's SHA on push.


