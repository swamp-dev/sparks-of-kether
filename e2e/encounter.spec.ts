import { test, expect } from '@playwright/test';

/**
 * #278 — `EncounterScreen.mode` route-level wiring.
 *
 * PR #275 (E3) shipped EncounterScreen with a discriminated-union
 * `mode: 'hot-seat' | 'multiplayer'` prop. PlayScreen previously
 * hard-coded `mode='hot-seat'`. This ticket flips the mode based on
 * whether PlayScreen received a `roomCode` prop.
 *
 * This e2e pins the route-level integration in HOT-SEAT mode. The
 * existing `/play` route is hot-seat-only; a `/rooms/[code]/play`
 * route does not yet exist (and the multiplayer lobby's Begin path
 * is blocked on #325 — joinRoom RLS fix). When that route lands,
 * extend this spec with a multiplayer cycle that uses a
 * service-role-seeded room (the `seedSecondPlayer` pattern from
 * `tests/integration/setZodiacSign.test.ts`) to drive a real
 * multiplayer encounter.
 *
 * Per-step modifier dispatch and the multiplayer mode flag itself
 * are pinned at the unit level by
 * `components/game/__tests__/PlayScreen.mode.test.tsx`, which mounts
 * `PlayScreen` with a `roomCode` prop and verifies the engine
 * reducer round-trips a `prep-add-modifier` event into
 * `state.pendingModifiers` — the same wire-format dispatch path
 * `applyClientAction` exposes to the multiplayer API route.
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

test('hot-seat /play route renders without flipping into multiplayer mode', async ({
  page,
}) => {
  // The route's only consumer of the encounter flow is when an active
  // player arrives at a check Sefirah — which depends on the seeded
  // RNG dealing a card matching an outgoing path's arcanum. Driving
  // that deterministically across browser engines is brittle, so this
  // test instead pins the structural contract: `/play` lands on the
  // PlayScreen and never renders an EncounterScreen with
  // `data-mode="multiplayer"`. The unit-level test
  // `PlayScreen.mode.test.tsx` covers the assertion that the
  // multiplayer branch IS chosen when `roomCode` is supplied.

  await page.goto('/');
  // #313: the home page was redesigned — the three entry points
  // (New game / Join game / Hot-seat) sit behind a single
  // "Begin the ascent" disclosure trigger. Click the trigger,
  // wait for the hot-seat link to be visible, click it, and wait
  // for navigation to /play. Without `waitForURL`, parallel dev-
  // server compile of /play can race with the next assertion.
  await page.getByRole('button', { name: /begin the ascent/i }).click();
  const hotseatLink = page.getByRole('link', { name: /Hot-seat/i });
  await hotseatLink.waitFor({ state: 'visible' });
  await hotseatLink.click();
  await page.waitForURL('**/play');

  // Walk both players through the blessing ritual + sign pick. Mirrors
  // the existing `play-flow.spec.ts` to land on the play screen.
  for (let player = 1; player <= 2; player++) {
    await expect(
      page.getByText(new RegExp(`Player ${player} — Sefirot Blessing`)),
    ).toBeVisible();
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: /Roll 3d6/i }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();
    }
    await expect(
      page.getByRole('heading', { name: /The Tree has spoken/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await expect(
      page.getByRole('heading', { name: /Choose your sign/i }),
    ).toBeVisible();
    const signKey = player === 1 ? 'aries' : 'leo';
    await page.locator(`[data-sign="${signKey}"]`).click();
    await page.getByRole('button', { name: /^Confirm$/ }).click();
  }

  await expect(page.getByRole('heading', { name: /^Lobby$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Begin$/ }).click();

  await expect(page.locator('[data-play-screen]')).toBeVisible();

  // No EncounterScreen renders at game start (Malkuth is no-check),
  // so the locator is absent. If a future setup change parks the
  // first arrival on a check Sefirah, this assertion would need to
  // shift to inspecting the data-mode attribute.
  await expect(
    page.locator('[data-encounter-screen][data-mode="multiplayer"]'),
  ).toHaveCount(0);
});
