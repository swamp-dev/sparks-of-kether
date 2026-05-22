# Journal — rider-waite-card-art (no-ticket design branch)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

This branch has no associated GitHub issue — user-directed design work
replacing the procedural geometric glyph cards with Rider-Waite photography.

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
