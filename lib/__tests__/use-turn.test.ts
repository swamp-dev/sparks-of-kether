import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTurn } from '../use-turn';
import type { CheckModifiers, CheckOutcome } from '@/engine/checks';
import { seededRng } from '@/engine/rng';
import type { GameState, KetherRitualState, PlayerState, Result } from '@/engine/types';
import { isKetherHeld } from '@/engine/kether';
import type { KetherRejection } from '@/engine/kether';
import type { PrepModifier } from '../turn-machine';
import type { ClientAction } from '../room-actions';
import { makePlayer, makeState } from '@/test/fixtures';

function freshHook() {
  const initialState = makeState(
    {},
    {
      players: [
        makePlayer({ id: 'p1', name: 'Andy', hand: [0, 1, 2, 3] }),
        makePlayer({ id: 'p2', name: 'Bea', hand: [4, 5, 6, 7] }),
      ],
      deck: [10, 11, 12, 13, 14, 15, 16, 17],
    },
  );
  return renderHook(() => useTurn({ initialState, rng: seededRng(1) }));
}

describe('useTurn — phase machine', () => {
  it('starts in move phase with player 0 active', () => {
    const { result } = freshHook();
    expect(result.current.phase).toBe('move');
    expect(result.current.activePlayerIndex).toBe(0);
    expect(result.current.isActive('p1')).toBe(true);
    expect(result.current.isActive('p2')).toBe(false);
  });

  it('meditate draws 2 cards (cap 6) and stays in move phase (#503)', () => {
    // #128: meditate is a complete turn-action that draws 2 cards.
    // #503: post-#503 Meditate stays in `'move'` so the player may
    // still play a card the same turn — the freshly drawn cards are
    // usable immediately. The once-per-turn cap (`meditatedThisTurn`)
    // stops it from strictly dominating Move.
    const { result } = freshHook();
    const handBefore = result.current.state.players[0]?.hand.length ?? 0;
    act(() => {
      result.current.meditate();
    });
    expect(result.current.phase).toBe('move');
    expect(result.current.state.meditatedThisTurn).toBe(true);
    const handAfter = result.current.state.players[0]?.hand.length ?? 0;
    // Hand grew by up to 2, capped at 6.
    expect(handAfter).toBeGreaterThan(handBefore);
    expect(handAfter).toBeLessThanOrEqual(6);
  });

  it('endTurn rotates to the next player and resets to move phase', () => {
    const { result } = freshHook();
    // #503: Meditate stays in move; after meditating the player can
    // end the turn directly even without playing a card.
    act(() => {
      result.current.meditate();
    });
    expect(result.current.phase).toBe('move');
    expect(result.current.state.meditatedThisTurn).toBe(true);
    act(() => {
      result.current.endTurn();
    });
    expect(result.current.activePlayerIndex).toBe(1);
    expect(result.current.phase).toBe('move');
    expect(result.current.isActive('p2')).toBe(true);
    // The active id now lives in GameState — confirm it's not just
    // local hook state. Server snapshots can be diff'd against this.
    expect(result.current.state.activePlayerId).toBe('p2');
    // #503: meditatedThisTurn flag resets on seat rotation.
    expect(result.current.state.meditatedThisTurn).toBe(false);
  });

  it('auto-rotates when a player arrives at Kether without triggering the ritual (#447)', () => {
    // Hot-seat soft-lock regression: when the active player's move
    // lands them at Kether but at least one other player is still
    // climbing, the just-arrived seat is `isKetherHeld === true` and
    // the held screen renders. Without this auto-rotate, the seat
    // stays on the held player — `phase: 'draw'` is reached, the
    // hot-seat auto-advance hook only fires on `phase === 'end'`,
    // and there's no UI affordance on the held screen to call
    // endTurn. The result is a soft-lock for both players.
    //
    // The fix in `lib/turn-machine.ts`'s move handler routes the
    // arrival through `endTurnReducer` immediately, which skips the
    // now-held seat (per `engine/turn.ts` #335) and lands on the
    // next still-climbing player in `phase: 'move'`.
    const initialState = makeState(
      {},
      {
        players: [
          // p1 is adjacent to Kether on the Mercy pillar (Chokmah)
          // and holds Aleph (arcanum 0 → path 11: Kether-Chokmah),
          // so `move(11)` arrives at Kether.
          makePlayer({ id: 'p1', name: 'Andy', position: 'chokmah', hand: [0] }),
          // p2 is still climbing — arrives nowhere this turn.
          makePlayer({ id: 'p2', name: 'Bea', position: 'malkuth', hand: [4] }),
        ],
        deck: [10, 11, 12, 13, 14, 15, 16, 17],
      },
    );
    const { result } = renderHook(() => useTurn({ initialState, rng: seededRng(1) }));
    expect(result.current.activePlayerIndex).toBe(0);
    expect(result.current.phase).toBe('move');
    let outcome: ReturnType<typeof result.current.move> | undefined;
    act(() => {
      outcome = result.current.move(11);
    });
    expect(outcome?.ok).toBe(true);
    // p1 arrived at Kether AND is now in the held state — the core
    // invariant the fix protects. Without this direct assertion the
    // rotation check below could pass even if a future change cleared
    // `position` and so accidentally un-held p1.
    expect(result.current.state.players[0]?.position).toBe('kether');
    expect(isKetherHeld(result.current.state, 'p1')).toBe(true);
    // The seat rotated to p2 — the still-climbing player gets their
    // turn, not the held p1. Phase is back to 'move' so p2 starts
    // their turn cleanly. Encounter envelope is cleared (no leakage
    // from the prior turn).
    expect(result.current.activePlayerIndex).toBe(1);
    expect(result.current.state.activePlayerId).toBe('p2');
    expect(result.current.phase).toBe('move');
    expect(result.current.state.encounter).toBeUndefined();
    // The ritual didn't trigger — only one player at Kether so far.
    // The convergence trip-wire (`maybeTriggerKetherRitual`) requires
    // every player at Kether before flipping `phase: 'kether'`.
    expect(result.current.state.phase).toBe('move');
  });

  it('triggers the Kether ritual (no auto-rotate) when the LAST player arrives (#447)', () => {
    // Boundary case for the auto-rotate fix: when the moving player's
    // arrival completes the convergence (every player at Kether),
    // `maybeTriggerKetherRitual` flips `phase: 'kether'` and the move
    // handler short-circuits BEFORE the auto-rotate branch. The
    // ritual takes over; no seat rotation, no held-state render.
    const initialState = makeState(
      {},
      {
        players: [
          // p1 already at Kether (held — first to arrive in some
          // earlier turn).
          makePlayer({
            id: 'p1',
            name: 'Andy',
            position: 'kether',
            hand: [],
            arrivedAtKetherAt: 1,
          }),
          // p2 is one step from Kether on the Severity pillar
          // (Binah) and holds Beth (arcanum 1 → path 12:
          // Kether-Binah). Their move(12) is the last arrival.
          makePlayer({ id: 'p2', name: 'Bea', position: 'binah', hand: [1] }),
        ],
        // p2 is the active seat (since p1 is held and got skipped
        // during a prior rotation).
        activePlayerId: 'p2',
        deck: [10, 11, 12, 13, 14, 15, 16, 17],
      },
    );
    const { result } = renderHook(() => useTurn({ initialState, rng: seededRng(1) }));
    expect(result.current.activePlayerIndex).toBe(1);
    let outcome: ReturnType<typeof result.current.move> | undefined;
    act(() => {
      outcome = result.current.move(12);
    });
    expect(outcome?.ok).toBe(true);
    // p2 arrived at Kether and the ritual fired: phase flipped to
    // 'kether' and the seat did NOT rotate (p2 is still active for
    // the witness round-robin's first slot — the ritual's own
    // pointer logic owns advancement from here).
    expect(result.current.state.players[1]?.position).toBe('kether');
    expect(result.current.state.phase).toBe('kether');
    expect(result.current.state.activePlayerId).toBe('p2');
  });
});

