import { describe, expect, it } from 'vitest';
import type { SefirahKey } from '@/data';
import { checkEndgame, resolveFinalThreshold } from '@/engine/endgame';
import type { GameState, PlayerState } from '@/engine/types';
import { makeFullGame } from '@/test/fixtures';
import { scenario } from '@/test/scenario';

/**
 * Full-game playthrough simulation. Drives a 2-player game from a
 * scripted starting state through a sequence of `applyClientAction`
 * calls (the same dispatcher the multiplayer events route uses) to
 * a deterministic win or loss outcome.
 *
 * The starting state is constructed via `makeFullGame` + targeted
 * overrides — we are not driving the full Sefirot-blessing-and-
 * shuffle sequence here. The point is to exercise the seams between
 * the action dispatcher, the engine reducers, and the win/loss
 * detection. Per-reducer behavior is covered by unit tests in
 * sibling files; this is the integration coverage above them.
 *
 * Both scenarios are deterministic via seeded RNG: the same seed
 * produces the same outcome on every run.
 */

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
 * Place every player at `position` with a custom hand and treat the
 * 8 clearable Sefirot as already cleared. Used to short-circuit
 * setup for the win-path test — we want to assert on the action
 * dispatcher and win detection, not on whether the team can grind
 * through every challenge in 200ms.
 */
function reset(
  state: GameState,
  patch: {
    position: SefirahKey;
    hand: readonly number[];
  },
): GameState {
  const players: PlayerState[] = state.players.map((p) => ({
    ...p,
    position: patch.position,
    hand: [...patch.hand],
    clearedSefirot: new Set<SefirahKey>(ALL_CLEARABLE_SEFIROT),
  }));
  return { ...state, players };
}

describe('playthrough — win path (2 players)', () => {
  it('drives both players to Kether and passes the Final Threshold', () => {
    // Construct a state where each player needs only one move (path
    // 13: Tiferet ↔ Kether via card 2) to reach Kether. Sefirot
    // already cleared so movement does not enter the challenge phase.
    // Illumination already past margin so the threshold ritual is a
    // pure formality.
    const base = makeFullGame({ playerCount: 2, seed: 11 });
    const initial: GameState = {
      ...reset(base, { position: 'tiferet', hand: [2] }),
      illumination: 9,
      separation: 0,
    };
    const p1 = initial.players[0]!.id;
    const p2 = initial.players[1]!.id;

    const final = scenario(initial)
      .move(p1, 13)
      .endTurn(p1)
      .move(p2, 13)
      .endTurn(p2)
      .run();

    // Both at Kether.
    expect(final.players.every((p) => p.position === 'kether')).toBe(true);

    // Endgame check sees a winning position.
    const endgame = checkEndgame(final);
    expect(endgame.status).toBe('won');

    // Final Threshold ritual succeeds with no extra plays/burns —
    // illumination is already at margin + 4.
    const ritual = resolveFinalThreshold({
      state: final,
      cardPlays: [],
      sparkBurns: [],
    });
    expect(ritual.ok).toBe(true);
    if (!ritual.ok) return;
    expect(ritual.value.status).toBe('won');
    // Illumination and separation are nested under `state` in the
    // ritual success payload.
    expect(ritual.value.state.illumination).toBeGreaterThanOrEqual(
      ritual.value.state.separation + 5,
    );
  });

  it('is deterministic when actions consume RNG (seed-0 default)', () => {
    // The action sequence below calls `scenario.submitChallenge(...)`,
    // which now (post #227 / E2) translates internally into a
    // `prep-confirm` `ClientAction` chain — see
    // `test/scenario.ts:translateSubmitChallenge`. With no explicit
    // `outcome`, the engine rolls a d20 from the scenario's seeded
    // RNG. `scenario.run()` constructs a fresh `seededRng(0)` per
    // call — so the same chain run twice should produce structurally
    // equal states. Without this, the previous version of the test
    // only proved `makeFullGame` is deterministic (already covered
    // by T0).
    const make = (): GameState => {
      const base = makeFullGame({ playerCount: 2, seed: 11 });
      // Place p1 at gevurah (uncleared so the challenge fires) with
      // the default Aries-class strength stat (zodiac dignity already
      // applied at game start: Mars rulership +1).
      const players = base.players.map((p, i) =>
        i === 0
          ? { ...p, position: 'gevurah' as const, hand: [...p.hand] }
          : p,
      );
      // Post-#227 review fix: phase / challengeSubPhase are on
      // GameState now, and the dispatcher reads them directly. Pin
      // phase to 'challenge'/'prep' so the scenario's `prep-confirm`
      // dispatch matches the engine's gate without a `move` event
      // first.
      return {
        ...base,
        players,
        phase: 'challenge',
        challengeSubPhase: 'prep',
      };
    };
    const stateA = make();
    const stateB = make();
    const p1A = stateA.players[0]!.id;
    const p1B = stateB.players[0]!.id;
    expect(p1A).toBe(p1B); // sanity: same id derivation
    const a = scenario(stateA)
      .submitChallenge(p1A, 'gevurah', {
        assistStats: [],
        cardBurns: 0,
        sparkBurns: 0,
        shortcutPenalty: false,
      })
      .run();
    const b = scenario(stateB)
      .submitChallenge(p1B, 'gevurah', {
        assistStats: [],
        cardBurns: 0,
        sparkBurns: 0,
        shortcutPenalty: false,
      })
      .run();
    // The actual proof of RNG determinism: same seed-0 → same roll →
    // same outcome → same final state.
    expect(a.illumination).toBe(b.illumination);
    expect(a.separation).toBe(b.separation);
    expect(a.players[0]!.clearedSefirot.has('gevurah')).toBe(
      b.players[0]!.clearedSefirot.has('gevurah'),
    );
    expect(a.players[0]!.sparksHeld.has('gevurah')).toBe(
      b.players[0]!.sparksHeld.has('gevurah'),
    );
  });
});

describe('playthrough — loss path (2 players)', () => {
  it('drives separation to 15 via accept-setback', () => {
    // One step from the loss threshold; one accepted setback tips
    // the team over.
    const base = makeFullGame({ playerCount: 2, seed: 11 });
    const initial: GameState = {
      ...base,
      players: base.players.map((p) => ({ ...p, position: 'gevurah' })),
      separation: 14,
    };
    const p1 = initial.players[0]!.id;

    const final = scenario(initial).acceptSetback(p1, 'gevurah').run();

    expect(final.separation).toBe(15);

    const endgame = checkEndgame(final);
    expect(endgame.status).toBe('lost');
    expect(endgame.reason).toBe('separation-overflow');
  });

  it('shortcut setback ticks separation +2 (drives loss faster)', () => {
    // From separation 13, a +2 shortcut setback tips to 15. Same
    // outcome as the previous test but proves the +2 shortcut path
    // is wired through the dispatcher.
    const base = makeFullGame({ playerCount: 2, seed: 11 });
    const initial: GameState = {
      ...base,
      players: base.players.map((p) => ({ ...p, position: 'tiferet' })),
      separation: 13,
    };
    const p1 = initial.players[0]!.id;

    const final = scenario(initial)
      .acceptSetback(p1, 'tiferet', true)
      .run();

    expect(final.separation).toBe(15);
    expect(checkEndgame(final).status).toBe('lost');
  });
});
