# Playability priorities — to first-shippable MVP

_Last updated 2026-04-27 (v2.1 — #128 closed, #84 added to defer
table, miscount fixed). Living doc: edit in place rather than
appending._

## TL;DR

Sparks of Kether is **playable hot-seat on a single device today** and
**partially playable as multiplayer** (schema + room + lobby + realtime
sync all shipped). The gap to a "you can hand this URL to a friend on
their phone and finish a game" MVP is **a tiered punch list of 13 open
tickets** (4 Tier-1 bugs, 3 Tier-2 UX-clarity items, 3 Tier-3
readability/pacing items, 4 Tier-4 phased-polish items), swamped by
five big sibling Epics (#84, #117, #118, #119, #125) that should NOT
start until the punch list closes.

This doc tiers them, sequences them, and explicitly defers the rest.

---

## What "playable" already means today

- `/play` route works: full hot-seat game from setup → Final Threshold,
  shipped in #74. Engine phases 1-3 closed (#10–#16). Phase 4 setup,
  turn orchestration, Final Threshold UI all closed (#27–#31).
- Multiplayer skeleton works: Supabase schema + RLS (#32), room
  create/join (#33), realtime sync (#34), turn ownership (#35),
  presence + disconnect grace (#36). Lobby flow (#108).
- Test scaffolding solid: factories (#85), playthrough sim (#87),
  in-memory Supabase shim (#88), coverage thresholds (#91), property
  tests (#93), screenshot capture (#92), mutation pilot (#90), smoke
  checklist (#95).

## What "playable" doesn't mean today

Pre-existing:

- Hand growth is unbounded — a long 4-player game can deck-empty (#56).
- Mobile layout is desktop-only at narrow viewports (#38).
- No keyboard / screen-reader support (#39).
- No motion polish — actions feel inert vs. magical (#37).
- Yesod's "start one Sefirah below Malkuth" weakness is unimplemented;
  fixtures silently misrepresent the start state (#99).

**Surfaced by the 2026-04-27 hot-seat playtest** (#128–#136 below).
These are not blockers in the strictest sense — the game is playable
without them — but each one is a real "ugh, this should be better"
moment a friend would hit on first play. The bugs (#128, #135, #136)
are above the polish items in priority because they actively confuse
players.

## The gating set, v2 (priority order)

Reordered after the 2026-04-27 playtest. Bugs first, then UX
clarity, then layout, then polish.

### Tier 1 — bugs (fix first, no excuses)

| # | Ticket | Why |
|---|---|---|
| ✅ | ~~**#128** Hand doesn't update after drawing~~ | _Closed by #138 — meditate now draws 2 cards directly._ |
| 1 | **#135** Confrontation roll result dismissed too quickly | Can't see what you rolled = challenge feels random and opaque. |
| 2 | **#136** Some Tree-of-Life path numbers invisible | Visible-content correctness bug. |
| 3 | **#56** Hand-size cap + discard recycle | A real 4-player game runs out of cards. Engine correctness. |

### Tier 2 — UX clarity (these are the "ugh" moments on first play)

| # | Ticket | Why |
|---|---|---|
| 5 | **#129** Clarify post-move action affordances | Players don't know what they can do next. Highest-leverage UX fix. |
| 6 | **#131** Auto-advance turn (with transition) | Hot-seat cadence. Should land after #129 so the `canEndTurn` flag has a clean home, but they're parallelizable if bandwidth allows. |
| 7 | **#134** Show stats during confrontation view | Players can't decide their action without leaving the modal. |

### Tier 3 — readability + pacing

| # | Ticket | Why |
|---|---|---|
| 8 | **#132** Bigger cards + animated hand-open | Tiny cards = squinting = hesitation. |
| 9 | **#130** Yesod→Malkuth path hit target | One specific edge plus a global ≥44px tap-target audit. |
| 10 | **#133** Blessing ceremony pacing | First-time wonder, but not on the 5th playthrough. |

### Tier 4 — phased polish (existing tickets, lower urgency)

| # | Ticket | Why |
|---|---|---|
| 11 | **#38** Mobile responsive layout | Family game night = phones. Has to come before #39 (a11y depends on layout). |
| 12 | **#39** Accessibility audit | Compliance floor; depends on #38. |
| 13 | **#37** Path travel + card animations | Adds the "magical" feel. Lowest-risk cut if we run out of time. |
| 14 | **#99** Yesod start offset OR exclude | Smallest item; Option B (exclude from fixtures) for now. |

**T3 (#89, real-Supabase integration tests in CI) shipped in #127.**
The integration suite now runs in CI, so multiplayer regressions get
caught during polish work.

## Sequencing rationale (v2)

- **Bugs first (~~#128~~ ✅ → #135 → #136 → #56).** A "polished" game
  with a broken hand UI loses every first-time player. Bug fixes are
  TDD-friendly and parallelizable.
- **UX clarity next (#129 → #131 → #134).** #129 should land before
  #131 because the auto-advance trigger naturally lives in the same
  reducer surface, but they're not hard-blocked. #134 stands alone
  but belongs in this tier because it's a 2026-04-27 finding, not a
  pre-existing wishlist item.
- **Readability + pacing (#132, #130, #133).** Card size, hit target,
  ceremony pacing. None blocks anything; pick whatever has the open
  worktree slot.
- **Phased polish last (#38, #39, #37, #99).** Mobile/a11y/animations
  rely on the surface above being settled. #38 must come before #39.
- **Tier-skipping is OK** when something's small. #99 is 30 minutes;
  fold it in next to anything you happen to be touching.

## What is explicitly deferred until the five are merged

These are the "bigger items" the user named — all of them are full
Epics, not single tickets:

| # | Epic | Why deferred |
|---|---|---|
| **#84** | Testing & QA Hardening | Sub-tickets are tracked independently and most have shipped (T0–T9 closed, T3 just merged in #127). Doesn't gate playability. |
| **#117** | Turn-based encounter system w/ Sefirot avatars | A *complete replacement* of `ChallengeModal`. ~10 sub-tickets, design + engine + UI. Touches the central game loop. |
| **#118** | Holistic UI review & polish | Useful, but premature before #38/#39 set the responsive + a11y baseline. |
| **#119** | Documentation refresh | Mostly meaningful after the punch list settles the surface. |
| **#125** | Asset polish & world-building (art + audio + narrative) | Lifts the whole experience but is the largest scope by far. Last in. |
| **#120** | USB controller support | Fun but not an MVP path. |

## Acceptance for "MVP shipped"

- All Tier 1–4 punch-list tickets closed.
- Multiplayer flow walkable end-to-end on a phone, without a screen
  reader complaining and without burning through every animation
  frame.
- One-pass user-flow video recorded on an iPhone 14 Pro at 320px
  (this is what "looks done" means — not coverage, not green CI).

After that, **and only after that**, start #117 / #118 / #119 / #125.

## Risk register (short)

- **#38 (mobile) might surface scope.** The Tree-of-Life SVG was sized
  for desktop. If it doesn't shrink cleanly, this ticket grows. Mitigate
  by spiking the SVG-resize alone first; if it's >2 days, file a follow-up
  for a redesigned mobile board.
- **#37 (animations) is the most cuttable.** If anything slips, drop
  this. The game works without animations.
- **#117 will compete for attention** because it's the most exciting
  ticket on the board. Do not start it until the five are in `main`.

## Quick reference for the agent that picks this up next

```
# Tier 1 — bugs (#128 closed in #138)
gh issue view 135  # confrontation roll result dismissed too quickly
gh issue view 136  # some path numbers invisible
gh issue view 56   # hand cap + recycle

# Tier 2 — UX clarity
gh issue view 129  # post-move affordances
gh issue view 131  # auto-advance turn
gh issue view 134  # stats during confrontation

# Tier 3 — readability + pacing
gh issue view 132  # bigger cards + hand animation
gh issue view 130  # path hit-target
gh issue view 133  # blessing ceremony pacing

# Tier 4 — phased polish
gh issue view 38   # mobile responsive
gh issue view 39   # a11y audit (after #38)
gh issue view 37   # path / card animations
gh issue view 99   # Yesod offset (smallest)
```

Read this doc first. Read the ticket second. Then `CLAUDE.md` for the
worktree + PR loop.
