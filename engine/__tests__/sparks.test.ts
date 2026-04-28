import { describe, expect, it } from 'vitest';
import { useSpark, earnSpark, type SparkAbility } from '../sparks';
import { seededRng } from '../rng';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState, PlayerState } from '../types';

// All `useSpark` calls in this file pass a fresh `seededRng(1)` —
// most paths don't consume rng (only the discard-recycle path does),
// but the spark API requires it for the recycle-shuffle invariant.
// Tests that explicitly verify recycle outputs may need a different
// seed if the default ever produces a degenerate shuffle.
const RNG = (): ReturnType<typeof seededRng> => seededRng(1);

// ──────────────── earnSpark ────────────────

describe('earnSpark', () => {
  it('adds the Sefirah key to sparksHeld and does not touch counters', () => {
    const state = makeState({ position: 'yesod' });
    const next = earnSpark(state, 'p1', 'yesod');
    expect(next.players[0]?.sparksHeld).toEqual(new Set(['yesod']));
    // Illumination is raised by resolveChallenge, not earnSpark.
    expect(next.illumination).toBe(0);
  });

  it('is idempotent: earning a Sefirah you already hold is a no-op', () => {
    const base = makeState({ sparksHeld: new Set(['yesod']) });
    const next = earnSpark(base, 'p1', 'yesod');
    expect(next.players[0]?.sparksHeld).toEqual(new Set(['yesod']));
  });

  it('throws on unknown player id (programmer error)', () => {
    const state = makeState();
    expect(() => earnSpark(state, 'who', 'yesod')).toThrow(/unknown player/i);
  });
});

// ──────────────── useSpark common rejections ────────────────

