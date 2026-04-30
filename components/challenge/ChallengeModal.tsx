'use client';
import { useMemo, useState } from 'react';
import { sefirahByKey } from '@/data';
import type { SefirahKey } from '@/data';
import {
  CARD_BURN_BONUS,
  SHORTCUT_DC_PENALTY,
  SPARK_BURN_BONUS,
  rollCheck,
  type CheckModifiers,
  type CheckOutcome,
} from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import type { PlayerState } from '@/engine/types';
import { StatIcon } from '@/components/icons/StatIcon';
import { StatSheet } from '@/components/player/StatSheet';
import { D20Roll } from './D20Roll';

/**
 * Modal-style challenge UI for an arrival at an uncleared Sefirah.
 *
 * Flow:
 *   1. Player commits modifiers (assist allies, card burns, spark burns).
 *   2. Click "Roll" → dispatches the d20 via `engine/checks.rollCheck`
 *      with the supplied `rng`. The math is pure; this component is a
 *      view + state machine wrapper.
 *   3. On pass: `onResolved({ pass: true, outcome })` fires.
 *   4. On fail: the player chooses retry (burn another card) or accept
 *      the setback. Choice fires `onResolved({ pass: false, ...choice })`.
 *
 * The component does NOT mutate game state. The orchestrator receives
 * the outcome via `onResolved` and applies it to engine state. Keeping
 * this purely presentational means the same modal works for tabletop
 * and Supabase-backed multiplayer without re-implementation.
 *
 * Tests inject a seeded `rng` so dice rolls are deterministic.
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
}

/**
 * What the modal reports to the orchestrator after a roll. Always
 * carries the `CheckModifiers` that produced the outcome — the
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

interface ChallengeModalProps {
  readonly context: ChallengeContext;
  /**
   * Seeded RNG used for the d20 roll. Each `Roll` click consumes ONE
   * value from this sequence — the modal's internal double-click
   * guard ensures that. On retry, the orchestrator should mount a
   * fresh modal instance with whatever `rng` reflects the next roll
   * (typically the same shared engine `rng`, advancing the sequence
   * naturally; tests can pass a fresh `seededRng(seed)` for
   * independent retry scenarios).
   */
  readonly rng: Rng;
  readonly onResolved: (resolution: ChallengeResolution) => void;
  /**
   * Optional escape hatch. Only rendered during the committing phase
   * — once the player rolls, the only exit is via `onResolved`
   * (pass, retry, or accept).
   */
  readonly onCancel?: () => void;
  /**
   * The active player. When supplied, a compact `StatSheet` is
   * rendered at the top of the modal so the player can see their
   * full stat picture without dismissing the dialog. The challenged
   * stat is highlighted via `activeStat`. Optional for backward
   * compat with `/demo/challenge` (#134).
   */
  readonly player?: PlayerState;
  readonly className?: string;
}

