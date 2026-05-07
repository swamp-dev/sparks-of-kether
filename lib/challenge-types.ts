import type { SefirahKey, ZodiacSignKey } from '@/data';
import type { CheckModifiers, CheckOutcome } from '@/engine/checks';

/**
 * Input contract for an arrival-at-Sefirah challenge. Built by the
 * orchestrator (`buildChallengeContext` in `PlayScreen`) and consumed
 * by the encounter UI (`EncounterScreen` for the real `/play` flow,
 * `ChallengeModal` for the `/demo/challenge` design-system route).
 *
 * Lifted out of `components/challenge/ChallengeModal.tsx` (#282) so
 * production callers don't import types from a `@deprecated` module.
 * Pure type relocation — shape unchanged.
 */
export interface ChallengeContext {
  readonly sefirah: SefirahKey;
  readonly stat: number;
  readonly statLabel: string;
  /** True when arrival was via a central-pillar shortcut (Da'at-style). */
  readonly shortcut?: boolean;
  /** Allies at the same Sefirah whose stat can boost this check. */
  readonly availableAllies?: readonly {
    readonly id: string;
    readonly name: string;
    readonly stat: number;
  }[];
  /** How many cards the player can burn (typically `hand.length`). */
  readonly availableCardBurns?: number;
  /** How many sparks the player can burn (size of `sparksHeld`). */
  readonly availableSparkBurns?: number;
  /**
   * Soul Door DC delta (#245 / Epic #240). Typically `-2` when the
   * arriving player's class has this Sefirah as one of its Doors;
   * `0` or absent otherwise. The orchestrator computes this via
   * `engine/soul-door-bonus.ts:soulDoorDcDelta(player.zodiacSign,
   * sefirah)`. The modal renders a "Soul Door open here" callout
   * for non-zero values AND folds the delta into both the displayed
   * `effectiveDC` and the `CheckModifiers` it builds for `rollCheck`
   * — so the pre-roll outcome's `effectiveDC` matches what the
   * engine will compute. See the `#244 contract` on
   * `ResolveChallengeInput.outcome`.
   */
  readonly soulDoorDelta?: number;
  /**
   * Zodiac sign of the player taking the check. Used by the
   * EncounterScreen (#277) to key per-Sefirah avatar verdict copy
   * and pre-roll player-response lines. Optional because demo /
   * test harnesses construct contexts without a real player; when
   * absent, the encounter screen falls back to the placeholder
   * "The gate considers you." line.
   */
  readonly playerSign?: ZodiacSignKey;
}

/**
 * What the encounter UI reports to the orchestrator after a roll.
 * Always carries the `CheckModifiers` that produced the outcome — the
 * orchestrator forwards them to the engine so the state mutation
 * matches what the player committed (assist allies, cards burned,
 * sparks burned). Without this, the engine has to roll again with
 * no modifiers and produces a different result.
 */
export type ChallengeResolution =
  | {
      readonly pass: true;
      readonly outcome: CheckOutcome;
      readonly modifiers: CheckModifiers;
    }
  | {
      readonly pass: false;
      readonly outcome: CheckOutcome;
      readonly modifiers: CheckModifiers;
      readonly choice: 'retry' | 'accept';
    };
