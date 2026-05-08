'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sefirahByKey, zodiacSigns } from '@/data';
import type { EncounterAvatarKey } from '@/data/types';
import { usePantheon } from '@/lib/settings/pantheon';
import {
  pickPlayerResponse,
  pickVerdict,
} from '@/data/pantheons/greco-roman/verdicts';
import { pickFraming } from '@/data/pantheons/greco-roman/framing';
import { sefirahTwist } from '@/data/sefirah-twists';
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
import { StatSheet } from '@/components/player/StatSheet';
import type {
  ChallengeContext,
  ChallengeResolution,
} from '@/lib/challenge-types';
import type { UseTurnReturn } from '@/lib/use-turn';
import type { PrepModifier } from '@/lib/turn-machine';
import { useSound } from '@/lib/sound/useSound';
import { avatarArrivesCueFor } from '@/lib/sound/cues';
import { AvatarPortrait } from './encounter/AvatarPortrait';
import { D20Button } from './encounter/D20Button';
import { RevealLine } from './encounter/RevealLine';
import { SEFIRAH_FRAME_TOKENS } from './encounter/sefirah-frame-tokens';
import { StatReadout } from './encounter/StatReadout';
import { VerdictReveal } from './encounter/VerdictReveal';

/**
 * EncounterScreen — replaces `ChallengeModal` (#228) as the visual layer
 * for an arrival at an uncleared Sefirah. Renders one of three layouts
 * based on the engine's `turn.challengeSubPhase`:
 *
 *   prep    — modifier-staging affordances (card-burn / spark-burn /
 *             assist-request). Hot-seat collapses everything into one
 *             "Roll" click; multiplayer dispatches per-step modifier
 *             events so allies see staged modifiers in real time.
 *   resolve — brief d20 animation + outcome reveal (`aria-live="polite"`).
 *   react   — pass: "Continue" advances the turn. fail: choose between
 *             retry (loop back to prep, cumulative burns preserved by
 *             the engine) or accept-setback.
 *
 * The component is the orchestrator's view of `useTurn` — it dispatches
 * via the per-step methods (`prepAddModifier`, `prepConfirm`,
 * `reactRetry`) and reads `turn.challengeSubPhase` /
 * `turn.pendingModifiers` to decide what to render.
 *
 * Engine state is the source of truth. The component carries a small
 * amount of LOCAL UI state — a brief "uiPhase = resolve" lag — to give
 * the d20 animation room to breathe before the engine's "react"
 * sub-phase view replaces it. The engine has already advanced; the
 * UI is showing the animation that the engine's `prep-confirm` step
 * fired internally.
 *
 * Per-Sefirah avatar copy (Epic #117 sub-tickets 1-3) slots into the
 * react sub-state's verdict line; for now the placeholder reads "The
 * Sefirah responds." and is filled in by future tickets.
 */

/**
 * Common (mode-agnostic) prop fields. Mode-specific props are added by
 * the discriminated union below — `mode: 'multiplayer'` requires
 * `player` (its absence in multiplayer would silently drop card-burn
 * / spark-burn dispatches, since the head-of-hand / head-of-sparksHeld
 * lookups bottom out at `[]`). Hot-seat keeps `player` optional for
 * back-compat with the demo / test harnesses that don't construct one.
 */
interface EncounterScreenCommonProps {
  readonly context: ChallengeContext;
  /**
   * Seeded RNG used for the d20 roll. The engine's reducer rolls
   * via `engine/checks.ts:resolveChallenge`; this component
   * pre-rolls a `CheckOutcome` so the player sees the same
   * face the engine commits to state. Each "Roll" click consumes
   * one value from the rng — the prep sub-phase guard prevents a
   * double-consume.
   */
  readonly rng: Rng;
  /** The full `useTurn` return value — read for sub-phase / dispatched for events. */
  readonly turn: UseTurnReturn;
  /**
   * Called when the encounter is fully resolved (pass + Continue,
   * fail + accept-setback). Retry doesn't fire `onResolved` — the
   * engine loops back to prep on its own and the parent stays
   * mounted.
   *
   * The component dispatches the engine event (submitChallenge /
   * acceptChallengeSetback) before invoking `onResolved`, so the
   * parent's reaction to `onResolved` runs against the post-resolve
   * snapshot.
   */
  readonly onResolved: (resolution: ChallengeResolution) => void;
  readonly onCancel?: () => void;
  readonly className?: string;
}

/**
 * Hot-seat: collapses prep-staging into a single click via the
 * `submitChallenge` wrapper. `player` is optional because the
 * wrapper reads the active player from `useTurn`'s state directly,
 * and demo / test harnesses occasionally mount without one.
 */
interface EncounterScreenHotSeatProps extends EncounterScreenCommonProps {
  readonly mode: 'hot-seat';
  /**
   * Active player for the embedded stat sheet. Optional in hot-seat
   * mode — the stat sheet is omitted when not provided.
   */
  readonly player?: PlayerState;
}

/**
 * Multiplayer: each modifier dispatches over the wire as it's
 * staged so allies see the staging in real time. The card-burn /
 * spark-burn synthesisers MUST be able to read the active player's
 * `hand` and `sparksHeld` to construct the per-step events; without
 * a `player` every step click would silently no-op (the lookup
 * bottoms out at `[]`). Required so TypeScript catches the mistake
 * at the call site instead of letting the runtime fail-closed
 * silently.
 */
interface EncounterScreenMultiplayerProps extends EncounterScreenCommonProps {
  readonly mode: 'multiplayer';
  readonly player: PlayerState;
}