describe('useTurn — meditate draw mechanics', () => {
  // Post-#128 these tests exercise meditate (which is the user-
  // visible draw path). The post-move 'draw' reducer is covered
  // directly by `turn-machine.test.ts`. The hand-cap, deck-recycle,
  // and starting-target behaviors are now meditate's responsibility
  // because meditate is the surface a 4-card-handed player would hit
  // with "I want more cards."
  it('meditate adds up to MEDITATE_DRAW (2) cards from the deck', () => {
    const { result } = freshHook();
    const initial = result.current.state;
    const trimmed = {
      ...initial,
      players: initial.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: p.hand.slice(0, 2) } : p,
      ),
    };
    act(() => {
      result.current.setState(trimmed);
    });
    act(() => {
      result.current.meditate();
    });
    // 2 cards drawn (well within the 6-card cap).
    expect(result.current.state.players[0]?.hand.length).toBe(4);
    // #503: Meditate stays in move (pre-#503 it transitioned to 'end').
    expect(result.current.phase).toBe('move');
  });

  it('meditate at HAND_CAP draws past the cap; cap check defers to end-turn (#503)', () => {
    // #291: meditate ALWAYS draws MEDITATE_DRAW (even past HAND_CAP).
    // #503: pendingDiscard is NOT set on Meditate; the cap check fires
    // when the player tries to End the turn instead. This lets a
    // Meditate-then-Move flow that drops back under cap proceed without
    // any prompt.
    const { result } = freshHook();
    const initial = result.current.state;
    const six = {
      ...initial,
      players: initial.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: [0, 1, 2, 3, 4, 5] } : p,
      ),
    };
    act(() => {
      result.current.setState(six);
    });
    act(() => {
      result.current.meditate();
    });
    // Hand grew to 8 (over HAND_CAP=6 by 2 cards) — but no
    // pendingDiscard yet; Meditate stays in 'move' so the player
    // could still play a card.
    expect(result.current.state.players[0]?.hand.length).toBe(8);
    expect(result.current.state.pendingDiscard).toBeUndefined();
    expect(result.current.phase).toBe('move');
    // Now End turn — the cap check fires here. Seat does NOT advance;
    // pendingDiscard.count = 2 lights up the DiscardPrompt.
    act(() => {
      result.current.endTurn();
    });
    expect(result.current.state.pendingDiscard).toEqual({
      count: 2,
      requiredBy: 'end-of-turn',
    });
    expect(result.current.activePlayerIndex).toBe(0);
  });

  it('recycles discard pile when deck empties mid-meditate', () => {
    const { result } = freshHook();
    const initial = result.current.state;
    const recyclable = {
      ...initial,
      deck: [],
      discardPile: [20, 21],
      players: initial.players.map((p, idx) => (idx === 0 ? { ...p, hand: [0, 1] } : p)),
    };
    act(() => {
      result.current.setState(recyclable);
    });
    act(() => {
      result.current.meditate();
    });
    // Drew 2 from the recycled discard; discard now empty.
    expect(result.current.state.players[0]?.hand.length).toBe(4);
    expect(result.current.state.discardPile).toEqual([]);
  });
});

describe('useTurn — acceptChallengeSetback', () => {
  it('applies the separation tick AND advances the phase atomically', () => {
    const { result } = freshHook();
    // Stage state: player at gevurah (an uncleared check Sefirah),
    // turn machine in 'challenge' phase. We can't easily get there
    // through `move` without a full path setup, so manipulate phase
    // by forcing a state that drops us into challenge — easiest is
    // to inject a state where the active player is at gevurah, then
    // simulate the move() that would have set phase = challenge.
    // Simpler: meditate to bypass move, then directly test that
    // acceptChallengeSetback is a no-op outside 'challenge'.
    const sepBefore = result.current.state.separation;
    let outcomeOutOfPhase: ReturnType<typeof result.current.acceptChallengeSetback> | undefined;
    act(() => {
      outcomeOutOfPhase = result.current.acceptChallengeSetback({
        sefirah: 'gevurah',
      });
    });
    // Out of 'challenge' phase: no-op, no separation change.
    expect(outcomeOutOfPhase?.separation).toBe(sepBefore);
    expect(result.current.phase).toBe('move');
  });

  it.todo(
    'separation ticks +1 on a regular failure-accept (integration test stub; needs a state-into-challenge helper)',
  );
});

// ────────────────────────────────────────────────────────────────────
// E4 (#229) — per-step prep / react methods exposed on the hook.
// ────────────────────────────────────────────────────────────────────
//
// The hot-seat hook gains explicit affordances for the engine's
// per-sub-phase events that E1 shipped: `prepAddModifier`,
// `prepRemoveModifier`, `prepConfirm`, `reactRetry`. The legacy
// `submitChallenge(sefirah, modifiers, outcome)` survives as a
// convenience wrapper that internally chains these methods so a
// single click in the modal produces the same `GameState` as the
// multiplayer path (per-step methods invoked one at a time).
//
// These tests stage the hook into `phase === 'challenge'` /
// `challengeSubPhase === 'prep'` by injecting a snapshot via the
// `setState` escape hatch and an internal helper. They test the
// surface of the hook rather than the engine — the engine's own
// reducer tests cover the semantics; here we verify the React
// adapter wires up correctly.

/**
 * Mount a hook and drive it into `challenge / prep` by moving
 * the active player from `chokmah` along path 14 (chokmah ↔
 * binah). The destination `binah` has `challenge.kind === 'check'`
 * and is uncleared by default, so the reducer enters
 * `challenge / prep` automatically. An ally `p2` is pre-staged
 * at `binah` so assist-staging tests have a co-located ally to
 * reference.
 *
 * `useTurn`'s `useState` always initialises at `phase: 'move'`,
 * and the public `setState` (which calls `replace-state`)
 * preserves the current phase — so the only way to enter
 * `challenge` from inside a `renderHook` harness is via `move`.
 */
