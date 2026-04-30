# UI review — Sparks of Kether

> **v1 pre-polish baseline. Wave 3 of Epic #118 has shipped since this
> review.** The scores below describe the UI _before_ wave-3 polish
> (#156–#163, all merged 2026-04-28) and the per-route ambient layer
> (#161). The post-polish surface is now locked in pixel-diff baselines
> by #175. The v1 scores stay in this doc as historical baselines —
> they're not overwritten because a future re-review will compare
> deltas against them.

_Snapshot: 2026-04-28, post-#37 merge. Captures from
`pnpm screenshots` (multi-viewport baselines, see #152). This doc
scores every route on four axes and ranks the weakest screens. The
fan-out polish tickets in Epic #118 wave 3 are scoped from the
recommendations here._

## Next review

The doc should be re-scored against a fresh multi-viewport capture
when **Epic #118 wave 4** (motion pass + empty / error / loading
states) closes. Trigger: when both wave-4 sub-tickets ship, run
`pnpm screenshots` to refresh `e2e/__screenshots__/baselines/`,
then re-score every route on the same four-axis rubric. The v1
scores below become the "pre-polish" column; the new pass produces
a "post-polish" column.

Re-scoring before wave 4 closes risks scoring a half-polished
surface and producing fan-out tickets that overlap with wave-4
work already filed.

## How to read this

Scoring rubric — each axis 1–5 (5 = strong, 1 = needs work):

- **Visual impact (V)** — first-impression "wow." Are the eye-catching
  elements actually in your eye when you land?
- **Fun (F)** — does the screen invite play? Does it feel like a
  game, not a form?
- **Token consistency (T)** — every colour pulls from
  `tailwind.config.ts` Sefirah / pillar tokens; no hand-coded hex.
  N/A for purely text screens.
- **Information density (D)** — how well the screen uses its
  vertical real estate. Scored:
  - **5** — balance is intentional; empty space is a compositional
    choice, content is paced.
  - **4** — minor void below the fold, doesn't read as a layout bug.
  - **3** — content is the right size but the page leaves a clear
    swath of empty navy after it.
  - **2** — content fills < ⅓ of the viewport with no atmosphere
    treatment in the rest.
  - **1** — content is < ⅕ of the viewport, OR the screen is so
    crowded that hierarchy collapses. Both extremes share the
    bottom of the scale.

A `–` means the axis is not applicable for that route (developer
reference pages skip Fun).

## TL;DR — ranked weakness list (v1 pre-polish)

> **v1 pre-polish — historical.** The five worst screens at the time
> of this review. Each became a fan-out polish ticket in Epic #118
> wave 3 — all merged 2026-04-28. See "What shipped since v1"
> below for the route → PR mapping.

1. **`/play` and `/demo/ritual` — the Blessing Ritual** _(V2 F2 T4 D1
   = 9/20)_. The first surface a hot-seat player meets. Cosmic
   content (Sefirah names, Hebrew calligraphy, italic invocation)
   adrift in a black void. The Sefirah icon is a 32 px circle. The
   page uses ~25% of vertical space; the rest is dark navy nothing.
   **Do**: add an atmospheric illustration / glyph wash behind the
   ritual content, scale the Sefirah icon up, fill the lower half
   with the running roll history (or a static cosmography
   illustration that responds to which Sefirah is active).
2. **`/` (home)** _(V2 F2 T4 D2 = 10/20)_. Title is striking (Cinzel
   in off-white over the dark navy). One line below it, the page
   lapses into a CRUD form
   (NICKNAME, JOIN GAME). On desktop the form is parked centre-
   middle with vast empty space top-and-bottom. **Do**: a hero
   illustration band beneath the title — the Tree silhouette, the
   star field, anything that says "ascent" before "form fields."
3. **`/demo/meters` — Team Meters** _(V2 F3 T4 D2 = 11/20)_.
   Illumination + Separation render as two 16 px-wide vertical bars
   parked at the left edge. The numeric input form to the right is
   visually heavier than the meters themselves. **Do**: widen the
   meter glyphs, centre-align with the controls, and consider a
   horizontal pillar-balance chart alongside (the data is there —
   `pillarStreak` lives in state already).
4. **Cross-cutting — empty-space / void problem** _(no single
   screen score; this is a pattern, not a per-route issue — included
   in this list because it affects routes 1, 2, 3 above and most of
   the routes scored below)_. Most pages have the same shape:
   heading top-left, content top-third, ~⅔ of the viewport black-
   on-black below. This is a Tailwind layout carry-over. **Do**:
   filed as fan-out ticket 6 below, not as a per-screen polish; one
   pass adds bottom-of-page motifs (flourish dividers — we have
   one! — constellation patterns, Sefirah colour washes) so every
   route earns its empty space rather than apologising for it.
5. **`/demo/challenge` mobile** _(V3 F3 T4 D3 = 13/20 on mobile)_.
   The challenge dialog itself works post-#38 but the demo page's
   page-frame chrome wraps awkwardly at 375 px ("Challenge Modal"
   title splits across two lines, the dialog title splits too).
   **Do**: tighten the demo page's outer padding and let the modal
   centre on its own. This is the demo page's problem, not the
   modal's.

## Strengths to keep

- **`/demo/cards`** _(V5 F5 T5 D4 = 19/20)_ — the symbolic-minimalist
  Major Arcana grid. Hebrew letter top, glyph centre, name + suit
  bottom, accent strip. **The strongest visual surface in the
  project.** Anything new should aspire to this. (D drops one
  point only because the 8-wide grid leaves a 2-card-wide ragged
  gap on the last row at 22 cards / 8 columns — fixable by
  centring the last row or rebalancing to a 5/5/4/4/4 layout.)
- **`/demo/tree`** _(V4 F4 T5 D3 = 16/20)_ — the Tree of Life is
  itself the centre of gravity. Path numbers (#136) read cleanly,
  Sefirah colours pop, geometry is correct. The only score below 5
  is information density: on desktop the tree sits in a square
  centre column with empty thirds either side.
- **`/demo/soul-aspect`** _(V4 F4 T4 D4 = 16/20)_ — six aspect
  cards in a 3×2 grid (mobile: stacked). Each carries a quote, an
  ability with title, a weakness. The "TAKEN BY..." disabled state
  is elegant. The +2 stat badges read well at every viewport. (D4
  not 5: ~120 px of empty space below the Confirm button on
  desktop, same pattern that pulls other screens down.)

## What shipped since v1 (post-polish, 2026-04-28)

Every recommendation below this line drove a wave-3 fan-out
ticket; all of them are now merged. The per-route scores from v1
are preserved verbatim as historical baselines.

### Cross-cutting polish

- **#161 — per-route ambient layer (PR #168).** Every route now
  carries a global `<Starfield />` (sparse) inherited from
  `app/layout.tsx`. Per-route bloom + glyph-wash on `/play`,
  `/demo/ritual`, `/demo/meters`. Addresses the D-axis "void
  below the fold" weakness across the board.
- **#162 — SVG token audit (PR #164).** Every hand-coded hex in
  SVG components (`#0e0a1f`, `#f8f8ff`, `#ffd700`, etc.)
  replaced with imports from `data/colors.ts`. Tightens T-axis
  consistency.
- **#163 — demo page chrome (PR #165).** Outer padding on every
  `app/demo/*/page.tsx` tightened to `p-4 sm:p-8` so embedded
  components have room to breathe at mobile width.

### Per-route polish

| Route | v1 score | Ticket | PR |
|---|---|---|---|
| `/play` | 9/20 | #156 ritual scene polish | #171 |
| `/demo/ritual` | 9/20 | #156 ritual scene polish | #171 |
| `/` home | 10/20 | #157 home hero illustration | #169 |
| `/demo/meters` | 11/20 | #158 TeamMeters polish | #172 |
| `/demo/hand` | 14/20 | #160 card-back motif | #170 |
| `/demo/soul-aspect` | 16/20 | #159 Sefirah-keyed accents | #166 |

The remaining routes (`/demo/icons`, `/demo/challenge`,
`/demo/shell-panel`, `/demo/stat-sheet`, `/demo/tokens`, `/tokens`,
`/demo/tree`, `/demo/cards`) either scored ≥14/20 in v1 or were
addressed sufficiently by the cross-cutting work above.

### Regression lock-in

- **#175 — visual regression baselines (Playwright `toHaveScreenshot`).**
  42 baselines (14 routes × 3 viewports) committed under
  `e2e/visual-regression.spec.ts-snapshots/`. Future regressions
  in the post-polish surface fail `pnpm e2e`.

## Per-route scoring (v1 — pre-polish)

Sorted worst-first by total score. Routes with the same total
appear in declared order.

### `/play` (V2 F2 T4 D1, total 9)

What renders: the BlessingRitual at step 1 (Crown). "Player 1 — Sefirot
Blessing" in Cinzel off-white, "STEP 1 OF 10", "Crown / כתר",
italic invocation, "Stat: Unity", "Roll 3d6" yellow button. That's it
on a 1280×800 viewport. The Sefirah indicator is a circled-dot
glyph that sits between the invocation and the stat label — it
reads as a small text-line element rather than a hero icon. Below
the Roll button: ~500 px of black.

**Why it scores low**: the cosmic content is rendered with utility-
form chrome. There's no _scene_, just a paragraph and a button. The
moment a hot-seat player sees first is the moment the game has the
fewest excuses to look unfinished.

**Recommendation**: dedicated polish ticket. (1) Promote the
glyph to a hero element (≥ 80 px circular badge keyed to the
current Sefirah's colour). (2) Add ambient illustration fills
(constellations, gradient flares matching Sefirah colour). (3)
Use the lower half for the running ledger (which Sefirot have been
blessed already + their rolled stats), turning it from a wizard
form into a build-up.

### `/demo/ritual` (V2 F2 T4 D1, total 9)

Same as `/play` plus a "Restart with new seed" affordance. Same
recommendations apply; the demo page is a strict subset of `/play`'s
actual UX.

### `/` home (V2 F2 T4 D2, total 10)

Title "Sparks of Kether" sits in Cinzel off-white at the top.
Below it — `NICKNAME` input, `New game` button (the yellow on the
page comes from this CTA), divider, `Room code` input, `Join game`
(gold-bordered transparent), `Hot-seat / single-machine` button. Mobile splits the title into two stacked lines, which
actually reads more dramatically than desktop.

**Why it scores low**: the layout is a centred form on void. There
is no signalling of "this is a Kabbalistic adventure game" between
the title and the inputs.

**Recommendation**: hero illustration band between title and form —
the Tree silhouette, a starfield with the 22 paths overlaid, or a
subtle Sefirah colour gradient. Also: the "hot-seat" button is the
fastest way to actually play; it's currently the lowest-weight CTA.
Promote it to equal weight with "New game".

### `/demo/meters` (V2 F3 T4 D2, total 11)

Two skinny vertical meters (Illumination gold, Separation crimson),
both ~12 px wide at the left edge of the viewport. To their right,
input controls for bumping values. Below: "Pillar streak Mercy 2/3
(imbalance)" in body copy, easy to miss.

**Recommendation**: meter polish ticket. Widen the bars (40+ px),
add gradient fills that match the underlying Sefirah colour for
each tick, centre the layout in the viewport rather than left-
hugging, and turn pillar streak into a visual element (three pillar
columns lighting up as the streak builds) rather than a text caption.

### `/demo/icons` (V3 F– T4 D3, total 10/15)

Developer reference. Pillar markers, ten stat icons, three meter
shapes, one decorative flourish. Functional. **No polish ticket —
this is a dev page; it should look like one.**

### `/demo/hand` (V3 F3 T4 D4, total 14)

Three hand layouts: own hand selectable, other-player private (face-
down with Tau backs), other-player public face-up. The fan geometry
works. Cards have visible content (Hebrew letter, glyph, name,
correspondence).

**Why not higher**: cards on desktop are well-sized post-#132 but
the spacing between hands is generous to the point of looking like
a layout grid rather than a designed page. The face-down "T" Tau
back is a single element repeated four times — it _reads_ as
"placeholder back" rather than "occult bookbinding".

**Recommendation**: lighter polish ticket. Decorative card-back
pattern (linework, sigil, anything but a single repeated letter).

### `/demo/challenge` (V3 F3 T4 D4, total 14)

The Severity challenge with two ally checkboxes, two steppers, a
projected total, and Roll/Cancel. Functional and clear; the gold
Roll button has appropriate weight. The Strength stat row is gold-
ringed.

Mobile: the demo page's outer padding makes "Challenge Modal" title
break to two lines; the modal's title also wraps. This is a demo-
page chrome issue, not the modal itself.

**Recommendation**: see weakness #5 above (tighten demo-page
padding). The modal proper is in good shape post-#134/#135.

### `/demo/shell-panel` (V3 F3 T4 D4, total 14)

Three Shell-state demos: all dormant, two active with effect copy,
mixed (one banished). The active glyphs read distinctively against
the dormant placeholders. Effect copy is small but legible.

**Recommendation**: minor — bump the shell glyphs' visible weight
when active (more colour contrast / glow), and let banished shells
have an explicit struck-through visual treatment beyond the small
strikeout (more obviously "out of play").

### `/demo/stat-sheet` (V4 F3 T4 D4, total 15)

Three layouts in one demo: expanded with active challenge,
compact orchestrator row, expanded with no Soul Aspect. Each
correctly carries the gold ring on the active stat, +2 badges, and
sparks as small colour dots. Compact is a single readable row;
expanded is a clean 2×5 grid.

No polish ticket needed. This screen is doing its job.

### `/demo/tokens` (V3 F– T5 D4, total 12/15)

Player tokens, Sparks (one per Sefirah), Shells in three states
(active / dormant / banished), and four d20 variants. Comprehensive
and well-organised reference. **No polish ticket — dev page.**

### `/tokens` (V3 F– T5 D4, total 12/15)

Design-token grid showing every Sefirah colour swatch, pillar
accents, and typography samples. Includes contrast ratio annotations
for borderline AA pairings (Netzach 4.1:1, Yesod 3.6:1) — _excellent_.
**No polish ticket — dev page; it's already serving its audience.**

### `/demo/soul-aspect` (V4 F4 T4 D4, total 16)

Six aspect cards (3×2 desktop, stacked on mobile). Each card carries
its title in Cinzel gold, the +2-stat badge, the quote, the ability
title + body, the weakness, and an optional "TAKEN BY..." disabled
state. The hierarchy works.

**Why not higher**: card frames are all the same dark-on-dark
rectangle. Could vary subtly by Sefirah affinity (Heart → tiferet
gold ring, Boundary-Keeper → gevurah crimson ring) so each card
gets a tactile colour identity matching the +2 stat.

**Recommendation**: small polish ticket. Sefirah-keyed border
accent.

### `/demo/tree` (V4 F4 T5 D3, total 16)

The Tree of Life. Ten Sefirot in correct geometry, distinctive
colours, Hebrew + English labels, path numbers (#136 just shipped
makes this readable). The whole composition is visually arresting
in a way nothing else on the project comes close to.

**Why not higher**: on desktop, the tree occupies roughly the left
55% of the viewport horizontally; the right ~45% is empty navy.
There's no context — no scene, no surrounding cosmography.

**Recommendation**: ambient surround. Let the lower-Tree pillar
markers extend into the page borders; let the starfield density
vary. The Tree is the protagonist of the game; right now it looks
like a logo on a wall.

### `/demo/cards` (V5 F5 T5 D5, total 20)

The 22 Major Arcana grid, 8-cards-wide on desktop. Each card has
the Hebrew letter, central glyph, arcanum number + name, and an
accent strip in the correspondence colour. **The strongest screen
in the project.** Mobile reflows to a single column gracefully.

**No polish ticket — this is the standard.**

## Routes not reviewed

- **`/rooms/[code]/lobby`** — requires a live multiplayer session
  to render meaningfully; the screenshot baselines suite can't reach
  it without a seeded room. Re-review once the in-flight integration
  test scaffolding (#89) supports a baseline lobby fixture, or
  capture manually from a dev `supabase start` session.

## Cross-cutting notes

These don't belong to any single screen — they're patterns for the
fan-out wave to consider:

- **Empty-space treatment**: every page has the same dark-navy
  gradient under content. The gradient is a strength (consistent,
  cosmic) but it's also _the only_ atmospheric layer. Consider
  adding a per-route ambient layer (subtle starfield, glyph wash,
  Sefirah-colour bloom) so empty space participates instead of
  receding.
- **Sefirah colour discipline**: token consistency scores 4–5 across
  the board. The remaining hand-coded values are inside SVG
  components (`#0e0a1f`, `#f8f8ff`) where Tailwind classes don't
  reach naturally. Worth an explicit token-audit ticket so any
  hex-with-Sefirah-name lives in `tailwind.config.ts`.
- **Mobile is solid post-#38**: every screen audited at 375×667
  reflows correctly. The remaining mobile issues (challenge demo
  page padding, soul-aspect text wrapping on long stat names) are
  individual fixes, not a systemic gap.
- **Reduced-motion respected**: `motion-reduce:animate-none` is on
  every animation we ship (#37, #132). No additional auditing
  needed — but the keyframes for path-travel are defined and
  unwired. A future polish ticket can wire them up safely.

## Fan-out tickets to file (Epic #118 wave 3) — historical

> **All eight tickets below were filed and merged 2026-04-28.** The
> proposed scope below is preserved as historical reference; see
> "What shipped since v1" near the top of this doc for the
> ticket → PR mapping.

Ordered by playtest leverage. Filenames named explicitly so a
filer doesn't have to re-derive scope.

1. **Blessing Ritual scene** — `/play` + `/demo/ritual` polish.
   Touches `components/setup/BlessingRitual.tsx` and likely a new
   presentational `RitualScene.tsx` for the ambient layer.
   Deliverables: hero-sized Sefirah glyph (≥80 px circular badge),
   ambient illustration fills keyed to the active Sefirah, and a
   running-ledger surface for already-blessed Sefirot in the
   lower half.
2. **Home hero band** — `/` between title and form. Touches
   `app/page.tsx` and a new `components/home/Hero.tsx` (or similar
   path). Deliverables: a hero illustration block (Tree silhouette
   / starfield / Sefirah-colour bloom). Promote the "Hot-seat /
   single-machine" affordance to equal weight with "New game".
3. **Team Meters polish** — `components/meters/TeamMeters.tsx`
   rework. Deliverables: wider bars (40+ px), gradient fills keyed
   to Sefirah colour per tick, centred layout, pillar-streak
   rendered as three pillar columns lighting up rather than a
   text caption.
4. **Sefirah-keyed Soul Aspect cards** — `components/setup/SoulAspectPicker.tsx`.
   Deliverable: per-card accent border / glow keyed to the +2 stat's
   Sefirah colour (Heart→tiferet gold, Boundary-Keeper→gevurah
   crimson, etc).
5. **Card-back motif** — `components/hand/CardBack.tsx`. Deliverable:
   replace repeated-letter back with a real pattern (sigil,
   linework, occult bookbinding motif).
6. **Empty-space / ambient layer** — cross-cutting bottom-of-page
   motif system. Touches `app/layout.tsx` and likely a new
   `components/atmosphere/` sub-tree. Deliverable: per-route ambient
   layer (subtle starfield variation, glyph wash, Sefirah-colour
   bloom) so empty space participates instead of receding.
7. **SVG token audit** — replace remaining hand-coded `#0e0a1f` /
   `#f8f8ff` references inside `components/tree/`, `components/cards/`,
   `components/icons/` with token references. Pure search-and-replace
   chore; no visual change expected.
8. **Demo-page chrome polish** — tighten outer padding on every
   `app/demo/*/page.tsx` so modal-style demos don't wrap titles
   awkwardly on mobile. **Scope boundary**: demo page wrappers ONLY
   — the embedded components are out of scope (their issues belong
   in their own polish tickets).

Tickets 1, 2, 6 are highest leverage (they touch the most
first-impression surface). Ticket 7 is housekeeping. The rest are
medium-impact polish.

<!-- code-ref: components/setup/BlessingRitual.tsx -->
<!-- code-ref: components/meters/TeamMeters.tsx -->
<!-- code-ref: components/hand/CardBack.tsx -->
