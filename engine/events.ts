import type { SefirahKey } from '@/data';

/**
 * Discriminated union of every game event that affects the team's
 * Illumination/Separation counters. Engine reducers emit events; the
 * `applyEvent` reducer in `counters.ts` is the single point that
 * translates them into counter deltas. Adding a new effect requires
 * exactly two changes — a new variant here and a new case in `deltaFor`.
 *
 * This shape is forward-compatible with full event sourcing: storing
 * the event log on `GameState` and folding it from scratch would
 * reproduce the counters identically. We don't currently persist the
 * log because counters-as-totals is sufficient and cheaper.
 */
export type GameEvent =
  | { readonly kind: 'spark-earned'; readonly playerId: string; readonly sefirah: SefirahKey }
  | { readonly kind: 'spark-spent'; readonly playerId: string; readonly sefirah: SefirahKey }
  | {
      readonly kind: 'card-gifted';
      readonly fromPlayerId: string;
      readonly toPlayerId: string;
      readonly arcanumNumber: number;
    }
  | {
      readonly kind: 'check-failed-accepted';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
      /** True when the failure was on a central-pillar shortcut Sefirah. */
      readonly shortcut: boolean;
    }
  | {
      /**
       * One assist contribution to a successful check. Each assist
       * adds +1 to team Illumination — Illumination is team-wide,
       * so per-assistant attribution isn't needed for the counter.
       * `challengerId` and `sefirah` are recorded for audit/log use.
       */
      readonly kind: 'assist-contributed';
      readonly challengerId: string;
      readonly sefirah: SefirahKey;
    }
  | {
      /**
       * Voluntary downward move (toward Malkuth). +1 Illumination as
       * an act of humility per `design/mechanics.md` § Movement.
       */
      readonly kind: 'move-downward';
      readonly playerId: string;
      readonly pathNumber: number;
    }
  | { readonly kind: 'pillar-streak-imbalance'; readonly pillar: 'mercy' | 'severity' }
  | { readonly kind: 'pillar-streak-equilibrium' }
  | { readonly kind: 'shell-activated'; readonly sefirah: SefirahKey }
  | { readonly kind: 'gift-refused'; readonly playerId: string }
  | {
      /**
       * #486 — Chesed Overflow "abundance beyond ask." Emitted by
       * `resolveChallenge` on top of `spark-earned` when the active
       * player has staged ≥1 `gift-card` at Chesed AND the d20
       * outcome would have passed the *unmodified* DC (the gift was
       * abundance, not load-bearing). Adds +1 Illumination —
       * distinct from `spark-earned`'s standard +1 so a counter-log
       * audit shows the abundance bump separately.
       */
      readonly kind: 'chesed-overflow-bonus';
      readonly playerId: string;
    };

/** Pure counter delta. Engine reducers shouldn't read this directly — go through `applyEvent`. */
export interface CounterDelta {
  readonly illumination: number;
  readonly separation: number;
}

/**
 * Map a game event to its counter delta. The single source of truth
 * for counter rules. See `design/mechanics.md` § Illumination vs
 * Separation for the canonical list.
 */
export function deltaFor(event: GameEvent): CounterDelta {
  switch (event.kind) {
    case 'spark-earned':
    case 'spark-spent':
    case 'card-gifted':
    case 'assist-contributed':
    case 'move-downward':
    case 'pillar-streak-equilibrium':
    case 'chesed-overflow-bonus':
      return { illumination: 1, separation: 0 };
    case 'check-failed-accepted':
      // Shortcut failures cost +2 Separation; regular accepted failures +1.
      return { illumination: 0, separation: event.shortcut ? 2 : 1 };
    case 'pillar-streak-imbalance':
    case 'gift-refused':
      return { illumination: 0, separation: 1 };
    case 'shell-activated':
      return { illumination: 0, separation: 2 };
  }
}