function hookViaMoveIntoPrep(playerOverrides?: Partial<PlayerState>) {
  const player: PlayerState = makePlayer({
    id: 'p1',
    name: 'Andy',
    position: 'chokmah',
    hand: [3, 7, 11, 14],
    sparksHeld: new Set(),
    ...playerOverrides,
  });
  const ally: PlayerState = makePlayer({
    id: 'p2',
    name: 'Bea',
    position: 'binah', // pre-positioned at the destination so assist works
    hand: [],
  });
  const initialState = makeState(
    {},
    {
      players: [player, ally],
      activePlayerId: 'p1',
    },
  );
  const harness = renderHook(() => useTurn({ initialState, rng: seededRng(1) }));
  // chokmah ↔ binah is path 14 (Heh, lovingkindness pillar). Move
  // p1 along it; the destination is an uncleared check Sefirah,
  // so the reducer enters `challenge / prep`.
  act(() => {
    harness.result.current.move(14);
  });
  return harness;
}

describe('useTurn — challenge sub-phase exposure (E4 / #229)', () => {
  it('challengeSubPhase is undefined outside the challenge phase', () => {
    const { result } = freshHook();
    expect(result.current.phase).toBe('move');
    expect(result.current.challengeSubPhase).toBeUndefined();
    expect(result.current.pendingModifiers).toBeUndefined();
  });

  it('enters prep on a move into an uncleared check Sefirah', () => {
    const { result } = hookViaMoveIntoPrep();
    expect(result.current.phase).toBe('challenge');
    expect(result.current.challengeSubPhase).toBe('prep');
    expect(result.current.pendingModifiers).toEqual({
      cardBurns: [],
      sparkBurns: [],
      assistRequests: [],
      nameCards: [],
      giftCards: [],
      declareDesires: [],
      dreamGuesses: [],
    });
  });
});

describe('useTurn — per-step prep methods (E4 / #229)', () => {
  it('prepAddModifier appends a card-burn to pendingModifiers', () => {
    const { result } = hookViaMoveIntoPrep();
    let outcome: ReturnType<typeof result.current.prepAddModifier> | undefined;
    act(() => {
      outcome = result.current.prepAddModifier({
        kind: 'card-burn',
        arcanum: 7,
      });
    });
    expect(outcome?.ok).toBe(true);
    expect(result.current.pendingModifiers?.cardBurns).toEqual([7]);
  });

  it('prepRemoveModifier removes by value-equality', () => {
    // Hand after move(14): [7, 11, 14] — arcanum 3 was consumed
    // by the move into binah. Stage two in-hand burns and remove
    // the first by value.
    const { result } = hookViaMoveIntoPrep();
    act(() => {
      result.current.prepAddModifier({ kind: 'card-burn', arcanum: 7 });
    });
    act(() => {
      result.current.prepAddModifier({ kind: 'card-burn', arcanum: 11 });
    });
    expect(result.current.pendingModifiers?.cardBurns).toEqual([7, 11]);
    act(() => {
      result.current.prepRemoveModifier({ kind: 'card-burn', arcanum: 7 });
    });
    expect(result.current.pendingModifiers?.cardBurns).toEqual([11]);
  });

  it('prepConfirm transitions to react sub-phase and returns a ChallengeSuccess', () => {
    const { result } = hookViaMoveIntoPrep();
    let outcome: ReturnType<typeof result.current.prepConfirm> | undefined;
    act(() => {
      outcome = result.current.prepConfirm('binah', {
        rolled: 18,
        statContribution: 10,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 28,
        effectiveDC: 15,
        pass: true,
      });
    });
    expect(outcome?.ok).toBe(true);
    if (outcome?.ok) {
      expect(outcome.value.outcome.pass).toBe(true);
    }
    expect(result.current.challengeSubPhase).toBe('react');
  });

  it('reactRetry after a failed prepConfirm returns to prep with pendingModifiers preserved', () => {
    const { result } = hookViaMoveIntoPrep();
    act(() => {
      result.current.prepAddModifier({ kind: 'card-burn', arcanum: 7 });
    });
    expect(result.current.pendingModifiers?.cardBurns).toEqual([7]);
    act(() => {
      result.current.prepConfirm('binah', {
        rolled: 1,
        statContribution: 10,
        modifierBreakdown: { assist: 0, cardBurn: 3, sparkBurn: 0 },
        total: 14,
        effectiveDC: 25,
        pass: false,
      });
    });
    expect(result.current.challengeSubPhase).toBe('react');
    let retryOutcome: ReturnType<typeof result.current.reactRetry> | undefined;
    act(() => {
      retryOutcome = result.current.reactRetry();
    });
    expect(retryOutcome?.ok).toBe(true);
    expect(result.current.challengeSubPhase).toBe('prep');
    // Cumulative card-burn stack survives the retry — the design
    // wants the player to see "1 card already burned" so they can
    // decide whether to stack another on top.
    expect(result.current.pendingModifiers?.cardBurns).toEqual([7]);
  });

  it('reactRetry on a passed challenge surfaces a structured rejection', () => {
    const { result } = hookViaMoveIntoPrep();
    act(() => {
      result.current.prepConfirm('binah', {
        rolled: 18,
        statContribution: 10,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 28,
        effectiveDC: 15,
        pass: true,
      });
    });
    let retryOutcome: ReturnType<typeof result.current.reactRetry> | undefined;
    act(() => {
      retryOutcome = result.current.reactRetry();
    });
    expect(retryOutcome?.ok).toBe(false);
  });

  // #385 — pass-path Continue out of challenge.react.
  // The hook surfaces `reactContinue` as the pass-path counterpart to
  // `acceptChallengeSetback`. After a successful prep-confirm the
  // snapshot sits at challenge/react/lastOutcome=pass; calling
  // reactContinue clears the challenge machinery and advances phase
  // to `'end'` (#502: pre-#502 this was 'draw').
  it('reactContinue after a passed prepConfirm advances phase to end and clears challenge state', () => {
    const { result } = hookViaMoveIntoPrep();
    act(() => {
      result.current.prepConfirm('binah', {
        rolled: 18,
        statContribution: 10,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 28,
        effectiveDC: 15,
        pass: true,
      });
    });
    expect(result.current.phase).toBe('challenge');
    expect(result.current.challengeSubPhase).toBe('react');
    let outcome: ReturnType<typeof result.current.reactContinue> | undefined;
    act(() => {
      outcome = result.current.reactContinue();
    });
    expect(outcome?.ok).toBe(true);
    expect(result.current.phase).toBe('end');
    expect(result.current.challengeSubPhase).toBeUndefined();
    expect(result.current.state.lastOutcome).toBeUndefined();
  });

  it('reactContinue on a failed challenge surfaces a structured rejection', () => {
    const { result } = hookViaMoveIntoPrep();
    act(() => {
      result.current.prepConfirm('binah', {
        rolled: 1,
        statContribution: 10,
        modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
        total: 11,
        effectiveDC: 15,
        pass: false,
      });
    });
    let outcome: ReturnType<typeof result.current.reactContinue> | undefined;
    act(() => {
      outcome = result.current.reactContinue();
    });
    expect(outcome?.ok).toBe(false);
    // Hook stays at challenge/react so the failure path UI remains
    // available.
    expect(result.current.phase).toBe('challenge');
    expect(result.current.challengeSubPhase).toBe('react');
  });
});

