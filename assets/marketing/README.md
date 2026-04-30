# Marketing assets

Curated screenshot pack for README hero, gameplay gallery, and any
external-facing surface that needs a stable image URL. Each file
here is a copy of a `pnpm screenshots` baseline, picked to represent
a distinct slice of the game's surface.

These files are **derived from** the visual regression baselines
under `e2e/visual-regression.spec.ts-snapshots/`. Updating them is
NOT automatic — see "Refreshing the pack" below.

## Index

| Asset | Source baseline | What it shows |
|---|---|---|
| `home-desktop.png` | `home-desktop-chromium-linux.png` | The `/` landing page on desktop — title, hero band, room CTAs. |
| `home-mobile.png` | `home-mobile-chromium-linux.png` | Same surface at a 375 px mobile viewport, for "responsive" claims. |
| `play-desktop.png` | `play-desktop-chromium-linux.png` | The play surface mid-game on desktop — Tree of Life board with the team meters and hand visible. |
| `demo-tree-desktop.png` | `demo-tree-desktop-chromium-linux.png` | The Tree of Life as a static reference — every Sefirah lit at full visibility, clean for a "what's the geometry" shot. |
| `demo-cards-desktop.png` | `demo-cards-desktop-chromium-linux.png` | The 22 Major Arcana grid — clearest "this is a card game" surface. |
| `demo-ritual-desktop.png` | `demo-ritual-desktop-chromium-linux.png` | The Blessing Ritual scene mid-step — atmospheric Sefirah-keyed bloom + ledger. |
| `demo-meters-desktop.png` | `demo-meters-desktop-chromium-linux.png` | TeamMeters with gradient fills + pillar columns. Compact "look at the polish" shot. |
| `demo-challenge-desktop.png` | `demo-challenge-desktop-chromium-linux.png` | The Challenge Modal mid-resolve — DC, allies, burn-card / burn-spark dials, projected total. The "this is the tense moment" shot. |
| `demo-shell-panel-desktop.png` | `demo-shell-panel-desktop-chromium-linux.png` | Per-Sefirah Shell pressure across three states — dormant, two active, mixed (with banished). Shows the shadow mechanic at a glance. |
| `demo-stat-sheet-desktop.png` | `demo-stat-sheet-desktop-chromium-linux.png` | Character panel — 10 stats with class-derived bonuses folded in, expanded and compact rows side by side. |
| `about-desktop.png` | `about-desktop-chromium-linux.png` | The `/about` marketing page on desktop — full pitch surface with hero, prose, gallery, and CTAs. |

## Size budget

Keep this directory under **1024 KiB (~1.0 MB binary) total**. Above
that, marketing assets should move to git LFS or an external CDN —
committing multiple megabytes of binary into the main repo bloats
clones for everyone. Current size: ~1016 KiB across 11 PNGs (8 KiB
under the cap).

If the source baseline for a copy doesn't exist on disk, the
baseline hasn't been generated yet — run
`PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e visual-regression --update-snapshots`
first.

## Refreshing the pack

When wave-4 polish lands and the visual regression baselines update
(typically as part of a PR that runs `pnpm e2e visual-regression
--update-snapshots`), refresh this pack:

```bash
# From repo root
for src in home-desktop play-desktop demo-tree-desktop \
           demo-cards-desktop demo-ritual-desktop \
           demo-meters-desktop \
           home-mobile \
           demo-challenge-desktop demo-shell-panel-desktop \
           demo-stat-sheet-desktop about-desktop; do
  cp "e2e/visual-regression.spec.ts-snapshots/${src}-chromium-linux.png" \
     "assets/marketing/${src}.png"
done
```

Commit the refreshed PNGs alongside the wave-4 PR (or as a separate
chore PR). External-facing surfaces should never read the e2e
baselines directly — that's an implementation detail of the
regression suite.

## Adding a new asset

1. Add the corresponding spec/route to `e2e/visual-regression.spec.ts`
   (it's likely there already if it's a public route).
2. Generate the baseline (`pnpm e2e visual-regression --update-snapshots`).
3. Copy the new baseline into this directory with a clean filename.
4. Add an Index row above.
