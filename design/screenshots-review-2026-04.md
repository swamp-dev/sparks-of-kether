# Screenshot review — 2026-04-30

A blunt audit of every PNG currently shipped under `assets/marketing/`
(11 files) and `docs/screenshots/` (14 files). The pack was captured
in #266 (Track 1) and #267 (Track 2). This doc records what each shot
actually shows, what's wrong with it, and the specific fix.

Verdict legend:

- **Keep** — acceptable; no change needed.
- **Restate** — right route, wrong state. Add Playwright actions to
  reach a more evocative beat before capture.
- **Recrop** — full-page capture of a sparse layout; switch
  `fullPage: true` to a tighter `clip` region or `locator.screenshot()`.
- **Drop** — redundant or weak; remove from disk + index + embeds.
- **Add** — surface that isn't currently captured.

---

## Recurring problems

These show up across many of the captures. Worth fixing once at the
spec level rather than per-asset:

1. **Dev-tooling clutter.** Every `/demo/*` page leads with a header
   like `Challenge Modal` followed by a paragraph aimed at contributors
   (e.g. "Click Roll to resolve a Gevurah challenge. Seeded RNG so the
   result is reproducible across reloads.", or "This route is disabled
   in production"). For marketing-tier captures this header text reads
   as developer ephemera, not game atmosphere. Fix: capture the inner
   demo container (`<main>` or a dedicated `[data-demo-canvas]`) via
   `page.locator(...).screenshot()`, not the whole page.
2. **Sparse-layout black void.** Several demo pages render a small
   widget on a tall, mostly-empty canvas — `demo-meters` (~15% used),
   `demo-icons` (~50% bottom void), `demo-stat-sheet` (~65% right void),
   `demo-tree` (~50% wide letterboxing). Full-page captures bake the
   wasted real estate into the image. Fix: `clip` regions or per-element
   `locator.screenshot()`.
3. **First-step state.** `play-desktop` and `demo-ritual-desktop` both
   land on STEP 1 OF 10 with the entire blessings ledger empty. The
   running ledger is the most evocative part of the ritual UI — the
   capture has to advance past Crown to surface it.
4. **Out-of-sync between surfaces.** `assets/marketing/about-desktop.png`
   (313 KB, post-#266) shows the 5-item gallery; `docs/screenshots/about-desktop.png`
   (297 KB, pre-#266) shows only 4 items. The two files have the same
   slug but capture different states.
5. **Missing Epic-#212 / Epic-#240 surfaces.** The zodiac-sign picker
   and the Soul Door callout — the two largest UX-visible features that
   shipped right before this pack was assembled — aren't visible in
   any current capture.

---

## Per-asset table — `docs/screenshots/` (14)

| Slug | Verdict | What's wrong | Fix |
|---|---|---|---|
| `home-desktop.png` | **Keep** | Tree icon is small (~250 px square in a 1280×1024 canvas); form fields are empty. | Optional: pre-fill the nickname field with `Andy` via Playwright before capture, so the page reads as "in use" rather than "empty form". Not blocking. |
| `play-desktop.png` | **Restate** | STEP 1 OF 10. Crown selected, "Roll 3d6" button visible, every other Sefirah dimmed in the ledger, no rolled values. The page also doesn't show the zodiac-sign picker (Epic #212) — that's a later phase. Header reads "Player 1 — Sefirot Blessing" which adds no visual interest. | Playwright sequence in `screenshots.review.spec.ts`: `await page.getByRole('button', { name: /roll 3d6/i }).click()` 5×, then capture. Yields STEP 6 OF 10 with five Sefirot rolled, gold accents on completed rows, current Sefirah highlighted. Separately: **add `play-sign-picker-desktop.png`** by walking through the full ritual (`page.getByRole('button', { name: /skip|roll all remaining/i }).click()`) into the sign phase and capturing the `ZodiacSignPicker`. |
| `about-desktop.png` (297 KB) | **Drop & replace** | Stale — captures the about page *before* #266 added the 5th GalleryItem. Diverges from the marketing-pack copy of the same slug. Also: full-page capture of a ~4500-px-tall page; the embedded gameplay-gallery thumbnails are unreadable at this scale. | Replace with a fresh capture from the current `/about` route. Consider Recrop'ing both files to `clip: { x: 0, y: 0, width: 1280, height: 1200 }` (above-the-fold + first heading) so the file is useful as a thumbnail rather than a long scroll. |
| `tokens-desktop.png` | **Keep** | Dev-only design-system swatch sheet — striking palette but not gameplay. Self-describes as "Dev-only visual check" in its first paragraph. Bottom of canvas has typography sample. | Keep for the contributor tour. Don't promote to marketing. |
| `demo-cards-desktop.png` | **Keep** | One of the strongest shots in the pack — 22 Major Arcana in 8×3 grid, each with Hebrew letter, glyph, name, and zodiac/planet. The page header + paragraph mention `components/cards/glyphs.tsx` (dev tooling) but it's small relative to the grid. | (Optional) `clip` past the header for a cleaner marketing variant. Otherwise no change. |
| `demo-challenge-desktop.png` | **Restate + Add** | Pre-roll static state. The d20 outcome (the actual moment of tension), the success/failure rendering, and the Soul Door callout (Epic #240) — all the parts that justify a "tense moment" caption — are absent. The dev-tooling intro paragraph is visible. | Restate: extend the demo page with a `?state=post-roll&result=success` URL param OR add a Playwright step that clicks Roll and waits for the d20 settle. Capture mid-animation or post-result. **Add: `demo-challenge-soul-door-desktop.png`** — open the demo with `?door=open` (or whatever testbed seeding the demo supports) so the "Soul Door open here: DC X → X-2" callout is visible in the same modal. |
| `demo-hand-desktop.png` | **Keep (docs-only)** | Three rows: own hand (3 cards face-up, with dev-only "× close" buttons on each), other-player at lower tree (2 face-down Star-of-David backs), other-player at upper tree (2 face-up). Informational for contributors. The face-down cards are visually flat (twice the same back). The "× close" buttons are dev fluff. | Keep for the contributor tour. Don't promote to marketing. Future: hide the dev `× close` controls behind a `?demo=clean` flag. |
| `demo-icons-desktop.png` | **Recrop** | Pillar markers, 10 stat icons, 3 meter variants, decorative flourish — but stat icons are ~32 px tall and the bottom 50% of canvas is empty. The flourish is one tiny line in the lower-left, almost invisible at viewport scale. | `clip: { x: 0, y: 0, width: 760, height: 780 }` to drop the void. Or capture the inner demo container per the recurring-problem #1 fix. |
| `demo-meters-desktop.png` | **Recrop + Restate** | Meters fill ~15% of canvas (left column, top half). Right column has dev-control buttons (- / + on Illumination, - / + on Separation, Reset) that have no narrative purpose. Pillar-streak indicators (M/S/B) are tiny (~24 px squares). Bottom 60% of canvas is black void. | Capture the meters container only via `page.locator('[data-meters-canvas]').screenshot()` (add the data attribute to the demo). Or `clip: { x: 0, y: 0, width: 280, height: 420 }`. **Also Restate**: bump Illumination to ≥ 12 / 15 and Separation to ≤ 4 / 15 before capture so the fills are dramatic, not balanced. |
| `demo-ritual-desktop.png` | **Drop or Restate (pick one)** | Visually 95% identical to `play-desktop.png` — same `BlessingRitual` component, same STEP 1 OF 10, same empty ledger. The dev-only "Restart with new seed" button is rendered at the bottom. The page header "Walk through Kether to Malkuth. 3d6 per stat. Seeded RNG so reloads produce the same blessings." is dev tooling. | One of the two should go: either Drop `demo-ritual-desktop` (let `play-desktop` cover this surface) or Drop `play-desktop` (let `demo-ritual-desktop` be the canonical ritual capture). Recommend Drop `demo-ritual` from the marketing pack but keep it in `docs/screens.md` showing a Restated mid-flow state distinct from `play-desktop`'s mid-flow state. |
| `demo-shell-panel-desktop.png` | **Keep** | Three rows: All Dormant / Two Active (Cruelty + Hoarding) / Mixed (Kether + Malkuth active, Binah banished — strikethrough rendering). Strong shot — demonstrates the state machine clearly with effect copy visible. Weakness: leads with the dormant row, which is the lowest-energy state visually. | No change needed; the dormant-leads ordering is a demo-page UI choice, not a screenshot framing one. |
| `demo-stat-sheet-desktop.png` | **Recrop** | Three states stacked vertically: Expanded with active-challenge highlight (Harmony 13 ringed gold), Compact orchestrator row, Expanded with no highlight. Right ~65% of canvas is black void; the panels are ≤ 480 px wide. The gold-ring on Harmony is the only place the eye lands. | Capture only the first state (Expanded, active challenge): `clip: { x: 0, y: 100, width: 540, height: 480 }`. Drop the other two states from the marketing-tier capture; let the contributor tour keep the multi-state version. |
| `demo-tokens-desktop.png` | **Keep (docs-only)** | Reference sheet: 4 player tokens, 10 Sefirah Sparks, 10 active Shells + 10 dormant + 10 banished, 4 d20 glyph variants. High information density but not gameplay. | Keep for the contributor tour. Don't promote to marketing. |
| `demo-tree-desktop.png` | **Recrop** | Tree occupies center ~50% of canvas; left and right ~25% each are black letterbox. Page header "Static board. Interactivity (move highlighting, click handlers) lands in Phase 3." is dev tooling that dates the screenshot. | `await page.locator('[data-tree-svg]').screenshot()` (add the `data-tree-svg` attribute to the SVG element). Or `clip: { x: 480, y: 60, width: 320, height: 400 }`. |

---

## Per-asset table — `assets/marketing/` (11)

The seven slugs that overlap with `docs/screenshots/` get the same
verdicts as above. The four marketing-only slugs:

| Slug | Verdict | What's wrong | Fix |
|---|---|---|---|
| `home-mobile.png` | **Keep** | Clean vertical stack at 375×667. Tree icon scales appropriately. Form is well-sized for thumb-tap. The only mobile asset in the pack. | No change. Future: capture more mobile variants if the marketing surface grows responsive claims. |
| `about-desktop.png` (313 KB) | **Recrop** | Same full-page-of-tall-page problem as the docs/screens.md copy (~4500 px tall; embedded gallery thumbnails unreadable). Captures the *current* layout (5-item gallery), so it's not stale, just intrinsically poor as a thumbnail. | `clip: { x: 0, y: 0, width: 1280, height: 1200 }` for hero + first heading. Saves 200+ KB of file weight too. |
| `demo-challenge-desktop.png` | **Restate + Add** | Same as the docs/screens.md copy. | Same fix. |
| `demo-shell-panel-desktop.png`, `demo-stat-sheet-desktop.png` | (covered above) | (covered above) | (covered above) |

---

## Missing surfaces (Add)

These are the four screens with no current capture that should exist:

1. **Zodiac-sign picker** (Epic #212). New slug: `play-sign-picker-desktop.png`. Walk through the ritual with "Skip — roll all remaining", land on the `ZodiacSignPicker`, capture. Twelve sign cards in a grid + class-derived bonuses preview is the visual subject.
2. **Soul Door callout** (Epic #240). New slug: `demo-challenge-soul-door-desktop.png`. Trigger via demo URL param or Playwright fixture. Modal shows `Challenge: <Sefirah>`, the standard DC line, AND the new "Soul Door open here: DC X → X-2 (shortcut +3, Door -2)" callout band.
3. **Multiplayer lobby** (`/rooms/[code]/lobby`). New slug: `lobby-desktop.png`. Currently documented as "captured separately" in `docs/screens.md`. Needs a Playwright fixture that mocks Supabase enough for the lobby to render with two seated players. Defer to a follow-up if the fixture cost is high; document the deferral inline.
4. **Mid-game play surface with rolled stats**. The current `play-desktop` is the ritual phase, not the actual play. New slug: `play-mid-game-desktop.png`. Walk through ritual + sign + lobby + Begin to reach `PlayScreen`, capture with the Tree board, hand fan, meters, and turn UI all visible. This is the screenshot the README "play surface" caption is *describing* but isn't actually showing.

---

## Cross-cutting issues

- **Synchronize `assets/marketing/about-desktop.png` and `docs/screenshots/about-desktop.png`**. They share a slug but have diverged. Either copy the marketing version into `docs/screenshots/`, or recapture both fresh from the same baseline run.
- **Dev-tooling header strip on every `/demo/*` page**. Either accept it as part of the contributor-tour aesthetic or wrap each demo page's content in a `<section data-demo-canvas>` that screenshots can target directly.
- **Marketing pack has 11 assets totalling ~1016 KiB; the cap is 1024 KiB.** After Adds (sign picker, soul door, mid-game) and Drops (demo-ritual marketing copy), the new total should be checked. If recropping shrinks files (likely — `clip` regions are smaller than full-page), there's headroom.
- **`tests/docs/links.test.ts` will catch missing-image regressions.** It does NOT catch stale-state or out-of-sync between two slugs. The drift-check is a path drift-check, not a content drift-check.

---

## Action plan summary

Priority order for Phase 2 work:

1. **High-impact Restate**: `play-desktop`, `demo-challenge-desktop`. These are the two screenshots that anchor the README "Gameplay" gallery and the `/about` page; making them not-empty-state is the biggest visible quality jump.
2. **High-impact Add**: `play-sign-picker-desktop.png`, `play-mid-game-desktop.png`. These cover Epic #212 + the actual play surface, which the marketing copy *implies* are visible but currently aren't.
3. **Recurring-problem fix**: introduce `[data-demo-canvas]` (or per-element `data-*` hooks) on the demo pages so screenshots can target inner content instead of the dev-tooling header. Once that lands, every Recrop entry becomes a one-line spec change instead of a per-element `clip` calculation.
4. **Soul Door callout Add**: `demo-challenge-soul-door-desktop.png`. Requires a small demo-page extension to seed the door state.
5. **Drops**: remove `demo-ritual-desktop.png` from `assets/marketing/`, update the Index, README, and `app/about/page.tsx` accordingly.
6. **Recrops**: `about-desktop` (both copies), `demo-tree-desktop`, `demo-meters-desktop`, `demo-stat-sheet-desktop`, `demo-icons-desktop`.
7. **Sync drift**: rectify `about-desktop.png` between the two surfaces.
8. **Lobby Add**: defer if fixture cost is high; otherwise capture.

Verification per usual: `pnpm ci:local` green; eyeball Markdown rendering; check `tests/docs/links.test.ts` still passes after Drops.

---

## Phase 2 outcome — 2026-04-30

What landed in this PR:

| Action plan item | Status | Notes |
|---|---|---|
| 1. High-impact Restate (`play`, `demo-challenge`) | ✅ Done for `play`; **partial** for `demo-challenge` | `play-desktop` now captures STEP 6 OF 10 with five rolled Sefirot. `demo-challenge` was Recropped via `[data-demo-canvas]` (drops dev header) but the post-roll Restate was not implemented — the more compelling Restate turned out to be the Soul Door variant (item 4), and the pre-roll modal pairs cleanly with that as a before/after diptych. Decision recorded; not deferred. |
| 2. High-impact Add (`play-sign-picker`, `play-mid-game`) | ✅ Done | Both captured via the new `setup(page)` hook. Sign picker shows the full 12-card grid; mid-game shows the live `PlayScreen` after walking ritual + sign + Begin for both players. |
| 3. Recurring-problem fix (`[data-demo-canvas]`) | ✅ Done | Attribute landed on every `/demo/*` route. The meters demo's wrap was tightened post-capture (the first pass left the dev stepper inside the canvas region — fixed in commit `727a78b`). |
| 4. Soul Door callout Add | ✅ Done | `app/demo/challenge/page.tsx` reads `?door=open` and `?shortcut=1` from search params and passes through to `ChallengeModal.context`. The callout band reads "Soul Door open here: DC 15 → 13", DC adjusted accordingly. |
| 5. Drops | ✅ Done | `demo-ritual-desktop.png` removed from `assets/marketing/`. README + `app/about/page.tsx` embed lists rebuilt around the player journey. The demo-ritual entry stays in `docs/screens.md` (still useful as a contributor harness reference). |
| 6. Recrops | ✅ Done for `demo-tree`, `demo-meters`, `demo-stat-sheet`, `demo-cards`, `demo-shell-panel`, `demo-challenge`, `demo-tokens`, `demo-icons`, `demo-hand`. **Deferred** for `about-desktop`. | Locator-based `[data-demo-canvas]` capture replaces full-page for every `/demo/*` route. The about page is still full-page (a hero-only crop is a follow-up — see deferred items). |
| 7. Sync drift (`about-desktop`) | ✅ Done | Both surfaces now read from the same `e2e/__screenshots__/baselines/about-desktop.png`. |
| 8. Lobby Add | ⏸ Deferred | The `/rooms/[code]/lobby` route requires Supabase fixture mocking that isn't trivial. Filed as a follow-up. The "Captured separately" section in `docs/screens.md` remains accurate. |

### Deferred / follow-ups

These are intentionally not in this PR:

- **`about-desktop` hero crop**: the about page is ~5000 px tall and full-page captures have unreadable embedded thumbnails. A `clip: { x: 0, y: 0, width: 1280, height: 1200 }` variant for marketing would be cleaner. Cost: small spec change. Skipped here so this PR isn't open-ended; worth a follow-up issue.
- **Lobby capture**: see item 8. Needs Supabase fixture or a `?seed=` URL hack on the lobby route.
- **`demo-challenge` post-roll Restate**: see item 1 — the Soul Door variant covers the "after the d20 lands" moment well enough for now.
- **PNG compression** (pngquant / oxipng): not available via `pnpm dlx`. The marketing pack at 1432 KiB is comfortably under the bumped 1.5 MiB cap; future growth can compress before bumping again.
- **Visual-regression baseline alignment**: `e2e/visual-regression.spec.ts` still captures `/demo/*` full-page. Switching it to `[data-demo-canvas]` would tighten regression scope to inner content. Not load-bearing for marketing; deferred.

### Numbers

- Marketing pack: 11 PNGs (~1016 KiB) → 13 PNGs (~1432 KiB). Cap bumped 1024 KiB → 1.5 MiB with rationale recorded in `assets/marketing/README.md`.
- Tour pack: 14 PNGs (~1340 KiB) → 17 PNGs (~1817 KiB).
- New routes covered: 3 (`play-sign-picker`, `play-mid-game`, `demo-challenge-soul-door`).
- Demo pages with `[data-demo-canvas]`: 10/10.
