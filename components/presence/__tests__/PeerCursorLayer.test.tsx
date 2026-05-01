import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeerCursorLayer } from '../PeerCursorLayer';
import type { PeerCursorSnapshot } from '@/lib/realtime/use-peer-presence';

/**
 * Acceptance criterion: "Mobile: peer taps render as tinted ripples
 * (no persistent cursor)." `PeerCursorLayer` decides which peer gets
 * the persistent-cursor render and which gets the ephemeral ripple.
 */

function snap(overrides: Partial<PeerCursorSnapshot> = {}): PeerCursorSnapshot {
  return {
    playerId: 'p2',
    x: 0.5,
    y: 0.5,
    viewport: { w: 1024, h: 768 },
    ts: 1000,
    receivedAt: 1000,
    ...overrides,
  };
}

describe('<PeerCursorLayer>', () => {
  beforeEach(() => {
    // Stub raf so the inner PeerCursor's effects don't dangle.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(0);
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders persistent cursors for desktop-class viewports', () => {
    const cursors = new Map<string, PeerCursorSnapshot>([
      ['p2', snap({ playerId: 'p2', viewport: { w: 1280, h: 800 } })],
    ]);
    render(
      <PeerCursorLayer
        cursors={cursors}
        nameByPlayerId={new Map([['p2', 'Brae']])}
        colorByPlayerId={new Map([['p2', '#4169e1']])}
      />,
    );
    expect(screen.getByTestId('peer-cursor-p2')).toBeInTheDocument();
    expect(screen.queryByTestId('tap-ripple-p2')).toBeNull();
  });

  it('renders a tap-ripple for phone-class viewports (no persistent arrow)', () => {
    const cursors = new Map<string, PeerCursorSnapshot>([
      ['p2', snap({ playerId: 'p2', viewport: { w: 390, h: 844 } })],
    ]);
    render(
      <PeerCursorLayer
        cursors={cursors}
        nameByPlayerId={new Map([['p2', 'Brae']])}
        colorByPlayerId={new Map([['p2', '#4169e1']])}
      />,
    );
    expect(screen.queryByTestId('peer-cursor-p2')).toBeNull();
    expect(screen.getByTestId('tap-ripple-p2')).toBeInTheDocument();
  });

  it('falls back to the trimmed playerId when no name is supplied', () => {
    const cursors = new Map<string, PeerCursorSnapshot>([
      ['unknown-player-abc', snap({ playerId: 'unknown-player-abc', viewport: { w: 1280, h: 800 } })],
    ]);
    render(
      <PeerCursorLayer
        cursors={cursors}
        nameByPlayerId={new Map()}
        colorByPlayerId={new Map()}
      />,
    );
    // The label uses the first 6 chars of the playerId on miss.
    expect(screen.getByText('unknow')).toBeInTheDocument();
  });
});
