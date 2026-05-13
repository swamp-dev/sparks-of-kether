import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

// `Document.elementFromPoint` is declared non-optional in lib.dom.d.ts,
// so a plain `Document & { elementFromPoint?: ... }` intersection keeps
// it required — and `delete` rejects required properties under strict
// mode. Omit first, then re-add as optional.
type DocWithEFP = Omit<Document, 'elementFromPoint'> & {
  elementFromPoint?: (x: number, y: number) => Element | null;
};

/**
 * jsdom doesn't implement `document.elementFromPoint`. The drop
 * handler in PlayScreen calls it to find the topmost element under
 * the pointer-up coordinates. We stub it to return a chosen
 * element, run the drag gesture (with microtask flushes so the
 * queueMicrotask-deferred effects commit before assertions), then
 * restore the original.
 *
 * Shared by both `drag-to-play` (#412) and `drag-to-discard` (#462)
 * describes — the gesture shape is identical; only the drop target
 * differs.
 */
async function performDragWithDropTarget(
  cardBtn: HTMLElement,
  dropTarget: Element | null,
): Promise<void> {
  const docWithEFP = document as DocWithEFP;
  const originalEFP = docWithEFP.elementFromPoint;
  docWithEFP.elementFromPoint = (): Element | null => dropTarget;
  try {
    await act(async () => {
      fireEvent.pointerDown(cardBtn, {
        pointerId: 1,
        clientX: 100,
        clientY: 600,
      });
      fireEvent.pointerMove(cardBtn, {
        pointerId: 1,
        clientX: 220,
        clientY: 300,
      });
      await Promise.resolve();
      fireEvent.pointerUp(cardBtn, {
        pointerId: 1,
        clientX: 220,
        clientY: 300,
      });
      // Two microtask flushes: the drop effect's queueMicrotask
      // dispatches into the parent's onCardDragEnd, which itself
      // queueMicrotasks the announcement.
      await Promise.resolve();
      await Promise.resolve();
    });
  } finally {
    // jsdom default: property was never set, so delete the own stub
    // rather than assigning `undefined` back and leaving a phantom
    // own-property.
    if (originalEFP === undefined) {
      delete docWithEFP.elementFromPoint;
    } else {
      docWithEFP.elementFromPoint = originalEFP;
    }
  }
}

/**
 * #412 — drag-to-play integration. Verifies that a drag gesture on a
 * card that ends over a matching Tree-path drop zone dispatches
 * `turn.move` exactly the same way click-then-click does, and that
 * a drag ending over the wrong path or empty space announces via the
 * aria-live region without dispatching anything.
 *
 * The pure machine + Hand wiring are covered separately. This test
 * stitches the layers together: pointer events on a card, then the
 * `elementFromPoint` hit-test against a Tree path's drop zone, then
 * the `turn.move` dispatch.
 */
describe('PlayScreen — drag-to-play (#412)', () => {
  it('dropping a card on its matching path advances the player', async () => {
    // Set up: active player at Malkuth, hand=[21], yesod cleared so
    // path 32 (arcanum 21, Malkuth↔Yesod) lands directly in 'end'.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? {
            ...p,
            position: 'malkuth' as const,
            hand: [21],
            clearedSefirot: new Set([...p.clearedSefirot, 'yesod' as const]),
          }
        : p,
    );
    const state = { ...base, players };
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const main = container.querySelector('[data-play-screen]');
    expect(main?.getAttribute('data-phase')).toBe('move');

    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="21"]',
    ) as HTMLElement;
    const path32Hit = container.querySelector(
      '[data-drop-zone="path-32"]',
    ) as Element;
    expect(path32Hit, 'path-32 drop zone in DOM').toBeTruthy();

    await performDragWithDropTarget(cardBtn, path32Hit);

    // Move resolved → phase has left 'move'. Yesod was pre-cleared
    // so the post-move challenge phase doesn't fire and we land
    // directly in 'end'.
    expect(main?.getAttribute('data-phase')).not.toBe('move');
  });

  it('dropping a card on a non-matching path announces rejection without dispatching', async () => {
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? { ...p, position: 'malkuth' as const, hand: [21] } // arcanum 21 only matches path 32
        : p,
    );
    const state = { ...base, players };
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="21"]',
    ) as HTMLElement;
    const path31Hit = container.querySelector(
      '[data-drop-zone="path-31"]',
    ) as Element;
    expect(path31Hit).toBeTruthy();

    await performDragWithDropTarget(cardBtn, path31Hit);

    const main = container.querySelector('[data-play-screen]');
    expect(main?.getAttribute('data-phase')).toBe('move');
    const liveRegion = container.querySelector('[data-drag-announcement]');
    expect(liveRegion?.textContent ?? '').toMatch(/cannot|that path/i);
  });

  it('dropping a card outside any drop zone announces rejection without dispatching', async () => {
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx ? { ...p, position: 'malkuth' as const, hand: [21] } : p,
    );
    const state = { ...base, players };
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="21"]',
    ) as HTMLElement;

    // Drop target is the document body — no `[data-drop-zone]`
    // ancestor.
    await performDragWithDropTarget(cardBtn, document.body);

    const main = container.querySelector('[data-play-screen]');
    expect(main?.getAttribute('data-phase')).toBe('move');
    const liveRegion = container.querySelector('[data-drag-announcement]');
    expect(liveRegion?.textContent ?? '').toMatch(/no path|tree path/i);
  });
});