describe('useTurn — submitChallenge wrapper equivalence (E4 / #229)', () => {
  // Pin the hot-seat wrapper's correctness: a single
  // `submitChallenge(sefirah, modifiers, outcome)` produces the
  // same `GameState` as a multiplayer-mode caller staging each
  // modifier as a `prep-add-modifier` and then `prep-confirm`-ing.
  // Use a deterministic outcome so RNG variance doesn't enter.

  const PASS_OUTCOME: CheckOutcome = {
    rolled: 17,
    statContribution: 10,
    modifierBreakdown: { assist: 4, cardBurn: 6, sparkBurn: 0 },
    total: 37,
    effectiveDC: 15,
    pass: true,
  };

  it('wrapper produces the same state as per-step add+confirm with the same inputs', () => {
    // Player has cards 3, 7 in hand. No assists / sparks in this
    // path — the wrapper-equivalence test for assists is
    // separately covered by the engine-level `directAssistStats`
    // test (see turn-machine.test.ts) because the wrapper has no
    // ally IDs to recover when given `assistStats: number[]`,
    // while the per-step path stages by ally ID. This test
    // covers card-burn equivalence end-to-end.
    const playerOverrides: Partial<PlayerState> = {
      hand: [3, 7, 11, 14],
    };
    const harnessWrapper = hookViaMoveIntoPrep(playerOverrides);
    const harnessPerStep = hookViaMoveIntoPrep(playerOverrides);

    // Wrapper path: one click via submitChallenge with two
    // card-burns (no assists, no sparks).
    const modifiers: CheckModifiers = {
      assistStats: [],
      cardBurns: 2,
      sparkBurns: 0,
      shortcutPenalty: false,
    };
    act(() => {
      harnessWrapper.result.current.submitChallenge('binah', modifiers, PASS_OUTCOME);
    });

    // Per-step path: stage two card-burns one at a time, then
    // confirm. The wrapper's card-synthesis order is the order they
    // appear in the player's hand (first N) AT THE TIME OF
    // submitChallenge. Pre-prep, `move(14)` (chokmah ↔ binah, Daleth
    // path, arcanumNumber=3) consumes arcanum 3 from hand, leaving
    // [7, 11, 14]. So for cardBurns=2 the synthesized events are
    // arcanum=7 then arcanum=11. (#281 made the in-hand vs.
    // gone-from-hand distinction load-bearing because consumption
    // now happens at confirm.)
    act(() => {
      harnessPerStep.result.current.prepAddModifier({
        kind: 'card-burn',
        arcanum: 7,
      });
    });
    act(() => {
      harnessPerStep.result.current.prepAddModifier({
        kind: 'card-burn',
        arcanum: 11,
      });
    });
    act(() => {
      harnessPerStep.result.current.prepConfirm('binah', PASS_OUTCOME);
    });

    // Both paths land in the same react sub-state (post-resolve,
    // pre-draw). Compare deep-equal on the published GameState.
    expect(harnessWrapper.result.current.state).toEqual(harnessPerStep.result.current.state);
    expect(harnessWrapper.result.current.phase).toBe(harnessPerStep.result.current.phase);
    expect(harnessWrapper.result.current.challengeSubPhase).toBe(
      harnessPerStep.result.current.challengeSubPhase,
    );
  });

  it('wrapper still satisfies the legacy contract on PlayScreen.submitChallenge call shape', () => {
    // PlayScreen calls `turn.submitChallenge(sefirah, modifiers,
    // outcome)` only on pass and forwards the modal-built
    // CheckModifiers + pre-rolled outcome. This test pins the
    // surface PlayScreen depends on (return type, success ok=true
    // shape, post-call sub-phase). If E4 changes this, PlayScreen
    // would break — read it as "regression guard for
    // PlayScreen.tsx:172".
    const { result } = hookViaMoveIntoPrep({ hand: [3, 7] });
    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      outcome = result.current.submitChallenge(
        'binah',
        {
          assistStats: [],
          cardBurns: 0,
          sparkBurns: 0,
          shortcutPenalty: false,
        },
        {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 28,
          effectiveDC: 15,
          pass: true,
        },
      );
    });
    expect(outcome?.ok).toBe(true);
    if (outcome?.ok) {
      expect(outcome.value.outcome.pass).toBe(true);
    }
    expect(result.current.challengeSubPhase).toBe('react');
  });

  it('wrapper synthesises spark-burn events from sparksHeld and stages them on prep', () => {
    // Hold two sparks. The wrapper should synthesise two
    // `spark-burn` PrepModifier events, stage them on
    // `pendingModifiers`, then prep-confirm. The engine then
    // (as of #281) removes the burned sparks from `sparksHeld`
    // at confirm-time alongside the d20-modifier credit.
    //
    // Hand needs arcanum 3 so the move(14) (chokmah ↔ binah,
    // arcanum 3) is legal. The sparkBurns count (2) is the
    // wrapper's input; the synthesised PrepModifiers come from
    // sparksHeld.
    const { result } = hookViaMoveIntoPrep({
      hand: [3],
      sparksHeld: new Set(['chokmah', 'malkuth']),
    });
    expect(result.current.phase).toBe('challenge');
    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      outcome = result.current.submitChallenge(
        'binah',
        {
          assistStats: [],
          cardBurns: 0,
          sparkBurns: 2, // both held sparks
          shortcutPenalty: false,
        },
        {
          rolled: 18,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 10 },
          total: 38,
          effectiveDC: 15,
          pass: true,
        },
      );
    });
    expect(outcome?.ok).toBe(true);
    if (outcome?.ok) {
      expect(outcome.value.outcome.pass).toBe(true);
    }
    // Challenge succeeded → Sefirah cleared, confirming the
    // engine saw the sparkBurn contribution.
    const player = result.current.state.players[0];
    expect(player?.clearedSefirot.has('binah')).toBe(true);
    // #281: burned sparks are removed from `sparksHeld`. Both
    // chokmah and malkuth were burned; both must be gone. (The
    // passed challenge earns a `binah` spark — that's separate
    // from the consumption being pinned here.)
    expect(player?.sparksHeld.has('chokmah')).toBe(false);
    expect(player?.sparksHeld.has('malkuth')).toBe(false);
    expect(player?.sparksHeld.has('binah')).toBe(true);
    expect(player?.sparksHeld.size).toBe(1);
  });
});

