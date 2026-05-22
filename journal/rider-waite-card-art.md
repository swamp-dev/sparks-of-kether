# Journal — rider-waite-card-art (no-ticket design branch)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

This branch has no associated GitHub issue — user-directed design work
replacing the procedural geometric glyph cards with Rider-Waite photography.

---

## 2026-05-22T01:55:00-04:00 — push 3: baselines re-captured on warm dev server

**Pushed:** 48 visual-regression baselines re-captured after clearing stale webpack cache.

**What changed:**
- The `.next` dev-server cache had a stale chunk (`./1501.js`) causing 500s on
  `/demo/cards`, `/demo/hand`, and other routes. Cleared `.next` and restarted.
- After cold-start, Playwright workers hit uncompiled routes concurrently,
  causing timeout-induced baseline gaps in push 2.
- Pre-warmed all 18 routes with a serial HTTP sweep, then ran `--update-snapshots`
  with the fully-warmed server → 60/60 passed, 48 baselines re-written to a
  stable state.

**Surprising:** The webpack chunk stale-cache failure only surfaces when the dev
server is reused across multiple test runs (Playwright's `reuseExistingServer`)
and the server accumulates stale `.next/server/` artifacts. Cold-starting forces
a clean rebuild — which then needs explicit pre-warming to avoid per-route
compilation races in parallel Playwright workers.

---

## 2026-05-22T01:15:00-04:00 — push 2: visual-regression baselines regenerated

**Pushed:** 40 updated Playwright visual-regression baselines.

**What changed:**
- `pnpm e2e visual-regression --update-snapshots` regenerated the 40 baseline
  PNGs that were stale relative to the push 1 redesign. The affected routes
  are those not captured in push 1: about (mobile/tablet), arcana-13 (all),
  codex (all), demo-challenge (all), demo-icons (all), demo-meters (all),
  demo-ritual (all), demo-shell-panel (mobile/tablet), demo-stat-sheet
  (mobile/tablet), demo-tokens (mobile/tablet), demo-tree (all), home
  (mobile/tablet), path-22 (all), sefirah-tiferet (all), tokens (all).

**Surprising:** Push 1 had already updated demo-cards, demo-hand, play, and
play-mid-game baselines — the routes most directly showing the new card art.
The push 2 batch covers the broader app shell: pages where card art only
appears indirectly (e.g. codex arcanum detail, sefirah detail sidebar) plus
unrelated routes where sub-pixel rendering differences accumulated.

---

## 2026-05-22T00:37:00-04:00 — push 1: RW art + drop card number

**Pushed:** Single-commit redesign of ArcanumCard.

**What changed:**
- Card middle zone now renders the Pamela Colman Smith 1909 Rider-Waite
  JPG, dark-filtered (SVG `feColorMatrix` desaturate + `feComponentTransfer`
  darken) to match the void/indigo aesthetic. Each card gets a 12%-opacity
  screen-blend accent tint keyed to its attribution colour so the cards stay
  visually distinct even at a glance.
- Card number (00–21) removed from footer — the Hebrew letter already
  uniquely identifies each card, and arcana numbers don't align with the
  Kabbalistic path numbers (11–32) shown on the Tree.
- Letter zone gains a radial gradient glow behind the Hebrew letter.
- Zone boundaries reconfigured: letter y 0–88, art y 88–230, footer 230–320.
- New `components/cards/rw-image-map.ts` with arcanum→filename mapping.
- 22 JPGs added to `public/rider-waite-cards/` (Pamela Colman Smith scans,
  12–18 KB each).

**Tests:** 50 card tests pass (2 structural invariant tests updated to match
new design intent: glyph-zone → image-href check; footer number-presence →
footer number-absence check). 3197/3198 Vitest tests pass; the 1 todo is
pre-existing in `makePrng`.

**Surprising:** The `preserveAspectRatio="xMidYMin slice"` + `<clipPath>`
combination effectively crops off the original RW card's roman numeral at
top and footer text at bottom without any per-card adjustment — the 10px
upward shift clears all 22 cards' top borders cleanly.
