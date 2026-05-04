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

  it('unselected cards stack left-over-right so leftmost is not occluded (#368)', () => {
    // The fan overlaps each card by ~55% with later DOM-order cards
    // rendering on top by default. That means the **leftmost** card's
    // right ~55% (including its bounding-box centre) sits under card 1.
    // A pointer click at card 0's geometric centre dispatches to card 1
    // (#368). The fix: stack the fan so left cards paint over right
    // cards, with the selected card winning regardless via #340.
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} onCardSelect={vi.fn()} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const [first, middle, last] = slots;
    if (!first || !middle || !last) {
      throw new Error('expected three slots in the rendered hand');
    }
    // zIndex must strictly decrease left → right so the leftmost
    // card's centre is not occluded by its right-hand neighbour.
    const z0 = parseInt(first.style.zIndex || '0', 10);
    const z1 = parseInt(middle.style.zIndex || '0', 10);
    const z2 = parseInt(last.style.zIndex || '0', 10);
    expect(z0).toBeGreaterThan(z1);
    expect(z1).toBeGreaterThan(z2);
  });

  it('selected card stacks above its neighbours (#340)', () => {
    // The fan overlaps cards via negative marginLeft; without a z-index
    // bump on the selected card, later cards in DOM order paint over
    // it and the gold border alone is the only signal — the selected
    // card stays buried under its right-hand neighbour. The fix is to
    // raise the selected card in the local stacking context so the
    // whole face is visible.
    const { container } = render(
      <Hand
        hand={[2, 5, 13]}
        visible={true}
        selectedArcanum={5}
        onCardSelect={vi.fn()}
      />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const [first, middle, last] = slots;
    expect(first).toBeDefined();
    expect(middle).toBeDefined();
    expect(last).toBeDefined();
    if (!first || !middle || !last) return;
    // The selected card needs both `position: relative` (so zIndex
    // takes effect) and a zIndex strictly greater than its siblings.
    expect(middle.style.position).toBe('relative');
    const selectedZ = parseInt(middle.style.zIndex || '0', 10);
    const firstZ = parseInt(first.style.zIndex || '0', 10);
    const lastZ = parseInt(last.style.zIndex || '0', 10);
    expect(selectedZ).toBeGreaterThan(firstZ);
    expect(selectedZ).toBeGreaterThan(lastZ);
  });

  it('selected at slot 0 still wins against the highest unselected slot (#340 + #368)', () => {
    // Adversarial case for the new #368 stacking: when the selected
    // card IS slot 0 (which under the unselected formula already has
    // the highest zIndex `hand.length`), the lift must still raise it
    // above. This pins the invariant that `hand.length + 1` for
    // selected stays strictly above `hand.length - 0` for the
    // leftmost-and-not-selected case — which collapses to the same
    // slot here, so the formula picks `hand.length + 1` (selected
    // branch). Pin the result.
    const { container } = render(
      <Hand
        hand={[2, 5, 13]}
        visible={true}
        selectedArcanum={2}
        onCardSelect={vi.fn()}
      />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const [first, middle, last] = slots;
    if (!first || !middle || !last) {
      throw new Error('expected three slots in the rendered hand');
    }
    const selectedZ = parseInt(first.style.zIndex || '0', 10);
    const middleZ = parseInt(middle.style.zIndex || '0', 10);
    const lastZ = parseInt(last.style.zIndex || '0', 10);
    expect(selectedZ).toBeGreaterThan(middleZ);
    expect(selectedZ).toBeGreaterThan(lastZ);
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

describe('Hand — open / close toggle (#132)', () => {
  it('renders the fan in open state by default', () => {
    const { container } = render(<Hand hand={[1, 2, 3]} visible={true} />);
    expect(
      container.querySelector('[data-hand]')?.getAttribute('data-hand-state'),
    ).toBe('open');
    expect(container.querySelectorAll('[data-card-slot]').length).toBe(3);
  });

  it('renders a compact badge when defaultOpen=false; tap opens the fan', () => {
    const { container } = render(
      <Hand hand={[1, 2, 3]} visible={true} defaultOpen={false} />,
    );
    expect(
      container.querySelector('[data-hand]')?.getAttribute('data-hand-state'),
    ).toBe('closed');
    // No card slots visible while collapsed.
    expect(container.querySelectorAll('[data-card-slot]').length).toBe(0);
    // The badge advertises the count.
    const openBtn = container.querySelector(
      '[data-action="open-hand"]',
    ) as HTMLButtonElement;
    expect(openBtn.textContent).toContain('3 cards');
    fireEvent.click(openBtn);
    expect(
      container.querySelector('[data-hand]')?.getAttribute('data-hand-state'),
    ).toBe('open');
    expect(container.querySelectorAll('[data-card-slot]').length).toBe(3);
  });

  it('clicking the close affordance collapses the hand again', () => {
    const { container } = render(<Hand hand={[1, 2]} visible={true} />);
    const close = container.querySelector(
      '[data-action="close-hand"]',
    ) as HTMLButtonElement;
    expect(close).not.toBeNull();
    fireEvent.click(close);
    expect(
      container.querySelector('[data-hand]')?.getAttribute('data-hand-state'),
    ).toBe('closed');
  });

  it('round-trips open → close → open via the toggle buttons', () => {
    const { container } = render(<Hand hand={[1, 2]} visible={true} />);
    fireEvent.click(
      container.querySelector('[data-action="close-hand"]') as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector('[data-action="open-hand"]') as HTMLButtonElement,
    );
    expect(
      container.querySelector('[data-hand]')?.getAttribute('data-hand-state'),
    ).toBe('open');
    expect(container.querySelectorAll('[data-card-slot]').length).toBe(2);
  });

  it('still renders the close button on an empty hand (so it can be collapsed)', () => {
    // Reviewer caught the regression: gating the close button on
    // `hand.length > 0` left an empty open hand un-collapsible.
    const { container } = render(<Hand hand={[]} visible={true} />);
    expect(container.querySelector('[data-action="close-hand"]')).not.toBeNull();
  });
});

describe('Hand — empty state (#208)', () => {
  it('renders explicit empty-state copy when open with zero cards', () => {
    const { container } = render(<Hand hand={[]} visible={true} />);
    const empty = container.querySelector('[data-hand-empty]');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toMatch(/empty/i);
  });

  it('does NOT render the empty-state copy when the hand has cards', () => {
    const { container } = render(<Hand hand={[1, 5]} visible={true} />);
    expect(container.querySelector('[data-hand-empty]')).toBeNull();
  });

  it('the closed badge already shows "0 cards" — no empty-state node there', () => {
    const { container } = render(
      <Hand hand={[]} visible={true} defaultOpen={false} />,
    );
    expect(container.querySelector('[data-hand-empty]')).toBeNull();
    expect(container.textContent).toMatch(/0 cards/);
  });
});

describe('Hand — full hand at HAND_CAP (#290)', () => {
  // #290: when a player draws beyond STARTING_HAND_SIZE (4) — e.g.
  // via Meditate while already holding 4 cards — the new cards must
  // render. The bug report: "all cards in hand must be visible
  // (currently caps at 4)". HAND_CAP is 6, so the fan must render
  // every slot up to 6.
  it('renders all 6 cards when the hand is at HAND_CAP=6', () => {
    const sixCards = [0, 2, 5, 13, 18, 21] as const;
    const { container } = render(
      <Hand hand={sixCards} visible={true} />,
    );
    const slots = container.querySelectorAll('[data-card-slot]');
    expect(slots.length).toBe(6);
    // Every arcanum number is exposed on its slot — no quiet drop
    // of the 5th and 6th cards.
    const arcana = Array.from(slots).map((s) => s.getAttribute('data-arcanum'));
    expect(arcana).toEqual(['0', '2', '5', '13', '18', '21']);
  });

  it('renders all 5 cards at hand size 5 (between starting size and cap)', () => {
    const { container } = render(
      <Hand hand={[0, 2, 5, 13, 21]} visible={true} />,
    );
    const slots = container.querySelectorAll('[data-card-slot]');
    expect(slots.length).toBe(5);
  });

  it('renders all 6 cards face-down when hidden at HAND_CAP', () => {
    const { container } = render(
      <Hand hand={[0, 2, 5, 13, 18, 21]} visible={false} />,
    );
    const backs = container.querySelectorAll('[data-card="back"]');
    expect(backs.length).toBe(6);
  });

  it('overlap is sized to card width, not parent width (no % marginLeft)', () => {
    // #290 root cause: `marginLeft: '-55%'` resolves against the
    // parent's content-box width per CSS spec — NOT against the
    // card's own width. With a 576 px parent (max-w-xl) that becomes
    // -316 px per card, which collapses 5/6 cards into a stack and
    // pushes their content past the `overflow-x-hidden` boundary
    // so only the first 4 are visible. The overlap must be sized
    // in card-relative units (rem, em, or fixed px) so the fan
    // scales with the card itself, not the container.
    const { container } = render(
      <Hand hand={[0, 2, 5, 13, 18, 21]} visible={true} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    // First card has no marginLeft inline style at all (anchors the
    // fan). Asserting the empty string instead of '0px' avoids
    // brittleness around how React/jsdom serialise a numeric `0`.
    expect(slots[0]?.style.marginLeft).toBe('');
    // Every subsequent card has a non-percentage negative margin.
    for (let i = 1; i < slots.length; i++) {
      const ml = slots[i]?.style.marginLeft ?? '';
      expect(
        ml.endsWith('%'),
        `slot ${i} marginLeft "${ml}" must not be a percentage`,
      ).toBe(false);
      expect(ml.startsWith('-')).toBe(true);
    }
  });
});