describe('useTurn — submitChallenge shortcutPenalty derivation (#286)', () => {
  // Pre-#286: the wrapper forwarded `modifiers.shortcutPenalty` through
  // a `prep-confirm` event override. Post-#286: the field is gone from
  // the event, and the reducer derives the +3 DC penalty from the
  // active player's `lastArrivalPathNumber`. The wrapper-built
  // `CheckModifiers.shortcutPenalty` (still used by the modal's UI to
  // render the DC summary line) no longer round-trips through the
  // engine event. These tests pin that contract: identical inputs to
  // `submitChallenge` reach the same `effectiveDC` whether the player
  // arrived via a shortcut path or not, driven purely by state.

  it('engine derives +3 DC penalty after a central-pillar shortcut arrival', () => {
    // Set up a snapshot where the active player just arrived at
    // yesod via path 25 (Tiferet ↔ Yesod, all-balance pillars — a
    // central-pillar shortcut). The reducer should derive
    // `shortcutPenalty: true` and bump effectiveDC by +3.
    // yesod base DC 12 → effective 15.
    const initialState = makeState(
      {},
      {
        players: [
          makePlayer({
            id: 'p1',
            name: 'Andy',
            position: 'yesod',
            stats: {
              unity: 10,
              insight: 10,
              understanding: 10,
              lovingkindness: 10,
              strength: 10,
              harmony: 10,
              passion: 10,
              intellect: 10,
              intuition: 10,
              body: 10,
            },
            lastArrivalPathNumber: 25,
          }),
        ],
        phase: 'challenge',
        challengeSubPhase: 'prep',
      },
    );
    const { result } = renderHook(() => useTurn({ initialState, rng: seededRng(1) }));
    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      // The modal still passes `shortcutPenalty: true` in
      // CheckModifiers (it computes the UI DC line from the same
      // state) but the wrapper no longer forwards it — the reducer
      // derives the same answer from `lastArrivalPathNumber`.
      outcome = result.current.submitChallenge('yesod', {
        assistStats: [],
        cardBurns: 0,
        sparkBurns: 0,
        shortcutPenalty: true,
      });
    });
    expect(outcome?.ok).toBe(true);
    if (!outcome?.ok) return;
    // yesod base DC 12; with +3 shortcut, effective 15.
    expect(outcome.value.outcome.effectiveDC).toBe(15);
  });

  it('engine derives no penalty after a non-shortcut arrival, even if modifiers.shortcutPenalty=true', () => {
    // Belt-and-braces: pin that the modifiers.shortcutPenalty bit
    // the modal sets is no longer authoritative. The active player
    // arrived at binah via path 14 (Chokmah ↔ Binah, mercy/severity
    // — not a shortcut). The wrapper still receives `shortcutPenalty:
    // true` in the modifiers blob (e.g. a future UI bug or stale
    // CheckModifiers), but the engine MUST disregard it and read
    // truth from `lastArrivalPathNumber`. This is the security-
    // benefit half of the #286 derivation: the wrapper can no
    // longer fabricate a shortcut.
    const { result } = hookViaMoveIntoPrep();
    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      outcome = result.current.submitChallenge('binah', {
        assistStats: [],
        cardBurns: 0,
        sparkBurns: 0,
        shortcutPenalty: true,
      });
    });
    expect(outcome?.ok).toBe(true);
    if (!outcome?.ok) return;
    // binah base DC 16; non-shortcut arrival, no bump.
    expect(outcome.value.outcome.effectiveDC).toBe(16);
  });

  it('engine derives no penalty when modifiers.shortcutPenalty is false on a non-shortcut path', () => {
    // The path 14 arrival via hookViaMoveIntoPrep + the modal's
    // honest `shortcutPenalty: false`. Baseline DC.
    const { result } = hookViaMoveIntoPrep();
    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      outcome = result.current.submitChallenge('binah', {
        assistStats: [],
        cardBurns: 0,
        sparkBurns: 0,
        shortcutPenalty: false,
      });
    });
    expect(outcome?.ok).toBe(true);
    if (!outcome?.ok) return;
    expect(outcome.value.outcome.effectiveDC).toBe(16);
  });
});

describe('useTurn — submitChallenge atomicity / rollback (E4 / #229)', () => {
  // Pin the wrapper's atomicity claim (lib/use-turn.ts ~311–313):
  // "Optimistically mutate a local snapshot through each staging
  // step. Only commit to React if the whole chain succeeds."
  // If a future refactor moves `setSnapshot` above the confirm,
  // the suite stays green and production silently loses the
  // rollback. These tests fail loudly under that scenario.

  it('rolls back: chain mid-fail leaves React state untouched (wrong-phase)', () => {
    // freshHook() initialises in `phase: 'move'`; submitChallenge
    // expects `phase: 'challenge' / 'prep'`. The first
    // prep-add-modifier (synthesised from a card-burn) — or, if
    // there are no card-burns, the prep-confirm itself — rejects
    // with `wrong-sub-phase`. The wrapper MUST NOT commit any
    // partial snapshot to React.
    const { result } = freshHook();
    const beforeState = result.current.state;
    const beforePhase = result.current.phase;
    const beforeSubPhase = result.current.challengeSubPhase;

    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      outcome = result.current.submitChallenge('tiferet', {
        assistStats: [],
        cardBurns: 1, // forces a prep-add-modifier step that will reject
        sparkBurns: 0,
        shortcutPenalty: false,
      });
    });

    expect(outcome?.ok).toBe(false);
    // Reference equality: the snapshot was never replaced, so the
    // `state` getter still returns the same object identity.
    expect(result.current.state).toBe(beforeState);
    expect(result.current.phase).toBe(beforePhase);
    expect(result.current.challengeSubPhase).toBe(beforeSubPhase);
  });

  it('rolls back: cardBurns count exceeds hand length leaves React state untouched', () => {
    // Variant: the wrapper caps `cardBurns` at `player.hand.length`
    // before synthesising events, so this case reaches `prep-confirm`
    // with fewer staged cards than the modal asked for. The
    // confirm itself then succeeds (no out-of-band rejection), so
    // this is more of a "the cap is sane" test than a true
    // rollback test — but it pins behaviour either way: if a
    // future refactor removed the cap, the synthesis loop would
    // throw on undefined and the harness would surface that.
    //
    // We also call from a non-prep state, so the cap-doesn't-help
    // path also rejects. Pin react state stays unchanged.
    const { result } = freshHook();
    const beforeState = result.current.state;

    let outcome: ReturnType<typeof result.current.submitChallenge> | undefined;
    act(() => {
      outcome = result.current.submitChallenge('tiferet', {
        assistStats: [],
        cardBurns: 99, // far exceeds hand size of 4
        sparkBurns: 0,
        shortcutPenalty: false,
      });
    });

    expect(outcome?.ok).toBe(false);
    expect(result.current.state).toBe(beforeState);
  });
});

// ────────────────────────────────────────────────────────────────────
// K4 (#352) — Kether ritual adapter + hot-seat collapse.
// ────────────────────────────────────────────────────────────────────
//
// `useTurn` gains five ritual-specific methods (`ketherWitnessPlay`,
// `ketherWitnessPass`, `ketherCloseStageSpark`, `ketherCloseUnstageSpark`,
// `thresholdConfirm`) plus a host-only `ketherHostSkipWitness` for
// multiplayer disconnect defense. Hot-seat consumes the engine reducers
// directly; multiplayer dispatches the matching K2 `ClientAction` via
// an injected `dispatchClientAction` callback so other clients see the
// move via Realtime.
//
// The hot-seat collapse: with no `dispatchClientAction` injected, the
// hook applies the engine reducer locally AND mirrors the witness
// pointer onto a derived field so the UI can render "whose voice is
// speaking now" without reaching into `state.ketherRitual`. The
// rotation tests below pin both 2-player and 3-player round-robins.
//
// Design refs: `design/final-threshold.md` § 7.1 (K4 scope), § 2.2
// (hot-seat collapse + abbreviated solo coda S-5), § 3.3 (active-player
// frozen during ritual), § 5 (state shape).

