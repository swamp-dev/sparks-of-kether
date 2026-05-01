import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TargetRing, type PeerTarget } from '../TargetRing';

/**
 * Targeted-node-ring contract (#322). When peers broadcast a Sefirah
 * target, a thin ring tinted with the peer's color renders around the
 * node. Multiple peers targeting the same node stack with offsets so
 * each peer's ring stays distinguishable.
 */

const NODE_POSITIONS = {
  tiferet: { x: 200, y: 340 },
  yesod: { x: 200, y: 490 },
  malkuth: { x: 200, y: 560 },
} as const;

function target(overrides: Partial<PeerTarget> = {}): PeerTarget {
  return {
    playerId: 'p2',
    nodeId: 'tiferet',
    color: '#dc143c',
    ...overrides,
  };
}

describe('<TargetRing>', () => {
  it('renders a ring for each peer with a non-null target', () => {
    render(
      <TargetRing
        targets={[target({ playerId: 'p2', nodeId: 'tiferet' })]}
        nodePositions={NODE_POSITIONS}
      />,
    );
    expect(screen.getByTestId('target-ring-p2')).toBeInTheDocument();
  });

  it('skips peers whose nodeId is null', () => {
    render(
      <TargetRing
        targets={[target({ playerId: 'p2', nodeId: null })]}
        nodePositions={NODE_POSITIONS}
      />,
    );
    expect(screen.queryByTestId('target-ring-p2')).toBeNull();
  });

  it('positions each ring on its target node', () => {
    render(
      <TargetRing
        targets={[target({ playerId: 'p2', nodeId: 'tiferet' })]}
        nodePositions={NODE_POSITIONS}
      />,
    );
    const ring = screen.getByTestId('target-ring-p2');
    expect(ring.getAttribute('cx')).toBe('200');
    expect(ring.getAttribute('cy')).toBe('340');
  });

  it('tints each ring with the peer color (stroke attribute)', () => {
    render(
      <TargetRing
        targets={[target({ playerId: 'p2', color: '#dc143c' })]}
        nodePositions={NODE_POSITIONS}
      />,
    );
    expect(screen.getByTestId('target-ring-p2').getAttribute('stroke')).toBe(
      '#dc143c',
    );
  });

  it('stacks multiple peers on the same node with progressively-larger radii', () => {
    render(
      <TargetRing
        targets={[
          target({ playerId: 'p2', nodeId: 'tiferet', color: '#dc143c' }),
          target({ playerId: 'p3', nodeId: 'tiferet', color: '#228b22' }),
          target({ playerId: 'p4', nodeId: 'tiferet', color: '#4169e1' }),
        ]}
        nodePositions={NODE_POSITIONS}
      />,
    );
    const r2 = parseFloat(
      screen.getByTestId('target-ring-p2').getAttribute('r') ?? '0',
    );
    const r3 = parseFloat(
      screen.getByTestId('target-ring-p3').getAttribute('r') ?? '0',
    );
    const r4 = parseFloat(
      screen.getByTestId('target-ring-p4').getAttribute('r') ?? '0',
    );
    // Strictly increasing — the offsets keep concentric rings visible.
    expect(r2).toBeLessThan(r3);
    expect(r3).toBeLessThan(r4);
  });

  it('caps to four simultaneous rings even when more peers target the same node', () => {
    render(
      <TargetRing
        targets={[
          target({ playerId: 'p1', nodeId: 'tiferet' }),
          target({ playerId: 'p2', nodeId: 'tiferet' }),
          target({ playerId: 'p3', nodeId: 'tiferet' }),
          target({ playerId: 'p4', nodeId: 'tiferet' }),
          target({ playerId: 'p5', nodeId: 'tiferet' }),
        ]}
        nodePositions={NODE_POSITIONS}
      />,
    );
    expect(screen.queryAllByTestId(/target-ring-/)).toHaveLength(4);
  });

  it('strips data-breath when reduceMotion is set (rings stay static)', () => {
    render(
      <TargetRing
        targets={[target()]}
        nodePositions={NODE_POSITIONS}
        reduceMotion
      />,
    );
    const ring = screen.getByTestId('target-ring-p2');
    expect(ring.getAttribute('data-breath')).toBe('false');
  });
});
