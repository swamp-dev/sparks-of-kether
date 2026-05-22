import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Pillar, SefirahKey, ZodiacSignKey } from '@/data';
import { acceptSetback, resolveChallenge } from '@/engine/checks';
import type { CheckOutcome } from '@/engine/checks';
import { ketherTrialResolve } from '@/engine/kether';
import { applyMove } from '@/engine/movement';
import { seededRng } from '@/engine/rng';
import { endTurn } from '@/engine/turn';
import type { GameState } from '@/engine/types';
import { initEncounterEnvelope } from '@/lib/turn-machine';
import { makeFullGame, makePlayer, makeState } from '@/test/fixtures';

/**
 * Property-based tests for the engine reducers. fast-check generates
 * many random inputs (≥ 100 per property by default) and asserts an
 * invariant holds for every generated case. Mutation testing tells us
 * *what is untested*; properties tell us *what must always be true*.
 *
 * Pure engine reducers are the natural fit — finite state, no IO,
 * deterministic on RNG seed. Each property runs in milliseconds even
 * with 100 generated cases.
 */

// Net-neutral or mildly positive picks per `test/fixtures.ts`
// convention — we sample 4 distinct signs without replacement so
// generated states satisfy `makeFullGame`'s uniqueness check.
const SAMPLE_ZODIAC_SIGNS: readonly ZodiacSignKey[] = ['aries', 'leo', 'libra', 'cancer'];

const ALL_CLEARABLE_SEFIROT: readonly SefirahKey[] = [
  'chokmah',
  'binah',
  'chesed',
  'gevurah',
  'tiferet',
  'netzach',
  'hod',
  'yesod',
];

/**
 * Arbitrary that produces a fully-dealt 2..4 player GameState built
 * via `makeFullGame`. Every generated state is engine-valid (deck
 * shuffled, hands dealt, zodiac dignity deltas applied) so the
 * properties under test are not trivially passing on degenerate
 * inputs.
 *
 * Zodiac signs are sampled without replacement from a 4-sign net-
 * neutral pool — `makeFullGame` enforces uniqueness across seats.
 * We sample from a known list so generated states always round-trip
 * cleanly.
 */
function gameStateArb(): fc.Arbitrary<GameState> {
  return fc
    .record({
      playerCount: fc.constantFrom(2, 3, 4),
      seed: fc.integer({ min: 1, max: 1_000_000 }),
      // Pick a permutation of zodiac signs for the seats. We slice
      // after the fact to match playerCount.
      signOrder: fc.shuffledSubarray(SAMPLE_ZODIAC_SIGNS as ZodiacSignKey[], {
        minLength: 4,
        maxLength: 4,
      }),
    })
    .map(({ playerCount, seed, signOrder }) =>
      makeFullGame({
        playerCount: playerCount as 2 | 3 | 4,
        seed,
        zodiacSigns: signOrder.slice(0, playerCount),
      }),
    );
}