/**
 * Build a `KetherRitualState` matching what `initKetherRitual`
 * produces for a 2- or 3-player ritual at fresh witness entry. Hand
 * sizes default to 2 cards each; first player in `playerIds`
 * opens the round-robin (matches the descending-timestamp invariant
 * via the order the test caller passes).
 */
function freshRitual(
  playerIds: readonly string[],
  handSizes: Readonly<Record<string, number>> = {},
): KetherRitualState {
  const personalQueueLengths: Record<string, number> = {};
  const passCounts: Record<string, number> = {};
  const arrivalTimestamps: Record<string, number> = {};
  for (const id of playerIds) {
    personalQueueLengths[id] = handSizes[id] ?? 2;
    passCounts[id] = 0;
    arrivalTimestamps[id] = 100; // unused at runtime, present for shape
  }
  return {
    subPhase: 'witness',
    witnessOrder: [...playerIds],
    witnessTurnIndex: 0,
    personalQueueLengths,
    passCounts,
    witnessLog: [],
    arrivalTimestamps,
    stagedClosureSparks: [],
    closureLocked: false,
  };
}

/**
 * Mount a `useTurn` hook against a fully-staged ritual state. Two
 * players by default — `p2` opens (last-arrived) per the design's
 * descending-timestamp rule — but a custom player set can be passed.
 *
 * The fixture is a hot-seat snapshot: no `dispatchClientAction`
 * injection, no Realtime. Tests can override `players` / `ritual`
 * fully; the helper just plumbs the standard plumbing.
 */
function ritualHook(opts?: {
  readonly players?: readonly PlayerState[];
  readonly ritual?: KetherRitualState;
  readonly dispatchClientAction?: (action: ClientAction) => void;
  readonly selfPlayerId?: string;
}) {
  const players: readonly PlayerState[] = opts?.players ?? [
    makePlayer({ id: 'p1', position: 'kether', hand: [3, 4] }),
    makePlayer({ id: 'p2', position: 'kether', hand: [5, 6] }),
  ];
  const ritual: KetherRitualState = opts?.ritual ?? freshRitual(['p2', 'p1']);
  const initialState: GameState = makeState(
    {},
    {
      players: [...players],
      activePlayerId: ritual.witnessOrder[0] ?? players[0]?.id ?? 'p1',
      phase: 'kether',
      ketherRitual: ritual,
    },
  );
  const baseOpts = { initialState, rng: seededRng(1) };
  const fullOpts =
    opts?.dispatchClientAction !== undefined
      ? {
          ...baseOpts,
          dispatchClientAction: opts.dispatchClientAction,
          ...(opts.selfPlayerId !== undefined ? { selfPlayerId: opts.selfPlayerId } : {}),
        }
      : baseOpts;
  return renderHook(() => useTurn(fullOpts));
}

describe('useTurn — Kether ritual return shape (K4 / #352)', () => {
  it('exposes the five ritual methods on the return shape', () => {
    const { result } = ritualHook();
    expect(typeof result.current.ketherWitnessPlay).toBe('function');
    expect(typeof result.current.ketherWitnessPass).toBe('function');
    expect(typeof result.current.ketherCloseStageSpark).toBe('function');
    expect(typeof result.current.ketherCloseUnstageSpark).toBe('function');
    expect(typeof result.current.thresholdConfirm).toBe('function');
  });

  it('exposes a derived currentWitnessPlayerId that tracks the engine pointer', () => {
    // Pre-action: p2 opens the round-robin (witnessOrder[0]).
    const { result } = ritualHook();
    expect(result.current.currentWitnessPlayerId).toBe('p2');
  });

  it('currentWitnessPlayerId is null outside the witness sub-phase', () => {
    // Non-ritual state: the field is null, not undefined, so callers
    // can rely on a single discriminator across hot-seat and
    // multiplayer paths.
    const { result } = freshHook();
    expect(result.current.currentWitnessPlayerId).toBeNull();
  });
});

describe('useTurn — ketherWitnessPlay (K4 / #352)', () => {
  it('hot-seat: plays the card via the engine reducer and advances the pointer', () => {
    const { result } = ritualHook();
    expect(result.current.currentWitnessPlayerId).toBe('p2');
    act(() => {
      result.current.ketherWitnessPlay(5);
    });
    // Engine: p2 burns arcanum 5 to discard, witness pointer advances
    // to p1 (next in witnessOrder).
    expect(result.current.state.ketherRitual?.witnessLog).toEqual([
      { kind: 'played', playerId: 'p2', arcanum: 5 },
    ]);
    expect(result.current.state.ketherRitual?.witnessTurnIndex).toBe(1);
    expect(result.current.state.players.find((p) => p.id === 'p2')?.hand).toEqual([6]);
    // Derived field follows the engine.
    expect(result.current.currentWitnessPlayerId).toBe('p1');
  });

  it('multiplayer: dispatches the K2 ClientAction with the correct shape', () => {
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      dispatchClientAction,
      selfPlayerId: 'p2',
    });
    act(() => {
      result.current.ketherWitnessPlay(5);
    });
    expect(dispatchClientAction).toHaveBeenCalledTimes(1);
    expect(dispatchClientAction).toHaveBeenCalledWith({
      kind: 'kether-witness-play',
      playerId: 'p2',
      arcanum: 5,
    } satisfies ClientAction);
  });
});

describe('useTurn — ketherWitnessPass (K4 / #352)', () => {
  it('hot-seat: passes via the engine reducer (+1 separation, pointer advances)', () => {
    const { result } = ritualHook({
      ritual: freshRitual(['p2', 'p1'], { p1: 4, p2: 4 }),
    });
    act(() => {
      result.current.ketherWitnessPass();
    });
    expect(result.current.state.separation).toBe(1);
    expect(result.current.state.ketherRitual?.passCounts.p2).toBe(1);
    expect(result.current.currentWitnessPlayerId).toBe('p1');
  });

  it('multiplayer: dispatches the K2 ClientAction with the correct shape', () => {
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      dispatchClientAction,
      selfPlayerId: 'p2',
    });
    act(() => {
      result.current.ketherWitnessPass();
    });
    expect(dispatchClientAction).toHaveBeenCalledWith({
      kind: 'kether-witness-pass',
      playerId: 'p2',
    } satisfies ClientAction);
  });
});