export function ChallengeModal({
  context,
  rng,
  onResolved,
  onCancel,
  player,
  className,
}: ChallengeModalProps): JSX.Element {
  const sefirahData = useMemo(() => sefirahByKey(context.sefirah), [context.sefirah]);
  // Malkuth (no-check) and Kether (collective) don't run a standard
  // d20 challenge — `resolveChallenge` rejects them in the engine.
  // Fail loud rather than silently rendering DC 0, which would let
  // any roll trivially pass.
  if (sefirahData.challenge.kind !== 'check') {
    throw new Error(
      `ChallengeModal: sefirah "${context.sefirah}" has no stat check (kind: ${sefirahData.challenge.kind})`,
    );
  }
  const baseDC = sefirahData.challenge.dc;
  // Effective DC composes two adjustments on the DC side: the shortcut
  // penalty (+3) and the Soul Door delta (typically -2 when the
  // player is at one of their Doors). Mirror of `rollCheck`'s
  // composition in `engine/checks.ts`.
  const soulDoorDelta = context.soulDoorDelta ?? 0;
  const effectiveDC =
    baseDC + (context.shortcut ? SHORTCUT_DC_PENALTY : 0) + soulDoorDelta;
  // Only the canonical Door discount (`-2`) shows the callout. Any
  // future positive delta (anti-Door penalty, hypothetical) would be
  // semantically wrong to render under "Soul Door open here", so the
  // guard is tighter than `!== 0`.
  const showSoulDoor = soulDoorDelta < 0;

  const [assistIds, setAssistIds] = useState<ReadonlySet<string>>(new Set());
  const [cardBurns, setCardBurns] = useState(0);
  const [sparkBurns, setSparkBurns] = useState(0);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [committedModifiers, setCommittedModifiers] =
    useState<CheckModifiers | null>(null);
  const [phase, setPhase] = useState<'committing' | 'rolling' | 'reveal'>(
    'committing',
  );

  // Wrap the `??` in useMemo so the empty-array fallback identity is
  // stable across renders — otherwise it would be a new `[]` each
  // render and re-trigger the dependent useMemo unnecessarily.
  const allies = useMemo(
    () => context.availableAllies ?? [],
    [context.availableAllies],
  );
  const maxCardBurns = context.availableCardBurns ?? 0;
  const maxSparkBurns = context.availableSparkBurns ?? 0;

  const assistTotal = useMemo(() => {
    return allies
      .filter((a) => assistIds.has(a.id))
      .reduce((sum, a) => sum + Math.floor(a.stat / 2), 0);
  }, [allies, assistIds]);

  const projectedTotal =
    context.stat +
    assistTotal +
    cardBurns * CARD_BURN_BONUS +
    sparkBurns * SPARK_BURN_BONUS;

  const handleRoll = (): void => {
    // Defensive guard. The Roll button only renders during the
    // committing phase, but if `CommittingPanel`'s visibility logic
    // is ever changed (e.g., for an animate-out transition), this
    // prevents a double-roll that would consume two values from the
    // shared `rng` and fire `onResolved` twice.
    if (phase !== 'committing') return;
    const modifiers: CheckModifiers = {
      assistStats: allies
        .filter((a) => assistIds.has(a.id))
        .map((a) => a.stat),
      cardBurns,
      sparkBurns,
      shortcutPenalty: context.shortcut ?? false,
      // #245 / #244 contract: include the Door delta in the modifiers
      // we hand to `rollCheck` so the pre-roll outcome's effectiveDC
      // matches what `resolveChallenge` would compute. The engine
      // treats `outcome` as authoritative when supplied, so the modal
      // is the source of truth for the displayed DC.
      ...(soulDoorDelta !== 0 ? { soulDoorDelta } : {}),
    };
    const result = rollCheck({
      stat: context.stat,
      dc: baseDC,
      modifiers,
      rng,
    });
    setOutcome(result);
    setCommittedModifiers(modifiers);
    setPhase('rolling');
    // After the roll animation, advance to the reveal phase. Both
    // pass and fail paths now stay there until the player explicitly
    // dismisses (Continue on pass, Retry/Accept on fail). Pre-#135
    // the pass path called `onResolved` immediately on the timeout,
    // hiding the result before players could read the d20 + math.
    setTimeout(() => setPhase('reveal'), 800);
  };

  const handleContinue = (): void => {
    if (outcome === null || committedModifiers === null) return;
    if (!outcome.pass) {
      // The Continue button is only rendered when `outcome.pass` is
      // true. If we ever reach this branch, a future refactor has
      // mis-wired the button — fail loud rather than silently no-op.
      throw new Error(
        'handleContinue invoked on a failed outcome — Continue button should be gated on outcome.pass',
      );
    }
    onResolved({ pass: true, outcome, modifiers: committedModifiers });
  };

  const handleFailChoice = (choice: 'retry' | 'accept'): void => {
    if (outcome === null || committedModifiers === null) return;
    onResolved({
      pass: false,
      outcome,
      modifiers: committedModifiers,
      choice,
    });
  };

  const toggleAssist = (id: string): void => {
    setAssistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`challenge-${context.sefirah}-title`}
      data-challenge-modal
      data-phase={phase}
      className={`rounded-lg border border-veil/30 bg-ground p-6 text-veil ${className ?? ''}`}
    >
      <h2
        id={`challenge-${context.sefirah}-title`}
        className="font-display text-2xl tracking-widest"
      >
        Challenge: {sefirahData.englishName}
      </h2>
      <p className="mt-1 text-sm opacity-70">
        {sefirahData.hebrewName} · DC {effectiveDC}
        {context.shortcut ? ` (shortcut +${SHORTCUT_DC_PENALTY})` : ''}
      </p>

      {showSoulDoor ? (
        // #245 / Epic #240: surface the per-class Door discount when
        // the arriving player is at one of their Doors. Verbatim copy
        // per `design/soul-doors.md` § 6 — colon, U+2192 arrow, no
        // period. The "from" is the base DC; the "to" is the final
        // effective DC. When a central-pillar shortcut also applies,
        // append a parenthetical breakdown per § 6's worked example
        // ("DC 14 → 15 (shortcut +3, Door −2)") so the player can see
        // both modifiers at once. U+2212 minus sign in "Door −2"
        // matches the design doc's typography.
        <p
          data-soul-door
          className="mt-2 rounded border border-illumination/40 bg-illumination/5 px-3 py-1 text-sm"
          style={{ borderColor: sefirahData.color }}
        >
          Soul Door open here: DC {baseDC} → {effectiveDC}
          {context.shortcut
            ? ` (shortcut +${SHORTCUT_DC_PENALTY}, Door −${Math.abs(soulDoorDelta)})`
            : ''}
        </p>
      ) : null}

      {player ? (
        // #134: compact stat sheet embedded inside the modal so the
        // player can read their full stat row without dismissing the
        // dialog. `activeStat` highlights the challenge stat.
        <div className="mt-3 rounded border border-veil/15 bg-ground/60 p-2">
          <StatSheet
            player={player}
            mode="compact"
            activeStat={sefirahData.stat}
          />
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 rounded bg-illumination/10 px-3 py-2 ring-1 ring-illumination">
        <StatIcon stat={sefirahData.stat} className="h-5 w-5" />
        <span className="capitalize">{context.statLabel}</span>
        <span
          className="ml-auto font-display text-lg tabular-nums"
          data-stat-contribution
        >
          {context.stat}
        </span>
      </div>

      {phase === 'committing' ? (
        <CommittingPanel
          allies={allies}
          assistIds={assistIds}
          toggleAssist={toggleAssist}
          assistTotal={assistTotal}
          cardBurns={cardBurns}
          setCardBurns={setCardBurns}
          maxCardBurns={maxCardBurns}
          sparkBurns={sparkBurns}
          setSparkBurns={setSparkBurns}
          maxSparkBurns={maxSparkBurns}
          projectedTotal={projectedTotal}
          effectiveDC={effectiveDC}
          onRoll={handleRoll}
          onCancel={onCancel}
        />
      ) : null}

      {phase !== 'committing' && outcome !== null ? (
        <RollPanel
          outcome={outcome}
          phase={phase}
          onFailChoice={handleFailChoice}
          onContinue={handleContinue}
        />
      ) : null}
    </div>
  );
}

interface CommittingPanelProps {
  readonly allies: readonly {
    readonly id: string;
    readonly name: string;
    readonly stat: number;
  }[];
  readonly assistIds: ReadonlySet<string>;
  readonly toggleAssist: (id: string) => void;
  readonly assistTotal: number;
  readonly cardBurns: number;
  readonly setCardBurns: (n: number) => void;
  readonly maxCardBurns: number;
  readonly sparkBurns: number;
  readonly setSparkBurns: (n: number) => void;
  readonly maxSparkBurns: number;
  readonly projectedTotal: number;
  readonly effectiveDC: number;
  readonly onRoll: () => void;
  readonly onCancel: (() => void) | undefined;
}

function CommittingPanel(props: CommittingPanelProps): JSX.Element {
  const {
    allies,
    assistIds,
    toggleAssist,
    assistTotal,
    cardBurns,
    setCardBurns,
    maxCardBurns,
    sparkBurns,
    setSparkBurns,
    maxSparkBurns,
    projectedTotal,
    effectiveDC,
    onRoll,
    onCancel,
  } = props;
  return (
    <div className="mt-4 space-y-4">
      {allies.length > 0 ? (
        <fieldset data-modifier="assist">
          <legend className="text-xs uppercase tracking-widest opacity-60">
            Allies (each adds floor(stat / 2))
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {allies.map((ally) => {
              const checked = assistIds.has(ally.id);
              return (
                <label
                  key={ally.id}
                  data-ally={ally.id}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ring-1 ${
                    checked ? 'ring-illumination' : 'ring-veil/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAssist(ally.id)}
                  />
                  {ally.name} (+{Math.floor(ally.stat / 2)})
                </label>
              );
            })}
          </div>
          <p className="mt-1 text-xs opacity-60">
            Assist contribution: <span data-assist-total>+{assistTotal}</span>
          </p>
        </fieldset>
      ) : null}

      <Stepper
        kind="cardBurns"
        label={`Burn cards (+${CARD_BURN_BONUS} each)`}
        value={cardBurns}
        max={maxCardBurns}
        onChange={setCardBurns}
      />
      <Stepper
        kind="sparkBurns"
        label={`Burn sparks (+${SPARK_BURN_BONUS} each)`}
        value={sparkBurns}
        max={maxSparkBurns}
        onChange={setSparkBurns}
      />

      <div className="flex items-center justify-between rounded bg-veil/5 px-3 py-2">
        <span className="text-xs uppercase tracking-widest opacity-70">
          Projected before d20
        </span>
        <span className="font-display tabular-nums" data-projected-total>
          {projectedTotal} vs DC {effectiveDC}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRoll}
          data-action="roll"
          className="flex-1 rounded bg-illumination px-4 py-2 font-display tracking-widest text-ground"
        >
          Roll
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            data-action="cancel"
            className="rounded border border-veil/30 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface StepperProps {
  readonly kind: 'cardBurns' | 'sparkBurns';
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly onChange: (n: number) => void;
}

function Stepper({ kind, label, value, max, onChange }: StepperProps): JSX.Element {
  const dec = (): void => onChange(Math.max(0, value - 1));
  const inc = (): void => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center justify-between" data-stepper={kind}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          aria-label={`Decrease ${label}`}
          disabled={value === 0}
          className="h-7 w-7 rounded border border-veil/30 disabled:opacity-30"
        >
          −
        </button>
        <span
          data-stepper-value={kind}
          className="w-6 text-center font-display tabular-nums"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          className="h-7 w-7 rounded border border-veil/30 disabled:opacity-30"
        >
          +
        </button>
        <span className="text-xs opacity-50">/ {max}</span>
      </div>
    </div>
  );
}

interface RollPanelProps {
  readonly outcome: CheckOutcome;
  readonly phase: 'rolling' | 'reveal';
  readonly onFailChoice: (choice: 'retry' | 'accept') => void;
  readonly onContinue: () => void;
}

function RollPanel({
  outcome,
  phase,
  onFailChoice,
  onContinue,
}: RollPanelProps): JSX.Element {
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <D20Roll value={outcome.rolled} rolling={phase === 'rolling'} className="h-16 w-16" />
      {phase === 'reveal' ? (
        <>
          <div
            className="text-center font-display tracking-widest"
            data-result={outcome.pass ? 'pass' : 'fail'}
          >
            <span className="text-2xl">
              {outcome.rolled} + {outcome.statContribution} +{' '}
              {outcome.modifierBreakdown.assist +
                outcome.modifierBreakdown.cardBurn +
                outcome.modifierBreakdown.sparkBurn}{' '}
              = <span data-total>{outcome.total}</span> vs {outcome.effectiveDC}
            </span>
            <p className="mt-1 text-sm opacity-80">
              {outcome.pass ? 'Pass' : 'Fail'}
            </p>
          </div>
          {outcome.pass ? (
            // #135: pass needs an explicit dismissal so the player
            // can read the breakdown. Pre-fix, `handleRoll`'s
            // setTimeout called `onResolved` directly and the modal
            // unmounted before the reveal phase rendered.
            <button
              type="button"
              onClick={onContinue}
              data-action="continue"
              className="mt-2 rounded bg-illumination px-4 py-2 font-display tracking-widest text-ground"
            >
              Continue
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onFailChoice('retry')}
                data-fail-choice="retry"
                className="rounded border border-illumination px-4 py-2 text-sm"
              >
                Burn another card to retry
              </button>
              <button
                type="button"
                onClick={() => onFailChoice('accept')}
                data-fail-choice="accept"
                className="rounded bg-veil/10 px-4 py-2 text-sm"
              >
                Accept setback
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