describe('PlayScreen — drag-to-discard (#462)', () => {
  it('dropping a card on the discard pile during pendingDiscard discards the card', async () => {
    // Set up: active player has been over-cap-Meditate'd into a
    // pendingDiscard state. The simplest fixture: hand of 8 cards
    // with `pendingDiscard.count = 1`. Engine accepts `discard` and
    // decrements `pendingDiscard.count`.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? { ...p, hand: [2, 5, 13, 18, 21] }
        : p,
    );
    // pendingDiscard count=1: one card needs to be shed.
    const state = {
      ...base,
      players,
      phase: 'end' as const,
      pendingDiscard: { count: 1, requiredBy: 'end-of-turn' as const },
    };
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="2"]',
    ) as HTMLElement;
    const pile = container.querySelector('[data-drop-zone="discard"]') as Element;
    expect(pile, 'discard drop zone in DOM').toBeTruthy();
    // #587 pre-condition: while `pendingDiscard.count > 0`, PlayScreen
    // mounts `<DiscardPrompt>` (PlayScreen.tsx ~L772 gates this on
    // `pendingDiscardCount > 0`). The prompt is the visible signal
    // that the engine has unsatisfied pendingDiscard state.
    expect(
      container.querySelector('[data-discard-prompt]'),
      'DiscardPrompt mounted while pendingDiscard.count > 0',
    ).toBeTruthy();

    const initialCount = container.querySelector('[data-discard-count]')?.textContent;
    await performDragWithDropTarget(cardBtn, pile);

    // pendingDiscard cleared (count=0) → engine accepted the discard.
    // The discard pile count went up by one.
    const finalCount = container.querySelector('[data-discard-count]')?.textContent;
    expect(Number(finalCount)).toBe(Number(initialCount) + 1);
    // Card 2 is no longer in the active player's hand.
    expect(
      container.querySelector('[data-card-slot][data-arcanum="2"]'),
    ).toBeNull();
    // #587: direct assertion that engine-state `pendingDiscard.count`
    // went from 1 → 0 after the discard. The DiscardPrompt unmounts
    // when `pendingDiscardCount > 0` becomes false, so its absence
    // proves the engine cleared the pendingDiscard. Closes the loop
    // on the "turn-state updated" half of the #462 acceptance.
    expect(
      container.querySelector('[data-discard-prompt]'),
      'DiscardPrompt unmounted after pendingDiscard cleared',
    ).toBeNull();
  });

  it('dropping a card on the discard pile outside pendingDiscard announces rejection without dispatching', async () => {
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: [2, 5, 13] } : p,
    );
    // No pendingDiscard — turn is in normal `move` phase.
    const state = { ...base, players };
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="2"]',
    ) as HTMLElement;
    const pile = container.querySelector('[data-drop-zone="discard"]') as Element;
    expect(pile).toBeTruthy();

    const initialCount = container.querySelector('[data-discard-count]')?.textContent;
    await performDragWithDropTarget(cardBtn, pile);

    // Pile count unchanged.
    const finalCount = container.querySelector('[data-discard-count]')?.textContent;
    expect(finalCount).toBe(initialCount);
    // Card 2 still in hand.
    expect(
      container.querySelector('[data-card-slot][data-arcanum="2"]'),
    ).not.toBeNull();
    // Aria-live announced rejection.
    const liveRegion = container.querySelector('[data-drag-announcement]');
    expect(liveRegion?.textContent ?? '').toMatch(/over the hand cap|don't need to discard/i);
  });

  it('discard pile lights up while a card is being dragged (data-drag-active)', async () => {
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx ? { ...p, hand: [2, 5, 13] } : p,
    );
    const state = { ...base, players };
    const { container } = render(
      <PlayScreen initialState={state} rng={seededRng(2)} />,
    );

    const pile = container.querySelector('[data-discard-pile]') as HTMLElement;
    // At rest, drag-active is false.
    expect(pile.getAttribute('data-drag-active')).toBe('false');

    // Start a drag (without releasing) — the pile should light up.
    const cardBtn = container.querySelector(
      '[data-card-slot][data-arcanum="2"]',
    ) as HTMLElement;
    await act(async () => {
      fireEvent.pointerDown(cardBtn, { pointerId: 1, clientX: 100, clientY: 600 });
      fireEvent.pointerMove(cardBtn, { pointerId: 1, clientX: 220, clientY: 300 });
      await Promise.resolve();
    });
    expect(pile.getAttribute('data-drag-active')).toBe('true');

    // Releasing (pointerCancel — no drop) clears it.
    await act(async () => {
      fireEvent.pointerCancel(cardBtn, { pointerId: 1 });
      await Promise.resolve();
    });
    expect(pile.getAttribute('data-drag-active')).toBe('false');
  });
});