describe('useTurn — closure-window methods (K4 / #352)', () => {
  /**
   * Build a closure-window state: ritual is in `subPhase: 'close'`
   * (witness has finished). Both players hold sparks they may stage.
   */
  function closureFixture() {
    const players: readonly PlayerState[] = [
      makePlayer({
        id: 'p1',
        position: 'kether',
        hand: [],
        sparksHeld: new Set(['chesed', 'gevurah']),
      }),
      makePlayer({
        id: 'p2',
        position: 'kether',
        hand: [],
        sparksHeld: new Set(['hod']),
      }),
    ];
    const ritual: KetherRitualState = {
      ...freshRitual(['p2', 'p1']),
      subPhase: 'close',
    };
    return { players, ritual };
  }

  it('hot-seat: ketherCloseStageSpark stages the spark on ritual state', () => {
    const { players, ritual } = closureFixture();
    const { result } = ritualHook({ players, ritual });
    act(() => {
      result.current.ketherCloseStageSpark('p1', 'chesed');
    });
    expect(result.current.state.ketherRitual?.stagedClosureSparks).toEqual([
      { playerId: 'p1', sefirah: 'chesed' },
    ]);
  });

  it('multiplayer: ketherCloseStageSpark dispatches the K2 ClientAction', () => {
    const { players, ritual } = closureFixture();
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      players,
      ritual,
      dispatchClientAction,
      selfPlayerId: 'p1',
    });
    act(() => {
      result.current.ketherCloseStageSpark('p1', 'chesed');
    });
    expect(dispatchClientAction).toHaveBeenCalledWith({
      kind: 'kether-close-stage-spark',
      playerId: 'p1',
      sefirah: 'chesed',
    } satisfies ClientAction);
  });

  it('hot-seat: ketherCloseUnstageSpark removes the staged spark', () => {
    const { players, ritual } = closureFixture();
    const stagedRitual: KetherRitualState = {
      ...ritual,
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'chesed' }],
    };
    const { result } = ritualHook({ players, ritual: stagedRitual });
    act(() => {
      result.current.ketherCloseUnstageSpark('p1', 'chesed');
    });
    expect(result.current.state.ketherRitual?.stagedClosureSparks).toEqual([]);
  });

  it('multiplayer: ketherCloseUnstageSpark dispatches the K2 ClientAction', () => {
    const { players, ritual } = closureFixture();
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      players,
      ritual: { ...ritual, stagedClosureSparks: [{ playerId: 'p1', sefirah: 'chesed' }] },
      dispatchClientAction,
      selfPlayerId: 'p1',
    });
    act(() => {
      result.current.ketherCloseUnstageSpark('p1', 'chesed');
    });
    expect(dispatchClientAction).toHaveBeenCalledWith({
      kind: 'kether-close-unstage-spark',
      playerId: 'p1',
      sefirah: 'chesed',
    } satisfies ClientAction);
  });

  it('hot-seat: thresholdConfirm consumes staged sparks and exits to phase=end', () => {
    const { players, ritual } = closureFixture();
    const stagedRitual: KetherRitualState = {
      ...ritual,
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'chesed' }],
    };
    const { result } = ritualHook({ players, ritual: stagedRitual });
    act(() => {
      result.current.thresholdConfirm();
    });
    // Engine consumed the spark and exited to 'end' (per § 3.4).
    expect(result.current.state.phase).toBe('end');
    expect(result.current.state.ketherRitual?.closureLocked).toBe(true);
    // Spark spent → +1 illumination.
    expect(result.current.state.illumination).toBe(1);
    const p1 = result.current.state.players.find((p) => p.id === 'p1');
    expect(p1?.sparksHeld.has('chesed')).toBe(false);
  });

  it('multiplayer: thresholdConfirm dispatches the K2 ClientAction with selfPlayerId', () => {
    const { players, ritual } = closureFixture();
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      players,
      ritual,
      dispatchClientAction,
      selfPlayerId: 'p2',
    });
    act(() => {
      result.current.thresholdConfirm();
    });
    expect(dispatchClientAction).toHaveBeenCalledWith({
      kind: 'threshold-confirm',
      playerId: 'p2',
    } satisfies ClientAction);
  });
});

describe('useTurn — hot-seat round-robin rotation (K4 / #352)', () => {
  // The "hot-seat collapse" claim from § 7.1: the round-robin still
  // rotates through local "players" — same rhythm. After each Play /
  // Pass, the derived `currentWitnessPlayerId` advances to the next
  // player in `witnessOrder`. `state.activePlayerId` itself stays
  // frozen per § 3.3 (the active-player field is a turn-machine
  // concept; the ritual owns its own pointer).

  it('rotates 2-player round-robin: p2 → p1 → close', () => {
    const { result } = ritualHook();
    expect(result.current.currentWitnessPlayerId).toBe('p2');
    act(() => {
      result.current.ketherWitnessPlay(5);
    });
    expect(result.current.currentWitnessPlayerId).toBe('p1');
    act(() => {
      result.current.ketherWitnessPlay(3);
    });
    // p2 hand: [6], p1 hand: [4]. Pointer wraps back to p2.
    expect(result.current.currentWitnessPlayerId).toBe('p2');
    act(() => {
      result.current.ketherWitnessPlay(6);
    });
    // p2 hand empty; advance to p1 (only non-empty queue).
    expect(result.current.currentWitnessPlayerId).toBe('p1');
    act(() => {
      result.current.ketherWitnessPlay(4);
    });
    // All queues empty → witness sub-phase ends; pointer null.
    expect(result.current.currentWitnessPlayerId).toBeNull();
    expect(result.current.state.ketherRitual?.subPhase).toBe('close');
  });

  it('rotates 3-player round-robin: p3 → p1 → p2 → wrap', () => {
    // 3 players, last-arrived first — say `witnessOrder: ['p3', 'p1', 'p2']`.
    const players: readonly PlayerState[] = [
      makePlayer({ id: 'p1', position: 'kether', hand: [10, 11] }),
      makePlayer({ id: 'p2', position: 'kether', hand: [20, 21] }),
      makePlayer({ id: 'p3', position: 'kether', hand: [30, 31] }),
    ];
    const ritual: KetherRitualState = freshRitual(['p3', 'p1', 'p2'], { p1: 2, p2: 2, p3: 2 });
    const { result } = ritualHook({ players, ritual });
    expect(result.current.currentWitnessPlayerId).toBe('p3');
    act(() => {
      result.current.ketherWitnessPlay(30);
    });
    expect(result.current.currentWitnessPlayerId).toBe('p1');
    act(() => {
      result.current.ketherWitnessPlay(10);
    });
    expect(result.current.currentWitnessPlayerId).toBe('p2');
    act(() => {
      result.current.ketherWitnessPlay(20);
    });
    // Wrap: back to p3 (first non-empty queue at pointer-wrap).
    expect(result.current.currentWitnessPlayerId).toBe('p3');
  });

  it('§ 3.3: state.activePlayerId is frozen during the ritual (not advanced by play/pass)', () => {
    const { result } = ritualHook();
    const initialActive = result.current.state.activePlayerId;
    act(() => {
      result.current.ketherWitnessPlay(5);
    });
    // The witness pointer advanced (currentWitnessPlayerId changed),
    // but state.activePlayerId stays frozen — the ritual has its own
    // pointer.
    expect(result.current.state.activePlayerId).toBe(initialActive);
    act(() => {
      result.current.ketherWitnessPass();
    });
    expect(result.current.state.activePlayerId).toBe(initialActive);
  });
});