export type EncounterScreenProps =
  | EncounterScreenHotSeatProps
  | EncounterScreenMultiplayerProps;

/**
 * Local UI sub-phase. Lags the engine's `challengeSubPhase` by one
 * tick during the resolve animation: the engine sets sub-phase to
 * `'react'` immediately on `prep-confirm`, but we want the d20 spin to
 * show before the react choices appear.
 */
type UiSubPhase = 'prep' | 'resolve' | 'react';

const RESOLVE_ANIMATION_MS = 800;

/**
 * Near-zero delay used when `prefers-reduced-motion: reduce` is set.
 * 0ms would skip the React tick and flush the resolve→react sub-state
 * change synchronously inside the click handler, which can interleave
 * badly with other state updates; one tick (50ms is generous) gives
 * React room to commit while still being effectively instantaneous to
 * the player. Mirrors `D20Roll`'s no-animation branch in spirit.
 */
const REDUCED_MOTION_RESOLVE_MS = 50;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function EncounterScreen(props: EncounterScreenProps): JSX.Element {
  const {
    context,
    rng,
    mode,
    turn,
    onResolved,
    onCancel,
    className,
  } = props;
  // `player` is optional in hot-seat, required in multiplayer. After
  // narrowing on `mode` TS would track this — but the consumers below
  // (card-burn / spark-burn synthesisers; embedded StatSheet render)
  // don't need to re-narrow if we just lift it out. The discriminated
  // union ensures multiplayer callers cannot reach this with `player`
  // undefined.
  const player: PlayerState | undefined = props.player;
  const { pantheon } = usePantheon();
  const sefirahData = useMemo(
    () => sefirahByKey(context.sefirah),
    [context.sefirah],
  );
  // Malkuth (no-check) and Kether (collective) don't run a standard
  // d20 challenge. Mirrors the loud-fail in `ChallengeModal` rather
  // than silently rendering DC 0.
  if (sefirahData.challenge.kind !== 'check') {
    throw new Error(
      `EncounterScreen: sefirah "${context.sefirah}" has no stat check (kind: ${sefirahData.challenge.kind})`,
    );
  }
  const baseDC = sefirahData.challenge.dc;

  // Local UI tracking — staged modifier counts for the prep panel, the
  // committed outcome we're animating, and a one-tick `animatingResolve`
  // flag that lags the engine's instant `prep → react` jump just long
  // enough for the d20 spin to play.
  const [stagedAssistIds, setStagedAssistIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [stagedCardBurns, setStagedCardBurns] = useState(0);
  const [stagedSparkBurns, setStagedSparkBurns] = useState(0);
  // Shaped exactly like ChallengeModal's `outcome`/`committedModifiers`
  // pair so the resolve / react sub-states have both the d20 face and
  // the modifier breakdown.
  const [resolvedOutcome, setResolvedOutcome] = useState<CheckOutcome | null>(
    null,
  );
  const [committedModifiers, setCommittedModifiers] =
    useState<CheckModifiers | null>(null);
  /**
   * Animation lag flag. The engine sets `challengeSubPhase: 'react'`
   * synchronously inside `prep-confirm`, but visually we want the
   * d20 spin to play before the react choices appear. This flag is
   * `true` for the brief animation window between Roll and the
   * setTimeout firing; it lets `uiSubPhase` (derived) read 'resolve'
   * during that interval even though the engine is already in
   * 'react'.
   */
  const [animatingResolve, setAnimatingResolve] = useState(false);

  // Avatar-voiced verdict / pre-roll player-response copy (#277).
  // The component owns the picker so the rng is consumed at a known
  // moment (player-response: once, on first prep entry per encounter
  // — picked into a ref-backed lazy initializer; verdict: once, on
  // Roll, alongside `rollCheck`). Both reset on a react→prep loopback
  // (retry). Cleared in the same useEffect that clears the staged
  // counters below.
  //
  // `avatarKey` is the narrow union excluding Kether/Malkuth — both
  // are already filtered upstream by the `challenge.kind === 'check'`
  // guard above (Kether is `'collective'`, Malkuth is `'no-check'`).
  // The cast is sound because the throw at line ~172 has already
  // ruled them out.
  const avatarKey = context.sefirah as EncounterAvatarKey;
  // Avatar copy requires a player sign. Kether/Malkuth are already
  // ruled out by the `challenge.kind === 'check'` throw above; no
  // need to re-check here.
  const avatarHasCopy = context.playerSign !== undefined;
  // Pre-roll player line — picked once per encounter. Lazy
  // initializer pulls from the same rng so deterministic seeds
  // produce deterministic copy. Rolls back to undefined on retry
  // (engine react→prep transition).
  // The setter is unused — the player response is picked once at
  // mount via the lazy initializer and never re-set; it's read-only
  // for the encounter's lifetime. (Retry intentionally does NOT
  // re-pick the player line — see the useEffect below.)
  const [playerResponse] = useState<string | undefined>(() => {
    if (!avatarHasCopy || context.playerSign === undefined) return undefined;
    return pickPlayerResponse(
      pantheon.sefirahPlayerResponses,
      avatarKey,
      context.playerSign,
      rng,
    );
  });
  // Trial-framing line for the prep stage (#478). Picked ONCE per
  // encounter via the same lazy-initializer pattern as
  // `playerResponse` so the line stays stable across prep ↔ resolve ↔
  // react re-renders, including a `react-retry` loopback. Calls into
  // the same seeded `rng` so deterministic seeds replay deterministic
  // copy. Sign-less callers (demo / tests) hit the placeholder
  // fallback below — see `framingLine` derivation.
  //
  // ⚠️ **Pre-d20 rng-draw ordering matters for seeded tests.** The
  // initializer below consumes one `rng.int(0, 2)` after
  // `playerResponse` has consumed one — both fire before the d20
  // inside `rollCheck`. `PlayScreen.shortcut.test.tsx` calibrates
  // its seeds against this ordering. If you add another pre-Roll
  // rng draw between these two `useState` calls (or before either),
  // rebase the seeds in that file too.
  const [pickedFraming] = useState<string | undefined>(() => {
    if (!avatarHasCopy || context.playerSign === undefined) return undefined;
    return pickFraming(
      pantheon.sefirahFraming,
      avatarKey,
      context.playerSign,
      rng,
    );
  });
  const [verdictLine, setVerdictLine] = useState<string | undefined>(undefined);
  // #482 framing-complete signal. Flips to `true` when `RevealLine`
  // finishes the staggered reveal of the trial-framing line. Surfaced
  // via the `data-framing-complete` attribute on the prep stage so
  // future polish can gate the d20 button on it (the AC's example
  // use case) without that gate landing in this PR — see PR body for
  // the deferral rationale and test-impact survey.
  const [framingComplete, setFramingComplete] = useState(false);

  // Reset staged counters when the engine sub-phase loops back to
  // 'prep' (a `react-retry`). The engine's `pendingModifiers` carries
  // the cumulative card / spark burns from the failed roll forward;
  // our local staged counters are the additional burns this round.
  // Using `useEffect` keyed on `challengeSubPhase` avoids the bug
  // where a stale-prop transition (`challengeSubPhase: 'prep'` while
  // we're animating resolve) trampled the in-flight uiPhase.
  const prevSubPhaseRef = useRef<typeof turn.challengeSubPhase>(
    turn.challengeSubPhase,
  );
  useEffect(() => {
    const prev = prevSubPhaseRef.current;
    prevSubPhaseRef.current = turn.challengeSubPhase;
    // Retry: engine went react → prep. Clear the per-round staged
    // counters AND the resolved-outcome cache so the prep panel
    // renders fresh.
    if (prev === 'react' && turn.challengeSubPhase === 'prep') {
      setStagedAssistIds(new Set());
      setStagedCardBurns(0);
      setStagedSparkBurns(0);
      setResolvedOutcome(null);
      setCommittedModifiers(null);
      setAnimatingResolve(false);
      // #321: clear the verdict-cue ref so a retry's new outcome
      // fires its own cue. Without this, a retry that lands on the
      // same boolean (fail → fail) would still be a NEW outcome
      // instance from `rollCheck` and the identity check below
      // would correctly re-fire — but explicitly resetting here
      // keeps the intent obvious in the loopback path.
      // (The ref itself is declared further down where it's read.)
      // Drop the verdict so the next Roll picks a fresh variant.
      // Player-response stays put — it's pre-roll flavor for the
      // current encounter, and re-picking on every retry would
      // reroll the player's "voice" mid-encounter, which reads
      // wrong. (#277)
      setVerdictLine(undefined);
      // Reset the framing-complete signal so the retry round shows
      // the avatar speak again from the top. The framing line itself
      // is stable across retries (#478 picks once per encounter via
      // `useState` lazy init), but the reveal animation re-runs.
      setFramingComplete(false);
    }
  }, [turn.challengeSubPhase]);

  /**
   * Derived UI sub-phase. Engine truth + animation lag:
   *   - engine 'prep'  → ui 'prep'
   *   - engine 'react' + animatingResolve → ui 'resolve'
   *   - engine 'react' + !animatingResolve → ui 'react'
   * The engine's `'resolve'` sub-phase value never appears in steady
   * state (the reducer transitions through it inside one tick), so
   * we don't read for it here.
   */
  const uiSubPhase: UiSubPhase = (() => {
    if (turn.challengeSubPhase === 'prep') return 'prep';
    if (animatingResolve) return 'resolve';
    return 'react';
  })();

  // #321: pass / fail cue. Fire once when the verdict reveals — i.e.
  // when the resolve animation finishes and the react sub-state is
  // about to render. The `firedForOutcomeRef` guard ties the cue to
  // a specific outcome instance (resets on retry by the existing
  // `setResolvedOutcome(null)` clear in the prep-loopback effect),
  // so re-renders inside react state don't re-fire.
  const { playSound } = useSound();
  const firedForOutcomeRef = useRef<CheckOutcome | null>(null);
  useEffect(() => {
    if (uiSubPhase !== 'react' || resolvedOutcome === null) return;
    if (firedForOutcomeRef.current === resolvedOutcome) return;
    firedForOutcomeRef.current = resolvedOutcome;
    playSound(resolvedOutcome.pass ? 'encounter-pass' : 'encounter-fail');
  }, [uiSubPhase, resolvedOutcome, playSound]);

  // #484: avatar-arrival sting. Fire once on first prep mount per
  // encounter — the moment the avatar's portrait first appears. Does
  // NOT re-fire on a `react → prep` retry; the avatar is already
  // present on retry and another sting would feel like a re-greet.
  // The ref starts `false`, latches `true` after the first fire, and
  // never resets within this component's lifetime (a fresh encounter
  // unmounts + remounts EncounterScreen, getting a fresh ref).
  const avatarStingFiredRef = useRef(false);
  useEffect(() => {
    if (avatarStingFiredRef.current) return;
    if (uiSubPhase !== 'prep') return;
    const cue = avatarArrivesCueFor(context.sefirah);
    if (cue === null) return;
    avatarStingFiredRef.current = true;
    playSound(cue);
  }, [uiSubPhase, context.sefirah, playSound]);

  const effectiveDC = useMemo(() => {
    const soulDoorDelta = context.soulDoorDelta ?? 0;
    return (
      baseDC + (context.shortcut ? SHORTCUT_DC_PENALTY : 0) + soulDoorDelta
    );
  }, [baseDC, context.shortcut, context.soulDoorDelta]);
  const soulDoorDelta = context.soulDoorDelta ?? 0;
  const showSoulDoor = soulDoorDelta < 0;

  const allies = useMemo(
    () => context.availableAllies ?? [],
    [context.availableAllies],
  );
  const maxCardBurns = context.availableCardBurns ?? 0;
  const maxSparkBurns = context.availableSparkBurns ?? 0;

  // Cumulative card-burn count: engine's preserved `pendingModifiers`
  // (from a prior failed roll, on retry) + this round's staged burns.
  // Surfaces "X cards burned, +Y modifier" so the player sees they're
  // stacking. On the initial encounter the engine's pending is empty
  // and this is just `stagedCardBurns`.
  const cumulativeCardBurns =
    (turn.pendingModifiers?.cardBurns.length ?? 0) + stagedCardBurns;
  const cumulativeSparkBurns =
    (turn.pendingModifiers?.sparkBurns.length ?? 0) + stagedSparkBurns;
  const isRetry = (turn.pendingModifiers?.cardBurns.length ?? 0) > 0;

  const assistTotal = useMemo(() => {
    return allies
      .filter((a) => stagedAssistIds.has(a.id))
      .reduce((sum, a) => sum + Math.floor(a.stat / 2), 0);
  }, [allies, stagedAssistIds]);

  const projectedTotal =
    context.stat +
    assistTotal +
    cumulativeCardBurns * CARD_BURN_BONUS +
    cumulativeSparkBurns * SPARK_BURN_BONUS;

  const toggleAssist = (allyId: string): void => {
    setStagedAssistIds((prev) => {
      const next = new Set(prev);
      if (next.has(allyId)) {
        next.delete(allyId);
        if (mode === 'multiplayer') {
          turn.prepRemoveModifier({ kind: 'assist-request', allyId });
        }
      } else {
        next.add(allyId);
        if (mode === 'multiplayer') {
          turn.prepAddModifier({ kind: 'assist-request', allyId });
        }
      }
      return next;
    });
  };

  // Stepper change handlers — multiplayer dispatches `prep-add-modifier`
  // / `prep-remove-modifier` events as the count changes so other
  // players see the staging in real time. Hot-seat doesn't go over a
  // wire, so the dispatch is deferred to the Roll click (synthesized
  // by `submitChallenge`).
  const adjustCardBurns = (next: number): void => {
    const clamped = Math.max(0, Math.min(maxCardBurns, next));
    if (mode === 'multiplayer' && clamped !== stagedCardBurns) {
      // Synthesize add/remove events for the diff. Card-burn modifiers
      // need an arcanum; we take from the head of the player's hand
      // (deterministic; matches the hot-seat wrapper).
      const playerHand = player?.hand ?? [];
      if (clamped > stagedCardBurns) {
        for (let i = stagedCardBurns; i < clamped; i++) {
          const arcanum = playerHand[i];
          if (arcanum === undefined) break;
          turn.prepAddModifier({ kind: 'card-burn', arcanum });
        }
      } else {
        for (let i = clamped; i < stagedCardBurns; i++) {
          const arcanum = playerHand[i];
          if (arcanum === undefined) break;
          turn.prepRemoveModifier({ kind: 'card-burn', arcanum });
        }
      }
    }
    setStagedCardBurns(clamped);
  };

  const adjustSparkBurns = (next: number): void => {
    const clamped = Math.max(0, Math.min(maxSparkBurns, next));
    if (mode === 'multiplayer' && clamped !== stagedSparkBurns) {
      const heldSparks = player ? Array.from(player.sparksHeld) : [];
      if (clamped > stagedSparkBurns) {
        for (let i = stagedSparkBurns; i < clamped; i++) {
          const sefirah = heldSparks[i];
          if (sefirah === undefined || !player) break;
          turn.prepAddModifier({
            kind: 'spark-burn',
            sefirah,
            sourcePlayerId: player.id,
          });
        }
      } else {
        for (let i = clamped; i < stagedSparkBurns; i++) {
          const sefirah = heldSparks[i];
          if (sefirah === undefined || !player) break;
          turn.prepRemoveModifier({
            kind: 'spark-burn',
            sefirah,
            sourcePlayerId: player.id,
          });
        }
      }
    }
    setStagedSparkBurns(clamped);
  };

  // Stable ref for onResolved so the resolve-timeout doesn't have to
  // depend on the function identity. Mirrors the PlayScreen pattern.
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    onResolvedRef.current = onResolved;
  });

  // Track the resolve-animation timer so we can cancel it if the
  // component unmounts mid-spin. Without this an unmount during the
  // 800ms window leaves a queued setTimeout that fires into an
  // unmounted component (React 18 silently drops the setState, but
  // it's still a defensive smell — and tests using fake timers can
  // surface the dangling handle).
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return (): void => {
      if (resolveTimerRef.current !== null) {
        clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = null;
      }
    };
  }, []);

  const handleRoll = (): void => {
    // Defensive: only roll from prep. Without this guard, a double-
    // click between the click handler and the state flush would fire
    // two rolls and consume two values from `rng`.
    if (uiSubPhase !== 'prep') return;
    if (turn.challengeSubPhase !== 'prep') return;

    const modifiers: CheckModifiers = {
      assistStats: allies
        .filter((a) => stagedAssistIds.has(a.id))
        .map((a) => a.stat),
      // Use cumulative counts so a retry stacks. Engine validates at
      // confirm time and drops anything that no longer applies.
      cardBurns: cumulativeCardBurns,
      sparkBurns: cumulativeSparkBurns,
      shortcutPenalty: context.shortcut ?? false,
      ...(soulDoorDelta !== 0 ? { soulDoorDelta } : {}),
    };
    // Pre-roll the d20 with the same modifiers the engine will use.
    // The engine treats `outcome` as authoritative when supplied, so
    // the displayed face matches state.
    const outcome = rollCheck({
      stat: context.stat,
      dc: baseDC,
      modifiers,
      rng,
    });

    if (mode === 'hot-seat') {
      // Hot-seat: collapse the staging into one shot via the
      // `submitChallenge` wrapper. The wrapper synthesizes per-step
      // modifier events from the active player's hand / sparks and
      // confirms with the supplied outcome.
      turn.submitChallenge(context.sefirah, modifiers, outcome);
    } else {
      // Multiplayer: every modifier was already staged via
      // `prepAddModifier` events. Just confirm.
      turn.prepConfirm(context.sefirah, outcome);
    }
    setResolvedOutcome(outcome);
    setCommittedModifiers(modifiers);
    // Pick the avatar's verdict variant alongside the d20 (#277) so
    // both come from the same rng and replay deterministically under
    // a seeded test. Skipped when the context has no sign (demo /
    // tests without a player) — the fallback placeholder renders.
    if (avatarHasCopy && context.playerSign !== undefined) {
      const line = pickVerdict(
        pantheon.sefirahVerdicts,
        avatarKey,
        context.playerSign,
        outcome.pass ? 'pass' : 'fail',
        rng,
      );
      setVerdictLine(line);
    }
    setAnimatingResolve(true);
    // Lag the engine's already-set 'react' sub-phase by the animation
    // duration so the spin renders before the react choices appear.
    // Honour `prefers-reduced-motion: reduce` — players with motion
    // preferences flip to react immediately (one tick, not 800ms) so
    // they aren't stuck on a static "Rolling…" screen with no visible
    // animation. Mirrors `D20Roll`'s no-animation branch.
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
    const delayMs = reduceMotion
      ? REDUCED_MOTION_RESOLVE_MS
      : RESOLVE_ANIMATION_MS;
    if (resolveTimerRef.current !== null) {
      clearTimeout(resolveTimerRef.current);
    }
    resolveTimerRef.current = setTimeout(() => {
      setAnimatingResolve(false);
      resolveTimerRef.current = null;
    }, delayMs);
  };

  const handleContinue = (): void => {
    if (resolvedOutcome === null || committedModifiers === null) return;
    if (!resolvedOutcome.pass) {
      throw new Error(
        'EncounterScreen.handleContinue: invoked on a failed outcome',
      );
    }
    onResolvedRef.current({
      pass: true,
      outcome: resolvedOutcome,
      modifiers: committedModifiers,
    });
  };

  const handleRetry = (): void => {
    if (resolvedOutcome === null || committedModifiers === null) return;
    // The engine's reducer loops back to prep with cumulative burns
    // preserved. The parent doesn't need to know — onResolved isn't
    // fired for retry; the encounter stays open. The `useEffect`
    // watching `challengeSubPhase` clears staged counters and the
    // outcome cache when the engine signals the loopback.
    turn.reactRetry();
  };

  const handleAccept = (): void => {
    if (resolvedOutcome === null || committedModifiers === null) return;
    onResolvedRef.current({
      pass: false,
      outcome: resolvedOutcome,
      modifiers: committedModifiers,
      choice: 'accept',
    });
  };

  // Per-Sefirah dramatic framing (#315). Glow recipe + tinted accents
  // come from `SEFIRAH_FRAME_TOKENS`; the non-Kether/Malkuth invariant
  // is enforced by the `challenge.kind === 'check'` throw above.
  const frameTokens = SEFIRAH_FRAME_TOKENS[context.sefirah];

  // Reduced-motion snapshot. Owned at the top so each sub-component
  // gets the same value on the same render — avoids the case where
  // VerdictReveal probes mid-render and disagrees with the parent's
  // resolve-timer branch. Read once on mount + on sub-phase change
  // so a media-query change between roll and verdict doesn't tear.
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReducedMotion(mql.matches);
    // No listener wiring — the flag is read once per encounter
    // sub-state. A user toggling reduced-motion mid-encounter is a
    // rare enough case that re-evaluating per state-change covers
    // it without the listener cleanup overhead.
  }, [uiSubPhase]);

  // Avatar caption: in prep, the player-response line; in pass/fail,
  // the verdict. The portrait stays mounted across all three sub-
  // states so its position / breath halo don't reset between them.
  const avatarCaption =
    uiSubPhase === 'prep'
      ? playerResponse
      : verdictLine !== undefined && avatarHasCopy
        ? verdictLine
        : undefined;
  const avatarState: 'prep' | 'pass' | 'fail' =
    uiSubPhase === 'prep'
      ? 'prep'
      : resolvedOutcome?.pass === true
        ? 'pass'
        : 'fail';
  const avatarNameLabel =
    avatarHasCopy && avatarKey in pantheon.avatarNames
      ? pantheon.avatarNames[avatarKey].greek
      : undefined;

  // Trial-framing line for the prep stage. Sign-aware multi-variant
  // copy from `pickFraming` when the encounter context carries a
  // player sign (#478); falls back to the deterministic per-avatar
  // placeholder from `sefirahFramingPlaceholder` when not (demo /
  // tests). Kether/Malkuth are already ruled out by the
  // `challenge.kind === 'check'` guard at mount time, so the
  // narrowed `avatarKey` lookup is total.
  const framingLine =
    pickedFraming ?? pantheon.sefirahFramingPlaceholder[avatarKey];

  // "Twist" banner — only Sefirot with shipped per-Sefirah mechanics
  // (#353 Hod Word-Match, #354 Yesod Dream-Peek) get a banner today.
  // The other six are tracked under Epic #475 and will register their
  // copy in `data/sefirah-twists.ts` as those mechanics land.
  const twistLine = sefirahTwist[avatarKey];

  // Player-sign zodiac entry — used for the Soul-Door payoff callout
  // (#315) when the door is open AND the player's sign was carried
  // through context. Falls back to undefined when sign is absent
  // (demo / test contexts); the original red banner still renders.
  const playerSignEntry =
    context.playerSign !== undefined
      ? zodiacSigns.find((s) => s.key === context.playerSign)
      : undefined;

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby={`encounter-${context.sefirah}-title`}
      data-encounter-screen
      data-encounter-sub-phase={uiSubPhase}
      data-sefirah={context.sefirah}
      data-mode={mode}
      // Border + shadow follow the challenged Sefirah's tokens
      // (`docs/motion.md` § Glow scale). The `bg-ground` keeps the
      // panel itself clearly differentiated from the void
      // substrate underneath.
      className={`relative rounded-lg border bg-ground p-6 text-veil ${frameTokens.frameBorder} ${frameTokens.frameShadow} ${className ?? ''}`}
    >
      {/*
        Header row: title block + small avatar. In `prep`, the avatar
        moves down to the stage section (#479) where it leads the
        screen at full size; the header keeps just the title. In
        resolve / react, the small portrait stays in the header so
        its breath halo doesn't reset between those two sub-states.
      */}
      <header className="flex items-start gap-4">
        {uiSubPhase !== 'prep' ? (
          <AvatarPortrait
            sefirah={context.sefirah}
            state={avatarState}
            size="small"
            {...(avatarNameLabel !== undefined
              ? { avatarName: avatarNameLabel }
              : {})}
            {...(avatarCaption !== undefined ? { caption: avatarCaption } : {})}
          />
        ) : null}
        <div className="flex-1">
          <h2
            id={`encounter-${context.sefirah}-title`}
            // Header underline is the per-Sefirah accent — a 2px
            // border-bottom in the Sefirah's colour. Picks up the
            // `headerAccent` token so swap is one-line.
            className={`border-b-2 pb-1 font-display text-2xl tracking-widest ${frameTokens.headerAccent}`}
          >
            Challenge: {sefirahData.englishName}
          </h2>
          <p className="mt-1 text-sm opacity-70">
            <span className="font-hebrew">{sefirahData.hebrewName}</span>
            {' · DC '}
            {effectiveDC}
            {context.shortcut ? ` (shortcut +${SHORTCUT_DC_PENALTY})` : ''}
          </p>
        </div>
      </header>

      {showSoulDoor ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p
            data-soul-door
            className="rounded border border-illumination/40 bg-illumination/5 px-3 py-1 text-sm"
            style={{ borderColor: sefirahData.color }}
          >
            Soul Door open here: DC {baseDC} → {effectiveDC}
            {context.shortcut
              ? ` (shortcut +${SHORTCUT_DC_PENALTY}, Door −${Math.abs(soulDoorDelta)})`
              : ''}
          </p>
          {playerSignEntry !== undefined ? (
            // Sign-glyph payoff (#315 § 6). Renders the player's
            // zodiac glyph (e.g. ♈) next to the existing banner with
            // "Your Star opens this gate." copy — reads as the
            // payoff for the sign-picker choice.
            <span
              data-soul-door-sign
              className="inline-flex items-center gap-2 rounded border border-veil/20 bg-veil/5 px-3 py-1 text-sm"
            >
              <span aria-hidden className="text-lg">
                {playerSignEntry.glyph}
              </span>
              <span className="opacity-80">Your Star opens this gate.</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {player ? (
        <div className="mt-3 rounded border border-veil/15 bg-ground/60 p-2">
          <StatSheet
            player={player}
            mode="compact"
            activeStat={sefirahData.stat}
          />
        </div>
      ) : null}

      {/*
        Dramatized stat readout — replaces the old illumination-pill.
        Stat icon at large size with a Sefirah-coloured breath halo,
        display-face number, projected total animating upward as
        allies/burns are staged.
      */}
      <div className="mt-4">
        <StatReadout
          stat={sefirahData.stat}
          statLabel={context.statLabel}
          statValue={context.stat}
          projectedTotal={projectedTotal}
          effectiveDC={effectiveDC}
          glowClass={frameTokens.frameShadow}
        />
      </div>

      {uiSubPhase === 'prep' ? (
        <>
          {/*
            Prep stage (#479): avatar leads. The portrait sits at
            stage centre (oval crop, ~240×360 with the commissioned
            half-body painting visible). The trial-framing line — the
            avatar's voice naming the trial — renders in font-display
            italic above the modifier panel. When the Sefirah has a
            shipped per-Sefirah mechanic (#353 Hod, #354 Yesod), the
            "Twist" banner names it in plain language so the player
            sees the rule before staging modifiers
            (`design/per-sefirah-mechanics.md` § 2.2).
          */}
          <div
            data-encounter-prep-stage
            data-framing-complete={framingComplete ? 'true' : 'false'}
            className="mt-6 flex flex-col items-center gap-4"
          >
            <AvatarPortrait
              sefirah={context.sefirah}
              state="prep"
              size="stage"
              {...(avatarNameLabel !== undefined
                ? { avatarName: avatarNameLabel }
                : {})}
              {...(avatarCaption !== undefined
                ? { caption: avatarCaption }
                : {})}
            />
            <p
              data-encounter-framing
              className="max-w-2xl text-balance text-center font-display text-lg italic leading-relaxed opacity-90"
            >
              <RevealLine
                text={framingLine}
                reducedMotionOverride={reducedMotion}
                onComplete={() => setFramingComplete(true)}
              />
            </p>
            {twistLine !== undefined ? (
              <p
                data-encounter-twist
                className={`rounded border px-3 py-1 text-center text-sm ${frameTokens.frameBorder}`}
              >
                <span className="mr-2 uppercase tracking-widest opacity-60">
                  Twist
                </span>
                {twistLine}
              </p>
            ) : null}
          </div>
          <PrepPanel
            mode={mode}
            allies={allies}
            stagedAssistIds={stagedAssistIds}
            toggleAssist={toggleAssist}
            assistTotal={assistTotal}
            stagedCardBurns={stagedCardBurns}
            adjustCardBurns={adjustCardBurns}
            maxCardBurns={maxCardBurns}
            stagedSparkBurns={stagedSparkBurns}
            adjustSparkBurns={adjustSparkBurns}
            maxSparkBurns={maxSparkBurns}
            cumulativeCardBurns={cumulativeCardBurns}
            cumulativeSparkBurns={cumulativeSparkBurns}
            isRetry={isRetry}
            onRoll={handleRoll}
            onCancel={onCancel}
            glowClass={frameTokens.buttonGlow}
          />
        </>
      ) : null}

      {uiSubPhase === 'resolve' && resolvedOutcome !== null ? (
        <ResolvePanel
          outcome={resolvedOutcome}
          glowClass={frameTokens.buttonGlow}
        />
      ) : null}

      {uiSubPhase === 'react' && resolvedOutcome !== null ? (
        <ReactPanel
          outcome={resolvedOutcome}
          onContinue={handleContinue}
          onRetry={handleRetry}
          onAccept={handleAccept}
          reducedMotion={reducedMotion}
          glowClass={frameTokens.buttonGlow}
          {...(avatarHasCopy
            ? { avatarName: pantheon.avatarNames[avatarKey].greek }
            : {})}
          {...(verdictLine !== undefined ? { verdictLine } : {})}
        />
      ) : null}
    </section>
  );
}

interface PrepPanelProps {
  readonly mode: 'hot-seat' | 'multiplayer';
  readonly allies: readonly {
    readonly id: string;
    readonly name: string;
    readonly stat: number;
  }[];
  readonly stagedAssistIds: ReadonlySet<string>;
  readonly toggleAssist: (id: string) => void;
  readonly assistTotal: number;
  readonly stagedCardBurns: number;
  readonly adjustCardBurns: (n: number) => void;
  readonly maxCardBurns: number;
  readonly stagedSparkBurns: number;
  readonly adjustSparkBurns: (n: number) => void;
  readonly maxSparkBurns: number;
  readonly cumulativeCardBurns: number;
  readonly cumulativeSparkBurns: number;
  readonly isRetry: boolean;
  readonly onRoll: () => void;
  readonly onCancel: (() => void) | undefined;
  /**
   * Sefirah-coloured glow class — applied to the d20 roll button so
   * it reads as part of the same dramatic frame. Comes from the
   * parent's `SEFIRAH_FRAME_TOKENS[context.sefirah].buttonGlow`.
   */
  readonly glowClass: string;
}

function PrepPanel(props: PrepPanelProps): JSX.Element {
  // #315: `projectedTotal` and `effectiveDC` previously rendered
  // in the prep-panel "Projected before d20" footer; that block is
  // gone — the new `StatReadout` (rendered by the parent above
  // this panel) carries the canonical [data-projected-total]
  // surface. PrepPanel no longer needs either field.
  const {
    mode,
    allies,
    stagedAssistIds,
    toggleAssist,
    assistTotal,
    stagedCardBurns,
    adjustCardBurns,
    maxCardBurns,
    stagedSparkBurns,
    adjustSparkBurns,
    maxSparkBurns,
    cumulativeCardBurns,
    cumulativeSparkBurns,
    isRetry,
    onRoll,
    onCancel,
    glowClass,
  } = props;
  return (
    <div className="mt-4 space-y-4" data-encounter-prep>
      {isRetry ? (
        // Retry context — the player is stacking burns on top of a
        // failed-roll's preserved cumulative count. Surface what's
        // already locked in by the engine so they can see they're
        // stacking, not double-paying.
        <p
          data-cumulative-burns
          className="rounded border border-veil/20 bg-veil/5 px-3 py-1 text-xs opacity-80"
        >
          {cumulativeCardBurns} cards burned, +
          {cumulativeCardBurns * CARD_BURN_BONUS +
            cumulativeSparkBurns * SPARK_BURN_BONUS}
          {' modifier'}
        </p>
      ) : null}

      {allies.length > 0 ? (
        <fieldset data-modifier="assist">
          <legend className="text-xs uppercase tracking-widest opacity-60">
            Allies (each adds half their stat, rounded down)
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {allies.map((ally) => {
              const checked = stagedAssistIds.has(ally.id);
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
                  {mode === 'multiplayer' && checked ? (
                    // Multiplayer: surface the offering state so allies
                    // know their assist is staged. Hot-seat doesn't
                    // need this — there's no remote ally to coordinate
                    // with on a single device.
                    <span data-ally-offering className="ml-1 text-xs opacity-70">
                      (offering +{Math.floor(ally.stat / 2)} stat)
                    </span>
                  ) : null}
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
        value={stagedCardBurns}
        max={maxCardBurns}
        onChange={adjustCardBurns}
      />
      <Stepper
        kind="sparkBurns"
        label={`Burn sparks (+${SPARK_BURN_BONUS} each)`}
        value={stagedSparkBurns}
        max={maxSparkBurns}
        onChange={adjustSparkBurns}
      />

      <div className="flex items-center justify-center gap-4 pt-2">
        <D20Button
          state="idle"
          glowClass={glowClass}
          onClick={onRoll}
          caption="Roll"
        />
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

function Stepper({
  kind,
  label,
  value,
  max,
  onChange,
}: StepperProps): JSX.Element {
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

interface ResolvePanelProps {
  readonly outcome: CheckOutcome;
  readonly glowClass: string;
}

function ResolvePanel({ outcome, glowClass }: ResolvePanelProps): JSX.Element {
  return (
    <div
      className="mt-6 flex flex-col items-center gap-3"
      data-encounter-resolve
    >
      <D20Button
        state="rolling"
        value={outcome.rolled}
        glowClass={glowClass}
        caption="Rolling…"
        disabled
      />
      <div
        // The d20 face is the only unambiguous status the resolve
        // sub-state can announce — modifier breakdown text appears in
        // the react sub-state once the spin settles. Keeping the
        // live region empty during the spin means screen readers don't
        // announce a stale value mid-roll.
        role="status"
        aria-live="polite"
        className="text-xs uppercase tracking-widest opacity-70"
        data-encounter-resolve-status
      >
        Rolling…
      </div>
      <ModifierStack outcome={outcome} />
    </div>
  );
}

function ModifierStack({ outcome }: { outcome: CheckOutcome }): JSX.Element {
  return (
    <ul
      data-modifier-stack
      className="mt-1 flex flex-wrap justify-center gap-2 text-xs opacity-80"
    >
      <li data-stack-item="stat">+{outcome.statContribution} stat</li>
      {outcome.modifierBreakdown.cardBurn > 0 ? (
        <li data-stack-item="card-burn">
          +{outcome.modifierBreakdown.cardBurn} cards
        </li>
      ) : null}
      {outcome.modifierBreakdown.sparkBurn > 0 ? (
        <li data-stack-item="spark-burn">
          +{outcome.modifierBreakdown.sparkBurn} spark
        </li>
      ) : null}
      {outcome.modifierBreakdown.assist > 0 ? (
        <li data-stack-item="assist">+{outcome.modifierBreakdown.assist} ally</li>
      ) : null}
    </ul>
  );
}

interface ReactPanelProps {
  readonly outcome: CheckOutcome;
  readonly onContinue: () => void;
  readonly onRetry: () => void;
  readonly onAccept: () => void;
  readonly reducedMotion: boolean;
  readonly glowClass: string;
  /**
   * Greek avatar name (e.g. "Hermes", "Demeter"). Optional — when
   * absent (demo / tests without a player sign), the placeholder
   * "The gate considers you." line is rendered instead. Roman names
   * (and any future-pantheon names) live on the active `Pantheon`
   * object via `usePantheon()` (#293 — Phase A2/#548 added the hook,
   * Phase A3/#549 wired consumers).
   */
  readonly avatarName?: string;
  /**
   * The picked verdict line for this (sefirah, sign, outcome).
   * Owned by the parent so the picker's rng consumption is colocated
   * with the d20 roll. Optional — placeholder fallback as above.
   */
  readonly verdictLine?: string;
}

function ReactPanel({
  outcome,
  onContinue,
  onRetry,
  onAccept,
  reducedMotion,
  glowClass,
  avatarName,
  verdictLine,
}: ReactPanelProps): JSX.Element {
  return (
    <div
      className="mt-6 flex flex-col items-center gap-3"
      data-encounter-react
    >
      <D20Button
        state="settled"
        value={outcome.rolled}
        result={outcome.pass ? 'pass' : 'fail'}
        glowClass={glowClass}
        caption={`${outcome.total} vs ${outcome.effectiveDC}`}
        disabled
      />
      <div
        role="status"
        aria-live="polite"
        data-result={outcome.pass ? 'pass' : 'fail'}
        className="text-center font-display tracking-widest"
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
      <VerdictReveal
        outcome={outcome}
        reducedMotion={reducedMotion}
        {...(avatarName !== undefined ? { avatarName } : {})}
        {...(verdictLine !== undefined ? { verdictLine } : {})}
      />
      {outcome.pass ? (
        <button
          type="button"
          onClick={onContinue}
          data-action="continue"
          // Pass action: bright Tiferet-gold button so the success
          // path reads as the rewarded one.
          className="mt-2 rounded bg-illumination px-4 py-2 font-display tracking-widest text-ground shadow-glow-tiferet"
        >
          Continue
        </button>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            data-fail-choice="retry"
            // Fail / retry: bright option — burn-another-card is the
            // active choice. Borders use the Sefirah glow so it
            // stays themed.
            className={`rounded border border-illumination px-4 py-2 text-sm ${glowClass}`}
          >
            Burn another card to retry
          </button>
          <button
            type="button"
            onClick={onAccept}
            data-fail-choice="accept"
            // Fail / accept: dim/heavy — visually the resigned
            // option. No glow; muted background; opacity dropped.
            className="rounded bg-veil/10 px-4 py-2 text-sm opacity-70"
          >
            Accept setback
          </button>
        </div>
      )}
    </div>
  );
}

// Re-export the modifier shape so callers can construct one without
// digging into `lib/turn-machine`.
export type { PrepModifier };
