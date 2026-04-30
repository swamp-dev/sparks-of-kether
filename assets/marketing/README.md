# Marketing assets

Curated screenshot pack for README hero, gameplay gallery, and any
external-facing surface that needs a stable image URL. Each file
here is a copy of a `pnpm screenshots` baseline, picked to represent
a distinct slice of the game's surface.

These files are **derived from** the multi-viewport review baselines
that `pnpm screenshots` writes to `e2e/__screenshots__/baselines/`
(gitignored). Updating them is NOT automatic — see "Refreshing the
pack" below.

> The previous source path was `e2e/visual-regression.spec.ts-snapshots/`.
> #271 moved this to the screenshots-review baselines because the
> pack now includes state-seeded captures (sign picker, mid-game,
> Soul Door callout) that the static visual-regression spec does not
> capture. The two specs are deliberately separate concerns:
> visual-regression catches unintended drift on default page renders;
> screenshots.review captures the most evocative state of each route
> for marketing.

## Index

| Asset | Source baseline | What it shows |
|---|---|---|
| `home-desktop.png` | `home-desktop.png` | The `/` landing page on desktop — title, hero band, room CTAs. |
| `home-mobile.png` | `home-mobile.png` | Same surface at a 375 px mobile viewport, for "responsive" claims. |
| `play-desktop.png` | `play-desktop.png` | The Blessing Ritual mid-flow — STEP 6 OF 10, five Sefirot rolled, current step (Tiferet/Beauty) highlighted. Replaces the pre-#271 STEP 1 / empty-ledger capture. |
| `play-sign-picker-desktop.png` | `play-sign-picker-desktop.png` | The ZodiacSignPicker (Epic #212) — all twelve signs in a grid with stat dignities and Soul Door copy per sign. Headline UI of the class system. |
| `play-mid-game-desktop.png` | `play-mid-game-desktop.png` | The live PlayScreen after full setup — Tree of Life board with player meters, Shells row, hand fan, and turn UI all in view. The "this is what playing looks like" shot. |
| `demo-tree-desktop.png` | `demo-tree-desktop.png` | The Tree of Life recropped to its bounding box (no letterbox) — every Sefirah at full visibility, all 22 paths numbered. |
| `demo-cards-desktop.png` | `demo-cards-desktop.png` | The 22 Major Arcana grid — clearest "this is a card game" surface. |
| `demo-meters-desktop.png` | `demo-meters-desktop.png` | TeamMeters at Illumination 12/15 — gold fill dominates, pillar streak visible. Compact "look at the polish" shot. |
| `demo-challenge-desktop.png` | `demo-challenge-desktop.png` | The Challenge Modal pre-roll — DC, allies, burn-card / burn-spark dials, projected total. |
| `demo-challenge-soul-door-desktop.png` | `demo-challenge-soul-door-desktop.png` | Same modal with the Soul Door callout (Epic #240) — "Soul Door open here: DC 15 → 13" band visible, DC adjusted. |
| `demo-shell-panel-desktop.png` | `demo-shell-panel-desktop.png` | Per-Sefirah Shell pressure across three states — dormant, two active, mixed (with banished). Shows the shadow mechanic at a glance. |
| `demo-stat-sheet-desktop.png` | `demo-stat-sheet-desktop.png` | Character panel — 10 stats with class-derived bonuses, the gold-ringed row marking the active challenge. |
| `about-desktop.png` | `about-desktop.png` | The `/about` marketing page on desktop — full pitch surface with hero, prose, gallery, and CTAs. |

## Size budget

Keep this directory under **1.5 MiB total**. Above that, marketing
assets should move to git LFS or an external CDN — committing
multiple megabytes of binary into the main repo bloats clones for
everyone. Current size: ~1432 KiB across 13 PNGs (~70 KiB under the
cap).

The cap was tightened from "1 MB" to "1024 KiB" in #266 (resolving
SI-vs-binary ambiguity); #271 raised it to 1.5 MiB to accommodate
the three new state-seeded captures (sign picker, mid-game, Soul
Door). Future refreshes should either fit in this envelope or bump
the cap explicitly with a one-line rationale, not silently.

## Refreshing the pack

After running `pnpm screenshots` (which writes the multi-viewport
baselines to `e2e/__screenshots__/baselines/`):

```bash
# From repo root
for src in home-desktop home-mobile \
           play-desktop play-sign-picker-desktop play-mid-game-desktop \
           demo-tree-desktop demo-cards-desktop demo-meters-desktop \
           demo-challenge-desktop demo-challenge-soul-door-desktop \
           demo-shell-panel-desktop demo-stat-sheet-desktop \
           about-desktop; do
  cp "e2e/__screenshots__/baselines/${src}.png" \
     "assets/marketing/${src}.png"
done
```

Commit the refreshed PNGs alongside the relevant feature PR (or as a
separate chore PR). External-facing surfaces should never read the
e2e baselines directly — `e2e/__screenshots__/baselines/` is
gitignored and contributor-local.

## Adding a new asset

1. Add the corresponding entry to `e2e/screenshots.review.spec.ts`
   `ROUTES` array. If the route needs to reach a non-default state
   for the capture, add a `setup(page)` helper.
2. Generate baselines: `pnpm screenshots`.
3. Copy the new baseline into this directory.
4. Add an Index row above.
5. If the new asset pushes total size past the cap, decide explicitly:
   trim another asset, compress the new one, or bump the cap with a
   rationale.
