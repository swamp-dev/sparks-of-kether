import { test, expect } from '@playwright/test';

/**
 * Two-browser integration test for the multiplayer turn-advance flow (#270).
 *
 * Regression: after player 1 ends their turn, the server snapshot was never
 * written, so Supabase Realtime never fired and player 2's screen remained
 * frozen on "t1's turn".
 *
 * Fix verified here: endTurn now dispatches { kind: 'end-turn' } to
 * /api/rooms/[code]/events, which writes the new game_state row, which
 * triggers the Realtime subscription on player 2's side and causes their
 * screen to re-render showing "t2's turn".
 *
 * Prerequisites: `supabase start` and `pnpm dev` must be running locally
 * (Realtime is the transport — a real backing service is required).
 *
 * Skip guard matches the project convention: set PLAYWRIGHT_BROWSERS_INSTALLED=1
 * after running `pnpm exec playwright install chromium`.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

// The multiplayer flow requires a real Supabase instance for room creation,
// auth, and Realtime. Skip in CI environments where only the hot-seat e2e
// job runs (no Supabase backing service).
test.skip(
  !process.env['NEXT_PUBLIC_SUPABASE_URL'],
  'Requires Supabase: set NEXT_PUBLIC_SUPABASE_URL and run `supabase start`',
);

test('non-active player sees turn advance when active player ends turn', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();

  try {
    // ── P1: create room ───────────────────────────────────────────────
    await p1.goto('/');
    await p1.getByRole('button', { name: /begin the ascent/i }).click();
    // Wait for the disclosure panel to expand and the nickname field to appear.
    const p1Nickname = p1.locator('[data-input="nickname"]');
    await p1Nickname.waitFor({ state: 'visible' });
    await p1Nickname.fill('t1');
    await p1.locator('[data-action="create-room"]').click();
    await p1.waitForURL('**/rooms/*/lobby');

    // Extract the room code from the URL so P2 can join the same room.
    // Pathname is /rooms/XXXXXX/lobby — split on "/" gives ["", "rooms", code, "lobby"].
    const pathSegments = new URL(p1.url()).pathname.split('/');
    const roomCode = pathSegments[2];
    if (!roomCode) throw new Error(`Could not extract room code from URL: ${p1.url()}`);

    // ── P2: join room ─────────────────────────────────────────────────
    await p2.goto('/');
    await p2.getByRole('button', { name: /begin the ascent/i }).click();
    const p2Nickname = p2.locator('[data-input="nickname"]');
    await p2Nickname.waitFor({ state: 'visible' });
    await p2Nickname.fill('t2');
    await p2.locator('[data-input="room-code"]').fill(roomCode);
    await p2.locator('[data-action="join-room"]').click();
    await p2.waitForURL('**/rooms/*/lobby');

    // ── Zodiac sign picks ─────────────────────────────────────────────
    // P1 picks Aries (the picker's default first sign).
    await p1.getByRole('button', { name: /^Confirm Aries$/i }).click();

    // P2 advances one step in the carousel then confirms.
    // This guarantees a sign different from Aries regardless of whether
    // the Realtime update carrying P1's pick has arrived yet.
    // #370: if Aries is already marked taken the picker auto-starts on
    // Taurus; clicking Next once yields Gemini. Either way P2 avoids
    // the sign P1 holds.
    const p2NextSign = p2.getByRole('button', { name: /^Next sign$/ }).first();
    await p2NextSign.waitFor({ state: 'visible' });
    await p2NextSign.click();
    // Wait for the carousel label to settle before confirming, then assert
    // the focused sign is NOT Aries (P1's sign) before clicking through.
    const p2ConfirmBtn = p2.getByRole('button', { name: /^Confirm (?!Aries)/i });
    await expect(p2ConfirmBtn).toBeVisible();
    await p2ConfirmBtn.click();

    // ── Ready toggles ─────────────────────────────────────────────────
    // After picking a sign each player lands in the main lobby view.
    // Toggle ready for both so the Begin button unlocks.
    await p1.locator('[data-action="toggle-ready"]').click();
    await p2.locator('[data-action="toggle-ready"]').click();

    // ── P1 (host) begins the game ─────────────────────────────────────
    // The Begin button is enabled only when every player is ready with a
    // zodiac sign (and there are ≥ 2 players). Poll with a timeout to
    // allow the Realtime ready-state update from P2 to arrive on P1's side.
    const beginButton = p1.locator('[data-action="begin"]');
    await expect(beginButton).toBeEnabled({ timeout: 8_000 });
    await beginButton.click();

    // ── Both pages navigate to the play surface ───────────────────────
    await p1.waitForURL('**/rooms/*/play', { timeout: 10_000 });
    await p2.waitForURL('**/rooms/*/play', { timeout: 10_000 });
    await expect(p1.locator('[data-play-screen]')).toBeVisible();
    await expect(p2.locator('[data-play-screen]')).toBeVisible();

    // ── P1 (active player) ends their turn ────────────────────────────
    // Meditate first (required to unlock the End Turn button).
    // The meditate action shows a confirm dialog — click through it.
    await p1.locator('[data-action="meditate"]').click();
    await p1.locator('[data-meditate-confirm-confirm]').click();

    // End the turn. This POSTs to /api/rooms/[code]/events and triggers
    // a Supabase Realtime push to P2's session.
    await p1.locator('[data-action="end-turn"]').click();

    // ── P2 sees the turn advance ──────────────────────────────────────
    // Within the Realtime roundtrip window, P2's screen must update from
    // "t1's turn" to "t2's turn". Before fix #270 this never happened
    // because the server snapshot was never written.
    await expect(p2.getByText(/t2.?s turn/i)).toBeVisible({ timeout: 5_000 });
    // Guard: "t1's turn" must no longer be visible once the advance fires.
    await expect(p2.getByText(/t1.?s turn/i)).not.toBeVisible();
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});
