'use client';

import type { SefirahKey } from '@/data';

/**
 * TargetRing — concentric tinted rings drawn around a Sefirah node
 * when peers focus / hover that node, for #322.
 *
 * Renders as `<circle>` elements meant to be slotted directly into the
 * TreeBoard's SVG (or any SVG using the same node-coordinate system).
 * Each peer gets one ring; multiple peers targeting the same node
 * stack with progressively-larger radii so each is visible.
 *
 * Capped at four rings — beyond that the visual density obliterates
 * the node itself. This matches the `MAX_VISIBLE` cap on the avatar
 * stack so the chrome stays consistent.
 *
 * Reduce-motion: drops the breath animation by setting
 * `data-breath="false"`. The ring stays visible but static — peers
 * can still see who is targeting what.
 */

const MAX_RINGS = 4;
const NODE_RADIUS = 28;
const RING_BASE_OFFSET = 6;
const RING_STEP = 4;
const RING_STROKE_WIDTH = 2;

export interface PeerTarget {
  readonly playerId: string;
  readonly nodeId: SefirahKey | null;
  readonly color: string;
}

export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

export interface TargetRingProps {
  readonly targets: readonly PeerTarget[];
  /** Map from Sefirah key → SVG-coord centre. Caller supplies. */
  readonly nodePositions: Readonly<Partial<Record<SefirahKey, NodePosition>>>;
  readonly reduceMotion?: boolean;
}

export function TargetRing({
  targets,
  nodePositions,
  reduceMotion = false,
}: TargetRingProps): JSX.Element | null {
  // Filter to the peers actually targeting a node; group by node so
  // we know what concentric-offset to apply to each ring.
  const active = targets.filter((t): t is PeerTarget & { nodeId: SefirahKey } => t.nodeId !== null);
  if (active.length === 0) return null;

  // Group by node id to compute per-peer offsets. Order within a
  // group is "first sender first ring" — playerId asc tie-break gives
  // stable visuals across renders.
  const grouped = new Map<SefirahKey, (PeerTarget & { nodeId: SefirahKey })[]>();
  for (const target of active) {
    const list = grouped.get(target.nodeId) ?? [];
    list.push(target);
    grouped.set(target.nodeId, list);
  }
  for (const [, list] of grouped) {
    list.sort((a, b) => a.playerId.localeCompare(b.playerId));
  }

  // Cap total rings to MAX_RINGS — pull from groups round-robin so a
  // single node hammered by 5 peers doesn't crowd out other nodes.
  const rings: {
    target: PeerTarget & { nodeId: SefirahKey };
    indexInGroup: number;
  }[] = [];
  let cursor = 0;
  const groupKeys = [...grouped.keys()];
  while (rings.length < MAX_RINGS) {
    let made = false;
    for (const key of groupKeys) {
      const list = grouped.get(key);
      if (list && cursor < list.length) {
        const target = list[cursor];
        if (target !== undefined) {
          rings.push({ target, indexInGroup: cursor });
          made = true;
          if (rings.length >= MAX_RINGS) break;
        }
      }
    }
    if (!made) break;
    cursor += 1;
  }

  return (
    <g data-testid="target-rings" pointerEvents="none">
      {rings.map(({ target, indexInGroup }) => {
        const pos = nodePositions[target.nodeId];
        if (!pos) return null;
        const r = NODE_RADIUS + RING_BASE_OFFSET + indexInGroup * RING_STEP;
        return (
          <circle
            key={target.playerId}
            data-testid={`target-ring-${target.playerId}`}
            data-breath={reduceMotion ? 'false' : 'true'}
            cx={pos.x}
            cy={pos.y}
            r={r}
            fill="none"
            stroke={target.color}
            strokeWidth={RING_STROKE_WIDTH}
            strokeOpacity={0.85}
            // Inline animation control: motion-safe gets a slow breath
            // via `animate-breath`; reduce-motion users see the ring
            // static but visible.
            className={reduceMotion ? '' : 'motion-safe:animate-breath'}
          />
        );
      })}
    </g>
  );
}
