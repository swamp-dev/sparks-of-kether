# Screens — Visual tour

A contributor-facing index of every screen in the app, with an embedded
desktop screenshot for each. The point is fast onboarding: skim this
file and you know what every route looks like before you go reading
component code.

Curated marketing imagery (the README hero, the gameplay gallery) is a
separate, hand-picked subset — see
[`assets/marketing/README.md`](../assets/marketing/README.md) for that
pack. This tour is exhaustive instead of curated; every route the
review screenshot spec touches has an entry below.

---

## Public routes

These ship in production and are reachable without any flag.

### `/` — the landing

![Landing page screenshot](screenshots/home-desktop.png)

The marketing-leaning home page: title, hero band, room CTAs (host /
join). Entry point for new players.

### `/about` — the marketing tour

![About page screenshot](screenshots/about-desktop.png)

Long-form pitch: what the game is, the symbolic system, screenshots,
contributor links. The deeper "what is this" surface for visitors who
clicked through from the landing.

### `/play` — the hot-seat play surface

![Play page screenshot](screenshots/play-desktop.png)

The local-only hot-seat play surface — Tree of Life board with team
meters, hand, and turn UI. Used for solo testing and the offline
co-located mode; the multiplayer rooms variant lives at
`/rooms/[code]/lobby` (see "Captured separately" below).

---

## Dev tooling

Reachable only in development; production builds 404 these routes via a
`NODE_ENV !== 'production'` guard so unfinished UI never lands publicly.

### `/tokens` — design-token gallery

![Tokens page screenshot](screenshots/tokens-desktop.png)

Visual swatch sheet for every Sefirah color token and the typography
stack. Used to spot-check that Tailwind utilities resolve to the
intended design tokens.

---

## Component demos

Every `/demo/*` route is a focused harness for a single component or
visual subsystem. They all 404 in production (same guard as `/tokens`).
Listed alphabetically by slug.

### `/demo/cards` — Major Arcana grid

![Demo cards screenshot](screenshots/demo-cards-desktop.png)

All 22 Major Arcana rendered in a single grid using the shared
`ArcanumCard` glyph vocabulary. Clearest "this is a card game" surface.

### `/demo/challenge` — challenge resolution

![Demo challenge screenshot](screenshots/demo-challenge-desktop.png)

The challenge-resolution UI: dice, modifiers, success/failure ledger.
Used to iterate on outcome readability without driving a full match.

### `/demo/hand` — player hand

![Demo hand screenshot](screenshots/demo-hand-desktop.png)

The player's hand component in isolation — fan layout, hover affordance,
selection state.

### `/demo/icons` — icon gallery

![Demo icons screenshot](screenshots/demo-icons-desktop.png)

Every icon glyph used across the app, in one grid. Visual regression
target for icon fidelity.

### `/demo/meters` — team meters

![Demo meters screenshot](screenshots/demo-meters-desktop.png)

`TeamMeters` with gradient fills and pillar columns. Compact "look at
the polish" shot.

### `/demo/ritual` — Blessing Ritual scene

![Demo ritual screenshot](screenshots/demo-ritual-desktop.png)

Mid-step Blessing Ritual: Sefirah-keyed bloom and step ledger.
Atmospheric setup-phase surface — this is what each player sees at
game start as they walk Kether → Malkuth and roll their stats.

### `/demo/shell-panel` — Shell panel

![Demo shell panel screenshot](screenshots/demo-shell-panel-desktop.png)

The Shell-of-Sefirah panel — descriptive Shell readout, tone, and
counter-move affordances. Drives the encounter UI.

### `/demo/stat-sheet` — stat sheet

![Demo stat sheet screenshot](screenshots/demo-stat-sheet-desktop.png)

The per-player stat sheet — class, virtues, hand-room, condition tags.

### `/demo/tokens` — token components

![Demo tokens screenshot](screenshots/demo-tokens-desktop.png)

Small-piece token components (the on-board pawns and markers) in
isolation, separate from the swatch sheet at `/tokens`.

### `/demo/tree` — Tree of Life

![Demo tree screenshot](screenshots/demo-tree-desktop.png)

Static Tree of Life with every Sefirah lit at full visibility. The
"what's the geometry" reference shot.

---

## Captured separately

`/rooms/[code]/lobby` is a real multiplayer route; reaching it requires
either a real Supabase room code or a mocked one wired through the e2e
harness. The review screenshot spec
([`e2e/screenshots.review.spec.ts`](../e2e/screenshots.review.spec.ts))
walks static routes only, so the lobby is intentionally out of scope
here. The visual regression suite covers it via its own seeded
fixtures; pull a current still from
`e2e/visual-regression.spec.ts-snapshots/` if you need one for a doc.

---

## How this is generated

The screenshots in `docs/screenshots/` are desktop captures (1280×800)
from the multi-viewport review spec at
[`e2e/screenshots.review.spec.ts`](../e2e/screenshots.review.spec.ts),
run via `pnpm screenshots`. The spec writes to the gitignored
`e2e/__screenshots__/baselines/` directory; the desktop captures get
copied into `docs/screenshots/` by hand when this tour is refreshed.
The curated marketing pack at [`assets/marketing/`](../assets/marketing/)
is a separate, hand-picked subset for external-facing surfaces — keep
the two distinct.