describe('useSpark — common rejections', () => {
  it('rejects unknown player id', () => {
    const state = makeState({ sparksHeld: new Set(['yesod']) });
    const result = useSpark(state, 'who', { kind: 'yesod-intuition', reorder: [] }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('unknown-player');
  });

  it('rejects when the player does not hold the Spark the ability requires', () => {
    const state = makeState({ sparksHeld: new Set(['hod']) });
    const result = useSpark(state, 'p1', { kind: 'yesod-intuition', reorder: [] }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('spark-not-held');
  });
});

// ──────────────── Each of the ten abilities ────────────────

function playerWithSpark(key: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return makePlayer({ sparksHeld: new Set([key as never]), ...overrides });
}

function stateWithSpark(
  key: string,
  playerOverrides: Partial<PlayerState> = {},
  stateOverrides: Partial<GameState> = {},
): GameState {
  return makeState({ sparksHeld: new Set([key as never]), ...playerOverrides }, stateOverrides);
}

describe('useSpark — Chesed (Grace)', () => {
  it('transfers a card from the giver to the receiver and spends the Spark', () => {
    const giver = playerWithSpark('chesed', { id: 'p1', hand: [5] });
    const receiver = makePlayer({ id: 'p2', hand: [] });
    const state = makeState({}, { players: [giver, receiver] });
    const result = useSpark(state, 'p1', {
      kind: 'chesed-grace',
      toPlayerId: 'p2',
      arcanumNumber: 5,
    }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [p1, p2] = result.value.players;
    expect(p1?.hand).toEqual([]);
    expect(p2?.hand).toEqual([5]);
    expect(p1?.sparksHeld.size).toBe(0);
    expect(result.value.spentSparks).toEqual([{ playerId: 'p1', sefirah: 'chesed' }]);
  });

  it('rejects if the giver does not hold the named card', () => {
    const giver = playerWithSpark('chesed', { id: 'p1', hand: [1] });
    const receiver = makePlayer({ id: 'p2' });
    const state = makeState({}, { players: [giver, receiver] });
    const result = useSpark(state, 'p1', {
      kind: 'chesed-grace',
      toPlayerId: 'p2',
      arcanumNumber: 99,
    }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('payload-invalid');
  });

  it('rejects if the receiver does not exist', () => {
    const giver = playerWithSpark('chesed', { id: 'p1', hand: [5] });
    const state = makeState({}, { players: [giver] });
    const result = useSpark(state, 'p1', {
      kind: 'chesed-grace',
      toPlayerId: 'ghost',
      arcanumNumber: 5,
    }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('payload-invalid');
  });

  it('rejects self-gift (giver === receiver)', () => {
    const giver = playerWithSpark('chesed', { id: 'p1', hand: [5] });
    const state = makeState({}, { players: [giver] });
    const result = useSpark(state, 'p1', {
      kind: 'chesed-grace',
      toPlayerId: 'p1',
      arcanumNumber: 5,
    }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('payload-invalid');
  });

  // #56: design/mechanics.md § Drawing & gift handling — hand-size
  // cap is HAND_CAP=6. Gifts that would push the receiver past the
  // cap are rejected so the giver can choose a different target or
  // hold the card.
  it('rejects when receiver hand is already at HAND_CAP', () => {
    const giver = playerWithSpark('chesed', { id: 'p1', hand: [5] });
    const receiver = makePlayer({ id: 'p2', hand: [10, 11, 12, 13, 14, 15] });
    const state = makeState({}, { players: [giver, receiver] });
    const result = useSpark(state, 'p1', {
      kind: 'chesed-grace',
      toPlayerId: 'p2',
      arcanumNumber: 5,
    }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('gift-rejected-cap-full');
  });
});

describe('useSpark — Gevurah (Severance)', () => {
  it('increments shellCancellationsAvailable by 1', () => {
    const state = stateWithSpark('gevurah');
    const result = useSpark(state, 'p1', { kind: 'gevurah-severance' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.shellCancellationsAvailable).toBe(1);
  });
});

describe('useSpark — Tiferet (Harmony)', () => {
  it('arms harmony on the active player', () => {
    const state = stateWithSpark('tiferet');
    const result = useSpark(state, 'p1', { kind: 'tiferet-harmony' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.harmonyArmed).toBe(true);
  });
});

describe('useSpark — Hod (Clarity)', () => {
  it('reveals a named card held by any player', () => {
    const p1 = playerWithSpark('hod', { id: 'p1', hand: [] });
    const p2 = makePlayer({ id: 'p2', hand: [14] });
    const state = makeState({}, { players: [p1, p2] });
    const result = useSpark(state, 'p1', { kind: 'hod-clarity', arcanumNumber: 14 }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revealedCards.has(14)).toBe(true);
  });

  it('is still a valid expenditure when no player holds the named card (Spark spent, no reveal)', () => {
    const state = stateWithSpark('hod');
    const result = useSpark(state, 'p1', { kind: 'hod-clarity', arcanumNumber: 99 }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No card revealed, but the Spark is still spent.
    expect(result.value.revealedCards.size).toBe(0);
    expect(result.value.players[0]?.sparksHeld.size).toBe(0);
  });
});

describe('useSpark — Netzach (Courage)', () => {
  it('arms courage retry for the active player', () => {
    const state = stateWithSpark('netzach');
    const result = useSpark(state, 'p1', { kind: 'netzach-courage' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.courageRetryAvailable).toBe(true);
  });
});

describe('useSpark — Yesod (Intuition)', () => {
  it('replaces the top-N cards of the deck with the given order (N = reorder.length)', () => {
    const state = stateWithSpark('yesod', {}, { deck: [10, 20, 30, 40, 50] });
    const result = useSpark(state, 'p1', {
      kind: 'yesod-intuition',
      reorder: [30, 10, 20],
    }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deck).toEqual([30, 10, 20, 40, 50]);
  });

  it('rejects a reorder that is not a permutation of the actual top-N', () => {
    const state = stateWithSpark('yesod', {}, { deck: [10, 20, 30, 40] });
    const result = useSpark(state, 'p1', {
      kind: 'yesod-intuition',
      reorder: [10, 20, 99],
    }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('payload-invalid');
  });

  it('rejects a reorder that asks for more cards than the deck has', () => {
    const state = stateWithSpark('yesod', {}, { deck: [10, 20] });
    const result = useSpark(state, 'p1', {
      kind: 'yesod-intuition',
      reorder: [10, 20, 30],
    }, RNG());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('payload-invalid');
  });
});

describe('useSpark — Binah (Acceptance)', () => {
  it('arms acceptance on the active player', () => {
    const state = stateWithSpark('binah');
    const result = useSpark(state, 'p1', { kind: 'binah-acceptance' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.acceptanceArmed).toBe(true);
  });
});

describe('useSpark — Chokmah (Flash)', () => {
  it('grants a free second move this turn', () => {
    const state = stateWithSpark('chokmah');
    const result = useSpark(state, 'p1', { kind: 'chokmah-flash' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.flashExtraMoves).toBe(1);
  });

  it('stacks with prior flash bonuses', () => {
    // Unlikely in practice (you can only hold one Chokmah Spark) but
    // the counter logic should not clobber existing value.
    const state = stateWithSpark('chokmah', {
      pendingAbilities: {
        flashExtraMoves: 2,
        separationShields: 0,
        harmonyArmed: false,
        acceptanceArmed: false,
        courageRetryAvailable: false,
      },
    });
    const result = useSpark(state, 'p1', { kind: 'chokmah-flash' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.flashExtraMoves).toBe(3);
  });
});

describe('useSpark — Kether (Unity)', () => {
  it('every player draws one from the top of the deck', () => {
    const p1 = playerWithSpark('kether', { id: 'p1', hand: [] });
    const p2 = makePlayer({ id: 'p2', hand: [] });
    const state = makeState({}, { players: [p1, p2], deck: [7, 8, 9] });
    const result = useSpark(state, 'p1', { kind: 'kether-unity' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [np1, np2] = result.value.players;
    expect(np1?.hand).toEqual([7]);
    expect(np2?.hand).toEqual([8]);
    expect(result.value.deck).toEqual([9]);
  });

  it('succeeds but only draws for as many players as the deck supports', () => {
    const p1 = playerWithSpark('kether', { id: 'p1', hand: [] });
    const p2 = makePlayer({ id: 'p2', hand: [] });
    const p3 = makePlayer({ id: 'p3', hand: [] });
    const state = makeState({}, { players: [p1, p2, p3], deck: [7] });
    const result = useSpark(state, 'p1', { kind: 'kether-unity' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const players = result.value.players;
    expect(players[0]?.hand).toEqual([7]);
    expect(players[1]?.hand).toEqual([]);
    expect(players[2]?.hand).toEqual([]);
    expect(result.value.deck).toEqual([]);
  });

  // #56: a player whose hand is already at HAND_CAP is skipped; the
  // card the deck would have given them is left in the deck for the
  // next player. Per ticket: "Kether-Unity Spark distributes only to
  // players under cap."
  it('skips players at HAND_CAP and gives their card to the next under-cap player', () => {
    const p1 = playerWithSpark('kether', { id: 'p1', hand: [1, 2, 3, 4, 5, 6] });
    const p2 = makePlayer({ id: 'p2', hand: [] });
    const state = makeState({}, { players: [p1, p2], deck: [7, 8] });
    const result = useSpark(state, 'p1', { kind: 'kether-unity' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [np1, np2] = result.value.players;
    // p1 already at cap — hand unchanged.
    expect(np1?.hand).toEqual([1, 2, 3, 4, 5, 6]);
    // p2 gets the top card (7), not 8 — the skip doesn't burn cards.
    expect(np2?.hand).toEqual([7]);
    // Only one card consumed.
    expect(result.value.deck).toEqual([8]);
  });

  it('recycles discard pile when deck empties mid-distribution', () => {
    const p1 = playerWithSpark('kether', { id: 'p1', hand: [] });
    const p2 = makePlayer({ id: 'p2', hand: [] });
    const state = makeState(
      {},
      { players: [p1, p2], deck: [7], discardPile: [20, 21] },
    );
    const result = useSpark(state, 'p1', { kind: 'kether-unity' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [np1, np2] = result.value.players;
    expect(np1?.hand).toEqual([7]);
    // p2 gets a card from the recycled (shuffled) discard.
    expect(np2?.hand?.length).toBe(1);
    // The recycled card came from the discard.
    expect([20, 21]).toContain(np2?.hand[0]);
    // After recycling [20,21] (length 2) and drawing one for p2, the
    // new deck has exactly 1 card and the discard is empty.
    expect(result.value.deck.length).toBe(1);
    expect(result.value.discardPile.length).toBe(0);
  });

  // #56 edge: every player at HAND_CAP — no cards consumed at all.
  it('is a no-op when every player is already at HAND_CAP', () => {
    const fullHand = [1, 2, 3, 4, 5, 6];
    const p1 = playerWithSpark('kether', { id: 'p1', hand: fullHand });
    const p2 = makePlayer({ id: 'p2', hand: fullHand });
    const state = makeState({}, { players: [p1, p2], deck: [7, 8, 9] });
    const result = useSpark(state, 'p1', { kind: 'kether-unity' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Both hands unchanged, deck untouched.
    expect(result.value.players[0]?.hand).toEqual(fullHand);
    expect(result.value.players[1]?.hand).toEqual(fullHand);
    expect(result.value.deck).toEqual([7, 8, 9]);
  });
});

describe('useSpark — Malkuth (Grounding)', () => {
  it('grants the active player a separation shield', () => {
    const state = stateWithSpark('malkuth');
    const result = useSpark(state, 'p1', { kind: 'malkuth-grounding' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.separationShields).toBe(1);
  });

  it('stacks with prior shields', () => {
    const state = stateWithSpark('malkuth', {
      pendingAbilities: {
        flashExtraMoves: 0,
        separationShields: 2,
        harmonyArmed: false,
        acceptanceArmed: false,
        courageRetryAvailable: false,
      },
    });
    const result = useSpark(state, 'p1', { kind: 'malkuth-grounding' }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.pendingAbilities.separationShields).toBe(3);
  });
});

// ──────────────── Post-spend invariants ────────────────

describe('useSpark — invariants across all abilities', () => {
  // Abilities without cross-player payload — can reuse the default
  // single-player state.
  const soloAbilities: readonly { readonly key: string; readonly ability: SparkAbility }[] = [
    { key: 'chokmah', ability: { kind: 'chokmah-flash' } },
    { key: 'binah', ability: { kind: 'binah-acceptance' } },
    { key: 'gevurah', ability: { kind: 'gevurah-severance' } },
    { key: 'tiferet', ability: { kind: 'tiferet-harmony' } },
    { key: 'netzach', ability: { kind: 'netzach-courage' } },
    { key: 'malkuth', ability: { kind: 'malkuth-grounding' } },
    { key: 'yesod', ability: { kind: 'yesod-intuition', reorder: [] } },
    { key: 'hod', ability: { kind: 'hod-clarity', arcanumNumber: 99 } },
    { key: 'kether', ability: { kind: 'kether-unity' } },
  ];

  it.each(soloAbilities)(
    '$key: Spark is spent exactly once and recorded in spentSparks',
    ({ key, ability }) => {
      const state = stateWithSpark(key);
      const result = useSpark(state, 'p1', ability, RNG());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.players[0]?.sparksHeld.has(key as never)).toBe(false);
      expect(result.value.spentSparks).toEqual([{ playerId: 'p1', sefirah: key }]);
    },
  );

  it.each(soloAbilities)('$key: spending emits +1 Illumination', ({ key, ability }) => {
    // design/mechanics.md: spent Sparks still contribute +1 Illumination.
    // Routed through the spark-spent event in #15.
    const state = stateWithSpark(key);
    const result = useSpark(state, 'p1', ability, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.illumination).toBe(1);
  });

  it('chesed-grace: Spark is spent exactly once (despite touching two players)', () => {
    // Chesed needs a receiver, so it can't share the solo fixture.
    // The real risk here is double-spend or partial-spend bugs when
    // mutating two players in one pass.
    const giver = playerWithSpark('chesed', { id: 'p1', hand: [5] });
    const receiver = makePlayer({ id: 'p2', hand: [] });
    const state = makeState({}, { players: [giver, receiver] });
    const result = useSpark(state, 'p1', {
      kind: 'chesed-grace',
      toPlayerId: 'p2',
      arcanumNumber: 5,
    }, RNG());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.sparksHeld.has('chesed')).toBe(false);
    expect(result.value.players[1]?.sparksHeld.has('chesed')).toBe(false);
    expect(result.value.spentSparks).toEqual([{ playerId: 'p1', sefirah: 'chesed' }]);
  });
});
