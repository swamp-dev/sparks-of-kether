import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #317 — GiftModal over-cap step should auto-focus the first discard button
 * when it opens, matching the pick-card / pick-recipient pattern from #315.
 * Without autoFocus, screen readers announce the dialog title but focus
 * remains on the backdrop; keyboard users must Tab to reach the first button.
 */

function renderGameWithRecipientAtCap(): void {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  // Give player 2 a full hand (HAND_CAP=5) so gifting to them triggers the
  // over-cap step. Cards 10–14 are arbitrary — only the count matters here.
  const state = {
    ...base,
    players: base.players.map((p, i) =>
      i === 1 ? { ...p, hand: [10, 11, 12, 13, 14] } : p,
    ),
  };
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

describe('PlayScreen — GiftModal over-cap auto-focus (#317)', () => {
  it('over-cap step: first discard button is auto-focused after picking a full-hand recipient', () => {
    renderGameWithRecipientAtCap();
    openGiftModal();

    // Pick the first card (pick-card step).
    const cardButtons = getModalActionButtons();
    const firstCard = cardButtons[0];
    if (!firstCard) throw new Error('No card buttons found in pick-card step');
    act(() => {
      fireEvent.click(firstCard);
    });

    // Pick player 2 (the recipient with a full hand) — triggers over-cap step.
    const recipientButtons = getModalActionButtons();
    const recipientBtn = recipientButtons[0];
    if (!recipientBtn) throw new Error('No recipient buttons found in pick-recipient step');
    act(() => {
      fireEvent.click(recipientBtn);
    });

    // Now in over-cap step — first discard button should be auto-focused.
    const discardButtons = getModalActionButtons();
    expect(discardButtons.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(discardButtons[0]);
  });
});
