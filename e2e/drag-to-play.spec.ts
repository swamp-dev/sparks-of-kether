import { test, expect, type Page } from '@playwright/test';

/**
 * #412 — drag-to-play onto path. End-to-end: walk through the
 * setup pipeline, land on `/play?seed=1492` (deterministic deal),
 * pick a card, drag it to its matching path, verify the player
 * advances. Then a second test verifies the rejection path: drag a
 * card to a non-matching path, verify the player stays put and the
 * aria-live region announces.
 *
 * The pure machine + Hand wiring + PlayScreen orchestration are
 * covered by Vitest. This spec exercises the real-browser pointer-
 * events path that jsdom can't simulate (capture, hit-testing via
 * the actual layout's `elementFromPoint`, suppression of the
 * synthesized click).
 */

test.skip(
  !process.env['PLAYWRIGHT_BROWSERS_INSTALLED'],
  'Set PLAYWRIGHT_BROWSERS_INSTALLED=1 after `pnpm exec playwright install chromium`',
);

async function walkToPlayScreen(page: Page): Promise<void> {
  await page.locator('[data-zodiac-sign-picker]').waitFor();
  await page.getByRole('button', { name: /^Confirm Aries$/ }).click();
  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await page.locator('[data-zodiac-sign-picker]').waitFor();
  const nextArrow = page.getByRole('button', { name: /^Next sign$/ }).first();
  for (let i = 0; i < 3; i++) {
    await nextArrow.click();
  }
  await page.getByRole('button', { name: /^Confirm Leo$/ }).click();

  await page.locator('[data-action="skip-ceremony"]').click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await page.getByRole('button', { name: /^begin$/i }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Find a (card, path) pair that satisfies:
 *   - The card is in the active player's hand AND visible.
 *   - The path's arcanum matches the card's arcanum.
 *   - The path is currently a valid move from the active player's
 *     position (so `turn.move` will accept the drop).
 *
 * Returns the card slot's data-arcanum and the path number, plus
 * locators for both. Returns null if no eligible pair exists in
 * this seeded deal — the test then skips the assertion rather than
 * fail on an arrangement we can't dispatch.
 */
async function findValidDragPair(page: Page): Promise<{
  readonly cardSlot: number;
  readonly arcanum: number;
  readonly pathNumber: number;
} | null> {
  // Cards expose `data-arcanum`; paths that are currently valid
  // moves expose `data-valid="true"` on the path `<g>`.
  const validPaths = await page.locator('[data-path][data-valid="true"]').all();
  if (validPaths.length === 0) return null;
  for (const pathEl of validPaths) {
    const pathNum = await pathEl.getAttribute('data-path');
    if (pathNum === null) continue;
    // The path's arcanum is encoded in its aria-label: "Path N
    // (Letter) — Arcanum K, between …". Extract K.
    const ariaLabel = (await pathEl.getAttribute('aria-label')) ?? '';
    const arcanumMatch = /Arcanum (\d+)/.exec(ariaLabel);
    if (!arcanumMatch || arcanumMatch[1] === undefined) continue;
    const arcanum = Number(arcanumMatch[1]);
    const card = page.locator(`[data-card-slot][data-arcanum="${arcanum}"]`).first();
    if ((await card.count()) === 0) continue;
    const slotAttr = await card.getAttribute('data-card-slot');
    if (slotAttr === null) continue;
    return {
      cardSlot: Number(slotAttr),
      arcanum,
      pathNumber: Number(pathNum),
    };
  }
  return null;
}

test('drag-to-play: dragging a card onto a matching path moves the player', async ({ page }) => {
  await page.goto('/play?seed=1492');
  await walkToPlayScreen(page);
  await expect(page.locator('[data-play-screen]')).toBeVisible();
  await expect(page.locator('[data-play-screen]')).toHaveAttribute('data-phase', 'move');

  const pair = await findValidDragPair(page);
  test.skip(
    pair === null,
    'No eligible card / path pair in this seeded deal — drag-to-play covered when the deal lines up.',
  );
  if (pair === null) return;

  const card = page.locator(`[data-card-slot][data-arcanum="${pair.arcanum}"]`);
  const path = page.locator(`[data-drop-zone="path-${pair.pathNumber}"]`);

  // Expand the floating hand from peek mode before computing bounding
  // boxes — otherwise the hover triggered by mouse.move shifts the card
  // position between box-capture and mouse.down, missing the element.
  await page.locator('[data-hand-fan]').hover();
  await page.waitForTimeout(350);

  const cardBox = await card.boundingBox();
  const pathBox = await path.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(pathBox).not.toBeNull();
  if (!cardBox || !pathBox) return;

  // Drag: mouse-move to card centre, mouse-down, mouse-move to path
  // centre (with a midpoint to ensure the threshold is crossed
  // smoothly), mouse-up. Pointer events fire alongside mouse events
  // in real browsers, so this exercises the production drag path.
  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = pathBox.x + pathBox.width / 2;
  const endY = pathBox.y + pathBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Two-step move so the threshold is crossed before the final drop.
  await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.mouse.up();

  // Phase has left 'move' — the drop dispatched. Either 'end' (no
  // challenge) or 'challenge' depending on whether the destination
  // Sefirah is uncleared and check-flagged. Both are valid.
  await expect(page.locator('[data-play-screen]')).not.toHaveAttribute('data-phase', 'move');
});

test('drag-to-play: dragging onto a non-matching path is rejected with announcement', async ({
  page,
}) => {
  await page.goto('/play?seed=1492');
  await walkToPlayScreen(page);
  await expect(page.locator('[data-play-screen]')).toBeVisible();

  const card = page.locator('[data-card-slot]').first();
  const arcanumAttr = await card.getAttribute('data-arcanum');
  test.skip(arcanumAttr === null, 'No visible card in hand for this seed.');
  if (arcanumAttr === null) return;
  const arcanum = Number(arcanumAttr);

  // Find a path whose arcanum DOESN'T match this card.
  const allPaths = await page.locator('[data-path]').all();
  let mismatchedPathNumber: number | null = null;
  for (const p of allPaths) {
    const ariaLabel = (await p.getAttribute('aria-label')) ?? '';
    const m = /Arcanum (\d+)/.exec(ariaLabel);
    if (!m || m[1] === undefined) continue;
    if (Number(m[1]) === arcanum) continue;
    const pathNum = await p.getAttribute('data-path');
    if (pathNum === null) continue;
    mismatchedPathNumber = Number(pathNum);
    break;
  }
  expect(mismatchedPathNumber).not.toBeNull();
  if (mismatchedPathNumber === null) return;

  const path = page.locator(`[data-drop-zone="path-${mismatchedPathNumber}"]`);

  // The hand floats in peek mode until hovered. Hovering triggers the
  // expand animation (HAND_REVEAL_MS=280 ms). We must expand BEFORE
  // computing the bounding box — otherwise page.mouse.move to the
  // peek-position card triggers expansion mid-sequence, the card shifts
  // upward, and page.mouse.down() misses it entirely (no pointerdown
  // on the card ⇒ drag never starts ⇒ announcement never fires).
  await page.locator('[data-hand-fan]').hover();
  await page.waitForTimeout(350); // 280 ms reveal + buffer

  const cardBox = await card.boundingBox();
  const pathBox = await path.boundingBox();
  if (!cardBox || !pathBox) return;

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = pathBox.x + pathBox.width / 2;
  const endY = pathBox.y + pathBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.mouse.up();

  // Phase stayed at 'move' (rejected drop) and the aria-live region
  // carries an announcement.
  await expect(page.locator('[data-play-screen]')).toHaveAttribute('data-phase', 'move');
  await expect(page.locator('[data-drag-announcement]')).toContainText(
    /cannot|that path|no path/i,
    { timeout: 3000 },
  );
});

test('drag-to-play: keyboard fallback — click-to-select then click-path still works', async ({
  page,
}) => {
  // Regression for the #412 AC: "Keyboard fallback (click-then-click)
  // preserved and still functional." A `page.click()` on the card
  // dispatches a synthesized click event without crossing the drag
  // threshold; React onClick fires `onCardSelect` and the card is
  // selected. Then clicking a matching path dispatches `turn.move`.
  await page.goto('/play?seed=1492');
  await walkToPlayScreen(page);
  await expect(page.locator('[data-play-screen]')).toBeVisible();

  const pair = await findValidDragPair(page);
  test.skip(pair === null, 'No eligible card / path pair for keyboard fallback.');
  if (pair === null) return;

  const card = page.locator(`[data-card-slot][data-arcanum="${pair.arcanum}"]`);
  await card.click();
  await expect(card).toHaveAttribute('data-selected', 'true');

  // Click the path's <g> wrapper (not the wide hit-line) — the
  // legacy click flow fires on the path element's onClick, which
  // routes through PlayScreen.handlePathClick.
  await page.locator(`[data-path="${pair.pathNumber}"]`).click();

  await expect(page.locator('[data-play-screen]')).not.toHaveAttribute('data-phase', 'move');
});
