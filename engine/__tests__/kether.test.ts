import { describe, expect, it } from 'vitest';
import { checkEndgame } from '../endgame';
import {
  REQUIRED_ILLUMINATION_MARGIN,
  SEPARATION_LOSS_THRESHOLD,
} from '../endgame';
import {
  ketherPlayCard,
  ketherPassCard,
  ketherStageSpark,
  ketherUnstageSpark,
  ketherConfirmClosure,
  initKetherRitual,
  maybeTriggerKetherRitual,
  currentWitnessPlayerId,
  isKetherHeld,
  type KetherRitualState,
  type KetherWitnessLogEntry,
} from '../kether';
import { applyMove } from '../movement';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '../types';

/**
 * Build a minimal post-gather Kether state. Two players, both at Kether,
 * `phase === 'kether'`, sub-phase `'witness'`, with a deterministic
 * `witnessOrder` and `personalQueueLengths` derived from the supplied
 * hands. `arrivalTimestamps` are stable for replay.
 *
 * Lives here (not in `test/fixtures.ts`) because it's specific to the
 * ritual's reducer-arm tests; promoting it would force the global
 * fixture file to know about the ritual shape.
 */
function makeWitnessState(opts: {
  readonly p1Hand?: readonly number[];
  readonly p2Hand?: readonly number[];
  readonly witnessTurnIndex?: number;
  readonly witnessOrder?: readonly string[];
  readonly illumination?: number;
  readonly separation?: number;
  readonly passCounts?: Record<string, number>;
  readonly subPhase?: KetherRitualState['subPhase'];
  readonly stagedClosureSparks?: KetherRitualState['stagedClosureSparks'];
  readonly closureLocked?: boolean;
  readonly p1Sparks?: ReadonlySet<'kether'> | ReadonlySet<string>;
  readonly p2Sparks?: ReadonlySet<string>;
}): GameState {
  const p1Hand = opts.p1Hand ?? [3, 7];
  const p2Hand = opts.p2Hand ?? [4, 9];
  const players = [
    makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [...p1Hand],
      sparksHeld: (opts.p1Sparks as ReadonlySet<never>) ?? new Set(),
    }),
    makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [...p2Hand],
      sparksHeld: (opts.p2Sparks as ReadonlySet<never>) ?? new Set(),
    }),
  ];
  const witnessOrder = opts.witnessOrder ?? ['p1', 'p2'];
  const personalQueueLengths: Record<string, number> = {
    p1: p1Hand.length,
    p2: p2Hand.length,
  };
  const ritual: KetherRitualState = {
    subPhase: opts.subPhase ?? 'witness',
    witnessOrder,
    witnessTurnIndex: opts.witnessTurnIndex ?? 0,
    personalQueueLengths,
    passCounts: opts.passCounts ?? { p1: 0, p2: 0 },
    witnessLog: [],
    arrivalTimestamps: { p1: 1, p2: 2 },
    stagedClosureSparks: opts.stagedClosureSparks ?? [],
    closureLocked: opts.closureLocked ?? false,
  };
  return makeState(
    {},
    {
      players,
      activePlayerId: 'p1',
      phase: 'kether',
      illumination: opts.illumination ?? 0,
      separation: opts.separation ?? 0,
      ketherRitual: ritual,
    },
  );
}

// ──────────────── isKetherHeld (pre-ritual hold predicate) ────────────────

describe('isKetherHeld — pre-ritual hold predicate', () => {
  it('returns true when player is at Kether but the ritual has not started', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState(
      {},
      { players: [p1, p2], phase: 'move' },
    );
    expect(isKetherHeld(state, 'p1')).toBe(true);
    expect(isKetherHeld(state, 'p2')).toBe(false);
  });

  it('returns false once the ritual has started (phase === kether)', () => {
    // Once everyone is at Kether and phase flips, no one is "held";
    // they are full participants in the ritual.
    const state = makeWitnessState({});
    expect(isKetherHeld(state, 'p1')).toBe(false);
    expect(isKetherHeld(state, 'p2')).toBe(false);
  });

  it('returns false for an unknown player id', () => {
    // Defense-in-depth — a stale UI ref shouldn't read true for a
    // player that no longer exists.
    const state = makeState({});
    expect(isKetherHeld(state, 'unknown')).toBe(false);
  });
});

