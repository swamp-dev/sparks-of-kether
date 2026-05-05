'use client';
import { Suspense, useMemo, useRef } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { FinalThresholdScreen } from '@/components/game/FinalThresholdScreen';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makePlayer, makeState } from '@/test/fixtures';
import { initKetherRitual } from '@/engine/kether';
import type { GameState, KetherRitualState } from '@/engine/types';
import type { SefirahKey } from '@/data';

/**
 * Demo-only route for the FinalThresholdScreen (#351). Lets a
 * design / visual-regression / e2e walkthrough exercise each of the
 * three rendered shapes deterministically without driving a full
 * 2-player game from /play.
 *
 * Query params:
 *   ?subPhase=hold       — pre-ritual hold view (held player + still-
 *                          climbing roster). The default.
 *   ?subPhase=witness    — round-robin witness state. P2 is the active
 *                          witness (last-arrived first per § 2.2).
 *   ?subPhase=close      — closure window with seeded held Sparks so
 *                          stage / unstage / Confirm exercise.
 *
 * The screen mounts a real `useTurn` hook so dispatched ritual
 * methods (ketherWitnessPlay, ketherWitnessPass,
 * ketherCloseStageSpark, etc.) flow through the engine reducer
 * exactly as they do in production.
 */

type DemoSubPhase = 'hold' | 'witness' | 'close';

const HELD_SPARKS: ReadonlySet<SefirahKey> = new Set([
  'gevurah',
  'tiferet',
] as const);

const HELD_SPARKS_P2: ReadonlySet<SefirahKey> = new Set(['hod'] as const);

export default function FinalThresholdDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <FinalThresholdDemoContent />
    </Suspense>
  );
}

function FinalThresholdDemoContent(): JSX.Element {
  const searchParams = useSearchParams();
  const subPhaseParam = searchParams.get('subPhase');
  const subPhase: DemoSubPhase =
    subPhaseParam === 'witness' || subPhaseParam === 'close'
      ? subPhaseParam
      : 'hold';

  const initialState = useMemo<GameState>(() => {
    if (subPhase === 'hold') {
      // P1 at Kether (held), P2 still climbing. `phase !== 'kether'`
      // so the screen routes to the pre-ritual hold view.
      const heldPlayer = makePlayer({
        id: 'p1',
        name: 'Alex',
        position: 'kether',
        hand: [1, 2, 3],
        zodiacSign: 'aries',
      });
      const climbingPlayer = makePlayer({
        id: 'p2',
        name: 'Bea',
        position: 'tiferet',
        hand: [4, 5, 6],
        zodiacSign: 'leo',
      });
      return makeState(
        {},
        { players: [heldPlayer, climbingPlayer], activePlayerId: 'p1' },
      );
    }

    // Witness + close share a base: both players at Kether with the
    // ritual initialised. P2 arrives last (descending timestamp →
    // p2 first in witness order).
    const p1 = makePlayer({
      id: 'p1',
      name: 'Alex',
      position: 'kether',
      hand: [10, 11],
      zodiacSign: 'aries',
      sparksHeld: HELD_SPARKS,
    });
    const p2 = makePlayer({
      id: 'p2',
      name: 'Bea',
      position: 'kether',
      hand: [20, 21],
      zodiacSign: 'leo',
      sparksHeld: HELD_SPARKS_P2,
    });
    const baseState = makeState(
      {},
      { players: [p1, p2], activePlayerId: 'p1' },
    );
    const initResult = initKetherRitual(baseState, { p1: 100, p2: 200 });
    if (!initResult.ok) {
      throw new Error(
        `final-threshold demo: initKetherRitual rejected — ${initResult.reason.kind}`,
      );
    }
    if (subPhase === 'witness') return initResult.value;

    // close — hand-roll the ritual into the closure sub-phase by
    // emptying both queues and flipping subPhase. Production reaches
    // this path naturally once every queue empties via play/pass; the
    // demo skips that traversal so the closure UI is reachable in one
    // page load.
    const baseRitual = initResult.value.ketherRitual;
    if (baseRitual === undefined) {
      throw new Error('final-threshold demo: ritual missing on init');
    }
    const ritual: KetherRitualState = {
      ...baseRitual,
      subPhase: 'close',
      stagedClosureSparks: [],
    };
    return {
      ...initResult.value,
      players: initResult.value.players.map((p) => ({ ...p, hand: [] })),
      ketherRitual: ritual,
    };
  }, [subPhase]);

  // RNG identity has to stay stable across renders so `useTurn`'s
  // memoised callbacks don't churn — `useRef` pins one seeded RNG for
  // the lifetime of the component.
  const rngRef = useRef(seededRng(1));
  const turn = useTurn({ initialState, rng: rngRef.current });
  const player = turn.state.players[0];
  if (player === undefined) {
    throw new Error('final-threshold demo: no player at index 0');
  }

  return (
    <main className="min-h-screen bg-ground p-6">
      <FinalThresholdScreen
        state={turn.state}
        player={player}
        turn={turn}
        mode="hot-seat"
      />
    </main>
  );
}
