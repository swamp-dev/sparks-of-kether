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

## Size budget

Keep this directory under **1 MB total**. Above that, marketing
assets should move to git LFS or an external CDN — committing
multiple megabytes of binary into the main repo bloats clones for
everyone. Current size: ~640 KB across 8 PNGs.

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
           home-mobile; do
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
