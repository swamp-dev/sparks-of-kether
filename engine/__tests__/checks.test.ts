import { describe, expect, it } from 'vitest';
import { seededRng } from '../rng';
import {
  rollCheck,
  resolveChallenge,
  acceptSetback,
  CARD_BURN_BONUS,
  SPARK_BURN_BONUS,
  SHORTCUT_DC_PENALTY,
  type CheckModifiers,
} from '../checks';
import { makePlayer, makeState, statSheet } from '@/test/fixtures';
import type { GameState } from '../types';

// ──────────────── rollCheck (pure math) ────────────────

describe('rollCheck', () => {
  const blank: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
  };

  it('passes when rolled + stat meets the DC exactly', () => {
    // Seeded to roll 8; stat 8 → total 16, DC 16 → pass (≥, not >).
    const rng = { d20: () => 8, int: () => 8 };
    const outcome = rollCheck({ stat: 8, dc: 16, modifiers: blank, rng });
    expect(outcome.rolled).toBe(8);
    expect(outcome.total).toBe(16);
    expect(outcome.pass).toBe(true);
  });

  it('fails when rolled + stat misses the DC by 1', () => {
    const rng = { d20: () => 7, int: () => 7 };
    const outcome = rollCheck({ stat: 8, dc: 16, modifiers: blank, rng });
    expect(outcome.total).toBe(15);
    expect(outcome.pass).toBe(false);
  });

  it('adds half of each assisting ally stat, floored', () => {
    const rng = { d20: () => 5, int: () => 5 };
    // Stat 10 + roll 5 = 15. Allies with 6 and 7 → +3 + +3 = +6.
    // Total = 21 ≥ DC 20 → pass.
    const outcome = rollCheck({
      stat: 10,
      dc: 20,
      modifiers: { ...blank, assistStats: [6, 7] },
      rng,
    });
    expect(outcome.modifierBreakdown.assist).toBe(6);
    expect(outcome.total).toBe(21);
    expect(outcome.pass).toBe(true);
  });

  it('stacks card burns — each adds +3', () => {
    const rng = { d20: () => 5, int: () => 5 };
    // Stat 5 + roll 5 + 2 burns (+6) = 16. DC 15 → pass.
    const outcome = rollCheck({
      stat: 5,
      dc: 15,
      modifiers: { ...blank, cardBurns: 2 },
      rng,
    });
    expect(outcome.modifierBreakdown.cardBurn).toBe(2 * CARD_BURN_BONUS);
    expect(outcome.total).toBe(16);
    expect(outcome.pass).toBe(true);
  });

  it('stacks spark burns — each adds +5', () => {
    const rng = { d20: () => 4, int: () => 4 };
    // Stat 1 + roll 4 + 2 sparks (+10) = 15. DC 15 → pass.
    const outcome = rollCheck({
      stat: 1,
      dc: 15,
      modifiers: { ...blank, sparkBurns: 2 },
      rng,
    });
    expect(outcome.modifierBreakdown.sparkBurn).toBe(2 * SPARK_BURN_BONUS);
    expect(outcome.total).toBe(15);
    expect(outcome.pass).toBe(true);
  });

  it('applies the shortcut-path penalty as +DC (not a modifier subtraction)', () => {
    const rng = { d20: () => 10, int: () => 10 };
    // Stat 10 + roll 10 = 20. Base DC 16 → pass. With penalty, effective
    // DC = 19 → still pass.
    const noPenalty = rollCheck({ stat: 10, dc: 16, modifiers: blank, rng });
    const withPenalty = rollCheck({
      stat: 10,
      dc: 16,
      modifiers: { ...blank, shortcutPenalty: true },
      rng,
    });
    expect(noPenalty.effectiveDC).toBe(16);
    expect(withPenalty.effectiveDC).toBe(16 + SHORTCUT_DC_PENALTY);
    expect(withPenalty.pass).toBe(true); // Stat+roll 20 still beats 19.
  });

  // #244: Soul Door reduction (Epic #240). The Door delta operates on
  // the DC side, not the roll side — keeps the breakdown ledger
  // (assist/burn/spark) clean. -2 is locked in design/soul-doors.md
  // § 7 D1.
  it('applies soulDoorDelta to the DC side', () => {
    // Two runs at the boundary: stat 5 + roll 5 = 10 against base
    // DC 12. Without Door: total 10 vs DC 12 → fails. With Door:
    // total 10 vs effective DC 10 → passes. Asserts both the DC
    // value AND the pass/fail direction, so a regression that
    // accidentally moved the delta to the roll side would surface
    // here (stays at DC 12 but `pass` flips).
    const noDoor = rollCheck({
      stat: 5,
      dc: 12,
      modifiers: blank,
      rng: { d20: () => 5, int: () => 5 },
    });
    const withDoor = rollCheck({
      stat: 5,
      dc: 12,
      modifiers: { ...blank, soulDoorDelta: -2 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(noDoor.effectiveDC).toBe(12);
    expect(noDoor.pass).toBe(false);
    expect(withDoor.effectiveDC).toBe(10);
    expect(withDoor.pass).toBe(true);
  });

  it('omitting soulDoorDelta is equivalent to 0 (default)', () => {
    const rng = { d20: () => 5, int: () => 5 };
    const out = rollCheck({ stat: 5, dc: 12, modifiers: blank, rng });
    expect(out.effectiveDC).toBe(12);
  });

  it('soulDoorDelta and shortcutPenalty stack additively on the DC', () => {
    const rng = { d20: () => 8, int: () => 8 };
    // Sagittarius on the central-pillar shortcut at Yesod (Door):
    // base 12, +3 shortcut, -2 Door → effective DC = 13.
    const both = rollCheck({
      stat: 5,
      dc: 12,
      modifiers: { ...blank, shortcutPenalty: true, soulDoorDelta: -2 },
      rng,
    });
    expect(both.effectiveDC).toBe(12 + SHORTCUT_DC_PENALTY - 2);
  });

  it('soulDoorDelta does NOT affect the roll-side total (assist / burn / spark)', () => {
    const rng = { d20: () => 5, int: () => 5 };
    // The Door reduces effectiveDC but should leave `total` and the
    // breakdown (assist, cardBurn, sparkBurn) untouched. Two runs
    // with the same stat + roll + side modifiers, only differing in
    // the Door delta, must produce the same total but different DCs.
    const without = rollCheck({
      stat: 10,
      dc: 14,
      modifiers: { ...blank, cardBurns: 1, sparkBurns: 1, assistStats: [4] },
      rng,
    });
    const with_ = rollCheck({
      stat: 10,
      dc: 14,
      modifiers: {
        ...blank,
        cardBurns: 1,
        sparkBurns: 1,
        assistStats: [4],
        soulDoorDelta: -2,
      },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(with_.total).toBe(without.total);
    expect(with_.modifierBreakdown).toEqual(without.modifierBreakdown);
    expect(with_.effectiveDC).toBe(without.effectiveDC - 2);
  });

  it('same seed produces identical outcomes', () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(42);
    const out1 = rollCheck({ stat: 10, dc: 15, modifiers: blank, rng: rng1 });
    const out2 = rollCheck({ stat: 10, dc: 15, modifiers: blank, rng: rng2 });
    expect(out1).toEqual(out2);
  });

  it('different seeds diverge within a few calls', () => {
    const rng1 = seededRng(1);
    const rng2 = seededRng(2);
    const rolls1 = [rng1.d20(), rng1.d20(), rng1.d20()];
    const rolls2 = [rng2.d20(), rng2.d20(), rng2.d20()];
    expect(rolls1).not.toEqual(rolls2);
  });
});

// ──────────────── resolveChallenge (state mutation) ────────────────

describe('resolveChallenge', () => {
  function stateAtSefirah(position: 'yesod' | 'hod' | 'netzach' | 'tiferet'): GameState {
    // Default hand empty; all stats 10; one player.
    return makeState({ position });
  }

  it('rejects unknown player', () => {
    const state = stateAtSefirah('yesod');
    const result = resolveChallenge({
      state,
      playerId: 'missing',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result).toEqual({ ok: false, reason: { kind: 'unknown-player', playerId: 'missing' } });
  });

  it('rejects a Sefirah whose challenge kind is not `check` (Malkuth)', () => {
    const state = makeState({ position: 'malkuth' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'malkuth',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('no-standard-check');
  });

  it('rejects a Sefirah whose challenge kind is not `check` (Kether collective)', () => {
    const state = makeState({ position: 'kether' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'kether',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('no-standard-check');
  });

  it('rejects re-attempting an already-cleared Sefirah for this player', () => {
    const state = makeState({
      position: 'yesod',
      clearedSefirot: new Set(['yesod']),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('already-cleared');
  });

  it('on success: marks Sefirah cleared, awards Spark, +1 Illumination, state unchanged otherwise', () => {
    // Yesod DC = 12, Intuition stat 20 + any roll ≥ 0 will pass.
    const state = makeState({
      position: 'yesod',
      stats: statSheet({ intuition: 20 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: seededRng(1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { newState, outcome } = result.value;
    expect(outcome.pass).toBe(true);

    const player = newState.players[0];
    expect(player?.clearedSefirot).toEqual(new Set(['yesod']));
    expect(player?.sparksHeld).toEqual(new Set(['yesod']));
    expect(newState.illumination).toBe(1);
    expect(newState.separation).toBe(0);
  });

  it('on failure: returns the outcome but does NOT mutate counters / clearedSefirot', () => {
    // Intuition 1 + d20 roll 3 = 4, no mods, fails DC 12.
    const state = makeState({
      position: 'yesod',
      stats: statSheet({ intuition: 1 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      // Seed tuned to ensure we roll ≤ 8.
      rng: { d20: () => 3, int: () => 3 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { newState, outcome } = result.value;
    expect(outcome.pass).toBe(false);
    expect(newState).toBe(state); // same reference — unchanged state on failure
    const player = newState.players[0];
    expect(player?.clearedSefirot.size).toBe(0);
    expect(player?.sparksHeld.size).toBe(0);
    expect(newState.illumination).toBe(0);
    expect(newState.separation).toBe(0);
  });

  it('honours the shortcut-penalty modifier on challenge resolution', () => {
    // Yesod base DC = 12. With shortcut penalty (+3), effective 15.
    // Intuition 5 + roll 7 = 12 ≥ 12 → pass without penalty;
    // Intuition 5 + roll 7 = 12 < 15 → fail with penalty.
    const state = makeState({
      position: 'yesod',
      stats: statSheet({ intuition: 5 }),
    });
    const noPenalty = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      rng: { d20: () => 7, int: () => 7 },
    });
    const withPenalty = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: true },
      rng: { d20: () => 7, int: () => 7 },
    });

    expect(noPenalty.ok && noPenalty.value.outcome.pass).toBe(true);
    expect(withPenalty.ok && withPenalty.value.outcome.pass).toBe(false);
  });
});

// ──────────────── acceptSetback ────────────────

describe('acceptSetback', () => {
  it('increments separation by 1 and returns new state', () => {
    const state = makeState({ position: 'yesod' });
    const next = acceptSetback(state, { playerId: 'p1', sefirah: 'yesod' });
    expect(next.separation).toBe(1);
    expect(next).not.toBe(state); // fresh object
  });

  it('does not touch player state or other counters', () => {
    const state = makeState({ position: 'yesod', clearedSefirot: new Set(['hod']) });
    const next = acceptSetback(state, { playerId: 'p1', sefirah: 'yesod' });
    expect(next.illumination).toBe(0);
    expect(next.players[0]).toEqual(state.players[0]);
  });

  it('raises separation by 2 for shortcut-path failures', () => {
    // design/mechanics.md: shortcut failures are +2 Separation,
    // not +1. The caller flags the shortcut context; the reducer
    // reads it.
    const state = makeState({ position: 'yesod' });
    const next = acceptSetback(state, { playerId: 'p1', sefirah: 'yesod', shortcut: true });
    expect(next.separation).toBe(2);
  });

  // ──────── #280: position rollback on shortcut failure ────────
  //
  // design/mechanics.md § Shortcuts: "Failing a shortcut challenge:
  // +2 Separation (not +1), and you drop back to the previous
  // Sefirah." Pre-#280 the +2 tick worked but the position rollback
  // was a TODO at the movement layer.
  //
  // Design choice: a dedicated rollback path (NOT routing through
  // applyMove) — applyMove would burn a card from hand, push to the
  // discard pile, and trigger move-downward / pillar-streak side
  // effects that are inappropriate for a forced setback push.
  // The rollback only writes `position` and clears
  // `lastArrivalPathNumber` so a subsequent challenge at the origin
  // Sefirah does NOT silently re-read as a shortcut from the old
  // path's perspective.

  it('shortcut failure pushes the player back to the Sefirah they came from', () => {
    // Path 25 (Tiferet ↔ Yesod) is a shortcut. Player arrived at
    // Yesod via path 25 (origin = Tiferet). Shortcut failure must
    // revert position to Tiferet.
    const state = makeState({
      position: 'yesod',
      lastArrivalPathNumber: 25,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('tiferet');
  });

  it('shortcut rollback clears lastArrivalPathNumber so origin challenge does not re-read as shortcut', () => {
    // Without this, a subsequent challenge at Tiferet would
    // erroneously consult path 25's pillarsCrossed (balance/balance)
    // and apply a phantom +3 DC penalty. Cleanest fix: clear the
    // field — the rollback wasn't a player-driven arrival.
    const state = makeState({
      position: 'yesod',
      lastArrivalPathNumber: 25,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.players[0]?.lastArrivalPathNumber).toBeUndefined();
  });

  it('shortcut failure tick of +2 Separation is preserved alongside the rollback', () => {
    // Regression guard for #275: the rollback path must not
    // accidentally drop the Separation tick.
    const state = makeState({
      position: 'yesod',
      lastArrivalPathNumber: 25,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.separation).toBe(2);
  });

  it('non-shortcut failure does NOT move the player', () => {
    // Regression guard: only shortcut failures push back. Path 30
    // (Hod ↔ Yesod) is severity/balance — not a shortcut.
    const state = makeState({
      position: 'yesod',
      lastArrivalPathNumber: 30,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: false,
    });
    expect(next.players[0]?.position).toBe('yesod');
    expect(next.players[0]?.lastArrivalPathNumber).toBe(30);
  });

  it('shortcut failure with no recorded arrival path leaves position untouched (defensive)', () => {
    // PlayerState.lastArrivalPathNumber is optional; if a snapshot
    // somehow lands in challenge phase without it (transitional
    // pre-#275 row, or an externally-injected state) the rollback
    // has no origin to push back to. Better to no-op the position
    // change than crash — the +2 Separation tick still applies.
    const state = makeState({ position: 'yesod' });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('yesod');
    expect(next.separation).toBe(2);
  });

  it('rollback works for path 13 (Kether ↔ Tiferet) — back to Tiferet', () => {
    // Path 13 is the Kether-side shortcut. Player at Kether after
    // travelling path 13 from Tiferet → rollback puts them at Tiferet.
    const state = makeState({
      position: 'kether',
      lastArrivalPathNumber: 13,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'kether',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('tiferet');
  });

  it('rollback works for path 32 (Yesod ↔ Malkuth) — back to Malkuth', () => {
    // Path 32 (Yesod ↔ Malkuth) is also balance/balance. Failing
    // at Yesod after travelling up from Malkuth should push back
    // to Malkuth.
    const state = makeState({
      position: 'yesod',
      lastArrivalPathNumber: 32,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('malkuth');
  });

  it('shortcut failure with arrival path that does not touch current position is a no-op (defensive)', () => {
    // Defensive: if a corrupted/injected snapshot has the player
    // at Hod with `lastArrivalPathNumber: 25` (Tiferet ↔ Yesod —
    // doesn't touch Hod), we cannot infer a sensible origin.
    // No-op the position change; +2 Separation still ticks.
    const state = makeState({
      position: 'hod',
      lastArrivalPathNumber: 25,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'hod',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('hod');
    expect(next.separation).toBe(2);
  });

  it('rollback only touches the active player (other players untouched)', () => {
    // Regression guard for the multi-player case: the rollback
    // must scope to the player whose challenge failed. Sibling
    // players at the same Sefirah (assistants) keep their position.
    const ally = makePlayer({
      id: 'p2',
      name: 'Bo',
      position: 'yesod',
      lastArrivalPathNumber: 25,
    });
    const state = makeState(
      {},
      {
        players: [
          makePlayer({ position: 'yesod', lastArrivalPathNumber: 25 }),
          ally,
        ],
      },
    );
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('tiferet');
    expect(next.players[1]?.position).toBe('yesod');
    expect(next.players[1]?.lastArrivalPathNumber).toBe(25);
  });
});

// ──────────────── resolveChallenge × Soul Doors (#244) ────────────────

describe('resolveChallenge — Soul Door auto-injection (#244)', () => {
  // The resolver computes the Door delta from `player.zodiacSign + sefirah`
  // when the caller hasn't supplied one explicitly. This keeps callers
  // (UI, turn-machine, tests) from each having to know the Soul Door
  // table. Modifies the effective DC the same way `shortcutPenalty`
  // does — DC-side, not roll-side.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
  };

  // Concrete: Pisces at Netzach (path 29: The Moon → Netzach is the
  // only Door endpoint with a challenge). Base DC 12, after Door = 10.
  // Stat 5 + roll 5 = 10 → fails without Door (10 < 12), passes with
  // (10 ≥ 10).
  it('Pisces at Netzach: DC 12 → 10 (passes a roll that would fail without)', () => {
    const state = makeState({
      position: 'netzach',
      zodiacSign: 'pisces',
      stats: statSheet({ passion: 5 }),
    });
    const rng = { d20: () => 5, int: () => 5 };
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(10);
    expect(result.value.outcome.pass).toBe(true);
  });

  it('Aries at Hod (non-Door): no DC reduction', () => {
    const state = makeState({
      position: 'hod',
      zodiacSign: 'aries',
      stats: statSheet({ intellect: 5 }),
    });
    const rng = { d20: () => 5, int: () => 5 };
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
  });

  it('player without zodiacSign: no Door injection (transitional path)', () => {
    // During the #212 transition some players still lack a sign
    // (#236 wires the picker; #237 makes it required). Those players
    // get no Door discount and the resolver behaves identically to
    // the pre-#244 path.
    // Note: under `exactOptionalPropertyTypes`, omit the key entirely
    // (rather than passing `undefined` literally).
    const state = makeState({
      position: 'netzach',
      stats: statSheet({ passion: 5 }),
    });
    const rng = { d20: () => 5, int: () => 5 };
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
  });

  it('caller-supplied soulDoorDelta in modifiers takes precedence', () => {
    // If the UI has already computed and passed a delta (so its
    // animation matches the engine's effective DC), the resolver
    // honours it rather than recomputing. This keeps the UI as the
    // source of truth for what the player saw.
    const state = makeState({
      position: 'netzach',
      zodiacSign: 'pisces', // would auto-inject -2
      stats: statSheet({ passion: 5 }),
    });
    const rng = { d20: () => 5, int: () => 5 };
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: { ...blankMods, soulDoorDelta: 0 }, // explicit 0 override
      rng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12); // not reduced
  });

  it('shortcut + Door stack on a single check', () => {
    // Sagittarius (Temperance, path 25: Tiferet ↔ Yesod — both Doors
    // are challenge-bearing) on the central-pillar shortcut at Yesod.
    // Base DC 12, +3 shortcut, -2 Door → effective 13.
    const state = makeState({
      position: 'yesod',
      zodiacSign: 'sagittarius',
      stats: statSheet({ intuition: 8 }),
    });
    const rng = { d20: () => 5, int: () => 5 };
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { ...blankMods, shortcutPenalty: true },
      rng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12 + 3 - 2);
  });
});