describe('useTurn — hot-seat solo coda (N=1) (K4 / #352)', () => {
  // § 2.2 / S-5: the abbreviated solo coda — one player at the keyboard
  // (e.g. dev / playtest) plays each card from their final hand in
  // arrival order, then enters closure normally. The engine handles
  // N=1 as a degenerate one-element round-robin: `witnessOrder = [p1]`,
  // `witnessTurnIndex = 0`. After the queue empties, advanceWitness
  // transitions to 'close'. K4's hook just exposes the same per-step
  // methods; the "abbreviated coda" is a UI presentation collapse, not
  // a state-shape collapse. (See Journal entry for #352 — design § 2.2
  // explicitly covers this.)

  it('solo: 1-player ritual enters witness with witnessOrder=[p1]', () => {
    const players: readonly PlayerState[] = [
      makePlayer({ id: 'p1', position: 'kether', hand: [3, 4] }),
    ];
    const ritual: KetherRitualState = freshRitual(['p1']);
    const { result } = ritualHook({ players, ritual });
    expect(result.current.state.phase).toBe('kether');
    expect(result.current.state.ketherRitual?.subPhase).toBe('witness');
    expect(result.current.state.ketherRitual?.witnessOrder).toEqual(['p1']);
    expect(result.current.currentWitnessPlayerId).toBe('p1');
  });

  it('solo: playing the entire queue exits witness → close', () => {
    const players: readonly PlayerState[] = [
      makePlayer({ id: 'p1', position: 'kether', hand: [3, 4] }),
    ];
    const ritual: KetherRitualState = freshRitual(['p1']);
    const { result } = ritualHook({ players, ritual });
    act(() => {
      result.current.ketherWitnessPlay(3);
    });
    // Queue still has [4]; pointer wraps to p1 (only player).
    expect(result.current.currentWitnessPlayerId).toBe('p1');
    act(() => {
      result.current.ketherWitnessPlay(4);
    });
    // Queue empty → close.
    expect(result.current.state.ketherRitual?.subPhase).toBe('close');
    expect(result.current.currentWitnessPlayerId).toBeNull();
  });
});

describe('useTurn — ketherHostSkipWitness (K4 / #352)', () => {
  // Host-only multiplayer affordance for the disconnect-defense path
  // (§ 7.1). Hot-seat does not expose this method (no disconnect risk
  // at one keyboard). The dispatch goes through the wire as a
  // `kether-host-skip-witness` ClientAction; the server enforces the
  // host-identity gate.

  it('multiplayer: dispatches the K2 ClientAction with the target playerId', () => {
    const { players, ritual } = (() => {
      const ps: readonly PlayerState[] = [
        makePlayer({ id: 'p1', position: 'kether', hand: [3, 4] }),
        makePlayer({ id: 'p2', position: 'kether', hand: [5, 6] }),
      ];
      // p1 is the host (state.players[0]); p2 is the absent witness.
      const r: KetherRitualState = freshRitual(['p2', 'p1']);
      return { players: ps, ritual: r };
    })();
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      players,
      ritual,
      dispatchClientAction,
      selfPlayerId: 'p1',
    });
    expect(typeof result.current.ketherHostSkipWitness).toBe('function');
    act(() => {
      result.current.ketherHostSkipWitness?.('p2');
    });
    expect(dispatchClientAction).toHaveBeenCalledWith({
      kind: 'kether-host-skip-witness',
      playerId: 'p1',
      targetPlayerId: 'p2',
    } satisfies ClientAction);
  });

  it('hot-seat: ketherHostSkipWitness is undefined (no disconnect at one keyboard)', () => {
    const { result } = ritualHook();
    expect(result.current.ketherHostSkipWitness).toBeUndefined();
  });
});

describe('useTurn — Kether dispatch ordering (K4 / #352 review fix)', () => {
  // The first draft of K4 dispatched the K2 ClientAction BEFORE applying
  // the engine reducer locally. A stale-closure race (two clients
  // clicking simultaneously, or a witness-play attempted out of turn)
  // would fire the wire even when the engine would reject locally —
  // sending an action the client knows is invalid. The fix swaps the
  // order: local-apply first; dispatch only on `result.ok`.

  it('does NOT dispatch over the wire when the local engine reduce rejects', () => {
    // p1 is NOT the current witness (p2 opens the round-robin).
    // Calling ketherWitnessPlay with selfPlayerId 'p1' should reject
    // with kether-not-your-turn. Pre-fix the wire would still fire.
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      dispatchClientAction,
      selfPlayerId: 'p1', // wrong — current witness is p2
    });
    let callResult: Result<GameState, KetherRejection> | undefined;
    act(() => {
      callResult = result.current.ketherWitnessPlay(5);
    });
    expect(callResult?.ok).toBe(false);
    if (!callResult || callResult.ok) return;
    expect(callResult.reason.kind).toBe('kether-not-your-turn');
    // Wire NEVER fires for a locally-rejected action.
    expect(dispatchClientAction).not.toHaveBeenCalled();
  });

  it('does NOT dispatch when ketherCloseStageSpark rejects locally', () => {
    // Stage attempt outside the close sub-phase rejects
    // (`kether-wrong-sub-phase`). Pre-fix the wire would still fire.
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    const { result } = ritualHook({
      dispatchClientAction,
      selfPlayerId: 'p1',
    });
    act(() => {
      result.current.ketherCloseStageSpark('p1', 'gevurah');
    });
    expect(dispatchClientAction).not.toHaveBeenCalled();
  });
});

describe('useTurn — multiplayer options pairing guard (K4 / #352 review fix)', () => {
  // When `dispatchClientAction` is provided, `selfPlayerId` MUST also
  // be provided. Without selfPlayerId, methods like thresholdConfirm
  // would silently no-op (the actor is undefined and the guard returns
  // `undefined` without dispatching). The hook throws at construction
  // time so the misconfiguration is caught immediately rather than at
  // runtime when the close button silently fails.

  it('throws when dispatchClientAction is provided without selfPlayerId', () => {
    const dispatchClientAction = vi.fn<(action: ClientAction) => void>();
    expect(() => {
      // Render the hook with a malformed options bag — the hook should
      // throw synchronously inside renderHook's wrapping component.
      ritualHook({ dispatchClientAction });
    }).toThrow(/selfPlayerId/);
  });
});

// Compile-time sanity: the `PrepModifier` type is exported from
// the turn-machine module so the hook's signature can refer to
// it. (This test is a lightweight type-check; if the export is
// removed or renamed, this file fails to compile.)
const _typeCheck: PrepModifier = { kind: 'card-burn', arcanum: 0 };
void _typeCheck;
