import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #507 — PlayScreen integration: the discard pile must be visible from
 * mount and reflect engine state live.
 */

describe('PlayScreen — #507 visible discard pile', () => {
  it('mounts the discard pile in the right-column aside on a fresh game', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const rng = seededRng(2);
    render(<PlayScreen initialState={state} rng={rng} />);
    const pile = document.querySelector('[data-discard-pile]');
    expect(pile).not.toBeNull();
    // Fresh game: discard pile starts empty, so the muted placeholder
    // is rendered and the count reads zero.
    expect(pile?.getAttribute('data-discard-empty')).toBe('true');
    expect(document.querySelector('[data-discard-count]')?.textContent).toBe('0');
  });

  it('renders the top-of-pile card and a non-zero count when the engine snapshot has discards', () => {
    // Synthesise a state where the discardPile is pre-populated. The
    // pile is purely state-driven, so we don't need to drive a real
    // discard event — the mounted pile reads `state.discardPile` and
    // re-renders on every snapshot.
    const base = makeFullGame({ playerCount: 2, seed: 6 });
    const state = { ...base, discardPile: [4, 11, 17] };
    const rng = seededRng(3);
    render(<PlayScreen initialState={state} rng={rng} />);
    const pile = document.querySelector('[data-discard-pile]');
    expect(pile).not.toBeNull();
    expect(pile?.getAttribute('data-discard-empty')).toBe('false');
    expect(document.querySelector('[data-discard-count]')?.textContent).toBe('3');
    // Top is the most recent (index count-1).
    const top = document
      .querySelector('[data-discard-top] [data-arcanum]')
      ?.getAttribute('data-arcanum');
    expect(top).toBe('17');
  });

  it('clicking the pile opens the browse overlay listing every card in pile order', () => {
    const base = makeFullGame({ playerCount: 2, seed: 7 });
    const state = { ...base, discardPile: [2, 9] };
    const rng = seededRng(4);
    render(<PlayScreen initialState={state} rng={rng} />);
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
    const button = document.querySelector<HTMLButtonElement>('[data-discard-pile-button]');
    expect(button).not.toBeNull();
    if (button === null) return;
    act(() => {
      fireEvent.click(button);
    });
    const overlay = document.querySelector('[data-discard-browse-overlay]');
    expect(overlay).not.toBeNull();
    const arcana = overlay
      ? Array.from(overlay.querySelectorAll('[data-discard-browse-list] [data-arcanum]')).map(
          (node) => node.getAttribute('data-arcanum'),
        )
      : [];
    expect(arcana).toEqual(['2', '9']);
  });

  it('overlay closes on Escape; pile remains visible', () => {
    const base = makeFullGame({ playerCount: 2, seed: 8 });
    const state = { ...base, discardPile: [3] };
    const rng = seededRng(5);
    render(<PlayScreen initialState={state} rng={rng} />);
    const button = document.querySelector<HTMLButtonElement>('[data-discard-pile-button]');
    expect(button).not.toBeNull();
    if (button === null) return;
    act(() => {
      fireEvent.click(button);
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).not.toBeNull();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
    expect(document.querySelector('[data-discard-pile]')).not.toBeNull();
  });
});
