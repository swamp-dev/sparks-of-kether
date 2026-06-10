import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #315 — GiftModal should auto-focus the first actionable button when each
 * step opens, matching the MeditateConfirmDialog pattern. Without autoFocus,
 * screen readers announce the dialog title but focus remains on the backdrop.
 */

function renderTwoPlayerGame(): void {
  const state = makeFullGame({ playerCount: 2, seed: 1 });
  const rng = seededRng(2);
  render(<PlayScreen initialState={state} rng={rng} />);
}

function openGiftModal(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-action="gift-card"]');
  if (!btn) throw new Error('Gift card button not found');
  act(() => {
    fireEvent.click(btn);
  });
}

function getModalActionButtons(): HTMLButtonElement[] {
  const modal = document.querySelector('[data-gift-modal]');
  if (!modal) throw new Error('Gift modal not found');
  return Array.from(modal.querySelectorAll<HTMLButtonElement>('button[type="button"]')).filter(
    (b) => b.getAttribute('aria-label') !== 'Close',
  );
}

describe('PlayScreen — GiftModal auto-focus (#315)', () => {
  it('pick-card step: first card button is auto-focused on open', () => {
    renderTwoPlayerGame();
    openGiftModal();

    const modal = document.querySelector('[data-gift-modal]');
    expect(modal).not.toBeNull();

    const cardButtons = getModalActionButtons();
    expect(cardButtons.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(cardButtons[0]);
  });

  it('pick-recipient step: first player button is auto-focused after picking a card', () => {
    renderTwoPlayerGame();
    openGiftModal();

    // Pick the first card to advance to pick-recipient step
    const cardButtons = getModalActionButtons();
    const firstCard = cardButtons[0];
    if (!firstCard) throw new Error('No card buttons found');
    act(() => {
      fireEvent.click(firstCard);
    });

    // Now in pick-recipient step — first player button should be auto-focused
    const recipientButtons = getModalActionButtons();
    expect(recipientButtons.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(recipientButtons[0]);
  });
});
