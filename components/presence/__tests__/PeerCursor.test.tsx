import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PeerCursor, type PeerCursorState } from '../PeerCursor';

/**
 * Peer-cursor contract (#322). The component renders a tinted SVG arrow
 * at a normalized {x,y} position with a trailing nickname label that
 * fades after 1s of stillness. Interpolation between samples lives on
 * `requestAnimationFrame`; reduce-motion users get the snapped 4Hz
 * behaviour (no interpolation).
 */

function cursor(overrides: Partial<PeerCursorState> = {}): PeerCursorState {
  return {
    playerId: 'p2',
    name: 'Brae',
    color: '#4169e1',
    x: 0.25,
    y: 0.5,
    lastUpdateTs: 1000,
    ...overrides,
  };
}

describe('<PeerCursor>', () => {
  let rafCalls: ((t: number) => void)[] = [];

  beforeEach(() => {
    rafCalls = [];
    // ORDER MATTERS: useFakeTimers replaces raf with vitest's
    // sinon-backed clock. Stubbing raf AFTER useFakeTimers wins.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(0);
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: (t: number) => void): number => {
        rafCalls.push(cb);
        return rafCalls.length;
      },
    );
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function tickRaf(t = 16): void {
    const callbacks = rafCalls.splice(0);
    for (const cb of callbacks) cb(t);
  }

  it('renders a tinted SVG arrow at the peer position', () => {
    render(<PeerCursor cursor={cursor()} />);
    const node = screen.getByTestId('peer-cursor-p2');
    expect(node.getAttribute('style') ?? '').toContain('#4169e1');
    expect(node.getAttribute('data-player-id')).toBe('p2');
  });

  it('renders the nickname label initially (visible after recent movement)', () => {
    render(<PeerCursor cursor={cursor({ name: 'Brae' })} />);
    expect(screen.getByText('Brae')).toBeInTheDocument();
  });

  it('hides the label after 1s of stillness in motion-safe mode', () => {
    render(<PeerCursor cursor={cursor()} />);
    const label = screen.getByTestId('peer-cursor-label-p2');
    expect(label.getAttribute('data-stale')).toBe('false');
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(label.getAttribute('data-stale')).toBe('true');
  });

  it('snaps to the latest sample without rAF when reduceMotion is on', () => {
    const { rerender } = render(
      <PeerCursor cursor={cursor({ x: 0.1, y: 0.2 })} reduceMotion />,
    );
    const node = screen.getByTestId('peer-cursor-p2');
    expect(node.getAttribute('data-x')).toBe('0.1');

    // Update with a new sample. Reduce-motion should snap immediately
    // without consuming any raf frames.
    rerender(<PeerCursor cursor={cursor({ x: 0.7, y: 0.8 })} reduceMotion />);
    expect(node.getAttribute('data-x')).toBe('0.7');
    expect(rafCalls).toEqual([]);
  });

  it('interpolates toward the latest sample on each rAF tick (motion-safe)', () => {
    const { rerender } = render(
      <PeerCursor cursor={cursor({ x: 0, y: 0 })} />,
    );
    rerender(<PeerCursor cursor={cursor({ x: 1, y: 1 })} />);

    // First tick should land somewhere strictly between 0 and 1 — the
    // contract is "smoothing", not "snap on first frame".
    act(() => {
      tickRaf(16);
    });
    const node = screen.getByTestId('peer-cursor-p2');
    const x = parseFloat(node.getAttribute('data-x') ?? '0');
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(1);
  });
});
