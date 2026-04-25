import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Hand } from '../Hand';
import { isHandVisible } from '../visibility';
import { makePlayer, makeState } from '@/test/fixtures';

describe('Hand — visibility (faces vs backs)', () => {
  it('renders ArcanumCard for each card when visible=true', () => {
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} />,
    );
    const slots = container.querySelectorAll('[data-card-slot]');
    expect(slots.length).toBe(3);
    // Visible mode: each slot exposes its arcanum number for tests.
    expect(slots[0]?.getAttribute('data-arcanum')).toBe('2');
    expect(slots[1]?.getAttribute('data-arcanum')).toBe('5');
    expect(slots[2]?.getAttribute('data-arcanum')).toBe('13');
    // No card backs render when visible.
    expect(container.querySelectorAll('[data-card="back"]').length).toBe(0);
  });

  it('renders CardBack for every card when visible=false; arcanum numbers are not in the DOM', () => {
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={false} />,
    );
    const backs = container.querySelectorAll('[data-card="back"]');
    expect(backs.length).toBe(3);
    // The DOM must not leak the actual arcanum numbers anywhere — not
    // on the wrapping button (data-arcanum) and not via the inner
    // ArcanumCard (which carries its own data-arcanum and would render
    // the card name as text).
    expect(container.innerHTML).not.toMatch(/data-arcanum=/);
    expect(container.innerHTML).not.toMatch(/High Priestess|Hierophant|Death/i);
    const slots = container.querySelectorAll('[data-card-slot]');
    for (const slot of slots) {
      expect(slot.getAttribute('data-arcanum')).toBeNull();
    }
  });
});

describe('Hand — interaction', () => {
  it('fires onCardSelect with the arcanum number on click', () => {
    const onCardSelect = vi.fn();
    render(
      <Hand
        hand={[2, 5, 13]}
        visible={true}
        onCardSelect={onCardSelect}
      />,
    );
    const middleSlot = screen.getByRole('button', { name: /high priestess|magician|fool/i });
    // Click any visible card; pick the first by data-arcanum.
    const firstCard = document.querySelector('[data-arcanum="2"]') as HTMLButtonElement;
    fireEvent.click(firstCard);
    expect(onCardSelect).toHaveBeenCalledExactlyOnceWith(2);
    // Suppress unused-var warning if the heuristic above ever stops matching.
    expect(middleSlot).toBeDefined();
  });

  it('does not fire onCardSelect when hand is hidden', () => {
    const onCardSelect = vi.fn();
    render(
      <Hand
        hand={[2, 5]}
        visible={false}
        onCardSelect={onCardSelect}
      />,
    );
    const slots = document.querySelectorAll('[data-card-slot]');
    // Even though onCardSelect was provided, the buttons are disabled
    // because cards are hidden — clicking does nothing.
    for (const slot of slots) {
      fireEvent.click(slot);
    }
    expect(onCardSelect).not.toHaveBeenCalled();
  });

  it('keyboard nav: ArrowRight/ArrowLeft moves focus across the hand', () => {
    const onCardSelect = vi.fn();
    const { container } = render(
      <Hand
        hand={[2, 5, 13]}
        visible={true}
        onCardSelect={onCardSelect}
      />,
    );
    const slots = container.querySelectorAll('[data-card-slot]') as NodeListOf<HTMLButtonElement>;
    const [first, second, third] = slots;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(third).toBeDefined();
    if (!first || !second || !third) return;
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(third);
    // ArrowRight at the last card stays put (clamped).
    fireEvent.keyDown(third, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(second);
  });

  it('Enter and Space activate the focused card', () => {
    const onCardSelect = vi.fn();
    const { container } = render(
      <Hand hand={[2, 5]} visible={true} onCardSelect={onCardSelect} />,
    );
    const first = container.querySelector('[data-card-slot="0"]') as HTMLButtonElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    fireEvent.keyDown(first, { key: ' ' });
    expect(onCardSelect).toHaveBeenCalledTimes(2);
    expect(onCardSelect).toHaveBeenNthCalledWith(1, 2);
    expect(onCardSelect).toHaveBeenNthCalledWith(2, 2);
  });

  it('visible read-only hands stay in the AT tree (aria-disabled, not disabled)', () => {
    // No onCardSelect: the hand renders for reading, not playing. The
    // cards must still be reachable to AT (aria-disabled) — using the
    // HTML `disabled` attribute would strip them from the AT tree.
    const { container } = render(
      <Hand hand={[2, 5]} visible={true} />,
    );
    const slots = container.querySelectorAll('[data-card-slot]');
    for (const slot of slots) {
      expect(slot.getAttribute('aria-disabled')).toBe('true');
      // HTML `disabled` only kicks in when the card is face-down.
      expect((slot as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('hidden hands use the HTML disabled attribute (nothing to announce)', () => {
    const { container } = render(<Hand hand={[2, 5]} visible={false} />);
    const slots = container.querySelectorAll('[data-card-slot]');
    for (const slot of slots) {
      expect((slot as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('selectedArcanum visually marks the matching card', () => {
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} selectedArcanum={5} />,
    );
    const slot1 = container.querySelector('[data-card-slot="0"]');
    const slot2 = container.querySelector('[data-card-slot="1"]');
    expect(slot1?.getAttribute('data-selected')).toBe('false');
    expect(slot2?.getAttribute('data-selected')).toBe('true');
  });
});

describe('isHandVisible', () => {
  it('returns true for the owner viewing themselves', () => {
    const p1 = makePlayer({ id: 'p1', position: 'malkuth' });
    const state = makeState({}, { players: [p1] });
    expect(isHandVisible(state, 'p1', 'p1')).toBe(true);
  });

  it('returns false when owner is in the lower Tree (private)', () => {
    const p1 = makePlayer({ id: 'p1', position: 'malkuth' });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState({}, { players: [p1, p2] });
    expect(isHandVisible(state, 'p2', 'p1')).toBe(false);
    // Tiferet is below the Abyss too — private until upper Tree.
    expect(isHandVisible(state, 'p1', 'p2')).toBe(false);
  });

  it('returns true when owner has crossed into the upper Tree', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'binah' });
    const p3 = makePlayer({ id: 'p3', position: 'malkuth' });
    const state = makeState({}, { players: [p1, p2, p3] });
    // p1 (Kether) and p2 (Binah) are visible to p3.
    expect(isHandVisible(state, 'p3', 'p1')).toBe(true);
    expect(isHandVisible(state, 'p3', 'p2')).toBe(true);
    // p3 (Malkuth) is still private.
    expect(isHandVisible(state, 'p1', 'p3')).toBe(false);
  });

  it('returns false for an unknown owner id (privacy default)', () => {
    const state = makeState();
    expect(isHandVisible(state, 'p1', 'ghost')).toBe(false);
  });
});