// ──────────────── currentWitnessPlayerId ────────────────

describe('currentWitnessPlayerId — pure query helper', () => {
  it('returns the player at witnessOrder[witnessTurnIndex] in the witness sub-phase', () => {
    const state = makeWitnessState({ witnessTurnIndex: 0 });
    expect(currentWitnessPlayerId(state)).toBe('p1');
    const advanced = makeWitnessState({ witnessTurnIndex: 1 });
    expect(currentWitnessPlayerId(advanced)).toBe('p2');
  });

  it('returns null when phase !== kether', () => {
    const state = makeState({}, { phase: 'move' });
    expect(currentWitnessPlayerId(state)).toBeNull();
  });

  it('returns null in the close sub-phase (round-robin pointer is frozen)', () => {
    const state = makeWitnessState({ subPhase: 'close' });
    expect(currentWitnessPlayerId(state)).toBeNull();
  });

  it('returns null in the gather sub-phase', () => {
    const state = makeWitnessState({ subPhase: 'gather' });
    expect(currentWitnessPlayerId(state)).toBeNull();
  });
});

// ──────────────── ketherPlayCard ────────────────

describe('ketherPlayCard', () => {
  it('moves the named arcanum from hand to discard, advances pointer, appends played log entry', () => {
    const state = makeWitnessState({ p1Hand: [3, 7], p2Hand: [4, 9] });
    const result = ketherPlayCard(state, { playerId: 'p1', arcanum: 7 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value;
    expect(next.players[0]?.hand).toEqual([3]);
    expect(next.discardPile).toEqual([7]);
    expect(next.ketherRitual?.witnessTurnIndex).toBe(1);
    expect(next.ketherRitual?.witnessLog).toEqual<KetherWitnessLogEntry[]>([
      { kind: 'played', playerId: 'p1', arcanum: 7 },
    ]);
  });

  it('rejects when dispatcher is not the current witness', () => {
    const state = makeWitnessState({});
    const result = ketherPlayCard(state, { playerId: 'p2', arcanum: 4 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-your-turn');
  });

  it('rejects when the arcanum is not in the dispatcher hand', () => {
    const state = makeWitnessState({ p1Hand: [3, 7] });
    const result = ketherPlayCard(state, { playerId: 'p1', arcanum: 99 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-card-not-in-hand');
  });

  it('rejects when phase is not kether', () => {
    const state = makeState({}, { phase: 'move' });
    const result = ketherPlayCard(state, { playerId: 'p1', arcanum: 3 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-phase');
  });

  it('skips empty queues when advancing the pointer', () => {
    // p1 plays last card; p2 still has one. Pointer should land on p2.
    const state = makeWitnessState({
      p1Hand: [3],
      p2Hand: [4],
      witnessTurnIndex: 0,
    });
    const result = ketherPlayCard(state, { playerId: 'p1', arcanum: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(currentWitnessPlayerId(result.value)).toBe('p2');
  });

  it('transitions to close sub-phase when all queues empty', () => {
    // Both queues at 1. p1 plays — pointer wraps; p2 plays — close.
    let state = makeWitnessState({
      p1Hand: [3],
      p2Hand: [4],
      witnessTurnIndex: 0,
    });
    const r1 = ketherPlayCard(state, { playerId: 'p1', arcanum: 3 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    state = r1.value;
    const r2 = ketherPlayCard(state, { playerId: 'p2', arcanum: 4 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.ketherRitual?.subPhase).toBe('close');
    expect(currentWitnessPlayerId(r2.value)).toBeNull();
  });
});

// ──────────────── ketherPassCard ────────────────

describe('ketherPassCard', () => {
  it('raises Separation by exactly +1, increments passCounts, advances pointer', () => {
    const state = makeWitnessState({
      p1Hand: [3, 7],
      p2Hand: [4, 9],
      separation: 4,
    });
    const result = ketherPassCard(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value;
    expect(next.separation).toBe(5);
    expect(next.ketherRitual?.passCounts['p1']).toBe(1);
    expect(next.ketherRitual?.witnessTurnIndex).toBe(1);
    expect(next.ketherRitual?.witnessLog).toEqual<KetherWitnessLogEntry[]>([
      { kind: 'passed', playerId: 'p1' },
    ]);
    // Hand is unchanged — pass does not consume a card.
    expect(next.players[0]?.hand).toEqual([3, 7]);
  });

  it('rejects when not the dispatcher turn', () => {
    const state = makeWitnessState({});
    const result = ketherPassCard(state, { playerId: 'p2' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-your-turn');
  });

  it('rejects when the dispatcher queue is empty (empty is exhaustion, not refusal)', () => {
    // p1 is the current witness but has no cards left — passing here
    // would be paying refusal cost on a queue that has nothing to refuse.
    // The reducer must instead skip them in advance logic; calling pass
    // explicitly is rejected.
    const state = makeWitnessState({
      p1Hand: [],
      p2Hand: [4],
      witnessTurnIndex: 0,
    });
    const result = ketherPassCard(state, { playerId: 'p1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-empty-queue');
  });

  it('enforces the per-player pass cap of ⌈personalQueueLength / 2⌉', () => {
    // p1 had 4 cards at gather (cap 2). They have already passed twice;
    // a third pass must be rejected even though they still hold cards.
    const state = makeWitnessState({
      p1Hand: [3, 7], // hand at this point in time, irrelevant to cap
      p2Hand: [4, 9],
      passCounts: { p1: 2, p2: 0 },
    });
    // Force personalQueueLengths to 4 (gather-time hand size).
    const ritualWithCap: GameState = {
      ...state,
      ketherRitual: state.ketherRitual && {
        ...state.ketherRitual,
        personalQueueLengths: { p1: 4, p2: 2 },
      },
    };
    const result = ketherPassCard(ritualWithCap, { playerId: 'p1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-pass-cap-exceeded');
  });

  it('per-player pass cap rounds up — a 1-card queue can be passed once', () => {
    // ⌈1 / 2⌉ = 1; one pass legal, two would not be (but the queue
    // empties after one pass anyway). Pin the rounding direction.
    const state = makeWitnessState({
      p1Hand: [3],
      p2Hand: [4],
    });
    const stateCap1: GameState = {
      ...state,
      ketherRitual: state.ketherRitual && {
        ...state.ketherRitual,
        personalQueueLengths: { p1: 1, p2: 1 },
      },
    };
    const result = ketherPassCard(stateCap1, { playerId: 'p1' });
    expect(result.ok).toBe(true);
  });
});

// ──────────────── ketherStageSpark / ketherUnstageSpark ────────────────

describe('ketherStageSpark', () => {
  it('stages a held Spark for the closure window', () => {
    const state = makeWitnessState({
      subPhase: 'close',
      p1Sparks: new Set(['yesod']) as ReadonlySet<string>,
    });
    const result = ketherStageSpark(state, {
      playerId: 'p1',
      sefirah: 'yesod',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.stagedClosureSparks).toEqual([
      { playerId: 'p1', sefirah: 'yesod' },
    ]);
    // Spark is NOT consumed yet — only consumed on confirm.
    expect(result.value.players[0]?.sparksHeld.has('yesod')).toBe(true);
  });

  it('rejects outside the close sub-phase', () => {
    const state = makeWitnessState({
      subPhase: 'witness',
      p1Sparks: new Set(['yesod']) as ReadonlySet<string>,
    });
    const result = ketherStageSpark(state, {
      playerId: 'p1',
      sefirah: 'yesod',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-sub-phase');
  });

  it('rejects when the player does not hold the named Spark', () => {
    const state = makeWitnessState({ subPhase: 'close' });
    const result = ketherStageSpark(state, {
      playerId: 'p1',
      sefirah: 'yesod',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-spark-not-held');
  });

  it('rejects after the closure has been locked', () => {
    const state = makeWitnessState({
      subPhase: 'close',
      closureLocked: true,
      p1Sparks: new Set(['yesod']) as ReadonlySet<string>,
    });
    const result = ketherStageSpark(state, {
      playerId: 'p1',
      sefirah: 'yesod',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-closure-locked');
  });
});

describe('ketherUnstageSpark', () => {
  it('removes a previously-staged Spark', () => {
    const state = makeWitnessState({
      subPhase: 'close',
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'yesod' }],
    });
    const result = ketherUnstageSpark(state, {
      playerId: 'p1',
      sefirah: 'yesod',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.stagedClosureSparks).toEqual([]);
  });

  it('rejects when the Spark is not currently staged', () => {
    const state = makeWitnessState({ subPhase: 'close' });
    const result = ketherUnstageSpark(state, {
      playerId: 'p1',
      sefirah: 'yesod',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-staged');
  });
});

// ──────────────── ketherConfirmClosure ────────────────

describe('ketherConfirmClosure', () => {
  it('locks the closure, consumes staged Sparks (each +1 illumination), wins on margin met', () => {
    // Need 1 more illumination to hit margin. Stage 1 spark.
    const state = makeWitnessState({
      subPhase: 'close',
      illumination: REQUIRED_ILLUMINATION_MARGIN - 1,
      separation: 0,
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'yesod' }],
      p1Sparks: new Set(['yesod']) as ReadonlySet<string>,
    });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value;
    expect(next.ketherRitual?.closureLocked).toBe(true);
    expect(next.illumination).toBe(REQUIRED_ILLUMINATION_MARGIN);
    expect(next.phase).toBe('end');
    // Spark actually consumed now.
    expect(next.players[0]?.sparksHeld.has('yesod')).toBe(false);
    // Endgame status reads 'won' on the post-confirm state.
    expect(checkEndgame(next).status).toBe('won');
  });

  it('loses with illumination-gap when margin still not met', () => {
    const state = makeWitnessState({
      subPhase: 'close',
      illumination: 0,
      separation: 0,
      stagedClosureSparks: [],
    });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value;
    expect(next.phase).toBe('end');
    const endgame = checkEndgame(next);
    expect(endgame.status).toBe('lost');
    expect(endgame.reason).toBe('illumination-gap');
  });

  it('first-confirm-wins — second confirm is rejected as already-confirmed', () => {
    const state = makeWitnessState({
      subPhase: 'close',
      illumination: REQUIRED_ILLUMINATION_MARGIN,
      separation: 0,
    });
    const r1 = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = ketherConfirmClosure(r1.value, { playerId: 'p2' });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason.kind).toBe('kether-already-confirmed');
  });

  it('rejects outside the close sub-phase', () => {
    const state = makeWitnessState({ subPhase: 'witness' });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-wrong-sub-phase');
  });

  it('drops staged Sparks the player no longer holds (audit list returned via meta)', () => {
    // Spark staged but no longer held — defense for a simultaneous-burn race.
    const state = makeWitnessState({
      subPhase: 'close',
      illumination: REQUIRED_ILLUMINATION_MARGIN,
      separation: 0,
      stagedClosureSparks: [{ playerId: 'p1', sefirah: 'yesod' }],
      p1Sparks: new Set(),
    });
    const result = ketherConfirmClosure(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Spark was dropped (not held), so illumination did NOT rise from it.
    expect(result.value.illumination).toBe(REQUIRED_ILLUMINATION_MARGIN);
    expect(result.meta?.droppedSparks).toEqual([
      { playerId: 'p1', sefirah: 'yesod' },
    ]);
  });
});

// ──────────────── End-state branching: separation-overflow precedence ────────────────

describe('separation-overflow precedence over illumination-gap', () => {
  it('passing into separation-overflow ends the ritual immediately on lost', () => {
    // Sep at 14; one pass tips it over. The pass reducer is the only
    // mid-ritual writer of Separation per § 3.4.
    const state = makeWitnessState({
      p1Hand: [3, 7],
      p2Hand: [4, 9],
      separation: SEPARATION_LOSS_THRESHOLD - 1,
    });
    const result = ketherPassCard(state, { playerId: 'p1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value;
    expect(next.phase).toBe('end');
    const endgame = checkEndgame(next);
    expect(endgame.status).toBe('lost');
    expect(endgame.reason).toBe('separation-overflow');
  });
});

// ──────────────── checkEndgame mid-ritual guard ────────────────

describe('checkEndgame — mid-ritual guard', () => {
  it("returns 'ongoing' while phase === 'kether' even if margin is met", () => {
    // Without this guard, a team that enters the ritual already
    // illumination ≥ separation + margin would short-circuit the
    // witness round-robin to 'won' on the first checkEndgame read.
    const state = makeWitnessState({
      illumination: REQUIRED_ILLUMINATION_MARGIN + 5,
      separation: 0,
    });
    expect(checkEndgame(state).status).toBe('ongoing');
  });

  it("returns 'ongoing' while phase === 'kether' even at otherwise-stranded card pool", () => {
    // Stranded check (no cards anywhere) must not fire mid-ritual either.
    // A team in close sub-phase has empty queues by construction; that
    // is normal, not a stranded loss.
    const state = makeWitnessState({
      subPhase: 'close',
      p1Hand: [],
      p2Hand: [],
      illumination: 0,
      separation: 0,
    });
    expect(checkEndgame(state).status).toBe('ongoing');
  });
});

// ──────────────── initKetherRitual ────────────────

describe('initKetherRitual', () => {
  it('builds a ritual state with witnessOrder by reverse arrival timestamp', () => {
    // p1 arrives first, p2 arrives second — p2 is "last" so p2 opens.
    const p1 = makePlayer({ id: 'p1', position: 'kether', hand: [3, 7] });
    const p2 = makePlayer({ id: 'p2', position: 'kether', hand: [4] });
    const state = makeState(
      {},
      { players: [p1, p2], phase: 'move' },
    );
    const arrivals = { p1: 100, p2: 200 };
    const result = initKetherRitual(state, arrivals);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value;
    expect(next.phase).toBe('kether');
    expect(next.ketherRitual?.subPhase).toBe('witness');
    expect(next.ketherRitual?.witnessOrder).toEqual(['p2', 'p1']);
    expect(next.ketherRitual?.witnessTurnIndex).toBe(0);
    expect(next.ketherRitual?.personalQueueLengths).toEqual({ p1: 2, p2: 1 });
    expect(next.ketherRitual?.passCounts).toEqual({ p1: 0, p2: 0 });
    expect(next.ketherRitual?.closureLocked).toBe(false);
    expect(next.ketherRitual?.arrivalTimestamps).toEqual(arrivals);
  });

  it('tie-breaks identical timestamps lexicographically on playerId', () => {
    // p1 and p2 arrive "simultaneously" — lex tie-break makes p2 last.
    const p1 = makePlayer({ id: 'p1', position: 'kether', hand: [3] });
    const p2 = makePlayer({ id: 'p2', position: 'kether', hand: [4] });
    const state = makeState(
      {},
      { players: [p1, p2], phase: 'move' },
    );
    const result = initKetherRitual(state, { p1: 100, p2: 100 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ketherRitual?.witnessOrder).toEqual(['p2', 'p1']);
  });

  it('rejects if not all players are at Kether', () => {
    const p1 = makePlayer({ id: 'p1', position: 'kether' });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const result = initKetherRitual(state, { p1: 100, p2: 200 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('kether-not-all-at-kether');
  });
});

// ──────────────── Trigger detection: applyMove stamps arrivedAtKetherAt ────────────────

describe('applyMove — Kether arrival timestamp (#345)', () => {
  it('stamps arrivedAtKetherAt on the moving player when destination is Kether', () => {
    // Arcanum 2 = path 13 = Kether ↔ Tiferet. Player at Tiferet, holding
    // arcanum 2, plays it to move to Kether.
    const p1 = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState({}, { players: [p1] });
    let captured = 0;
    const clock = (): number => {
      captured = 17_000;
      return captured;
    };
    const result = applyMove(state, 'p1', 13, { now: clock });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const moved = result.value.players[0];
    expect(moved?.position).toBe('kether');
    expect(moved?.arrivedAtKetherAt).toBe(captured);
  });

  it('does NOT stamp arrivedAtKetherAt on a non-Kether arrival', () => {
    // Arcanum 21 = path 32 = Yesod ↔ Malkuth. Player at Yesod moves to
    // Malkuth — arrivedAtKetherAt remains undefined.
    const p1 = makePlayer({
      id: 'p1',
      position: 'yesod',
      hand: [21],
    });
    const state = makeState({}, { players: [p1] });
    const result = applyMove(state, 'p1', 32, { now: () => 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.position).toBe('malkuth');
    expect(result.value.players[0]?.arrivedAtKetherAt).toBeUndefined();
  });

  it('does not overwrite an existing arrivedAtKetherAt on a re-arrival', () => {
    // Defensive: in MVP a player cannot leave Kether, but if a future
    // ticket allows a Meditate-back step, the original arrival timestamp
    // is the canonical one (the player "completed the journey then" —
    // the second arrival is a return, not a closure). Only stamp if
    // the field is currently undefined.
    const p1 = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
      arrivedAtKetherAt: 500,
    });
    const state = makeState({}, { players: [p1] });
    const result = applyMove(state, 'p1', 13, { now: () => 999 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.arrivedAtKetherAt).toBe(500);
  });
});

// ──────────────── maybeTriggerKetherRitual ────────────────

describe('maybeTriggerKetherRitual', () => {
  it('triggers the ritual when every player is at Kether and phase is not yet kether', () => {
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3, 7],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [4],
      arrivedAtKetherAt: 200,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.phase).toBe('kether');
    expect(next.ketherRitual).toBeDefined();
    expect(next.ketherRitual?.subPhase).toBe('witness');
  });

  it('does NOT trigger when only some players have arrived', () => {
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({ id: 'p2', position: 'tiferet', hand: [4] });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next).toBe(state);
    expect(next.phase).toBe('move');
    expect(next.ketherRitual).toBeUndefined();
  });

  it('builds witnessOrder by descending arrivedAtKetherAt (last arrival first)', () => {
    // p1 arrives first (lower timestamp), p2 last — p2 opens the ritual.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3, 7],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [4],
      arrivedAtKetherAt: 200,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.ketherRitual?.witnessOrder).toEqual(['p2', 'p1']);
  });

  it('hot-seat: latest seat-rotation arrival opens the ritual (timestamps are monotonically captured at applyMove)', () => {
    // Hot-seat single-machine play: each player arrival happens in
    // seat-rotation sequence. The timestamps stamped by applyMove are
    // monotonic, so descending-timestamp ordering naturally yields
    // "the player whose seat-rotation index most recently advanced into
    // Kether" — exactly the rule from § 2.2 / S-1.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 1000, // arrived earliest in this run
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 3000, // arrived last
    });
    const p3 = makePlayer({
      id: 'p3',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 2000, // middle
    });
    const state = makeState({}, { players: [p1, p2, p3], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    // p2 arrived last → p2 opens; then p3, then p1.
    expect(next.ketherRitual?.witnessOrder).toEqual(['p2', 'p3', 'p1']);
  });

  it('snapshots personalQueueLengths from each player hand at trigger time', () => {
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3, 7, 11, 15], // 4-card queue → cap 2
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [4, 9], // 2-card queue → cap 1
      arrivedAtKetherAt: 200,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.ketherRitual?.personalQueueLengths).toEqual({
      p1: 4,
      p2: 2,
    });
    expect(next.ketherRitual?.passCounts).toEqual({ p1: 0, p2: 0 });
  });

  it('initializes subPhase to "witness" (gather is transient — see § 3.2)', () => {
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 200,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.ketherRitual?.subPhase).toBe('witness');
  });

  it('is idempotent: calling on a state already in phase=kether returns it unchanged', () => {
    // The trigger should fire exactly once. If the helper is called
    // again on the post-trigger state (e.g. after a witness action that
    // lands inside the ritual), it must be a no-op — never re-init.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [4],
      arrivedAtKetherAt: 200,
    });
    const initial = makeState({}, { players: [p1, p2], phase: 'move' });
    const triggered = maybeTriggerKetherRitual(initial);
    const triggeredAgain = maybeTriggerKetherRitual(triggered);
    expect(triggeredAgain).toBe(triggered);
  });

  it('tie-break: simultaneous arrivals resolve lexicographically on playerId', () => {
    // Two players record the same arrivedAtKetherAt — the descending
    // sort + lex tie-break per § 2.2 puts the lex-larger id first.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [3],
      arrivedAtKetherAt: 500,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [4],
      arrivedAtKetherAt: 500,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.ketherRitual?.witnessOrder).toEqual(['p2', 'p1']);
  });

  it('captures arrivalTimestamps from arrivedAtKetherAt fields on each player', () => {
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 200,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    const next = maybeTriggerKetherRitual(state);
    expect(next.ketherRitual?.arrivalTimestamps).toEqual({
      p1: 100,
      p2: 200,
    });
  });

  it('does not trigger if state.phase is already kether (defense in depth)', () => {
    // If something already flipped phase to kether but ketherRitual is
    // not yet built, the helper still must not re-trigger — the path
    // out of "phase=kether without ritual" is engine corruption to
    // surface, not silently re-init.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 200,
    });
    const state = makeState({}, { players: [p1, p2], phase: 'kether' });
    const next = maybeTriggerKetherRitual(state);
    expect(next).toBe(state);
  });
});

// ──────────────── End-to-end: applyMove → maybeTriggerKetherRitual ────────────────

describe('Kether trigger end-to-end (applyMove → maybeTriggerKetherRitual)', () => {
  it('last arrival flips phase to kether and initializes the ritual', () => {
    // Two players. p1 already at Kether (arrivedAtKetherAt set).
    // p2 plays arcanum 2 (path 13, Tiferet→Kether) — this is the LAST
    // arrival; the trigger should fire on the post-move state.
    const p1 = makePlayer({
      id: 'p1',
      position: 'kether',
      hand: [],
      arrivedAtKetherAt: 100,
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'tiferet',
      hand: [2],
    });
    const state = makeState(
      {},
      { players: [p1, p2], phase: 'move', activePlayerId: 'p2' },
    );
    const moveResult = applyMove(state, 'p2', 13, { now: () => 200 });
    expect(moveResult.ok).toBe(true);
    if (!moveResult.ok) return;
    expect(moveResult.value.players[1]?.position).toBe('kether');
    expect(moveResult.value.players[1]?.arrivedAtKetherAt).toBe(200);
    // Trigger should now fire — every player at Kether.
    const triggered = maybeTriggerKetherRitual(moveResult.value);
    expect(triggered.phase).toBe('kether');
    expect(triggered.ketherRitual).toBeDefined();
    // p2 arrived last (timestamp 200 > 100) → p2 opens.
    expect(triggered.ketherRitual?.witnessOrder).toEqual(['p2', 'p1']);
  });

  it('mid-arrival does NOT trigger the ritual (only first player at Kether)', () => {
    // p1 arrives at Kether but p2 still at Tiferet — phase remains 'move'.
    const p1 = makePlayer({
      id: 'p1',
      position: 'tiferet',
      hand: [2],
    });
    const p2 = makePlayer({
      id: 'p2',
      position: 'tiferet',
      hand: [],
    });
    const state = makeState(
      {},
      { players: [p1, p2], phase: 'move', activePlayerId: 'p1' },
    );
    const moveResult = applyMove(state, 'p1', 13, { now: () => 100 });
    expect(moveResult.ok).toBe(true);
    if (!moveResult.ok) return;
    const triggered = maybeTriggerKetherRitual(moveResult.value);
    expect(triggered.phase).toBe('move');
    expect(triggered.ketherRitual).toBeUndefined();
  });
});
