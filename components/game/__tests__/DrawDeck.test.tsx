import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DrawDeck } from '../DrawDeck';

/**
 * #25 — visible draw deck. Informational visualization: shows a face-down
 * CardBack with a count badge, stack shadow when more than one card,
 * and an empty placeholder when the deck is exhausted.
 *
 * Since #502 shipped (discrete 'draw' phase folded into end-turn), the deck
 * is purely informational — no click-to-draw interaction. Tests cover
 * visual states only.
 */

describe('DrawDeck', () => {
  it('renders the empty state when the deck is empty', () => {
    render(<DrawDeck deck={[]} />);
    const root = document.querySelector<HTMLElement>('[data-draw-deck]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-deck-empty')).toBe('true');
    expect(document.querySelector('[data-deck-empty-placeholder]')).not.toBeNull();
    expect(document.querySelector('[data-deck-top]')).toBeNull();
    expect(document.querySelector('[data-deck-count]')?.textContent).toBe('0');
  });

  it('renders a face-down card and count when the deck is non-empty', () => {
    render(<DrawDeck deck={[0, 1, 2, 3, 4]} />);
    const root = document.querySelector<HTMLElement>('[data-draw-deck]');
    expect(root?.getAttribute('data-deck-empty')).toBe('false');
    expect(document.querySelector('[data-deck-top]')).not.toBeNull();
    expect(document.querySelector('[data-deck-empty-placeholder]')).toBeNull();
    // CardBack SVG is the face-down representation.
    expect(document.querySelector('[data-card="back"]')).not.toBeNull();
    expect(document.querySelector('[data-deck-count]')?.textContent).toBe('5');
  });

  it('shows the offset stack shadow only when more than one card is in the deck', () => {
    const { rerender } = render(<DrawDeck deck={[7]} />);
    expect(document.querySelector('[data-deck-stack-shadow]')).toBeNull();
    rerender(<DrawDeck deck={[7, 8]} />);
    expect(document.querySelector('[data-deck-stack-shadow]')).not.toBeNull();
  });

  it('singular vs plural count label: 1 card vs N cards', () => {
    const { rerender } = render(<DrawDeck deck={[3]} />);
    const label = document.querySelector('[data-draw-deck] p');
    expect(label?.textContent).toMatch(/1\s+card\b/i);
    rerender(<DrawDeck deck={[3, 4]} />);
    expect(label?.textContent).toMatch(/2\s+cards/i);
  });

  it('transitions from non-empty to empty when the deck is exhausted', () => {
    const { rerender } = render(<DrawDeck deck={[1, 2, 3]} />);
    expect(document.querySelector('[data-deck-top]')).not.toBeNull();
    expect(document.querySelector('[data-deck-count]')?.textContent).toBe('3');

    rerender(<DrawDeck deck={[]} />);

    expect(document.querySelector('[data-deck-top]')).toBeNull();
    expect(document.querySelector('[data-deck-empty-placeholder]')).not.toBeNull();
    expect(document.querySelector('[data-deck-count]')?.textContent).toBe('0');
  });

  it('has an accessible label describing the deck state, including singular 1-card branch', () => {
    const { rerender } = render(<DrawDeck deck={[0, 1, 2]} />);
    const root = document.querySelector<HTMLElement>('[data-draw-deck]');
    expect(root?.getAttribute('role')).toBe('group');
    const label = root?.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/draw deck/i);
    expect(label).toMatch(/3/);

    rerender(<DrawDeck deck={[5]} />);
    const singleLabel = root?.getAttribute('aria-label') ?? '';
    expect(singleLabel).toMatch(/1 card remaining/i);
    expect(singleLabel).not.toMatch(/cards/i);

    rerender(<DrawDeck deck={[]} />);
    const emptyLabel = root?.getAttribute('aria-label') ?? '';
    expect(emptyLabel).toMatch(/draw deck/i);
    expect(emptyLabel).toMatch(/empty/i);
  });

  it('count <p> has aria-live so count changes are announced to screen readers', () => {
    render(<DrawDeck deck={[0, 1, 2]} />);
    const countP = document.querySelector('[data-draw-deck] p');
    expect(countP?.getAttribute('aria-live')).toBe('polite');
    expect(countP?.getAttribute('aria-atomic')).toBe('true');
    expect(countP?.getAttribute('aria-hidden')).toBeNull();
  });
});
