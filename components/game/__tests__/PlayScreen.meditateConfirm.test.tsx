import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #24 — Meditate must show a confirmation step before mutating state.
 * A misclick on the wrong turn otherwise loses the player's move and
 * rotates the seat with no recourse.
 *
 * Option A: confirmation modal. Clicking Meditate opens a dialog;
 * Cancel closes with no state change; Confirm fires turn.meditate().
 */

function renderPlay(): void {
  const state = makeFullGame({ playerCount: 2, seed: 1 });
  const rng = seededRng(2);
  render(<PlayScreen initialState={state} rng={rng} />);
}

describe('PlayScreen — Meditate confirm dialog (#24)', () => {
  it('clicking Meditate opens the confirm dialog without mutating state', () => {
    renderPlay();
    const slots = document.querySelectorAll('[data-hand] [data-card-slot]').length;

    const meditateBtn = screen.getByRole('button', { name: /^meditate$/i });
    act(() => {
      fireEvent.click(meditateBtn);
    });

    // Dialog appears.
    const dialog = document.querySelector('[data-meditate-confirm]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    // Hand is unchanged — no draw fired.
    expect(document.querySelectorAll('[data-hand] [data-card-slot]').length).toBe(slots);
  });

  it('Cancel closes the dialog with no state change (hand unchanged, still in move)', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex((p) => p.id === state.activePlayerId);
    const trimmed = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: p.hand.slice(0, 2) } : p,
    );
    const rng = seededRng(2);
    render(<PlayScreen initialState={{ ...state, players: trimmed }} rng={rng} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^meditate$/i }));
    });
    expect(document.querySelector('[data-meditate-confirm]')).not.toBeNull();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    });

    // Dialog gone, hand still 2.
    expect(document.querySelector('[data-meditate-confirm]')).toBeNull();
    expect(document.querySelectorAll('[data-hand] [data-card-slot]').length).toBe(2);
    // End-turn button not yet visible — still in move phase.
    expect(document.querySelector('[data-meditate-callout]')).toBeNull();
  });

  it('Confirm runs turn.meditate() — hand grows by 2', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = state.players.findIndex((p) => p.id === state.activePlayerId);
    const trimmed = state.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: p.hand.slice(0, 2) } : p,
    );
    const rng = seededRng(2);
    render(<PlayScreen initialState={{ ...state, players: trimmed }} rng={rng} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^meditate$/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    });

    // Dialog dismissed, 2 cards drawn.
    expect(document.querySelector('[data-meditate-confirm]')).toBeNull();
    expect(document.querySelectorAll('[data-hand] [data-card-slot]').length).toBe(4);
  });

  it('Escape key cancels without mutating state', () => {
    renderPlay();
    const slots = document.querySelectorAll('[data-hand] [data-card-slot]').length;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^meditate$/i }));
    });
    expect(document.querySelector('[data-meditate-confirm]')).not.toBeNull();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(document.querySelector('[data-meditate-confirm]')).toBeNull();
    expect(document.querySelectorAll('[data-hand] [data-card-slot]').length).toBe(slots);
  });

  it('backdrop click cancels', () => {
    renderPlay();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^meditate$/i }));
    });
    const backdrop = document.querySelector('[data-meditate-confirm-backdrop]');
    expect(backdrop).not.toBeNull();
    if (backdrop === null) return;
    act(() => {
      fireEvent.click(backdrop);
    });
    expect(document.querySelector('[data-meditate-confirm]')).toBeNull();
  });

  it('dialog has aria-labelledby pointing to a visible title', () => {
    renderPlay();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^meditate$/i }));
    });
    const dialog = document.querySelector('[data-meditate-confirm]');
    const labelId = dialog?.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const label = document.getElementById(labelId ?? '');
    expect(label).not.toBeNull();
    expect(label?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
