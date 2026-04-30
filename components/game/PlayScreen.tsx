'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sefirahByKey, tryPathByNumber } from '@/data';
import { TreeBoard } from '@/components/tree/TreeBoard';
import { Hand } from '@/components/hand/Hand';
import { StatSheet } from '@/components/player/StatSheet';
import { TeamMeters } from '@/components/meters/TeamMeters';
import { ShellPanel } from '@/components/shells/ShellPanel';
import { DiscardPrompt } from '@/components/game/DiscardPrompt';
import { EncounterScreen } from '@/components/game/EncounterScreen';
import type {
  ChallengeContext,
  ChallengeResolution,
} from '@/lib/challenge-types';
import { FinalThreshold } from '@/components/game/FinalThreshold';
import type { FinalThresholdResult } from '@/engine/endgame';
import { isHandVisible } from '@/components/hand/visibility';
import { useTurn, type TurnPhase } from '@/lib/use-turn';
import type { Rng } from '@/engine/rng';
import type { GameState } from '@/engine/types';
import { checkEndgame } from '@/engine/endgame';
import { soulDoorDcDelta } from '@/engine/soul-door-bonus';

/**
 * Top-level play surface. Composes every Phase 3 component around the
 * `useTurn` state machine. This is the integration that turns the
 * engine + UI library into something a human can actually play.
 *
 * Single-screen orchestrator (no multiplayer routing yet — Phase 5):
 *   - Tree (current player's valid moves highlighted)
 *   - Hand (visibility-aware, owner sees own; others by upper-Tree rule)
 *   - StatSheet for the active player (active stat highlighted during a check)
 *   - TeamMeters (Illumination / Separation / pillar streak)
 *   - ShellPanel
 *   - EncounterScreen opens automatically when the active player arrives at
 *     an uncleared `'check'`-kind Sefirah (replaces the prior ChallengeModal
 *     in #228; ChallengeModal stays alive for `/demo/challenge` only).
 *   - FinalThreshold takes over when all players reach Kether
 *
 * The orchestrator does not own GameState authoritatively — `useTurn`
 * exposes a `setState` hook for server pushes (Phase 5). For now the
 * hook owns local state.
 */

interface PlayScreenProps {
  readonly initialState: GameState;
  readonly rng: Rng;
  readonly className?: string;
}

/**
 * Delay before the orchestrator auto-advances from `'end'` phase to
 * the next player's turn (#131). 1500ms is long enough for a player
 * to glance at the result and short enough that it doesn't feel
 * like a stall. Manual End Turn clicks override / cancel the timer.
 *
 * Exported so tests can reference the canonical value rather than
 * hardcoding `1500` in two places.
 */
export const AUTO_ADVANCE_DELAY_MS = 1500;

