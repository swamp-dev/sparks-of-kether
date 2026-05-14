import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Hand } from '../Hand';
import { isHandVisible } from '../visibility';
import { makePlayer, makeState } from '@/test/fixtures';

/**
 * Stub `window.matchMedia` to report a fixed `prefers-reduced-motion`
 * value. jsdom does not implement matchMedia by default, so the
 * `useReduceMotion` hook short-circuits to `false`. Tests that need to
 * exercise the reduced-motion branch swap in this stub before mounting.
 */
function stubMatchMedia(reduce: boolean): () => void {
  const original = window.matchMedia as unknown;
  const stub = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? reduce : false,
    media: query,
    onchange: null,
    // `useReduceMotion` only consumes the modern listener pair
    // (`addEventListener` / `removeEventListener`). The legacy
    // `addListener` / `removeListener` MediaQueryList shape was
    // dropped in #559 — keeping mocks for unused names hid the
    // contract.
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: stub,
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: original,
    });
  };
}

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

  it('fires onCardHover on mouseenter / mouseleave (#405)', () => {
    const onCardHover = vi.fn();
    const { container } = render(
      <Hand
        hand={[2, 5, 13]}
        visible={true}
        onCardSelect={vi.fn()}
        onCardHover={onCardHover}
      />,
    );
    const second = container.querySelector('[data-card-slot="1"]') as HTMLButtonElement;
    fireEvent.mouseEnter(second);
    expect(onCardHover).toHaveBeenLastCalledWith(5);
    fireEvent.mouseLeave(second);
    expect(onCardHover).toHaveBeenLastCalledWith(undefined);
  });

  it('fires onCardHover on focus / blur (keyboard + touch path) (#405)', () => {
    const onCardHover = vi.fn();
    const { container } = render(
      <Hand
        hand={[2, 5, 13]}
        visible={true}
        onCardSelect={vi.fn()}
        onCardHover={onCardHover}
      />,
    );
    const third = container.querySelector('[data-card-slot="2"]') as HTMLButtonElement;
    third.focus();
    expect(onCardHover).toHaveBeenLastCalledWith(13);
    third.blur();
    expect(onCardHover).toHaveBeenLastCalledWith(undefined);
  });

  it('does not fire onCardHover when hand is hidden (#405)', () => {
    // Hidden hands MUST NOT leak the arcanum via hover — the onCardHover
    // callback would otherwise pass it back to the consumer (which then
    // could put it in the DOM via highlightedCard, leaking to other
    // players in a multiplayer view).
    const onCardHover = vi.fn();
    const { container } = render(
      <Hand
        hand={[2, 5]}
        visible={false}
        onCardHover={onCardHover}
      />,
    );
    const slot = container.querySelector('[data-card-slot="0"]') as HTMLButtonElement;
    fireEvent.mouseEnter(slot);
    fireEvent.focus(slot);
    expect(onCardHover).not.toHaveBeenCalled();
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

describe('Hand — Mac-dock magnification (#463)', () => {
  // Default suite runs without reduced-motion (jsdom has no matchMedia,
  // so useReduceMotion returns false). These tests exercise the
  // magnify-on path. The reduced-motion suite below stubs matchMedia.

  it('hovered card carries data-magnified="true"; siblings stay false', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLButtonElement>;
    const [first, middle, last] = slots;
    if (!first || !middle || !last) throw new Error('expected three slots');
    fireEvent.mouseEnter(middle);
    expect(middle.getAttribute('data-magnified')).toBe('true');
    expect(first.getAttribute('data-magnified')).toBe('false');
    expect(last.getAttribute('data-magnified')).toBe('false');
  });

  it('mouseleave clears the magnification on the previously hovered card', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    fireEvent.mouseEnter(middle);
    expect(middle.getAttribute('data-magnified')).toBe('true');
    fireEvent.mouseLeave(middle);
    expect(middle.getAttribute('data-magnified')).toBe('false');
  });

  it('keyboard focus magnifies the focused card the same as hover', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    // fireEvent.focus / blur (rather than el.focus()) so RTL's
    // auto-act wrapper flushes the state update before the assertion.
    fireEvent.focus(middle);
    expect(middle.getAttribute('data-magnified')).toBe('true');
    fireEvent.blur(middle);
    expect(middle.getAttribute('data-magnified')).toBe('false');
  });

  it('magnified card stacks above unselected and above selected (#340 + #463)', () => {
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} selectedArcanum={13} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const [first, middle, last] = slots;
    if (!first || !middle || !last) throw new Error('expected three slots');
    // Hover the middle (unselected) card. Last is the selected one.
    fireEvent.mouseEnter(middle);
    const middleZ = parseInt(middle.style.zIndex || '0', 10);
    const lastZ = parseInt(last.style.zIndex || '0', 10);
    const firstZ = parseInt(first.style.zIndex || '0', 10);
    expect(middleZ).toBeGreaterThan(lastZ);
    expect(middleZ).toBeGreaterThan(firstZ);
  });

  it('hovered card scales to MAGNIFY_SCALE (1.12) in-place with 18 px lift; no centering translateX', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    fireEvent.mouseEnter(middle);
    expect(middle.style.transform).toMatch(/scale\(1\.12\)/);
    expect(middle.style.transform).toMatch(/translateY\(-18px\)/);
    expect(middle.style.transform).not.toMatch(/translateX\([^)]+px\)/);
  });

  it('hovered card runs at ~75% opacity so the matching Tree path glow shows through (#579)', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    expect(middle.style.opacity).toBe('');
    fireEvent.mouseEnter(middle);
    expect(middle.style.opacity).toBe('0.75');
  });

  it('open hand mounts as a position-fixed overlay anchored to the viewport bottom (#579)', () => {
    // Pre-#579 the open hand was inline-flow at the bottom of the
    // Tree column under the #411 fit-on-screen budget. #579 promotes
    // it to a fixed-position overlay so the Tree gets the full
    // column and the hand floats above it. Pin the contract: the
    // outer `[data-hand][data-hand-state="open"]` element carries
    // the `fixed`, `inset-x-0`, `bottom-0` Tailwind utilities, and
    // an inner `[data-hand-fan]` carries the actual fan layout.
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} />,
    );
    const hand = container.querySelector('[data-hand]');
    expect(hand?.getAttribute('data-hand-state')).toBe('open');
    const cls = hand?.getAttribute('class') ?? '';
    expect(cls).toMatch(/\bfixed\b/);
    expect(cls).toMatch(/\binset-x-0\b/);
    expect(cls).toMatch(/\bbottom-0\b/);
    // Pointer-events: none on outer so empty space passes clicks
    // through to the Tree below.
    expect(cls).toMatch(/pointer-events-none/);
    const fan = hand?.querySelector('[data-hand-fan]');
    expect(fan, 'fan child present').not.toBeNull();
    // Pointer-events re-enabled on the fan itself so the cards take
    // events.
    const fanCls = fan?.getAttribute('class') ?? '';
    expect(fanCls).toMatch(/pointer-events-auto/);
  });

  it('floating outer wrapper has no overflow clip — viewport is the natural boundary', () => {
    // The peek-shelf design keeps the fan at full size, so the viewport
    // edge is the natural clip. No overflow-x-clip on the outer wrapper.
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const hand = container.querySelector('[data-hand]');
    const handCls = hand?.getAttribute('class') ?? '';
    expect(handCls).not.toMatch(/\boverflow-x-clip\b/);
    expect(handCls).not.toMatch(/\boverflow-x-hidden\b/);
  });

  it('peek-shelf: fan translateY at rest peeks 72 px above viewport bottom', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const fan = container.querySelector('[data-hand-fan]') as HTMLElement;
    expect(fan.style.transform).toBe('translateY(calc(100% - 72px))');
  });

  it('peek-shelf: mouseenter on the fan reveals it with translateY(0)', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const fan = container.querySelector('[data-hand-fan]') as HTMLElement;
    fireEvent.mouseEnter(fan);
    expect(fan.style.transform).toBe('translateY(0)');
  });

  it('peek-shelf: mouseleave does NOT immediately hide — grace-period timer not yet fired', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const fan = container.querySelector('[data-hand-fan]') as HTMLElement;
    fireEvent.mouseEnter(fan);
    fireEvent.mouseLeave(fan);
    // Synchronously after mouseleave the hand is still expanded — the
    // 120 ms grace-period timer has not fired yet.
    expect(fan.style.transform).toBe('translateY(0)');
  });

  it('peek-shelf: drag keeps hand expanded even after mouseleave', async () => {
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} onCardSelect={vi.fn()} />,
    );
    const fan = container.querySelector('[data-hand-fan]') as HTMLElement;
    const card = container.querySelector('[data-card-slot="0"]') as HTMLButtonElement;

    // Expand the hand, then trigger a drag (move > 5 px DRAG_THRESHOLD_PX).
    // The drag-start effect is dispatched via queueMicrotask, so wrap in
    // act(async) to flush the microtask before asserting.
    fireEvent.mouseEnter(fan);
    await act(async () => {
      fireEvent.pointerDown(card, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(card, { clientX: 10, clientY: 0, pointerId: 1 });
    });
    expect(card.getAttribute('data-dragging')).toBe('true');

    // Mouse leaves the fan during the drag — hand must stay expanded.
    fireEvent.mouseLeave(fan);
    expect(fan.style.transform).toBe('translateY(0)');
  });

  it('peek-shelf: keyboard focus on a card expands the fan (AC: Tab → hand expands)', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} onCardSelect={vi.fn()} />);
    const fan = container.querySelector('[data-hand-fan]') as HTMLElement;
    const card = container.querySelector('[data-card-slot="0"]') as HTMLButtonElement;
    expect(fan.style.transform).toBe('translateY(calc(100% - 72px))');
    fireEvent.focus(card);
    expect(fan.style.transform).toBe('translateY(0)');
  });

  it('peek-shelf: grace-period timer hides the fan after 120 ms', () => {
    vi.useFakeTimers();
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const fan = container.querySelector('[data-hand-fan]') as HTMLElement;
    fireEvent.mouseEnter(fan);
    expect(fan.style.transform).toBe('translateY(0)');
    fireEvent.mouseLeave(fan);
    // Before timer fires — still expanded.
    expect(fan.style.transform).toBe('translateY(0)');
    act(() => { vi.advanceTimersByTime(120); });
    // After grace period — fan slides back down.
    expect(fan.style.transform).toBe('translateY(calc(100% - 72px))');
    vi.useRealTimers();
  });

  it('immediate neighbours of the magnified card translate outward', () => {
    const { container } = render(
      <Hand hand={[2, 5, 13, 18, 21]} visible={true} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const middle = slots[2]; // index 2, 5-card hand → centre card
    const left = slots[1];
    const right = slots[3];
    if (!middle || !left || !right) throw new Error('expected five slots');
    fireEvent.mouseEnter(middle);
    // Left neighbour should translateX in the negative direction (push
    // left); right neighbour should translateX positive (push right).
    expect(left.style.transform).toMatch(/translateX\(-/);
    expect(right.style.transform).toMatch(/translateX\(0?\.?\d+rem\)/);
  });

  it('magnified card gets a box-shadow lift; siblings do not', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const [first, middle] = slots;
    if (!first || !middle) throw new Error('expected slots');
    fireEvent.mouseEnter(middle);
    expect(middle.style.boxShadow).not.toBe('');
    expect(first.style.boxShadow).toBe('');
  });

  it('hover on a hidden hand does NOT magnify (face-down, no visual lift)', () => {
    const { container } = render(<Hand hand={[2, 5]} visible={false} />);
    const first = container.querySelector(
      '[data-card-slot="0"]',
    ) as HTMLButtonElement;
    fireEvent.mouseEnter(first);
    expect(first.getAttribute('data-magnified')).toBe('false');
    expect(first.style.transform).not.toMatch(/scale\(/);
  });

  it('hover wins over focus when both are present', () => {
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLButtonElement>;
    const [first, middle, last] = slots;
    if (!first || !middle || !last) throw new Error('expected three slots');
    // First the keyboard focuses the last card. fireEvent (not native
    // .focus()) so RTL's auto-act flushes the state update.
    fireEvent.focus(last);
    expect(last.getAttribute('data-magnified')).toBe('true');
    // Now the mouse hovers the middle card. Hover wins.
    fireEvent.mouseEnter(middle);
    expect(middle.getAttribute('data-magnified')).toBe('true');
    expect(last.getAttribute('data-magnified')).toBe('false');
    // When the mouse leaves middle, the keyboard-focused last reasserts.
    fireEvent.mouseLeave(middle);
    expect(middle.getAttribute('data-magnified')).toBe('false');
    expect(last.getAttribute('data-magnified')).toBe('true');
    // Round-trip the focus exit: blur clears the keyboard magnify
    // even after a hover-then-leave dance. Pins that hover state
    // didn't leak into the focus state machine.
    fireEvent.blur(last);
    expect(last.getAttribute('data-magnified')).toBe('false');
  });

  it('transition is scoped to cards participating in the magnify (not unrelated cards)', () => {
    // Without scoping, every card carries the magnify transition on
    // every render, which animates the base fan transform whenever
    // *any* state changes (focusIndex, selection, open toggle). Scope
    // the transition to the active card + immediate + near neighbours
    // so unrelated cards don't repaint their compositor layer.
    const { container } = render(
      <Hand hand={[2, 5, 13, 18, 21, 0]} visible={true} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    // Hover the leftmost card (index 0). Cards 1 (immediate) and 2
    // (near) participate in the magnify; cards 3, 4, 5 do not.
    const first = slots[0];
    const farLast = slots[5];
    if (!first || !farLast) throw new Error('expected six slots');
    fireEvent.mouseEnter(first);
    expect(first.style.transition).not.toBe('');
    expect(farLast.style.transition).toBe('');
  });

  it('exit transition persists for one render after mouseLeave (no snap-back)', () => {
    // CSS transitions only fire when the `transition` property is
    // present *before* the style change. If we drop both the transform
    // and the transition in the same render, the exit animation is
    // skipped — the active card snaps from scale(1.3) → scale(1.0)
    // and neighbours snap their translateX back to zero. The fix is
    // to track the previous render's `activeIndex` and keep the
    // transition on cards that *were* in the magnify set even if
    // they aren't now. This pins that the magnified card retains its
    // transition for the render after mouseLeave so the exit eases.
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    fireEvent.mouseEnter(middle);
    expect(middle.style.transition).not.toBe('');
    fireEvent.mouseLeave(middle);
    // Critical assertion: even after the active state has cleared,
    // the previously-active card still carries the transition so the
    // scale(1.3) → scale(1.0) drop animates rather than snaps.
    expect(middle.style.transition).not.toBe('');
  });

  it('exit transition is cleared one render after mouseLeave when another card becomes active (#558)', () => {
    // Pair to the persists-for-one-render test above: that test pins
    // the entry half of the prev-active invariant (transition stays on
    // the cleanup render so the exit eases). This one pins the exit
    // half — the transition must NOT linger forever. Once a render
    // happens where the originally-magnified card is in neither
    // `inMagnifySet` (no longer active) nor `prevInMagnifySet` (the
    // previous render's active set has moved on), the inline
    // transition style should be back to empty so unrelated state
    // changes don't trigger a phantom animation on stale cards. In
    // production this is self-correcting, but a regression — e.g. the
    // post-commit effect tracking prev-active dropping the
    // `activeIndex === undefined` case — would silently keep stale
    // transitions around. This test catches that.
    //
    // Six-card hand so the originally-magnified card and the newly-
    // active card are far enough apart that their ±2 magnify
    // neighbour sets are disjoint. Hovering slot 0 magnifies {0,1,2};
    // after mouseLeave + mouseEnter on slot 5, the magnify set
    // becomes {3,4,5} with an empty prev-set (the post-leave render
    // had no active card). Slot 0 then belongs to neither set, so
    // its inline transition should be back to empty.
    const { container } = render(
      <Hand hand={[2, 5, 13, 18, 21, 0]} visible={true} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLButtonElement>;
    const first = slots[0];
    const farLast = slots[5];
    if (!first || !farLast) throw new Error('expected six slots');
    fireEvent.mouseEnter(first);
    expect(first.style.transition).not.toBe('');
    fireEvent.mouseLeave(first);
    // Persists-for-one-render contract still holds at this point —
    // covered by the test above. Now force a fresh render with a
    // different active card whose magnify set excludes slot 0.
    fireEvent.mouseEnter(farLast);
    expect(first.style.transition).toBe('');
  });

  it('focus-visible ring class is present on every slot (load-bearing under reduce-motion)', () => {
    // The keyboard focus indicator must remain visible regardless of
    // motion preference — it's the load-bearing way a keyboard user
    // identifies the focused card. The CSS `:focus-visible` ring is
    // declared via Tailwind utility classes on the button itself, so
    // we assert the class is present (DOM-level) and trust browsers to
    // honour `:focus-visible`.
    const { container } = render(<Hand hand={[2, 5]} visible={true} />);
    const slots = container.querySelectorAll('[data-card-slot]');
    for (const slot of slots) {
      const cls = slot.getAttribute('class') ?? '';
      expect(cls).toMatch(/focus-visible:ring-2/);
      expect(cls).toMatch(/focus-visible:ring-illumination/);
    }
  });
});

describe('Hand — magnification under prefers-reduced-motion (#463)', () => {
  let restoreMatchMedia: (() => void) | undefined;

  afterEach(() => {
    restoreMatchMedia?.();
    restoreMatchMedia = undefined;
  });

  it('skips the scale transform on hover when reduced-motion is set', () => {
    restoreMatchMedia = stubMatchMedia(true);
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    fireEvent.mouseEnter(middle);
    // data-magnified still flips so consumers / tests can still
    // observe the active state, but no scale transform applies.
    expect(middle.getAttribute('data-magnified')).toBe('true');
    expect(middle.style.transform).not.toMatch(/scale\(/);
  });

  it('skips neighbour translateX nudge under reduced-motion', () => {
    restoreMatchMedia = stubMatchMedia(true);
    const { container } = render(
      <Hand hand={[2, 5, 13, 18, 21]} visible={true} />,
    );
    const slots = container.querySelectorAll(
      '[data-card-slot]',
    ) as NodeListOf<HTMLElement>;
    const middle = slots[2];
    const left = slots[1];
    if (!middle || !left) throw new Error('expected slots');
    fireEvent.mouseEnter(middle);
    // The base transform contains rotate + translateY but never
    // translateX. Asserting absence of translateX pins the no-nudge
    // contract under reduced-motion.
    expect(left.style.transform).not.toMatch(/translateX\(/);
  });

  it('omits the transform/opacity/box-shadow transition under reduced-motion', () => {
    restoreMatchMedia = stubMatchMedia(true);
    const { container } = render(<Hand hand={[2, 5]} visible={true} />);
    const first = container.querySelector(
      '[data-card-slot="0"]',
    ) as HTMLElement;
    // No transition string written inline → no animated motion.
    expect(first.style.transition).toBe('');
  });

  it('does NOT animate opacity / box-shadow on hover under reduced-motion (#579 review)', () => {
    // First-pass review of #579 caught a regression: when opacity
    // was added to MAGNIFY_TRANSITION, the `!reduceMotion` gate on
    // the `transition` style was dropped. Reduced-motion users
    // would still see the box-shadow flash + opacity fade on hover
    // even though the AC says "preserve the opacity *value*", not
    // "animate the opacity transition." The fix restores the gate.
    // Pin the contract: hover the card under reduced-motion → no
    // transition string set inline.
    restoreMatchMedia = stubMatchMedia(true);
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const middle = container.querySelector(
      '[data-card-slot="1"]',
    ) as HTMLButtonElement;
    fireEvent.mouseEnter(middle);
    expect(middle.style.transition).toBe('');
    // Opacity value is still preserved — the path-through-card
    // visual is a11y-load-bearing.
    expect(middle.style.opacity).toBe('0.75');
  });

  it('layout="inline" renders the open hand without the position-fixed overlay (#579 review)', () => {
    // The /demo/hand showcase renders three Hand instances stacked
    // vertically. Pre-fix, all three rendered as
    // `fixed inset-x-0 bottom-0 z-30` overlays and collided at the
    // same viewport position. The `layout="inline"` opt-out keeps
    // the open hand inline-flow for embedded contexts.
    const { container } = render(
      <Hand hand={[2, 5, 13]} visible={true} layout="inline" />,
    );
    const hand = container.querySelector('[data-hand]');
    const cls = hand?.getAttribute('class') ?? '';
    expect(cls).not.toMatch(/\bfixed\b/);
    expect(cls).not.toMatch(/\binset-x-0\b/);
    expect(cls).not.toMatch(/pointer-events-none/);
    expect(hand?.getAttribute('data-layout')).toBe('inline');
    // Inline-mode fan has no peek-shelf translateY — the fan is always
    // fully visible in inline layout (no fixed overlay, no slide animation).
    const fan = hand?.querySelector('[data-hand-fan]') as HTMLElement;
    expect(fan.style.transform ?? '').toBe('');
  });

  it('still renders the focus-visible ring class under reduced-motion', () => {
    restoreMatchMedia = stubMatchMedia(true);
    const { container } = render(<Hand hand={[2, 5]} visible={true} />);
    const first = container.querySelector('[data-card-slot="0"]');
    const cls = first?.getAttribute('class') ?? '';
    expect(cls).toMatch(/focus-visible:ring-2/);
  });

  it('peek-shelf: fan is fully revealed at rest under reduced-motion (AC: always fully visible)', () => {
    restoreMatchMedia = stubMatchMedia(true);
    const { container } = render(<Hand hand={[2, 5, 13]} visible={true} />);
    const hand = container.querySelector('[data-hand]') as HTMLElement;
    const fan = hand?.querySelector('[data-hand-fan]') as HTMLElement;
    expect(fan.style.transform).toBe('translateY(0)');
  });
});
