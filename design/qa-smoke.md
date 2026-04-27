# Sparks of Kether — manual smoke checklist

> [!IMPORTANT]
> **This checklist is NOT executed in CI.** It captures the human-only coverage that automated tests miss — font fallbacks, motion sickness from animation, awkward hover states, broken keyboard navigation, and other "it renders but it doesn't *feel* right" failure modes. Run before each Phase-N close, or after any change that touches a route or visual layout.

**How to use:** copy this list into a session log, walk through it, mark each box as you go. Anything that doesn't match the expected outcome becomes a follow-up issue. Don't pencil-whip — if a check is genuinely fine, just note "OK". If you're not sure, mark it as a question and ask.

## Setup

- [ ] **Local dev server running.** `pnpm dev` boots cleanly. No env-var errors at startup. Default port `http://localhost:3000`.
- [ ] **Browser:** Chromium-based (Chrome/Edge/Brave) or Firefox. Note any browser-specific findings.
- [ ] **Window size:** 1280×800 minimum; mobile viewport (375×667) for the responsive checks at the bottom.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`** if smoking the multiplayer flow. Without it, the `/start` route throws at request time.

## 1. Home page (`/`)

- [ ] Page renders without flashing the wrong font (the Hebrew display font should be applied to headings).
- [ ] Heading "Sparks of Kether" visible and centered.
- [ ] At least two distinct entry points: a "Hot-seat" link and a multiplayer "New game" / "Join" affordance.
- [ ] No layout shift after fonts load (CLS-style flicker).
- [ ] Tab key cycles to each interactive element in a sensible reading order.

## 2. Hot-seat full game (`/play`)

- [ ] Click "Hot-seat" → arrive at the play setup screen.
- [ ] Player 1 Sefirot blessing ritual: 10 steps, one per Sefirah. Each step shows the Sefirah's name in Hebrew + English, the stat being blessed, and a die-roll affordance.
- [ ] Each blessing step accepts a roll without "stuck" UI (button visually disables during animation, re-enables when ready).
- [ ] After P1 ritual: Soul Aspect picker shows all 6 personality Sefirot. Selecting one advances to P2.
- [ ] Player 2 ritual + aspect pick: same flow, no leaks of P1 state visible.
- [ ] Lobby renders both players. Both show as "ready" (since hot-seat auto-readies).
- [ ] Click "Begin" → play screen mounts. Tree of Life renders. Both player tokens visible at Malkuth.
- [ ] Make a move: select an arcanum, then a destination. Within 2 seconds the player token sits on the destination node; no duplicate token visible at the source; the played card no longer in hand.
- [ ] Hand updates after the play. Cards remaining = starting size − 1 (modulo any draw step).
- [ ] Trigger a challenge: in a fresh game, all Sefirot except Malkuth start uncleared, so any first move into a non-Malkuth node opens the challenge modal. Modal renders; the d20 affordance is visible and clickable.
- [ ] On challenge pass: Sefirah marked cleared, player gains the Spark token, illumination ticks +1.
- [ ] On challenge fail: accept-setback works (player pushed back, separation +1).
- [ ] End the turn → active-player indicator visibly rotates.
- [ ] No console errors (open DevTools, check at each step).

## 3. Multiplayer lobby create / join (`/`)

- [ ] Click "New game" → backend creates a room, page redirects to `/rooms/<code>/lobby` with a 6-char code.
- [ ] Room code is visible and easy to read out loud (no ambiguous characters like O vs 0).
- [ ] Open a second browser (or incognito tab). On home page, enter the code in the join field. Click join.
- [ ] Second tab arrives at the same lobby. Both players appear in the player list.
- [ ] Each player can toggle their ready state. Indicator updates within 2s on the other tab.

(Note: the Soul Aspect picker UI is not wired into multiplayer yet. Once the picker lands, add a check here that picks reflect cross-tab within 2s.)

## 4. Lobby Begin happy path

- [ ] In a 2-player lobby with both ready and both having distinct Soul Aspects, the host's "Begin" button is enabled.
- [ ] Non-host's "Begin" button is disabled (or hidden).
- [ ] Click Begin → button shows "Beginning…" and disables.
- [ ] Within 2s, the lobby reflects `state: 'playing'` (visible somehow — game-page transition or status indicator).
- [ ] No 5xx errors in the network tab.

## 5. Lobby error paths

- [ ] Try to start a 1-player lobby (open one tab, click Begin) — server returns 422 `too-few-players`. Error visible, not silent.
- [ ] Have two players pick the same Soul Aspect. Begin returns 422 `duplicate-soul-aspects`. Error visible.
- [ ] Try to access `/rooms/ZZZZZZ/lobby` (a code that does not exist). Page shows a clean "no room" error, not a crash.

## 6. Demo pages (each renders without crash)

- [ ] `/demo/cards` — Major Arcana grid. All 22 cards render. Hover shows arcanum number / letter.
- [ ] `/demo/challenge` — Challenge modal opens. Roll affordance works. Modal closes cleanly.
- [ ] `/demo/hand` — Hand component with a sample hand. Cards selectable.
- [ ] `/demo/icons` — All app icons render at the correct size and color.
- [ ] `/demo/meters` — Illumination + Separation meters render. Test edge cases (0/15, 14/15) by adjusting the props if exposed.
- [ ] `/demo/ritual` — Sefirot blessing ritual step. Roll button works.
- [ ] `/demo/shell-panel` — Shell indicators for all 10 Shells. Dormant / active / banished states visible.
- [ ] `/demo/soul-aspect` — Soul Aspect picker. All 6 personality Sefirot render.
- [ ] `/demo/stat-sheet` — Player stat sheet. All 10 stats render with correct labels.
- [ ] `/demo/tokens` — Player tokens, Spark tokens, Shell tokens, d20. All render at correct color/size.
- [ ] `/demo/tree` — Tree of Life board. All 10 Sefirot nodes render. All 22 paths render. No overlapping labels.

## 7. Top-level pages

- [ ] `/tokens` — Token reference page renders.

## 8. Visual / motion / accessibility

- [ ] No element flashes unexpectedly on mount (animation should ease in, not pop).
- [ ] Hover states have visible feedback on all interactive elements.
- [ ] Focus rings visible on all interactive elements when tabbing.
- [ ] Reduced motion (`prefers-reduced-motion: reduce` set in OS): animations are dampened or removed.
- [ ] Color-only state distinctions also have a non-color signal (icon, text, border) — color-blindness friendly.

## 9. Mobile responsive (375×667)

- [ ] Home page legible without horizontal scroll.
- [ ] Lobby is usable on a phone (player list + ready toggle reachable).
- [ ] Tree of Life on the play screen at least *fits*; pinch-zoom may be needed but the layout should not break.
- [ ] Modals (challenge, soul aspect, etc.) take the full viewport on phone.

## 10. Navigation + recovery

- [ ] Refresh `/play` mid-game (Ctrl+R) — page reloads to a clean state (single-player has no persistence; multiplayer should re-fetch the snapshot and resume).
- [ ] Refresh the lobby page mid ready-toggle — readiness re-fetches; no orphaned indicators left visible.
- [ ] Browser back button from `/play` returns to `/` cleanly. No console errors. No leftover Realtime subscriptions still firing in the background (open DevTools network tab and confirm WebSocket frames stop).
- [ ] Browser back from `/rooms/<code>/lobby` returns to `/`. The room is not torn down (you can re-enter via the code).
- [ ] Tab-cycle through the entire hot-seat game with the keyboard only — no mouse — from home to first move. Every interactive element is reachable; focus order is sensible; modals trap focus until dismissed.

## 11. Console + network hygiene

- [ ] No React "Each child in a list should have a unique 'key' prop" warnings.
- [ ] No "act() not wrapped" warnings (sign of a bug in async state updates).
- [ ] No 4xx / 5xx network responses on a happy-path walk.
- [ ] No `console.error` calls from app code (browser-side console.error from libraries is OK if explained).

---

_Last updated: 2026-04-27 (initial). Add a note at the bottom of this file each time a Phase-N close runs the list, with date + tester + notable findings._