export function PlayScreen({
  initialState,
  rng,
  className,
}: PlayScreenProps): JSX.Element {
  const turn = useTurn({ initialState, rng });
  const [thresholdResult, setThresholdResult] =
    useState<FinalThresholdResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | undefined>(undefined);

  // #131: hot-seat cadence — once the active player lands in `'end'`
  // phase, schedule an auto-advance to the next turn after a short
  // delay. Without this the player has to click End Turn explicitly,
  // which is friction in a single-device session. Manual click still
  // works (the timer is cleared when the phase changes off `'end'`,
  // including via the explicit endTurn). No auto-advance during
  // `'challenge'` — that path requires player input by design.
  //
  // #291: also no auto-advance while pendingDiscard.count > 0 — the
  // engine's endTurn would refuse anyway, but the explicit gate
  // here keeps the timer from re-arming on every discard click as
  // the count decrements. The DiscardPrompt is interactive and
  // already gates the cadence; let the player drive.
  //
  // #292: also no auto-advance after Meditate. Meditate transitions
  // straight to `'end'` after drawing up to two new cards; if the
  // timer fired the seat would rotate before the meditator could
  // see what they drew. The reducer stamps `state.lastAction =
  // 'meditate'` for that path; gate the timer on `'move-draw'` (the
  // Move + Draw arrival, which is what #131 was designed for).
  // Note: an at-cap Meditate ALSO sets `pendingDiscard.count > 0`,
  // so the #291 gate above already catches that branch — but Meditate
  // *under* cap leaves pendingDiscard undefined while still wanting
  // the no-auto-advance behaviour, which is what `lastAction` covers.
  //
  // Stable callback ref: `turn.endTurn` is `useCallback` but its dep
  // list includes the engine snapshot, so the function reference
  // changes on every state update. If we depended on it directly the
  // timer would re-arm on every unrelated render — fine in test but
  // not under Phase-5 Supabase realtime pushes. Mirror the latest
  // `endTurn` into a ref via `useLayoutEffect` and only depend on
  // `turn.phase` so the timer arms once per `'end'` transition.
  const endTurnRef = useRef(turn.endTurn);
  useLayoutEffect(() => {
    endTurnRef.current = turn.endTurn;
  });
  const pendingDiscardCount = turn.state.pendingDiscard?.count ?? 0;
  const lastAction = turn.state.lastAction;
  useEffect(() => {
    if (turn.phase !== 'end') return undefined;
    if (pendingDiscardCount > 0) return undefined;
    if (lastAction === 'meditate') return undefined;
    const handle = setTimeout(() => {
      endTurnRef.current();
    }, AUTO_ADVANCE_DELAY_MS);
    return (): void => clearTimeout(handle);
  }, [turn.phase, pendingDiscardCount, lastAction]);

  const activePlayer = turn.state.players[turn.activePlayerIndex];
  const endgame = checkEndgame(turn.state);
  const allAtKether =
    turn.state.players.length > 0 &&
    turn.state.players.every((p) => p.position === 'kether');

  // Final Threshold takeover: once all players reach Kether, the play
  // surface yields to the threshold ritual. The engine runs the actual
  // win/loss check inside `resolveFinalThreshold`.
  if (allAtKether && thresholdResult === null) {
    return (
      <FinalThreshold
        state={turn.state}
        onResolved={(r) => setThresholdResult(r)}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  if (endgame.status === 'lost') {
    return (
      <section
        data-play-screen
        data-status="lost"
        className={`mx-auto max-w-md p-8 text-center text-veil ${className ?? ''}`}
      >
        <h2 className="font-display text-3xl tracking-widest">The light fell.</h2>
        <p className="mt-2 italic opacity-80">
          {endgame.reason === 'separation-overflow'
            ? 'Separation overflowed the Tree.'
            : 'The team is stranded.'}
        </p>
      </section>
    );
  }

  // Challenge modal: useTurn's phase moves to 'challenge' when the
  // active player arrives at an uncleared 'check' Sefirah.
  const showChallenge =
    turn.phase === 'challenge' &&
    activePlayer !== undefined &&
    !activePlayer.clearedSefirot.has(activePlayer.position);

  const challengeContext: ChallengeContext | null =
    showChallenge && activePlayer
      ? buildChallengeContext(turn.state, activePlayer.id)
      : null;

  const handlePathClick = (pathNumber: number): void => {
    if (!activePlayer) return;
    if (selectedCard === undefined) {
      // No card selected — short-circuit. Phase 6 polish: surface a
      // hint that the player must select a card first.
      return;
    }
    const path = tryPathByNumber(pathNumber);
    if (!path || path.arcanumNumber !== selectedCard) return;
    const result = turn.move(pathNumber);
    if (result.ok) {
      setSelectedCard(undefined);
    }
  };

  const handleChallengeResolved = (resolution: ChallengeResolution): void => {
    if (!activePlayer) return;
    const ctx = challengeContext;
    if (!ctx) return;
    // EncounterScreen calls the engine itself (`submitChallenge` for
    // hot-seat, `prepConfirm` for multiplayer) before invoking
    // `onResolved`, so by the time we get here the engine's
    // post-resolve snapshot already reflects the pass-with-Spark or
    // fail-no-state-change outcome. The orchestrator no longer
    // forwards the outcome to the engine — that double-dispatched the
    // event in the pre-#228 ChallengeModal flow and is unnecessary now.
    //
    // The retry path doesn't reach here: `EncounterScreen` handles
    // it internally via `turn.reactRetry()` and stays mounted. The
    // only resolutions surfaced are `pass` (player saw the win, hit
    // Continue) and `accept` (player saw the fail, hit Accept setback).
    if (resolution.pass) {
      // Engine already cleared the Sefirah and ticked Illumination —
      // nothing to do here. The next render's `showChallenge` gate
      // unmounts the EncounterScreen because the player's
      // `clearedSefirot` now contains their position.
      return;
    }
    // 'accept': apply the engine's failure consequence — Separation
    // ticks up by 1 (or +2 on shortcut arrivals) — and advance the
    // phase to 'draw'. ATOMICALLY via `acceptChallengeSetback`. The
    // earlier pattern (setState(acceptSetback(...)) +
    // submitChallenge(failed-outcome)) lost the setback to a React
    // batching race: submitChallenge's internal `setState(unchanged)`
    // overwrote the setback in the same flush. The dedicated action
    // collapses both updates into one setState call.
    turn.acceptChallengeSetback({
      sefirah: ctx.sefirah,
      shortcut: ctx.shortcut ?? false,
    });
  };

  return (
    <main
      data-play-screen
      data-phase={turn.phase}
      data-active-player={activePlayer?.id}
      className={`mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_400px] ${className ?? ''}`}
    >
      <section aria-label="Tree of Life board" className="flex flex-col items-center gap-4">
        <TreeBoard
          state={turn.state}
          {...(activePlayer ? { activePlayerId: activePlayer.id } : {})}
          onPathClick={handlePathClick}
          // #129: only highlight paths during the move phase. Once
          // the player has moved, the board is decorative until the
          // next turn begins; the action panel below carries the
          // available affordances (Draw, End Turn, etc.).
          movesEnabled={turn.phase === 'move'}
          className="w-full max-w-xl"
        />
        <div className="flex w-full max-w-xl flex-col items-stretch gap-2 rounded border border-veil/20 bg-ground/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <span
            className="text-xs uppercase tracking-widest opacity-60"
            data-phase-hint
          >
            {phaseHint(turn.phase)}
          </span>
          <span className="font-display tracking-widest">
            {activePlayer?.name ?? '—'}&apos;s turn
          </span>
          <div className="flex gap-2">
            {turn.phase === 'move' ? (
              <MeditateButton onMeditate={turn.meditate} />
            ) : null}
            {turn.phase === 'draw' ? (
              <button
                type="button"
                onClick={() => turn.draw()}
                data-action="draw"
                className="min-h-11 rounded border border-illumination/60 px-3 py-2 text-xs"
              >
                Draw
              </button>
            ) : null}
            {turn.phase === 'end' ? (
              <button
                type="button"
                onClick={() => turn.endTurn()}
                data-action="end-turn"
                className="min-h-11 rounded bg-illumination px-3 py-2 text-xs text-ground"
              >
                End turn
              </button>
            ) : null}
          </div>
        </div>
        {/*
         * #292: post-Meditate a11y callout. The auto-advance timer
         * is suppressed for this path so the player can read the
         * cards they just drew; the aria-live region nudges screen-
         * reader users that the turn is paused awaiting their input.
         * `polite` (not `assertive`) so it queues behind any
         * in-progress announcement (e.g. the move resolution) rather
         * than interrupting it.
         */}
        {turn.phase === 'end' && lastAction === 'meditate' ? (
          <div
            role="status"
            aria-live="polite"
            data-meditate-callout
            className="w-full max-w-xl rounded border border-veil/20 bg-ground/40 px-4 py-2 text-xs italic opacity-80"
          >
            Review the cards you drew, then click End turn when ready.
          </div>
        ) : null}
        {activePlayer ? (
          <Hand
            hand={activePlayer.hand}
            visible={isHandVisible(turn.state, activePlayer.id, activePlayer.id)}
            onCardSelect={(n) => setSelectedCard(n)}
            {...(selectedCard !== undefined ? { selectedArcanum: selectedCard } : {})}
            ariaLabel={`${activePlayer.name}'s hand`}
            className="w-full max-w-xl"
          />
        ) : null}
      </section>

      <aside aria-label="Game status" className="flex flex-col gap-6 text-veil">
        {activePlayer ? (
          <div className="rounded border border-veil/20 bg-ground/40 p-4">
            <StatSheet player={activePlayer} />
          </div>
        ) : null}
        <div className="rounded border border-veil/20 bg-ground/40 p-4">
          <TeamMeters
            illumination={turn.state.illumination}
            separation={turn.state.separation}
            pillarStreak={turn.state.pillarStreak}
          />
        </div>
        <div className="rounded border border-veil/20 bg-ground/40 p-4">
          <ShellPanel shells={turn.state.shells} headingLevel={3} />
        </div>
      </aside>

      {challengeContext && activePlayer ? (
        // #38: full-screen overlay on narrow viewports — the modal's
        // 448 px max-width is wider than a 320 px phone. Drop the
        // outer padding below `sm:` so the dialog reaches the edges,
        // and let the modal itself shrink via its own className.
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-ground/80 p-0 sm:p-4">
          <EncounterScreen
            // Hot-seat: the orchestrator runs on a single device so
            // we collapse prep-staging into one Roll click via the
            // `submitChallenge` wrapper. Multiplayer wiring (Phase 5)
            // flips this to 'multiplayer' so each modifier goes over
            // the wire and other players see the staging in real
            // time.
            mode="hot-seat"
            context={challengeContext}
            rng={rng}
            turn={turn}
            onResolved={handleChallengeResolved}
            // #134: embedded stat sheet so players can see their
            // full stat row without dismissing the dialog.
            player={activePlayer}
            // #38: on `sm:` and up the dialog stays centred at 28rem;
            // below that it fills the screen so a 320 px viewport
            // gets a usable dialog without horizontal scrolling.
            className="min-h-screen w-full sm:min-h-fit sm:max-w-md"
          />
        </div>
      ) : null}

      {/*
       * #291: end-of-turn over-cap reconciliation. Renders when the
       * active player Meditated past HAND_CAP and still owes a trim;
       * unmounts as soon as count reaches 0 (the engine's discard
       * reducer clears pendingDiscard at that point). The auto-
       * advance timer is gated on count === 0, so the player drives
       * the cadence here.
       */}
      {pendingDiscardCount > 0 && activePlayer ? (
        <DiscardPrompt
          hand={activePlayer.hand}
          count={pendingDiscardCount}
          onDiscard={(arcanum) => turn.discard(arcanum)}
        />
      ) : null}
    </main>
  );
}

/**
 * Build a ChallengeContext from the active player's current state.
 * The check is for the Sefirah they just arrived at; the relevant
 * stat is that Sefirah's stat. Allies are other players currently
 * at the same Sefirah; their relevant stat is the same.
 *
 * Shortcut derivation: a "shortcut" arrival is one that travelled a
 * central-pillar path (Kether↔Tiferet, Tiferet↔Yesod, Yesod↔Malkuth —
 * `pillarsCrossed === ['balance', 'balance']`). The flag drives BOTH
 * the +3 DC penalty inside `EncounterScreen` AND the +2 Separation
 * tick on `acceptChallengeSetback` (vs. the +1 tick on a non-shortcut
 * failure) — without it the engine silently applies the wrong cost
 * for any shortcut-path failure. Pre-#228 review fix this field was
 * never populated; `acceptChallengeSetback` always saw `shortcut: false`.
 */
function buildChallengeContext(
  state: GameState,
  playerId: string,
): ChallengeContext | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  const sefirahData = sefirahByKey(player.position);
  if (sefirahData.challenge.kind !== 'check') return null;
  const allies = state.players
    .filter(
      (p) =>
        p.id !== player.id && p.position === player.position,
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      stat: p.stats[sefirahData.stat],
    }));
  // #245 / Epic #240: compute the Door delta here (where we already
  // have the player + sefirah) so the modal can render the "Soul Door
  // open here" callout and pass the delta through to CheckModifiers.
  // zodiacSign is required on PlayerState since #237 (T8); the modal's
  // `showSoulDoor` guard skips the callout when the delta is 0.
  const doorDelta = soulDoorDcDelta(player.zodiacSign, sefirahData.key);
  // Derive shortcut from the path the player just travelled. Set by
  // `engine/movement.ts:applyMove`; `undefined` for a fresh game (no
  // moves yet) which folds to a non-shortcut arrival. A "shortcut"
  // path is one whose `pillarsCrossed` is two `'balance'` entries —
  // i.e. Kether↔Tiferet, Tiferet↔Yesod, Yesod↔Malkuth (paths 13, 25, 32).
  const lastPath =
    player.lastArrivalPathNumber !== undefined
      ? tryPathByNumber(player.lastArrivalPathNumber)
      : undefined;
  const isShortcut =
    lastPath !== undefined &&
    lastPath.pillarsCrossed[0] === 'balance' &&
    lastPath.pillarsCrossed[1] === 'balance';
  return {
    sefirah: sefirahData.key,
    stat: player.stats[sefirahData.stat],
    statLabel: sefirahData.stat,
    availableAllies: allies,
    availableCardBurns: player.hand.length,
    availableSparkBurns: player.sparksHeld.size,
    playerSign: player.zodiacSign,
    ...(doorDelta !== 0 ? { soulDoorDelta: doorDelta } : {}),
    ...(isShortcut ? { shortcut: true } : {}),
  };
}

/**
 * Meditate button. Always enabled (#291): clicking from at-or-above
 * HAND_CAP draws past the cap and renders a DiscardPrompt for the
 * over-cap excess. The pre-#291 disable-at-cap gating produced a
 * softlock when the player had no usable paths.
 *
 * `onMeditate` is `() => void` because the button discards the
 * caller's return value (`turn.meditate` returns `GameState`, but
 * the button doesn't use it).
 */
function MeditateButton({
  onMeditate,
}: {
  onMeditate: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onMeditate()}
      data-action="meditate"
      className="min-h-11 rounded border border-veil/30 px-3 py-2 text-xs"
    >
      Meditate
    </button>
  );
}

/**
 * Plain-English phase hint shown next to the active player's name.
 * Replaces the raw enum value (`Phase: draw`) so a first-time player
 * can read the panel and know what they're allowed to do without
 * knowing the engine's vocabulary (#129).
 */
function phaseHint(phase: TurnPhase): string {
  switch (phase) {
    case 'move':
      return 'Pick a card and a path, or meditate';
    case 'challenge':
      return 'Resolve the challenge';
    case 'draw':
      return 'Draw to refill your hand';
    case 'end':
      return 'Move complete — end turn';
  }
}
