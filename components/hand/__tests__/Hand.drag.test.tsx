import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { Hand } from '../Hand';

/**
 * #412 — drag-to-play integration tests on Hand. The pure state
 * machine is exhaustively covered by `card-drag-machine.test.ts`;
 * these tests verify the React wiring: pointer events route
 * through `useCardDrag`, drag effects fire the right callbacks,
 * and the click-suppression flag prevents double-dispatch when a
 * drop completes.
 */
describe('Hand — drag-to-play (#412)', () => {
  it('drag-start fires onCardDragStart with the dragged arcanum', async () => {
    const onCardDragStart = vi.fn();
    const { container } = render(
      <Hand hand={[5]} visible={true} onCardSelect={vi.fn()} onCardDragStart={onCardDragStart} />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 130, clientY: 200 });
    // Effects flush via queueMicrotask; one tick is enough.
    await Promise.resolve();
    expect(onCardDragStart).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('drop fires onCardDragEnd with arcanum and pointer-up coordinates', async () => {
    const onCardDragEnd = vi.fn();
    const { container } = render(
      <Hand hand={[5]} visible={true} onCardSelect={vi.fn()} onCardDragEnd={onCardDragEnd} />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 200, clientY: 250 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 220, clientY: 260 });
    await Promise.resolve();
    expect(onCardDragEnd).toHaveBeenCalledExactlyOnceWith(5, { x: 220, y: 260 });
  });

  it('a tap (no drag movement) does not fire drag callbacks', async () => {
    const onCardDragStart = vi.fn();
    const onCardDragEnd = vi.fn();
    const { container } = render(
      <Hand
        hand={[5]}
        visible={true}
        onCardSelect={vi.fn()}
        onCardDragStart={onCardDragStart}
        onCardDragEnd={onCardDragEnd}
      />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    // Movement of 1px is well under the 5px threshold — should stay
    // in `press` and resolve to a click on pointer-up.
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 101, clientY: 200 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 101, clientY: 200 });
    await Promise.resolve();
    expect(onCardDragStart).not.toHaveBeenCalled();
    expect(onCardDragEnd).not.toHaveBeenCalled();
  });

  it('after a drop the next synthesized click is suppressed (no double-fire)', async () => {
    // Why: real browsers dispatch a `click` event after pointer-up
    // even when the gesture moved across drag threshold. Without the
    // suppression flag the React onClick would fire `onCardSelect`
    // immediately after the drop already committed the play, which
    // would set a stale selectedCard in the parent.
    const onCardSelect = vi.fn();
    const onCardDragEnd = vi.fn();
    const { container } = render(
      <Hand hand={[5]} visible={true} onCardSelect={onCardSelect} onCardDragEnd={onCardDragEnd} />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 200, clientY: 250 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 220, clientY: 260 });
    await Promise.resolve();
    // Now simulate the synthesized click that the browser fires
    // after pointerup.
    fireEvent.click(card);
    expect(onCardDragEnd).toHaveBeenCalledTimes(1);
    expect(onCardSelect).not.toHaveBeenCalled();
    // A subsequent legitimate tap (no drag) still routes to
    // onCardSelect — the suppression is one-shot.
    fireEvent.click(card);
    expect(onCardSelect).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('drag-cancel from dragging fires onCardDragCancel and does NOT suppress the next legitimate tap', async () => {
    // Why "does NOT suppress": browsers don't synthesize a click
    // after `pointercancel` (only after a clean `pointerup`), so
    // there's nothing to suppress. Setting the flag on cancel would
    // eat the user's NEXT genuine tap. Real-world hit on mobile:
    // iOS scroll-capture cancels a tentative press, then the user
    // taps a second time intentionally — that tap must register.
    const onCardSelect = vi.fn();
    const onCardDragCancel = vi.fn();
    const { container } = render(
      <Hand
        hand={[5]}
        visible={true}
        onCardSelect={onCardSelect}
        onCardDragCancel={onCardDragCancel}
      />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 200, clientY: 250 });
    fireEvent.pointerCancel(card, { pointerId: 1 });
    await Promise.resolve();
    expect(onCardDragCancel).toHaveBeenCalledTimes(1);
    // The user's next tap must register. The synthesized click
    // would never arrive in a real browser after pointercancel —
    // we simulate the next FULL gesture (down + up below threshold)
    // and assert the click reaches onCardSelect.
    fireEvent.pointerDown(card, { pointerId: 2, clientX: 100, clientY: 200 });
    fireEvent.pointerUp(card, { pointerId: 2, clientX: 100, clientY: 200 });
    fireEvent.click(card);
    expect(onCardSelect).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('press-cancel (cancel before drag threshold) does NOT suppress the next tap (#412 regression)', async () => {
    // Real-world hit: iOS scroll-capture or any system gesture that
    // yanks the touch BEFORE the 5px drag threshold is crossed.
    // The state machine emits `drag-cancel` from the press state.
    // Hand must not set the click-suppression flag — that path
    // never produces a synthesized click in the browser, so the
    // flag has nothing to suppress and would silently eat the
    // user's next tap.
    const onCardSelect = vi.fn();
    const onCardDragCancel = vi.fn();
    const { container } = render(
      <Hand
        hand={[5]}
        visible={true}
        onCardSelect={onCardSelect}
        onCardDragCancel={onCardDragCancel}
      />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    // Press, no movement past threshold, then cancel — this is the
    // OS-yanks-the-touch scenario.
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerCancel(card, { pointerId: 1 });
    await Promise.resolve();
    expect(onCardDragCancel).toHaveBeenCalledTimes(1);
    // User taps again. The click that the browser synthesizes for
    // a clean tap (down + up below threshold) MUST register.
    fireEvent.pointerDown(card, { pointerId: 2, clientX: 100, clientY: 200 });
    fireEvent.pointerUp(card, { pointerId: 2, clientX: 100, clientY: 200 });
    fireEvent.click(card);
    expect(onCardSelect).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('marks the dragged card with data-dragging="true" while the gesture is live', async () => {
    const { container } = render(<Hand hand={[5, 9]} visible={true} onCardSelect={vi.fn()} />);
    const card5 = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    expect(card5.getAttribute('data-dragging')).toBe('false');
    // Wrap each fireEvent + microtask flush in `act` so React
    // processes the queued setState (which fires from a microtask
    // inside useCardDrag's dispatch). Without act, the
    // `data-dragging` attribute reads stale even though the state
    // has been updated — the DOM commit hasn't run.
    await act(async () => {
      fireEvent.pointerDown(card5, { pointerId: 1, clientX: 100, clientY: 200 });
      fireEvent.pointerMove(card5, { pointerId: 1, clientX: 200, clientY: 250 });
      await Promise.resolve();
    });
    expect(card5.getAttribute('data-dragging')).toBe('true');
    await act(async () => {
      fireEvent.pointerUp(card5, { pointerId: 1, clientX: 220, clientY: 260 });
      await Promise.resolve();
    });
    expect(card5.getAttribute('data-dragging')).toBe('false');
  });

  it('does not start tracking when not interactive (no onCardSelect)', async () => {
    const onCardDragStart = vi.fn();
    const { container } = render(
      <Hand
        hand={[5]}
        visible={true}
        // onCardSelect omitted → not interactive
        onCardDragStart={onCardDragStart}
      />,
    );
    const card = container.querySelector('[data-arcanum="5"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 200, clientY: 250 });
    await Promise.resolve();
    expect(onCardDragStart).not.toHaveBeenCalled();
  });
});
