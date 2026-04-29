# Playability priorities — MVP shipped, what's next

_Last updated 2026-04-28 (v3.0 — punch list closed; doc reframed
from gating-set to history-and-pointers). v2.1 history preserved
in git for the sequencing rationale that drove the punch-list
phase. Living doc: edit in place rather than appending._

## TL;DR

**The MVP punch list is closed.** All 14 Tier 1–4 tickets the
2026-04-27 hot-seat playtest surfaced (#56, #128–#136, #37–#39, #99)
shipped between 2026-04-27 and 2026-04-28 — #128 closed first, the
remaining 13 closed 2026-04-28. Sparks of Kether is now playable
hot-seat AND multiplayer end-to-end on desktop, tablet, and mobile.

What's next: the five sibling Epics (#84, #117, #118, #119, #125)
that were deferred until the punch list closed. Two of them are
already substantially done — Epic #84 (Testing & QA Hardening) is
fully closed and Epic #118 (Holistic UI review) is wave-3-and-7
shipped. Epic #119 is in flight (the doc you're reading is part of
it). The two genuinely new initiatives ahead are **#117** (turn-based
encounter system, replaces ChallengeModal) and **#125** (asset polish
& world-building).

This doc captures (a) what the MVP currently delivers, (b) the
post-punch-list epic queue, and (c) historical context for the
sequencing the punch list followed.

---

## What the MVP delivers today

