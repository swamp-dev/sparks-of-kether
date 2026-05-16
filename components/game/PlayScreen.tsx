'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isPathShortcut, sefirahByKey, tryPathByNumber } from '@/data';
import type { SefirahKey } from '@/data';
import { TreeBoard } from '@/components/tree/TreeBoard';
import { Hand } from '@/components/hand/Hand';
import { StatSheet } from '@/components/player/StatSheet';
import { TeamMeters } from '@/components/meters/TeamMeters';
import { ShellPanel } from '@/components/shells/ShellPanel';
import { DiscardPile } from '@/components/game/DiscardPile';
import { EncounterScreen } from '@/components/game/EncounterScreen';
import { SefirahInfoPopover } from '@/components/game/SefirahInfoPopover';
import { SettingsButton } from '@/components/play/SettingsButton';
import type { ChallengeContext, ChallengeResolution } from '@/lib/challenge-types';
import { FinalThresholdScreen } from '@/components/game/FinalThresholdScreen';
import { isKetherHeld } from '@/engine/kether';
import { isHandVisible } from '@/components/hand/visibility';
import { useTurn, type TurnPhase } from '@/lib/use-turn';
import { useSound } from '@/lib/sound/useSound';
import { useMusic } from '@/lib/music/useMusic';
import type { Rng } from '@/engine/rng';
import type { GameState } from '@/engine/types';
import { checkEndgame } from '@/engine/endgame';
import { soulDoorDcDelta } from '@/engine/soul-door-bonus';

/**
 * Top-level play surface. Composes every Phase 3 component around the
 * `useTurn` state machine. This is the integration that turns the
 * engine + UI library into something a human can actually play.
 *
 * Hot-seat by default; multiplayer when the optional `roomCode` prop
 * is supplied (#278). The roomCode flips the rendered EncounterScreen
 * into multiplayer mode so each staged modifier dispatches a per-step
 * `prep-add-modifier` event over the wire (design § 7).
 *
 * Single-screen orchestrator:
 *   - Tree (current player's valid moves highlighted)
 *   - Hand (visibility-aware, owner sees own; others by upper-Tree rule)
 *   - StatSheet for the active player (active stat highlighted during a check)
 *   - TeamMeters (Illumination / Separation / pillar streak)
 *   - ShellPanel
 *   - EncounterScreen opens automatically when the active player arrives at
 *     an uncleared `'check'`-kind Sefirah (replaces the prior ChallengeModal
 *     in #228; ChallengeModal stays alive for `/demo/challenge` only).
 *   - FinalThresholdScreen (K3 of #285) takes over when phase ===
 *     'kether' (the engine's all-at-Kether trigger from #344). Held
 *     seats — players already at Kether but waiting for the team —
 *     also route through FinalThresholdScreen for the pre-ritual hold
 *     view (per `design/final-threshold.md` § 2.1).
 *
 * The orchestrator does not own GameState authoritatively — `useTurn`
 * exposes a `setState` hook for server pushes (Phase 5). For now the
 * hook owns local state.
 */