describe('property: endTurn always advances activePlayerId to a known player', () => {
  it('holds for every generated state', () => {
    fc.assert(
      fc.property(gameStateArb(), (state) => {
        const next = endTurn(state);
        const ids = new Set(state.players.map((p) => p.id));
        expect(ids.has(next.activePlayerId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

describe('property: applyMove does not mutate input state', () => {
  it('input is deep-equal to its pre-call snapshot (regardless of ok/!ok)', () => {
    fc.assert(
      fc.property(
        gameStateArb(),
        fc.integer({ min: 11, max: 32 }), // valid path-number range
        (state, pathNumber) => {
          // Deep snapshot before the call. structuredClone preserves
          // Set instances, so the post-call deep-equal check catches
          // mutations to clearedSefirot / sparksHeld / revealedCards
          // as well as shells / pillarStreak / spentSparks /
          // pendingAbilities — i.e. the whole state shape, not just
          // primitives. Vitest's `toEqual` handles Sets via the
          // structuredEquals algorithm.
          const before = structuredClone(state);
          applyMove(state, state.activePlayerId, pathNumber);
          expect(state).toEqual(before);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('property: resolveChallenge with a passing outcome increments illumination by exactly 1', () => {
  it('holds across generated states + sefirot', () => {
    fc.assert(
      fc.property(gameStateArb(), fc.constantFrom(...ALL_CLEARABLE_SEFIROT), (initial, sefirah) => {
        // Place the active player at the chosen sefirah and clear
        // the precondition (hand requirements, etc.) to ensure the
        // challenge can resolve. We force `outcome.pass = true`
        // so the property is about the side effect, not the roll.
        const activeId = initial.activePlayerId;
        const state: GameState = {
          ...initial,
          players: initial.players.map((p) =>
            p.id === activeId ? { ...p, position: sefirah } : p,
          ),
        };
        const passingOutcome: CheckOutcome = {
          rolled: 20,
          statContribution: 12,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 32,
          effectiveDC: 10,
          pass: true,
        };
        const result = resolveChallenge({
          state,
          playerId: activeId,
          sefirah,
          modifiers: {
            assistStats: [],
            cardBurns: 0,
            sparkBurns: 0,
            shortcutPenalty: false,
          },
          rng: seededRng(1),
          outcome: passingOutcome,
        });
        if (!result.ok) {
          // Skip cases where the engine rejects the resolve for a
          // reason orthogonal to the property (e.g. already cleared).
          // The escape list MUST match `ChallengeRejection['kind']`
          // in `engine/checks.ts:48-58`. A drift here gives false
          // confidence — the test would interpret an unexpected
          // rejection as a real failure of the property.
          expect(['unknown-player', 'no-standard-check', 'already-cleared']).toContain(
            result.reason.kind,
          );
          return;
        }
        expect(result.value.newState.illumination).toBe(state.illumination + 1);
      }),
      { numRuns: 100 },
    );
  });
});

describe('property: acceptSetback raises separation by +1 regular / +2 shortcut', () => {
  it('holds across generated states + sefirot + shortcut flag', () => {
    fc.assert(
      fc.property(
        gameStateArb(),
        fc.constantFrom(...ALL_CLEARABLE_SEFIROT),
        fc.boolean(),
        (state, sefirah, shortcut) => {
          const next = acceptSetback(state, {
            playerId: state.activePlayerId,
            sefirah,
            shortcut,
          });
          const expectedDelta = shortcut ? 2 : 1;
          expect(next.separation - state.separation).toBe(expectedDelta);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ──────── #303 retro-review: rollback correctness across shortcuts ────────
//
// The previous separation-delta property runs against `makeFullGame`
// states where `lastArrivalPathNumber` is always undefined — so
// `shortcut: true` always hits the no-op branch and only the
// Separation tick is exercised. This property generates a (sefirah,
// shortcut path, direction) tuple that PINS the position rollback
// itself: starting at one endpoint with `lastArrivalPathNumber` set,
// the post-setback position must be the OTHER endpoint and the field
// must be cleared.
//
// Three central-pillar shortcuts exist: 13 (Kether↔Tiferet),
// 25 (Tiferet↔Yesod), 32 (Yesod↔Malkuth). Each is bidirectional, so
// for each path we pick which endpoint the player started from.

interface ShortcutScenario {
  readonly pathNumber: 13 | 25 | 32;
  readonly arrivedAt: SefirahKey;
  readonly origin: SefirahKey;
}

const SHORTCUT_SCENARIOS: readonly ShortcutScenario[] = [
  // Path 13: Kether ↔ Tiferet
  { pathNumber: 13, arrivedAt: 'kether', origin: 'tiferet' },
  { pathNumber: 13, arrivedAt: 'tiferet', origin: 'kether' },
  // Path 25: Tiferet ↔ Yesod
  { pathNumber: 25, arrivedAt: 'tiferet', origin: 'yesod' },
  { pathNumber: 25, arrivedAt: 'yesod', origin: 'tiferet' },
  // Path 32: Yesod ↔ Malkuth
  { pathNumber: 32, arrivedAt: 'yesod', origin: 'malkuth' },
  { pathNumber: 32, arrivedAt: 'malkuth', origin: 'yesod' },
];

describe('property: shortcut acceptSetback rolls active player back to path origin', () => {
  it('holds across all three shortcut paths in either direction', () => {
    fc.assert(
      fc.property(gameStateArb(), fc.constantFrom(...SHORTCUT_SCENARIOS), (initial, scenario) => {
        // Place the active player at the "arrived" endpoint with the
        // matching `lastArrivalPathNumber`. Other players are
        // untouched — the rollback property is per-player.
        const activeId = initial.activePlayerId;
        const state: GameState = {
          ...initial,
          players: initial.players.map((p) =>
            p.id === activeId
              ? {
                  ...p,
                  position: scenario.arrivedAt,
                  lastArrivalPathNumber: scenario.pathNumber,
                }
              : p,
          ),
        };

        const next = acceptSetback(state, {
          playerId: activeId,
          sefirah: scenario.arrivedAt,
          shortcut: true,
        });

        const movedPlayer = next.players.find((p) => p.id === activeId);
        // Position rolled back to the OTHER endpoint of the path.
        expect(movedPlayer?.position).toBe(scenario.origin);
        // lastArrivalPathNumber cleared so a subsequent challenge
        // at the origin doesn't re-read the old path's pillarsCrossed.
        expect(movedPlayer?.lastArrivalPathNumber).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});

// ──────── #335 Final Threshold ritual property ────────
//
// Pin the trial gauntlet's completion contract: resolving all N
// challenges (one per player) always transitions to 'close'.
// Generates a 2-player trial state with random DCs, then drives all
// challenges to completion and checks the transition fires exactly
// when trialTurnIndex reaches the challenge count.

describe('property: Kether trial transitions to close after all challenges resolve', () => {
  it('holds across random roll/DC combinations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 20 }),
        fc.integer({ min: 10, max: 20 }),
        (dc1, dc2) => {
          const players = [
            makePlayer({ id: 'p1', position: 'kether', hand: [] }),
            makePlayer({ id: 'p2', position: 'kether', hand: [] }),
          ];
          let state: GameState = makeState(
            {},
            {
              players,
              activePlayerId: 'p1',
              phase: 'kether',
              ketherRitual: {
                subPhase: 'trial',
                trialOrder: ['p1', 'p2'],
                trialTurnIndex: 0,
                trialChallenges: [
                  { sefirahKey: 'chokmah', stat: 'insight', dc: dc1, roll: null, passed: null },
                  { sefirahKey: 'binah', stat: 'understanding', dc: dc2, roll: null, passed: null },
                ],
                trialStagedSparks: [],
                arrivalTimestamps: { p1: 1, p2: 2 },
                stagedClosureSparks: [],
                closureLocked: false,
              },
            },
          );

          const rng = seededRng(42);
          for (let step = 0; step < 4; step++) {
            if (state.ketherRitual?.subPhase !== 'trial') break;
            const ritual = state.ketherRitual;
            const current = ritual.trialOrder[ritual.trialTurnIndex];
            if (current === undefined) break;
            const result = ketherTrialResolve(state, { playerId: current, rng });
            if (!result.ok) {
              throw new Error(`unexpected rejection: ${result.reason.kind}`);
            }
            state = result.value;
          }

          // After 2 challenges both players have resolved → 'close'.
          expect(state.ketherRitual?.subPhase).toBe('close');
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('property: applyMove conserves total card count', () => {
  it('hand loses 1, discard gains 1, deck unchanged on a successful move', () => {
    // Reviewer note: the original endTurn-card-invariant property was
    // trivial because endTurn does not touch cards. The conservation
    // law that actually matters lives in applyMove: a played arcanum
    // moves from hand to discard. Total card count across all pools
    // never changes; per-pool changes are exactly +1 / -1.
    fc.assert(
      fc.property(gameStateArb(), fc.integer({ min: 11, max: 32 }), (state, pathNumber) => {
        const totalBefore =
          state.deck.length +
          state.discardPile.length +
          state.players.reduce((sum, p) => sum + p.hand.length, 0);
        const result = applyMove(state, state.activePlayerId, pathNumber);
        if (!result.ok) {
          // Rejected moves do not mutate state — total count
          // unchanged trivially. Skip detailed assertions; the
          // immutability property already covers this case.
          return;
        }
        const next = result.value;
        const totalAfter =
          next.deck.length +
          next.discardPile.length +
          next.players.reduce((sum, p) => sum + p.hand.length, 0);
        expect(totalAfter).toBe(totalBefore);
        // Deck does not change (movement does not draw).
        expect(next.deck.length).toBe(state.deck.length);
        // Discard grows by exactly one (the played card).
        expect(next.discardPile.length).toBe(state.discardPile.length + 1);
      }),
      { numRuns: 100 },
    );
  });
});

const VALID_PILLARS: readonly Pillar[] = ['mercy', 'severity', 'balance'];

describe('property: Yesod Dream-Peek envelope.dreamPillar is always one of the three pillars (#354)', () => {
  it('initEncounterEnvelope at yesod produces a valid pillar across generated states', () => {
    fc.assert(
      fc.property(gameStateArb(), (state) => {
        const env = initEncounterEnvelope(state, 'yesod');
        // The pillar must be defined and one of the three valid values.
        // A regression that left it undefined or returned something else
        // (e.g. 'central' from an earlier name choice, or a number from
        // a refactor mistake) would fail this property.
        expect(env.dreamPillar).toBeDefined();
        expect(VALID_PILLARS).toContain(env.dreamPillar);
      }),
      { numRuns: 100 },
    );
  });

  it('initEncounterEnvelope at non-yesod sefirot leaves dreamPillar undefined', () => {
    fc.assert(
      fc.property(
        gameStateArb(),
        // Non-Yesod targets — Malkuth has no challenge but still gets an
        // envelope when called explicitly via initEncounterEnvelope (the
        // helper doesn't gate on challenge.kind; the reducer does).
        fc.constantFrom<SefirahKey>(
          'kether',
          'chokmah',
          'binah',
          'chesed',
          'gevurah',
          'tiferet',
          'netzach',
          'hod',
          'malkuth',
        ),
        (state, sefirah) => {
          const env = initEncounterEnvelope(state, sefirah);
          // Only Yesod populates the pillar — every other Sefirah
          // returns an envelope with `dreamPillar: undefined`.
          expect(env.dreamPillar).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('initEncounterEnvelope is deterministic for the same input state (replay-determinism)', () => {
    // Per § 3.6 "Replay-determinism": same digest inputs hash to the
    // same seed, and the same seed maps to the same pillar. Two calls
    // on the same state must produce identical envelopes — required
    // for multiplayer state-sync (`lib/room-actions.ts` mirrors the
    // reducer's move arm and must produce a byte-identical envelope).
    fc.assert(
      fc.property(gameStateArb(), (state) => {
        const env1 = initEncounterEnvelope(state, 'yesod');
        const env2 = initEncounterEnvelope(state, 'yesod');
        expect(env1.seed).toBe(env2.seed);
        expect(env1.dreamPillar).toBe(env2.dreamPillar);
      }),
      { numRuns: 100 },
    );
  });
});
