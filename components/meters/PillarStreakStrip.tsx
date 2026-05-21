'use client';
import type { PillarStreakState } from '@/engine/types';

/**
 * PillarStreakStrip — three-chevron triptych for the pillar streak.
 *
 * Today's `PILLAR STREAK MERCY 2/3` strip becomes a horizontal
 * triptych echoing the Tree's three pillars: Mercy (left, blue),
 * Balance (centre, gold), Severity (right, red). The active pillar's
 * chevron is filled in its colour; the others are outline-only. Count
 * (n / 3) is rendered in small caps below.
 *
 * Ordering is **left-to-right Mercy → Balance → Severity** to mirror
 * the Tree's left-to-right view from the player's perspective; the
 * `PillarStreakState` engine type only tracks `mercy | severity` for
 * `currentPillar` (Balance moves don't advance either streak per
 * design/mechanics.md), but we still render the Balance chevron so
 * the visual reads as the full triptych.
 */

const PILLAR_STREAK_THRESHOLD = 3;

type Pillar = 'mercy' | 'balance' | 'severity';
const PILLARS: readonly Pillar[] = ['mercy', 'balance', 'severity'];

// Border + fill colours per pillar. Use the pillar tokens from
// `tailwind.config.ts` so a future re-tint cascades automatically.
const PILLAR_FILL: Record<Pillar, string> = {
  mercy: '#4169e1', // pillar-mercy
  balance: '#ffd700', // pillar-balance
  severity: '#dc143c', // pillar-severity
};

type StreakKind = 'imbalance' | 'equilibrium' | 'none';

interface PillarStreakStripProps {
  readonly state: PillarStreakState;
  readonly className?: string;
}

export function PillarStreakStrip({ state, className }: PillarStreakStripProps): JSX.Element {
  const same = state.sameCount;
  const alt = state.alternationCount;
  // Fresh state (0/0) is "none", not "imbalance" — the engine doesn't
  // count a non-move toward either streak.
  const dominant: StreakKind =
    same === 0 && alt === 0 ? 'none' : same >= alt ? 'imbalance' : 'equilibrium';
  const count = Math.max(same, alt);
  const current = state.currentPillar;
  const fillRatio = Math.min(1, count / PILLAR_STREAK_THRESHOLD);

  return (
    <div
      data-pillar-streak
      data-streak-kind={dominant}
      className={`flex flex-col items-center gap-1${className ? ` ${className}` : ''}`}
      aria-label={`Pillar streak: ${current ?? 'none'}, ${dominant} count ${count} of ${PILLAR_STREAK_THRESHOLD}`}
    >
      <div className="flex items-end gap-3" data-pillar-chevrons>
        {PILLARS.map((pillar) => {
          const isActive = current === pillar && count > 0;
          // Balance is rendered but never `active` (engine doesn't
          // streak on Balance). Keeps the triptych visible.
          const ratio = isActive ? fillRatio : 0;
          return <Chevron key={pillar} pillar={pillar} active={isActive} ratio={ratio} />;
        })}
      </div>
      <span className="text-[10px] uppercase tracking-widest opacity-60">
        Pillar streak <span data-pillar-current>{current ?? 'none'}</span>{' '}
        <span className="font-display tabular-nums">
          <span data-streak-count>{count}</span>/{PILLAR_STREAK_THRESHOLD}
        </span>
      </span>
    </div>
  );
}

interface ChevronProps {
  readonly pillar: Pillar;
  readonly active: boolean;
  readonly ratio: number;
}

/**
 * One chevron in the triptych. SVG `polygon` shaped like an arrowhead
 * pointing up — the visual echoes a Tree-of-Life pillar segment.
 *
 * When inactive: outline-only in the pillar colour.
 * When active: filled at `ratio` opacity (so 1/3 reads as a whisper,
 * 3/3 reads as solid).
 *
 * The `fill-opacity` transition runs on every state change (240 ms,
 * `ease-emerge`) — this is chrome state-change feedback, not an
 * atmospheric loop, so it isn't gated by `motion-safe:` (per
 * `docs/motion.md` § Reduced motion: only continuous loops opt in).
 */
function Chevron({ pillar, active, ratio }: ChevronProps): JSX.Element {
  const colour = PILLAR_FILL[pillar];
  // Fill opacity scales with ratio; inactive chevrons get 0 fill so
  // only the outline renders.
  const fillOpacity = active ? ratio : 0;
  return (
    <div
      // `data-pillar-chevron` is the new (chevron-shape) selector;
      // `data-pillar-column` is preserved for backwards-compatibility
      // with the pre-#316 column-bar tests. Both point at the same
      // element so existing assertions keep working.
      data-pillar-column={pillar}
      data-pillar-chevron={pillar}
      data-active={active ? 'true' : 'false'}
      data-fill-ratio={ratio.toFixed(2)}
      className="flex flex-col items-center gap-0.5"
    >
      <svg
        width="20"
        height="22"
        viewBox="0 0 20 22"
        // The container's `aria-label` (set by the parent strip)
        // already announces pillar + state; the inner SVG is
        // decorative to AT users to avoid double-announcement.
        aria-hidden="true"
      >
        {/* Chevron path — a stylised triangle/arrowhead, stem at the
            bottom. 20×22 viewbox keeps the visual close to a Tree-
            pillar wedge rather than a perfect equilateral. */}
        <polygon
          points="10,2 18,18 14,18 10,10 6,18 2,18"
          fill={colour}
          fillOpacity={fillOpacity}
          stroke={colour}
          strokeOpacity={active ? 1 : 0.6}
          strokeWidth={1.25}
          style={{
            transition: 'fill-opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </svg>
      <span className="text-[9px] uppercase tracking-widest opacity-50">{pillar[0]}</span>
    </div>
  );
}