interface PlayScreenProps {
  readonly initialState: GameState;
  readonly rng: Rng;
  readonly className?: string;
  /**
   * Multiplayer room code. When set, this PlayScreen instance is
   * embedded in a Supabase-backed room and the rendered
   * `EncounterScreen` flips its `mode` to `'multiplayer'` — each
   * staged modifier dispatches a `prep-add-modifier` /
   * `prep-remove-modifier` event through `useTurn` so allies see
   * staging in real time (design/encounter-prep-phase.md § 7).
   *
   * When absent, mode defaults to `'hot-seat'` and the hot-seat
   * `submitChallenge` wrapper synthesizes burns at Roll time. The
   * code itself is currently only used as a presence signal — no
   * data-fetching is wired here yet; the upstream caller (e.g. a
   * future `/rooms/[code]/play` route) is responsible for plumbing
   * room state into `initialState`. The full real-Realtime e2e is
   * blocked on #325 (joinRoom RLS fix) and a `/rooms/[code]/play`
   * route landing.
   */
  readonly roomCode?: string;
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
  roomCode,
}: PlayScreenProps): JSX.Element {
  const turn = useTurn({ initialState, rng });
  const [selectedCard, setSelectedCard] = useState<number | undefined>(undefined);
  // #405: separate hover state, so path-light fires on card hover/focus
  // BEFORE the player commits to a click. Hovered takes precedence over
  // selected when both are set; clearing hover (mouseleave/blur) falls
  // back to the selected card so a clicked-then-mouse-moved-away card
  // still keeps the Tree lit. Across all phases except `'challenge'` —
  // the Tree should not compete with movement-resolution animation.
  const [hoveredCard, setHoveredCard] = useState<number | undefined>(undefined);
  // #412: arcanum currently being dragged from the hand. Drives the
  // Tree's `highlightedCard` while the gesture is live (so the
  // matching path lights up under the finger before the drop
  // commits). Cleared on drop or cancel.
  const [draggingCard, setDraggingCard] = useState<number | undefined>(undefined);
  // #412: aria-live announcement for invalid drag-to-play attempts.
  // Sighted players see the card snap back; AT users hear it. Empty
  // string between announcements so re-attempts re-announce.
  const [dragAnnouncement, setDragAnnouncement] = useState('');
  // #405: clear both card-state values when the turn rotates. Without
  // this, the new player's Tree would open with a stale highlight from
  // the previous player's hovered/selected card and self-heal only on
  // their first interaction.
  useEffect(() => {
    setSelectedCard(undefined);
    setHoveredCard(undefined);
    setDraggingCard(undefined);
  }, [turn.activePlayerIndex]);
  // #384: in-game Sefirah info popover. The Tree's `onSefirahClick`
  // sets this; the popover renders an overlay with name / Hebrew /
  // meaning / stat / soul-door indicator and a "Read more in Codex"
  // link that opens in a new tab so reading the full Codex page
  // doesn't lose game state. Closed via the X button, the backdrop,
  // or Escape.
  const [openSefirah, setOpenSefirah] = useState<SefirahKey | undefined>(undefined);

  // #321: sound wiring. The Meters and ShellPanel below already
  // expose state-change callbacks (`onIlluminationIncrease`,
  // `onShellAwakened`, etc.) — we route those into `playSound`
  // directly. For events that don't yet have callbacks (Spark
  // collected on challenge pass, card drawn) we watch derived state
  // here. Keeping the calls at the orchestrator level avoids
  // sprinkling sound logic through pure-display components.
  const { playSound } = useSound();
  // Watch the active player's sparksHeld and hand sizes. A net
  // increase fires the appropriate cue. Edge case: rotating to a
  // different active player (size difference is incidental, not a
  // gameplay event) — we key the watcher on activePlayerIndex so
  // a turn-change resets the baseline. Without that gate, every
  // hot-seat rotation would fire spurious cues.
  const turnIndex = turn.activePlayerIndex;
  const activeForSound = turn.state.players[turnIndex];
  const sparksCount = activeForSound?.sparksHeld.size ?? 0;
  const handCount = activeForSound?.hand.length ?? 0;
  // Refs seed to the current count on first render so the initial
  // mount NEVER fires a spurious cue — fresh-game start at 0 sparks /
  // 0 cards is the common case, but if a future fixture seeds players
  // with non-zero state, this still does the right thing (no chime
  // for the seed values; only growth from this point onward fires).
  const prevSparksRef = useRef(sparksCount);
  const prevHandRef = useRef(handCount);
  const prevTurnIndexRef = useRef(turnIndex);
  useEffect(() => {
    if (prevTurnIndexRef.current !== turnIndex) {
      // Turn rotated — reset baselines without firing cues.
      prevTurnIndexRef.current = turnIndex;
      prevSparksRef.current = sparksCount;
      prevHandRef.current = handCount;
      return;
    }
    if (sparksCount > prevSparksRef.current) {
      playSound('spark-collected');
    }
    if (handCount > prevHandRef.current) {
      // Card drawn — only the active-turn Meditate is a player-initiated
      // draw that warrants the chime. The start-of-turn refill (#502)
      // happens at seat rotation, which the early-return above resets
      // baselines for without firing any cue — that's intentional: the
      // new active player didn't *do* anything to draw, the cards just
      // appear at turn start, and chiming on every seat rotation would
      // be noisy. Future hand-growing effects (e.g. a Spark ability
      // that returns a played card) are *not* draws and should not fire
      // this chime; the `meditatedThisTurn` gate excludes them.
      // Throttle inside `useSound` keeps a multi-card Meditate to one
      // chime.
      if (turn.state.meditatedThisTurn === true) {
        playSound('card-drawn');
      }
    }
    prevSparksRef.current = sparksCount;
    prevHandRef.current = handCount;
  }, [turnIndex, sparksCount, handCount, turn.state.meditatedThisTurn, playSound]);

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
  // #503: post-#503 Meditate stays in `'move'` (it no longer
  // transitions to `'end'`), so the original "no auto-advance after
  // Meditate" suppression is no longer reachable from this gate —
  // landing in `'end'` always means a Move/Challenge has resolved
  // and the auto-advance is appropriate. The `pendingDiscard` gate
  // below still catches the at-cap-Meditate-then-clicks-End case
  // (the player must trim down before End-turn fires).
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
  useEffect(() => {
    if (turn.phase !== 'end') return undefined;
    if (pendingDiscardCount > 0) return undefined;
    const handle = setTimeout(() => {
      endTurnRef.current();
    }, AUTO_ADVANCE_DELAY_MS);
    return (): void => clearTimeout(handle);
  }, [turn.phase, pendingDiscardCount]);

  const activePlayer = turn.state.players[turn.activePlayerIndex];
  const endgame = checkEndgame(turn.state);

  // #526: ambient music. Must come before any early returns so the hook
  // fires on every render path. During a challenge, the active player's
  // position is the encounter Sefirah — use it directly rather than
  // waiting for challengeContext to be built later in the component.
  useMusic(turn.phase === 'challenge' && activePlayer !== undefined ? activePlayer.position : 'play');

  // Final Threshold takeover: once the engine flips `phase: 'kether'`
  // (K1's `maybeTriggerKetherRitual` fires when every player has
  // arrived), the play surface yields to the FinalThresholdScreen for
  // the round-robin witness ritual. Per § 4.1 Kether is a Shell-free
  // zone — no shell-panel render in this branch (the early-return is
  // the gate).
  //
  // Seat derivation (#562): during the witness sub-phase, the rendered
  // seat must follow `currentWitnessPlayerId` — the engine reducers
  // rotate `witnessTurnIndex` independently of `activePlayerIndex`,
  // so pinning to `activePlayer` would freeze the chorus on the first
  // witness handoff. The close sub-phase exposes a null witness pointer
  // (`currentWitnessPlayerId` returns null once every queue is empty);
  // fall back to `activePlayer` then so the closure-window UI still
  // mounts. Multiplayer's per-client seat derivation (each client
  // renders for its own selfPlayerId) is deferred to the
  // `/rooms/[code]/play` route landing per #325.
  if (turn.phase === 'kether') {
    const witnessId = turn.currentWitnessPlayerId;
    const seatPlayer =
      witnessId !== null
        ? turn.state.players.find((p) => p.id === witnessId)
        : // TODO(#325): close sub-phase needs per-player rotation in
          // hot-seat (each player stages their own Sparks). Falling
          // back to activePlayer here means only one seat surfaces
          // their Sparks; multiplayer will solve this via per-client
          // selfPlayerId rendering when the /rooms/[code]/play route
          // lands.
          activePlayer;
    if (seatPlayer !== undefined) {
      return (
        <FinalThresholdScreen
          state={turn.state}
          player={seatPlayer}
          turn={turn}
          mode={roomCode !== undefined ? 'multiplayer' : 'hot-seat'}
          {...(className !== undefined ? { className } : {})}
        />
      );
    }
  }

  // Pre-ritual hold view: a player has arrived at Kether but the rest
  // of the team has not. Their seat is held — skipped in turn rotation,
  // hand frozen — and they see a "waiting for the team" surface
  // instead of the normal turn UI. The active player (still climbing)
  // sees their normal play surface; only held seats route here.
  if (activePlayer !== undefined && isKetherHeld(turn.state, activePlayer.id)) {
    return (
      <FinalThresholdScreen
        state={turn.state}
        player={activePlayer}
        turn={turn}
        mode={roomCode !== undefined ? 'multiplayer' : 'hot-seat'}
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
  // active player arrives at an uncleared 'check' Sefirah. The
  // engine is the authoritative gate — once `prep-confirm` succeeds
  // (pass) or `accept-setback` fires (fail) or `react-continue` fires
  // (pass + Continue), phase leaves 'challenge' and this gate
  // unmounts the modal. Pre-#385 we also short-circuited on
  // `clearedSefirot.has(position)` to defensively unmount when the
  // engine had recorded the win but stayed at challenge/react — but
  // that was masking the real bug (no event for pass + Continue) and
  // caused the modal to disappear mid-react with no UI to advance.
  // Now that `react-continue` exists, trust the engine: the phase
  // check alone is sufficient.
  const showChallenge = turn.phase === 'challenge' && activePlayer !== undefined;

  const challengeContext: ChallengeContext | null =
    showChallenge && activePlayer ? buildChallengeContext(turn.state, activePlayer.id) : null;

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

  // #412: drag-to-play drop handler. Hit-tests the pointer-up
  // coordinates against the Tree's `[data-drop-zone="path-N"]`
  // elements (set in TreeBoard.tsx on each path's wide hit-line).
  // Valid drop fires `turn.move`; invalid drop sets an aria-live
  // announcement so AT users hear the rejection.
  //
  // Design note: this dispatches via `turn.move` directly rather
  // than going through `selectedCard` + `handlePathClick`. Drag-to-
  // play is its own commit gesture — bypassing selection state
  // means a successful drop doesn't leave a stale `selectedCard`
  // that the next click-then-click flow would have to clear.
  // Helper for the announce-on-rejection pattern: clear then set on
  // the next microtask so re-attempts with the same message still
  // re-announce in the aria-live region.
  const announceDragRejection = (message: string): void => {
    setDragAnnouncement('');
    queueMicrotask(() => setDragAnnouncement(message));
  };

  const handleCardDrop = (
    arcanum: number,
    position: { readonly x: number; readonly y: number },
  ): void => {
    setDraggingCard(undefined);
    if (!activePlayer) return;
    const target = document.elementFromPoint(position.x, position.y);
    const dropZone = target?.closest('[data-drop-zone]');
    const slug = dropZone?.getAttribute('data-drop-zone') ?? '';

    // #462: drag-to-discard-pile branch. Routes to `turn.discard`,
    // which is the same engine action the click-the-card-name
    // DiscardPrompt fires. The discard reducer is gated on
    // `pendingDiscard.count > 0` (over-cap reconciliation at end of
    // turn, #291); outside that state the engine refuses and we
    // announce the rejection.
    //
    // No phase guard here on purpose. The engine's `discard` action
    // is intentionally phase-agnostic — `turn-machine.ts` accepts a
    // `discard` event whenever `pendingDiscard.count > 0`,
    // regardless of `phase`. Today `pendingDiscard` only ever ticks
    // up during `end` phase (the post-Meditate over-cap path), so a
    // UI phase guard would be redundant. If a future ticket sets
    // `pendingDiscard` from `challenge` or any other phase, the
    // engine gate stays authoritative and this branch surfaces the
    // affordance correctly without code change. The DiscardPrompt
    // at the bottom of this component follows the same pattern (it
    // mounts purely on `pendingDiscardCount > 0`, no phase check),
    // so the two discard surfaces are consistent.
    if (slug === 'discard') {
      if (pendingDiscardCount === 0) {
        announceDragRejection(
          'You only need to discard when over the hand cap. Try a Tree path instead.',
        );
        return;
      }
      turn.discard(arcanum);
      // Clear any selection that was set before the drag; same
      // bookkeeping as drag-to-play.
      setSelectedCard(undefined);
      setDragAnnouncement('');
      return;
    }

    // #412: drag-to-play branch. Path drops are gated on `move`
    // phase — the player can only play a card to advance during
    // their move. Outside `move`, the path drop is rejected.
    if (turn.phase !== 'move') {
      announceDragRejection(
        'You can only play a card during the move phase.',
      );
      return;
    }
    const pathMatch = /^path-(\d+)$/.exec(slug);
    if (!pathMatch || pathMatch[1] === undefined) {
      announceDragRejection(
        'No path under the pointer. Drag onto a Tree path to play.',
      );
      return;
    }
    const pathNumber = Number(pathMatch[1]);
    const path = tryPathByNumber(pathNumber);
    if (!path || path.arcanumNumber !== arcanum) {
      announceDragRejection('This card cannot be played on that path.');
      return;
    }
    const result = turn.move(pathNumber);
    if (!result.ok) {
      announceDragRejection(
        'That move is not available right now. Try a different path.',
      );
      return;
    }
    setSelectedCard(undefined);
    setDragAnnouncement('');
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
      // #385: dispatch `react-continue` to advance phase out of
      // 'challenge.react'. The engine clears all challenge machinery
      // (sub-phase, lastOutcome, encounter, pendingModifiers) and
      // transitions phase → 'end' (#502: pre-#502 the post-pass phase
      // was 'draw'; with the start-of-turn refill folded into
      // `end-turn`, the discrete `'draw'` phase no longer exists).
      // The reward (cleared Sefirah, +1 Illumination) was already
      // applied at prep-confirm; this dispatch is purely the phase
      // teardown.
      //
      // Pre-#385 this branch returned without dispatching, leaving
      // the snapshot stuck at challenge/react indefinitely while the
      // showChallenge gate unmounted on the over-eager
      // `clearedSefirot.has(position)` short-circuit. The player was
      // left UI-less — phase hint read "Resolve the challenge" but
      // no modal, and turn.move()/turn.endTurn() all failed their
      // phase guards.
      turn.reactContinue();
      return;
    }
    // 'accept': apply the engine's failure consequence — Separation
    // ticks up by 1 (or +2 on shortcut arrivals) — and advance the
    // phase to 'end' atomically via `acceptChallengeSetback` (#502
    // moved this from 'draw' to 'end' when the discrete draw phase
    // was folded into `end-turn`). The
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
      // #411: at lg+ the padding tightens (p-6 → p-4), the gap
      // shrinks (gap-6 → gap-4), and the sidebar narrows (400px →
      // 320px). Every reclaimed pixel of chrome lets the Tree
      // column breathe more after the viewport-height-aware sizing.
      // Below lg, the original gap-6 / p-6 is preserved — mobile
      // is explicitly out of scope for this ticket; mobile-tab
      // pattern is queued as #466.
      className={`mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_320px] lg:gap-4 lg:p-4 ${className ?? ''}`}
    >
      <section
        aria-label="Tree of Life board"
        className="flex flex-col items-center gap-4 lg:gap-3"
      >
        {/*
          #579: free-floating Hand. Pre-#579 the Hand sat as inline-flow
          at the bottom of this column under the #411 fit-on-screen
          budget; the wrapper had `lg:h-[calc(100vh-388px)]` because
          the below-Tree stack reserved ~388 px for action bar + Hand
          fan + padding. Post-#579 the Hand is a `position: fixed`
          overlay that floats over the Tree, so the Tree no longer
          competes with it for vertical space. The new budget reserves
          only ~180 px for the action bar + a small breathing margin
          above the floating Hand's rest band. The cap rises to
          `max-h-[640px]` so the Tree dominates as the centerpiece on
          taller viewports.
          Below lg the wrapper stays `w-full max-w-xl` — mobile layout
          is explicitly preserved here (#466 owns the mobile tab
          pattern, which will likely revisit the floating-Hand mobile
          story alongside it).
          The wrapper goes here rather than on TreeBoard's prop
          because TreeBoard's own root has `inline-block` +
          `style={{width:'100%'}}` shipped behaviour — height
          constraints from outside fire correctly through it, but
          `inline-block` would defeat the aspect-ratio sizing if
          applied to the wrapper itself.
        */}
        <div className="w-full max-w-2xl lg:max-w-none lg:w-auto lg:aspect-[400/620] lg:h-[calc(100vh-120px)] lg:max-h-[820px]">
          <TreeBoard
            state={turn.state}
            {...(activePlayer ? { activePlayerId: activePlayer.id } : {})}
            onPathClick={handlePathClick}
            // #384: opens an inline popover instead of navigating to
            // the Codex detail page (which would strand the player
            // off-game with no return-to-game affordance).
            onSefirahClick={(key) => setOpenSefirah(key)}
            // #129: only highlight paths during the move phase. Once
            // the player has moved, the board is decorative until the
            // next turn begins; the action panel below carries the
            // available affordances (End Turn, etc.).
            movesEnabled={turn.phase === 'move'}
            // #312 + #405: light the corresponding paths on the Tree
            // when the player is considering a card. The signal source
            // is `hoveredCard` (mouse / focus) with `selectedCard` as
            // a sticky fallback — a clicked card stays lit even when
            // the mouse moves to the Tree. Active across all phases
            // except `'challenge'` (the resolution moment) so the
            // path-light doesn't compete with movement animation. The
            // `'move'` phase covers both the pre-move card evaluation
            // and (post-#503) the post-Meditate review window where
            // the player is considering whether to play a freshly
            // drawn card.
            {...((): { highlightedCard?: number } => {
              if (turn.phase === 'challenge') return {};
              // #412: drag wins over hover wins over select. While
              // a card is mid-drag the pointer has left the card
              // (it's hovering over the Tree), so `hoveredCard` is
              // undefined; without this precedence the path-light
              // would drop the moment the gesture leaves the hand.
              const effective = draggingCard ?? hoveredCard ?? selectedCard;
              return effective === undefined ? {} : { highlightedCard: effective };
            })()}
            className="w-full"
          />
        </div>
        <div className="flex w-full max-w-xl flex-col items-stretch gap-2 rounded border border-veil/20 bg-ground/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <span className="text-xs uppercase tracking-widest opacity-60" data-phase-hint>
            {phaseHint(turn.phase)}
          </span>
          <span className="font-display tracking-widest">
            {activePlayer?.name ?? '—'}&apos;s turn
          </span>
          <div className="flex gap-2">
            {turn.phase === 'move' ? (
              <MeditateButton
                onMeditate={turn.meditate}
                disabled={turn.state.meditatedThisTurn === true}
              />
            ) : null}
            {/*
             * #503: post-Meditate, the player remains in `'move'`
             * phase but may not want to play one of their freshly
             * drawn cards (e.g. they meditated for a path-key that
             * still hasn't surfaced). The End turn affordance must
             * be reachable from `'move'` in that case. Pre-#503 the
             * Meditate path transitioned straight to `'end'` so this
             * affordance was not needed.
             *
             * Gate: only show End turn from `'move'` when the player
             * has already meditated this turn. Without that gate the
             * player could end their turn cold (no Move, no Meditate),
             * which violates the engine invariant that every turn does
             * something.
             */}
            {turn.phase === 'end' ||
            (turn.phase === 'move' && turn.state.meditatedThisTurn === true) ? (
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
         * #292/#503: post-Meditate a11y callout. Post-#503 Meditate
         * stays in `'move'` phase rather than transitioning to
         * `'end'`, so the callout fires while `meditatedThisTurn`
         * is true and the player is still in `'move'`. The aria-live
         * region nudges screen-reader users that the player has just
         * drawn cards and may still play one. `polite` (not
         * `assertive`) so it queues behind any in-progress
         * announcement (e.g. the move resolution) rather than
         * interrupting it.
         */}
        {turn.phase === 'move' && turn.state.meditatedThisTurn === true ? (
          <div
            role="status"
            aria-live="polite"
            data-meditate-callout
            className="w-full max-w-xl rounded border border-veil/20 bg-ground/40 px-4 py-2 text-xs italic opacity-80"
          >
            You drew 2 cards. You may still play a card, or End your turn.
          </div>
        ) : null}
        {activePlayer ? (
          <Hand
            hand={activePlayer.hand}
            visible={isHandVisible(turn.state, activePlayer.id, activePlayer.id)}
            {...(pendingDiscardCount === 0 ? { onCardSelect: (n: number) => setSelectedCard(n) } : {})}
            onCardHover={(n) => setHoveredCard(n)}
            // #412: drag-to-play wiring. drag-start lights the path
            // beneath the gesture; drag-end runs the drop handler;
            // drag-cancel clears the highlight without dispatching.
            onCardDragStart={(n) => setDraggingCard(n)}
            onCardDragEnd={handleCardDrop}
            onCardDragCancel={() => setDraggingCard(undefined)}
            {...(selectedCard !== undefined && pendingDiscardCount === 0 ? { selectedArcanum: selectedCard } : {})}
            {...(pendingDiscardCount > 0
              ? {
                  discardMode: true as const,
                  onDiscard: (arcanum: number) => turn.discard(arcanum),
                }
              : {})}
            ariaLabel={`${activePlayer.name}'s hand`}
            className="w-full max-w-xl"
          />
        ) : null}
        {/* #412: aria-live region for invalid drag-to-play attempts. */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-drag-announcement
          className="sr-only"
        >
          {dragAnnouncement}
        </div>
      </section>

      {/*
        #411: at lg+ the inter-panel gap drops to gap-3 (was gap-6)
        and per-panel padding drops to p-3 (was p-4) — reclaims
        ~48 px of aside height so the right column stops dominating
        the document height at 1280×800. Mobile (gap-6 / p-4) is
        preserved unchanged. ShellPanel collapse-to-strip remains a
        separate ticket (#464) that can layer further compaction.
      */}
      <aside aria-label="Game status" className="flex flex-col gap-6 text-veil lg:gap-3">
        {/*
         * #507: visible discard pile. Mounted at the top of the right-
         * column aside so the deck/discard cluster lives on the same
         * side as the rest of the game-state surfaces (StatSheet,
         * meters, shells). The pile is informational and not phase-
         * gated — it stays mounted across `move` / `challenge` / `end`
         * and reflects engine state live.
         */}
        <div className="flex justify-center rounded border border-veil/20 bg-ground/40 p-4 lg:p-3">
          <DiscardPile
            discardPile={turn.state.discardPile}
            dragActive={draggingCard !== undefined}
          />
        </div>
        {activePlayer ? (
          <div className="rounded border border-veil/20 bg-ground/40 p-4 lg:p-3">
            <StatSheet player={activePlayer} />
          </div>
        ) : null}
        <div className="rounded border border-veil/20 bg-ground/40 p-4 lg:p-3">
          <TeamMeters
            illumination={turn.state.illumination}
            separation={turn.state.separation}
            pillarStreak={turn.state.pillarStreak}
            // #321: route the per-meter callbacks straight into
            // `playSound`. The hook itself is a no-op when sound is
            // off and throttled per cue, so we don't need a guard
            // here.
            onIlluminationIncrease={() => playSound('illumination-up')}
            onSeparationIncrease={() => playSound('separation-up')}
          />
        </div>
        <div className="rounded border border-veil/20 bg-ground/40 p-4 lg:p-3">
          <ShellPanel
            shells={turn.state.shells}
            headingLevel={3}
            // #321: same wiring pattern. ShellPanel fires the
            // callback once per state transition; throttle still
            // covers the multi-Shell-banished-in-one-tick case.
            onShellAwakened={() => playSound('shell-awakened')}
            onShellBanished={() => playSound('shell-banished')}
          />
        </div>
      </aside>

      {challengeContext && activePlayer ? (
        // #38: full-screen overlay on narrow viewports — the modal's
        // 448 px max-width is wider than a 320 px phone. Drop the
        // outer padding below `sm:` so the dialog reaches the edges,
        // and let the modal itself shrink via its own className.
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-ground/80 p-0 sm:p-4">
          {/*
           * #278: mode is derived from `roomCode`. Multiplayer routes
           * each modifier change over the wire as a per-step
           * `prep-add-modifier` event so allies see staging in real
           * time; hot-seat collapses staging into one Roll click via
           * the `submitChallenge` wrapper. EncounterScreen's
           * discriminated-union props require `player` in
           * multiplayer mode; we pass it unconditionally because
           * `activePlayer` is in scope and the hot-seat branch
           * accepts it too (it powers the embedded StatSheet either
           * way).
           */}
          {roomCode !== undefined ? (
            <EncounterScreen
              mode="multiplayer"
              context={challengeContext}
              rng={rng}
              turn={turn}
              onResolved={handleChallengeResolved}
              player={activePlayer}
              // #38: on `sm:` and up the dialog stays centred at 28rem;
              // below that it fills the screen so a 320 px viewport
              // gets a usable dialog without horizontal scrolling.
              className="min-h-screen w-full sm:min-h-fit sm:max-w-md"
            />
          ) : (
            <EncounterScreen
              mode="hot-seat"
              context={challengeContext}
              rng={rng}
              turn={turn}
              onResolved={handleChallengeResolved}
              // #134: embedded stat sheet so players can see their
              // full stat row without dismissing the dialog.
              player={activePlayer}
              className="min-h-screen w-full sm:min-h-fit sm:max-w-md"
            />
          )}
        </div>
      ) : null}

      {/*
       * #90: end-of-turn over-cap reconciliation. Status bar replaces
       * the DiscardPrompt bottom sheet — discard icons now overlay the
       * hand cards directly so players can hover for path-lighting
       * before committing.
       */}
      {pendingDiscardCount > 0 ? (
        <div
          role="status"
          aria-live="polite"
          data-discard-status
          className="w-full max-w-xl rounded border border-veil/30 bg-ground/80 px-4 py-2 text-center text-xs text-veil"
        >
          Shed {pendingDiscardCount} card{pendingDiscardCount === 1 ? '' : 's'} — hover a card to
          see its paths, then click <span aria-hidden>✕</span> to discard
        </div>
      ) : null}

      {/* #321: floating settings cog. Always available on the play
          surface so players can flip sound on/off without leaving
          the game. Renders fixed bottom-right; the inline div keeps
          it inside the main layout for SR ordering, but the
          component itself uses `position: fixed` so it floats. */}
      <SettingsButton />
      {/* #384: in-game Sefirah info popover. Mounted at the play-
          screen root so the backdrop covers the full viewport, but
          inside <main> so accessibility-tree ordering keeps it
          adjacent to the play surface that triggered it. */}
      {openSefirah !== undefined ? (
        <SefirahInfoPopover
          sefirahKey={openSefirah}
          teamSparks={turn.state.players.filter((p) => p.sparksHeld.has(openSefirah)).length}
          activePlayerSign={activePlayer?.zodiacSign}
          onClose={() => setOpenSefirah(undefined)}
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
function buildChallengeContext(state: GameState, playerId: string): ChallengeContext | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  const sefirahData = sefirahByKey(player.position);
  if (sefirahData.challenge.kind !== 'check') return null;
  const allies = state.players
    .filter((p) => p.id !== player.id && p.position === player.position)
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
  // The same `isPathShortcut` helper drives the engine-side derivation
  // in `lib/turn-machine.ts:prep-confirm` (#286), so UI and engine
  // can never disagree about which paths are shortcuts.
  const isShortcut =
    player.lastArrivalPathNumber !== undefined && isPathShortcut(player.lastArrivalPathNumber);
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
  disabled,
}: {
  onMeditate: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onMeditate()}
      data-action="meditate"
      disabled={disabled === true}
      aria-disabled={disabled === true}
      title={disabled === true ? 'You can only Meditate once per turn' : undefined}
      className="min-h-11 rounded border border-veil/30 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
    >
      Meditate
    </button>
  );
}

/**
 * Plain-English phase hint shown next to the active player's name.
 * Replaces the raw enum value (`Phase: end`) so a first-time player
 * can read the panel and know what they're allowed to do without
 * knowing the engine's vocabulary (#129). Post-#502 the discrete
 * `'draw'` phase no longer exists (the refill moved to start-of-turn
 * inside `end-turn`), so the switch is one case shorter.
 */
function phaseHint(phase: TurnPhase): string {
  switch (phase) {
    case 'move':
      return 'Pick a card and a path, or meditate';
    case 'challenge':
      return 'Resolve the challenge';
    case 'end':
      return 'Move complete — end turn';
    case 'kether':
      // K1 / #335: top-level phase for the Final Threshold collective
      // ritual. The dedicated `FinalThresholdScreen` (K3) takes over
      // the play surface when this phase is active and the inline
      // phase hint isn't visible — but the switch must stay
      // exhaustive so a future routing bug surfaces at compile time.
      return 'Final Threshold ritual';
  }
}