### Engine + game flow
- `/play` route: full hot-seat game from setup → Final Threshold,
  shipped in #74. Engine phases 1–3 (#10–#16). Phase 4 setup, turn
  orchestration, Final Threshold UI (#27–#31). Hand-size cap +
  discard recycle (#56). Yesod start offset modelled correctly (#99).

### Multiplayer
- Supabase schema + RLS (#32). Room create / join (#33). Realtime
  sync (#34). Turn ownership (#35). Presence + disconnect grace
  (#36). Lobby flow (#108).

### UX clarity (post-playtest fixes)
- Confrontation roll result dwell-time (#135). Tree-of-Life path
  number visibility (#136). Post-move action affordances (#129).
  Auto-advance turn with transition (#131). Stats surfaced during
  confrontation (#134).

### Readability + pacing
- Bigger cards + animated hand-open (#132). Yesod→Malkuth tap-target
  audit (#130). Blessing ceremony pacing — parallel rolls + faster
  cadence (#133).

### Phased polish
- Mobile responsive layout (#38). Accessibility audit (#39). Path
  travel + card animations (#37).

### UI polish (Epic #118 wave 3)
- SVG token audit (#162). Demo-page chrome (#163). Soul Aspect
  Sefirah-keyed accents (#159). Per-route ambient layer — Starfield,
  ColorBloom, GlyphWash (#161). Home hero illustration band (#157).
  Card-back motif — hexagram + Tetragrammaton seal (#160). Blessing
  Ritual scene polish — hero badge + ambient + ledger (#156).
  TeamMeters polish — wider gradient bars + pillar columns (#158).

### UI regression lock-in (Epic #118 wave 4 partial)
- Pixel-diff visual regression baselines via Playwright
  `toHaveScreenshot()` — 14 routes × 3 viewports = 42 baselines
  committed (#175).

### Test scaffolding (Epic #84 — fully closed)
- Shared factories (#85). `pnpm test:coverage` working (#86).
  Full-game playthrough simulation (#87). In-memory Supabase shim
  (#88). Real-Supabase integration tests in CI (#89, #127). Mutation
  testing pilot (#90). Coverage thresholds in CI (#91). Screenshot
  capture for review (#92). Property-based engine tests (#93).
  Testability-refactor audit + sub-tickets (#94, #106–#110).
  Manual smoke checklist (#95).

### Local-CI tooling
- `pnpm ci:local` aggregate that mirrors every CI job (verify +
  build + e2e + integration). Auto-installed git pre-push hook
  running the fast subset. The per-PR checklist + admin-merge
  bypass policy is codified at `~/.claude/rules/local-ci-and-admin-merge.md`
  (#173).

---

## What's not yet in the MVP

What the v2 doc called out as gaps is now closed — what remains is
forward-looking work, not "ugh" moments a first-time player hits:

- **Encounter system** — `ChallengeModal` works but is a temporary
  surface; Epic #117 will replace it with a turn-based encounter
  system using Sefirot avatars.
- **Marketing surfaces** — README hero, gallery, animated GIFs,
  cinematic trailer storyboard. Epic #119 part 2.
- **Asset polish & world-building** — illustrated environments,
  audio, narrative text. Epic #125. Largest scope by far.

---

## Post-punch-list epic queue

| # | Epic | Status | Notes |
|---|---|---|---|
| **#84** | Testing & QA Hardening | sub-tickets closed; tracking issue still open | All 11 sub-tickets (T0–T9 + T1a) closed. The epic itself is OPEN on GitHub as a tracking record; close it when convenient. |
| **#117** | Turn-based encounter system w/ Sefirot avatars | not started | Complete replacement of `ChallengeModal`. ~10 sub-tickets, design + engine + UI. The biggest *gameplay* delta still pending. |
| **#118** | Holistic UI review & polish | partial — wave 3 + visual regression done | Wave 3 (per-screen polish) and item 7 (visual regression) shipped 2026-04-28. Items 4 (motion pass) and 6 (empty / error / loading states) still queued. |
| **#119** | Documentation refresh | in flight | Audit landed (#177); CLAUDE.md refresh landed (#179); fan-out continues. Marketing polish (sub-tickets 6–11) still queued. |
| **#125** | Asset polish & world-building (art + audio + narrative) | not started | Largest scope. Best done last. |
| **#120** | USB controller support | deferred | Per the v2 doc: "Fun but not an MVP path." Not in any natural sequence. |

### Recommended sequence

1. **Finish Epic #119** (docs refresh + drift-check + marketing polish).
   The audit exists, CLAUDE.md is fresh, this doc is fresh — keep
   the momentum and close out the rest of the doc fan-out + the
   anchor-based drift-check + marketing pack. ~7 more tickets.
2. **Finish Epic #118 wave 4** (motion pass + empty states). Two
   tickets. Smaller scope; lock in the look.
3. **Epic #117 — turn-based encounter system.** This is the biggest
   gameplay change still pending. Substantial design + engine + UI
   work. Probably the right time to start once the docs and visual
   surfaces have stabilised.
4. **Epic #125 — asset polish.** Last. Biggest scope. Lifts the
   whole experience but doesn't change any rules.

_Epic #84 close-out is a 30-second admin action, not a dev
initiative — close the tracking issue whenever convenient. Epic
#120 (USB controller) is deferred indefinitely unless the user
explicitly wants it._

---

## Acceptance for "MVP shipped" (v3 status)

- ✅ All Tier 1–4 punch-list tickets closed.
- ✅ Multiplayer flow walkable end-to-end on a phone (mobile layout
  #38 + a11y #39 baseline established; visual regression locks the
  surface in #175).
- ⏳ One-pass user-flow video recorded on a real device. _(This is
  the one acceptance criterion that's a manual-only bar — not
  covered by automated tests. Filing-or-not is the user's call.)_

The v2 doc said: "After that, **and only after that**, start #117 /
#118 / #119 / #125." The first three are now safe to start (and
have been started — #118 wave 3 + 7 done; #119 in flight). #117 and
#125 remain the largest forward initiatives.

---

## Risk register (post-punch-list)

- **#117 will absorb significant attention** when started. Expect
  it to take longer than feels reasonable — it touches the central
  game loop (encounter resolution) and replaces a working surface
  (`ChallengeModal`). Plan for a multi-PR fan-out, not a single
  ticket.
- **Hosted CI is currently in a runner-startup-failure state** as
  of 2026-04-28T14:00 (job containers fail in 3–8 s with
  `BlobNotFound` on logs API). The local-CI tooling and admin-merge
  bypass policy at `~/.claude/rules/local-ci-and-admin-merge.md`
  exist precisely to keep merges flowing under this condition.
  _Remove this entry once hosted CI has been green for 48 h._
- **Visual regression baselines are platform-specific** (`*-linux.png`
  in CI; macOS / Windows contributors see drift on local runs). The
  `e2e/visual-regression.spec.ts-snapshots/.gitignore` blocks
  `*-darwin.png` and `*-win32.png` from being committed.

---

## v2 history (2026-04-27 sequencing rationale)

Preserved here as context for why the punch list got built in the
order it did. The actual ordering shipped — the rationale held.

- **Bugs first (#128 → #135 → #136 → #56).** Polish on top of a
  broken hand UI loses every first-time player. Bugs are
  TDD-friendly and parallelizable.
- **UX clarity next (#129 → #131 → #134).** #129 + #131 share the
  same reducer surface; #134 stands alone but was a 2026-04-27
  finding so it joined this tier.
- **Readability + pacing (#132, #130, #133).** Cards size, hit
  target, ceremony pacing. None blocked anything; picked by
  available worktree slot.
- **Phased polish last (#38 → #39 → #37 → #99).** Mobile/a11y/
  animations relied on the surface above being settled. #38 went
  before #39.
- **Tier-skipping was OK** for small items. #99 was 30 minutes;
  folded in next to whatever was being touched.

Closed tickets, in order of merge:

```
#135 → #136 → #56 → #129 → #134 → #131 → #132 → #130 → #133 →
#99 → #38 → #39 → #37
```
