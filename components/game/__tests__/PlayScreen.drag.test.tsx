import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

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
  /**
   * jsdom doesn't implement `document.elementFromPoint`. The drop
   * handler in PlayScreen calls it to find the topmost element under
   * the pointer-up coordinates. We stub it to return a chosen
   * element, run the drag gesture (with microtask flushes so the
   * queueMicrotask-deferred effects commit before assertions), then
   * restore the original.
   */
  async function performDragWithDropTarget(
    cardBtn: HTMLElement,
    dropTarget: Element | null,
  ): Promise<void> {
    type DocWithEFP = Document & {
      elementFromPoint?: (x: number, y: number) => Element | null;
    };
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
      docWithEFP.elementFromPoint = originalEFP;
    }
  }

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
