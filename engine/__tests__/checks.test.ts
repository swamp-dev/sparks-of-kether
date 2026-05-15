import { describe, expect, it } from 'vitest';
import { seededRng } from '../rng';
import {
  rollCheck,
  resolveChallenge,
  acceptSetback,
  CARD_BURN_BONUS,
  SPARK_BURN_BONUS,
  SHORTCUT_DC_PENALTY,
  HOD_WORD_MATCH_BONUS,
  YESOD_DREAM_PEEK_BONUS,
  TIFERET_BALANCE_TILT,
  TIFERET_LOPSIDED_TILT,
  NETZACH_DECLARED_DESIRE_BONUS,
  NETZACH_RETRY_DC_TILT,
  GEVURAH_DEAREST_BONUS,
  CHESED_OVERFLOW_BONUS,
  CHESED_DC_REDUCTION_CAP,
  binahBurnTierBonus,
  chokmahTilt,
  CHOKMAH_FLASH_BONUS,
  type CheckModifiers,
} from '../checks';
import { makePlayer, makeState, statSheet } from '@/test/fixtures';
import type { GameState, PlayerState } from '../types';
import { EMPTY_PENDING_MODIFIERS } from '../types';

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

  // #334 / per-Sefirah surface (`design/per-sefirah-mechanics.md` § 2.6 (a)):
  // `flatBonus` is the single field that the per-Sefirah twists land
  // their bonus through (Hod / Yesod match, Gevurah dearest stack,
  // Netzach declared-desire sign-aware bump, Chokmah fire-sign flash).
  // The resolver folds it into `total` alongside assist / cardBurn /
  // sparkBurn. Default-zero so existing call sites that pre-date the
  // per-Sefirah work keep producing identical totals.
  it('adds flatBonus to the total (default 0 keeps the legacy total unchanged)', () => {
    const rng = { d20: () => 6, int: () => 6 };
    // Stat 5 + roll 6 = 11. Without flatBonus → total 11.
    const baseline = rollCheck({ stat: 5, dc: 14, modifiers: blank, rng });
    expect(baseline.total).toBe(11);
    expect(baseline.pass).toBe(false);
    // Default-zero case: breakdown OMITS the field so legacy outcomes
    // stay byte-identical and downstream renderers can use
    // `breakdown.flatBonus !== undefined` as a "shipped this roll" signal.
    expect(baseline.modifierBreakdown.flatBonus).toBeUndefined();

    // With +5 flatBonus → total 16, pass.
    const withFlat = rollCheck({
      stat: 5,
      dc: 14,
      modifiers: { ...blank, flatBonus: 5 },
      rng: { d20: () => 6, int: () => 6 },
    });
    expect(withFlat.total).toBe(16);
    expect(withFlat.pass).toBe(true);
    // breakdown reports the per-Sefirah contribution so downstream
    // tickets (Hod +5, Yesod +5, ...) can render "+5 (dream match)"
    // without re-deriving the value from inputs.
    expect(withFlat.modifierBreakdown.flatBonus).toBe(5);
  });

  it('omitting flatBonus is equivalent to flatBonus: 0', () => {
    const rng = { d20: () => 5, int: () => 5 };
    const omitted = rollCheck({ stat: 8, dc: 12, modifiers: blank, rng });
    const explicitZero = rollCheck({
      stat: 8,
      dc: 12,
      modifiers: { ...blank, flatBonus: 0 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(omitted.total).toBe(explicitZero.total);
    expect(omitted.effectiveDC).toBe(explicitZero.effectiveDC);
    expect(omitted.pass).toBe(explicitZero.pass);
  });

  it('flatBonus stacks additively with assist / card-burn / spark-burn', () => {
    const rng = { d20: () => 5, int: () => 5 };
    // Stat 5 + roll 5 = 10; +1 assist (half of 3) + 2 cardBurn (+6) +
    // 1 sparkBurn (+5) + 4 flatBonus = 26. DC 26 → pass on the boundary.
    const outcome = rollCheck({
      stat: 5,
      dc: 26,
      modifiers: {
        ...blank,
        assistStats: [3],
        cardBurns: 2,
        sparkBurns: 1,
        flatBonus: 4,
      },
      rng,
    });
    expect(outcome.modifierBreakdown.assist).toBe(1);
    expect(outcome.modifierBreakdown.cardBurn).toBe(2 * CARD_BURN_BONUS);
    expect(outcome.modifierBreakdown.sparkBurn).toBe(1 * SPARK_BURN_BONUS);
    expect(outcome.modifierBreakdown.flatBonus).toBe(4);
    expect(outcome.total).toBe(5 + 5 + 1 + 6 + 5 + 4);
    expect(outcome.pass).toBe(true);
  });

  it('flatBonus is roll-side, not DC-side — leaves effectiveDC alone', () => {
    const rng = { d20: () => 8, int: () => 8 };
    // Two runs at the same DC + Door delta; only flatBonus differs.
    // The DC must be identical between them (the bonus is on the roll
    // side); a regression that misrouted flatBonus to the DC subtractor
    // would surface here as an effectiveDC change.
    const without = rollCheck({
      stat: 6,
      dc: 14,
      modifiers: { ...blank, soulDoorDelta: -2 },
      rng,
    });
    const withFlat = rollCheck({
      stat: 6,
      dc: 14,
      modifiers: { ...blank, soulDoorDelta: -2, flatBonus: 5 },
      rng: { d20: () => 8, int: () => 8 },
    });
    expect(withFlat.effectiveDC).toBe(without.effectiveDC);
    expect(withFlat.total).toBe(without.total + 5);
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

  // ──────── #303 retro-review: validate pillarsCrossed before rollback ────────
  //
  // Defense-in-depth against an exploitable trust gap. Pre-#308 the
  // rollback trusted the caller's `shortcut` flag entirely — it would
  // happily roll the player back along ANY recorded `lastArrivalPathNumber`
  // as long as the path's endpoints touched the current position. A
  // buggy/malicious multiplayer client could send `{ kind:
  // 'accept-setback', shortcut: true }` after arriving via a non-
  // shortcut path (e.g. path 27 Netzach↔Hod) and get silently
  // teleported with the +2 Separation tick.
  //
  // Fix: `rollbackPosition` verifies the path's `pillarsCrossed` is
  // `['balance', 'balance']` (the central-pillar shortcut signature)
  // before moving the player. On mismatch, the position is left
  // untouched but the +2 Separation tick still fires — the player
  // chose to accept setback, they pay the design's published cost.

  it('shortcut failure with non-shortcut arrival path is a no-op for position, but +2 Separation still ticks', () => {
    // Path 27 (Netzach ↔ Hod) crosses mercy/severity, not the central
    // pillar. Even if the (buggy/malicious) caller passes
    // `shortcut: true`, the rollback must reject the path as not
    // actually a shortcut and leave position alone.
    const state = makeState({
      position: 'hod',
      lastArrivalPathNumber: 27,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'hod',
      shortcut: true,
    });
    // Position unchanged: caller's shortcut flag was untrusted.
    expect(next.players[0]?.position).toBe('hod');
    // lastArrivalPathNumber NOT cleared — no rollback happened, so
    // the field stays so subsequent legitimate flows can read it.
    expect(next.players[0]?.lastArrivalPathNumber).toBe(27);
    // Separation tick still applies — design semantic per
    // `design/mechanics.md` § Shortcuts: the player asked for
    // setback, they pay it.
    expect(next.separation).toBe(2);
  });

  it('shortcut failure with another non-shortcut arrival path (path 28, mercy/balance) is also a no-op for position', () => {
    // Second case to lock in the validation: path 28 Netzach↔Yesod
    // is mercy/balance — only HALF balance, so it's NOT a central-
    // pillar shortcut. The endpoint touches Yesod, but `pillarsCrossed`
    // disqualifies it.
    const state = makeState({
      position: 'yesod',
      lastArrivalPathNumber: 28,
    });
    const next = acceptSetback(state, {
      playerId: 'p1',
      sefirah: 'yesod',
      shortcut: true,
    });
    expect(next.players[0]?.position).toBe('yesod');
    expect(next.players[0]?.lastArrivalPathNumber).toBe(28);
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
        players: [makePlayer({ position: 'yesod', lastArrivalPathNumber: 25 }), ally],
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

// ──────────────── resolveChallenge × Hod Word-Match (#353) ────────────────
//
// `design/per-sefirah-mechanics.md` § 3.1 — when the player stages a
// `name-card` modifier at Hod, the engine peeks the deck top at resolve
// time. Match → +5 to the roll (the `flatBonus` field on the modifiers
// passed to `rollCheck`). Miss → no bonus; the miss event broadcasts
// only "your guess didn't match", NOT the actual deck-top arcanum
// (C4 information-hiding rule). The `name-card` modifier is consumed
// at resolve REGARDLESS of pass / fail — distinct from card-burns
// which persist on retry. Combined with the opaque miss event, this
// closes the C4 retry-exploit cheat path.
//
// Shell of Hod (C5) — when the Shell is active the engine compares the
// guess against `state.encounter.deceptionMisreport` (the lie the Shell
// tells the player) instead of the true deck top. Word-Match becomes a
// noise check; the engine respects the Shell rather than skipping it.

describe('resolveChallenge — Hod Word-Match (#353)', () => {
  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
  };

  it('match: deck top equals the named arcanum → +5 flatBonus and pass event with the matched arcanum', () => {
    // Hod stat = intellect (10 default), DC 12. Roll 5 → 5 + 10 = 15
    // before bonus (passes baseline DC 12 anyway). The point of THIS
    // test is the `+5` showing in the breakdown's flatBonus and the
    // hodWordMatch event reporting `'pass'` with the matched arcanum.
    // Use a low intellect + DC-meeting roll so the +5 is load-bearing
    // for a pass-side regression: stat 4, roll 5 → 9; +5 from match =
    // 14 vs DC 12 → pass. Without the +5 → 9 < 12 → fail.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 4 }),
      },
      {
        deck: [7],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [7] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
    expect(result.value.outcome.total).toBe(5 + 4 + 5); // roll + stat + match bonus
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.hodWordMatch).toEqual({
      kind: 'hod-word-match-pass',
      named: 7,
    });
  });

  it('miss: deck top differs from the named arcanum → no flatBonus and miss event with NO actual arcanum', () => {
    // Per design § 3.1 C4 fix rule 1: the miss event MUST omit the
    // actual deck-top arcanum so a react-retry has no information
    // advantage. The hod event records only the named arcanum.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 10 }),
      },
      {
        deck: [3], // actual top
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [7] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.outcome.total).toBe(5 + 10); // no match bonus
    expect(result.value.hodWordMatch).toEqual({
      kind: 'hod-word-match-miss',
      named: 7,
    });
    // Defensive: the event must not leak the actual deck-top.
    const hodEvent = result.value.hodWordMatch;
    expect(hodEvent && 'actual' in hodEvent).toBe(false);
  });

  it('name-card is consumed at resolve regardless of pass/fail (miss path)', () => {
    // C4 rule 2: the staged name-card is removed from
    // `pendingModifiers.nameCards` whether or not the guess matched.
    // On a miss the chassis-level resolveChallenge path returns the
    // input state unchanged for the standard counters/clearedSefirot,
    // BUT it must clear the name-card so a subsequent react-retry
    // re-staging requires a fresh `prep-add-modifier`.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 1 }),
      },
      {
        deck: [3],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [7] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      // Stat 1 + roll 1 = 2 vs DC 12 → fail without bonus, miss has no bonus.
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    expect(result.value.newState.pendingModifiers.nameCards).toEqual([]);
    // Counters stay 0 — fail path doesn't touch them.
    expect(result.value.newState.illumination).toBe(0);
    expect(result.value.newState.separation).toBe(0);
  });

  it('name-card is consumed at resolve regardless of pass/fail (pass path)', () => {
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 4 }),
      },
      {
        deck: [11],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [11] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 }, // 5 + 4 + 5 = 14 ≥ 12 → pass
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.newState.pendingModifiers.nameCards).toEqual([]);
  });

  it('Shell of Hod (Deception): engine compares against encounter.deceptionMisreport, not deck top', () => {
    // Per design § 3.1 C5 fix: when the Shell of Hod is active, the
    // engine substitutes `state.encounter.deceptionMisreport` for the
    // deck top in the match comparison. The mechanic respects the
    // Shell rather than skipping it.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 4 }),
      },
      {
        deck: [3], // truth — but the Shell hides it
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [11] },
        encounter: {
          sefirah: 'hod',
          seed: 1,
          retryCount: 0,
          deceptionMisreport: 11, // the lie matches the player's guess
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Match against the LIE → +5 even though the truth disagrees.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
    expect(result.value.hodWordMatch?.kind).toBe('hod-word-match-pass');
  });

  it('Shell of Hod: guess matching the truth but NOT the lie misses', () => {
    // Inverse of the above — player names the actual deck-top, but the
    // Shell's misreport is something else, so the engine sees a miss.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 10 }),
      },
      {
        deck: [3], // truth
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [3] },
        encounter: {
          sefirah: 'hod',
          seed: 1,
          retryCount: 0,
          deceptionMisreport: 11, // lie ≠ guess
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.hodWordMatch?.kind).toBe('hod-word-match-miss');
  });

  it('non-Hod Sefirah with stale name-card in pendingModifiers does NOT fold the bonus', () => {
    // Defensive: a name-card should never be staged at a non-Hod
    // encounter (the prep-add reducer in turn-machine.ts is gated on
    // sefirah === 'hod'), but the engine path must not credit the
    // bonus if the active Sefirah differs. Otherwise a misrouted
    // staging would let a player buy +5 on Yesod from a leftover Hod
    // guess. The flatBonus must not appear in the breakdown.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 10 }),
      },
      {
        deck: [7],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [7] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.hodWordMatch).toBeUndefined();
  });

  it('Hod with no name-card staged: vanilla resolveChallenge behaviour, no event', () => {
    // The mechanic is opt-in via `prep-add-modifier name-card`. A Hod
    // encounter without a staged name-card should resolve as a normal
    // d20 check — no flatBonus folded in, no hodWordMatch event.
    const state = makeState({
      position: 'hod',
      stats: statSheet({ intellect: 10 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.hodWordMatch).toBeUndefined();
  });

  it('exposes HOD_WORD_MATCH_BONUS as the locked +5 constant', () => {
    // Pinning the constant makes the design contract auditable and
    // gives the downstream UI ticket a single import to render
    // "Word-Match: +5" in the prep panel.
    expect(HOD_WORD_MATCH_BONUS).toBe(5);
  });

  it('caller-supplied modifiers.flatBonus stacks with the Hod match bonus', () => {
    // A future per-Sefirah twist or a Spark might add its own flatBonus.
    // The Hod match bonus must STACK on top, not replace.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 0 }),
      },
      {
        deck: [7],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [7] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: { ...blankMods, flatBonus: 2 }, // pretend a +2 elsewhere
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // +2 caller + +5 Hod match = +7 total flatBonus.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(7);
  });

  it('both piles empty at resolve: name-card dropped (no event, no bonus), still consumed', () => {
    // Design § 3.1 edge case: when the deck is empty at prep-confirm,
    // the chassis layer normally reshuffles the discard before the
    // peek. Reaching the engine with an empty deck means BOTH piles
    // are empty (the true game-end state), in which case the design
    // says "the modifier is dropped." Dropping is distinct from a miss:
    // no comparison happened, so no `hod-word-match-miss` event is
    // emitted (the UI would otherwise render "your guess didn't match"
    // even though there was no guess-vs-card comparison).
    //
    // The C4 rule 2 still applies: the name-card is consumed, so a
    // subsequent `react-retry` does not see the modifier in
    // `pendingModifiers`.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 10 }),
      },
      {
        deck: [],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, nameCards: [7] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    // Drop branch: no hodWordMatch event surfaced — the dropped
    // modifier is silent from the UI's perspective.
    expect(result.value.hodWordMatch).toBeUndefined();
    // Name-card consumed regardless (C4 rule 2).
    expect(result.value.newState.pendingModifiers.nameCards).toEqual([]);
  });
});

// ──────────────── resolveChallenge × Yesod Dream-Peek (#354) ────────────────
//
// `design/per-sefirah-mechanics.md` § 3.6 — when the player stages a
// `dream-guess` modifier at Yesod, the engine compares against the
// envelope's deterministically-derived `dreamPillar` at resolve time.
// Match → +5 to the roll (the `flatBonus` field on the modifiers passed
// to `rollCheck`); pass event carries the matched pillar. Miss → no
// bonus; the miss event broadcasts ONLY the player's named guess and
// deliberately omits the actual `dreamPillar` so a `react-retry` has no
// information advantage over the first attempt (C4 information-hiding
// rule, design § 3.6 rule 1). The `dream-guess` modifier is consumed at
// resolve REGARDLESS of pass / fail — distinct from card-burns which
// persist on retry. Combined with the opaque miss event AND the per-
// retry re-seed of `dreamPillar` (rule 2 in the reducer at react-retry),
// this closes the C4 retry-exploit cheat path.
//
// Soul Door composition (S6) — Yesod is a Soul Door for Sagittarius and
// Aquarius (`design/soul-doors.md` § 4). The Dream-Peek bonus is roll-
// side via `flatBonus`; the Soul Door delta is DC-side via
// `soulDoorDelta`. They MUST stack — neither replaces the other.

describe('resolveChallenge — Yesod Dream-Peek (#354)', () => {
  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
  };

  it('match: dreamPillar equals the named pillar → +5 flatBonus and pass event with the matched pillar', () => {
    // Yesod stat = intuition (default 10). DC for Yesod is 12 in the
    // sefirot data; we pin a fixture where the +5 is load-bearing for
    // pass: stat 4, roll 5 → 9; +5 from match = 14 vs DC 12 → pass.
    // Without the +5 → 9 < 12 → fail.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 4 }),
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['mercy'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
    expect(result.value.outcome.total).toBe(5 + 4 + 5); // roll + stat + match bonus
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.yesodDreamPeek).toEqual({
      kind: 'yesod-dream-peek-pass',
      pillar: 'mercy',
    });
  });

  it('miss: dreamPillar differs from the named pillar → no flatBonus and miss event with NO actual pillar', () => {
    // Per design § 3.6 C4 fix rule 1: the miss event MUST omit the
    // actual dreamPillar so a react-retry has no information advantage.
    // The yesod event records only the named (guessed) pillar.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 10 }),
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['severity'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy', // actual ≠ guess
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.outcome.total).toBe(5 + 10); // no match bonus
    expect(result.value.yesodDreamPeek).toEqual({
      kind: 'yesod-dream-peek-miss',
      named: 'severity',
    });
    // Defensive: the event must not leak the actual dreamPillar.
    const dreamEvent = result.value.yesodDreamPeek;
    expect(dreamEvent && 'pillar' in dreamEvent).toBe(false);
    expect(dreamEvent && 'actual' in dreamEvent).toBe(false);
  });

  it('dream-guess is consumed at resolve regardless of pass/fail (miss path)', () => {
    // C4 rule 2 (design § 3.6 + § 2.7 "Consumption note"): the staged
    // dream-guess is removed from `pendingModifiers.dreamGuesses`
    // whether or not the guess matched. On a miss the chassis-level
    // resolveChallenge path returns the input state unchanged for the
    // standard counters/clearedSefirot, BUT it must clear the
    // dream-guess so a subsequent react-retry re-staging requires a
    // fresh `prep-add-modifier`.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 1 }),
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['severity'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      // Stat 1 + roll 1 = 2 vs DC 12 → fail without bonus, miss has no bonus.
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    expect(result.value.newState.pendingModifiers.dreamGuesses).toEqual([]);
    // Counters stay 0 — fail path doesn't touch them.
    expect(result.value.newState.illumination).toBe(0);
    expect(result.value.newState.separation).toBe(0);
  });

  it('dream-guess is consumed at resolve regardless of pass/fail (pass path)', () => {
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 4 }),
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['balance'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'balance',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 }, // 5 + 4 + 5 = 14 ≥ 12 → pass
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.newState.pendingModifiers.dreamGuesses).toEqual([]);
  });

  it('non-Yesod Sefirah with stale dream-guess in pendingModifiers does NOT fold the bonus', () => {
    // Defensive: a dream-guess should never be staged at a non-Yesod
    // encounter (the prep-add reducer in turn-machine.ts is gated on
    // sefirah === 'yesod'), but the engine path must not credit the
    // bonus if the active Sefirah differs. Otherwise a misrouted
    // staging would let a player buy +5 on Hod from a leftover Yesod
    // guess. The flatBonus must not appear in the breakdown.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 10 }),
      },
      {
        deck: [7],
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['mercy'] },
        encounter: {
          sefirah: 'hod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy', // stale envelope field
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.yesodDreamPeek).toBeUndefined();
  });

  it('Yesod with no dream-guess staged: vanilla resolveChallenge behaviour, no event', () => {
    // The mechanic is opt-in via `prep-add-modifier dream-guess`. A
    // Yesod encounter without a staged dream-guess should resolve as a
    // normal d20 check — no flatBonus folded in, no yesodDreamPeek
    // event — even when the envelope's `dreamPillar` happens to be set.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 10 }),
      },
      {
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.yesodDreamPeek).toBeUndefined();
  });

  it('Yesod with dream-guess staged but no dreamPillar in envelope: drop branch (no event, no bonus, still consumed)', () => {
    // Defensive: if the envelope arrived without `dreamPillar` populated
    // (a malformed snapshot, or a transitional state during refactor),
    // the engine has no comparison source. Drop the modifier silently
    // — no event, no bonus — but still consume the dream-guess per
    // the C4 consumption rule. Treating this as a "miss" would render
    // "your guess didn't match" in the UI even though no comparison
    // happened, mirroring the Hod empty-deck drop case.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 10 }),
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['mercy'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          // dreamPillar absent — malformed envelope, drop branch
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.yesodDreamPeek).toBeUndefined();
    // Dream-guess consumed regardless (C4 rule 2).
    expect(result.value.newState.pendingModifiers.dreamGuesses).toEqual([]);
  });

  it('Soul Door composition: Sagittarius at Yesod with a matched dream-guess gets BOTH the −2 DC delta AND the +5 roll bonus', () => {
    // `design/soul-doors.md` § 4: Yesod is a Soul Door for Sagittarius
    // and Aquarius. The Soul Door delta is DC-side (−2); the
    // Dream-Peek bonus is roll-side (+5). They MUST stack — a
    // regression that routes one through the other (or replaces one
    // with the other) would silently drop a leg.
    //
    // Pin the math: Yesod DC 12, Sagittarius Soul Door delta −2
    // → effective DC 10. Stat 4 + roll 5 = 9 (would fail effective
    // DC 10 alone) + 5 dream-match = 14 → pass.
    // WITHOUT the dream-match: 9 < 10 → fail.
    // WITHOUT the Soul Door delta: 14 vs 12 → still passes here, so
    // we additionally check the breakdown reflects both contributions.
    const state = makeState(
      {
        id: 'p1',
        position: 'yesod',
        stats: statSheet({ intuition: 4 }),
        zodiacSign: 'sagittarius',
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['mercy'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Roll-side: the +5 dream-match is in the breakdown.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
    expect(result.value.outcome.total).toBe(5 + 4 + 5); // roll + stat + match
    // DC-side: the Sagittarius Soul Door delta lowered the DC by 2.
    // Yesod baseDC = 12, no shortcut → effectiveDC = 12 + 0 + (−2) = 10.
    expect(result.value.outcome.effectiveDC).toBe(10);
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.yesodDreamPeek?.kind).toBe('yesod-dream-peek-pass');
  });

  it('Soul Door composition is load-bearing: a Sagittarius pass that needs BOTH the dream bonus AND the Soul Door discount', () => {
    // Pin a stat / DC margin where neither contribution alone is
    // sufficient — only the combined effect passes the check. Catches
    // a regression that drops either leg.
    //
    // Yesod base DC 12. Stat 0 + roll 7 = 7. With +5 dream-match alone
    // → 12 vs 12 → passes. To make BOTH load-bearing:
    //   stat 0 + roll 6 = 6
    //   + 5 (dream-match) = 11
    //   vs effectiveDC = 12 - 2 (Sagittarius Door) = 10 → 11 ≥ 10 → pass
    // Without dream-match: 6 < 10 → fail.
    // Without Soul Door:   11 < 12 → fail.
    // With both:           11 ≥ 10 → pass.
    const state = makeState(
      {
        id: 'p1',
        position: 'yesod',
        stats: statSheet({ intuition: 0 }),
        zodiacSign: 'sagittarius',
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['balance'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'balance',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: blankMods,
      rng: { d20: () => 6, int: () => 6 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.total).toBe(11);
    expect(result.value.outcome.effectiveDC).toBe(10);
    expect(result.value.outcome.pass).toBe(true);
  });

  it('exposes YESOD_DREAM_PEEK_BONUS as the locked +5 constant', () => {
    // Pinning the constant makes the design contract auditable and
    // gives the downstream UI ticket a single import to render
    // "Dream-Peek: +5" in the prep panel.
    expect(YESOD_DREAM_PEEK_BONUS).toBe(5);
  });

  it('caller-supplied modifiers.flatBonus stacks with the Yesod match bonus', () => {
    // A future per-Sefirah twist or a Spark might add its own flatBonus.
    // The Yesod match bonus must STACK on top, not replace.
    const state = makeState(
      {
        position: 'yesod',
        stats: statSheet({ intuition: 0 }),
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, dreamGuesses: ['mercy'] },
        encounter: {
          sefirah: 'yesod',
          seed: 1,
          retryCount: 0,
          dreamPillar: 'mercy',
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { ...blankMods, flatBonus: 2 }, // pretend a +2 elsewhere
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // +2 caller + +5 Yesod match = +7 total flatBonus.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(7);
  });
});

// ──────────────── resolveChallenge — Tiferet Two-Pillar Balance (#488) ────────────────

describe('resolveChallenge — Tiferet Two-Pillar Balance (#488)', () => {
  // Arcana fixtures (from data/paths.ts):
  //   arc  0 (Fool)        → path 11 ['balance','mercy']
  //   arc  2 (Priestess)   → path 13 ['balance','balance']
  //   arc  3 (Empress)     → path 14 ['mercy','severity']
  //   arc  5 (Hierophant)  → path 16 ['mercy','mercy']
  //   arc  7 (Chariot)     → path 18 ['severity','severity']
  //   arc 12 (Hanged Man)  → path 23 ['severity','severity']
  //   arc 14 (Temperance)  → path 25 ['balance','balance']
  //   arc 16 (Tower)       → path 27 ['mercy','severity']
  //   arc 21 (World)       → path 32 ['balance','balance']
  //
  // Tiferet base DC = 14 (sefirot.ts), stat = harmony.
  //
  // `soulDoorDelta: 0` is set explicitly throughout to bypass the
  // resolver's auto-inject (#244) — otherwise the player's default
  // zodiac (Aries, which is exalted at Tiferet) would shift the DC
  // and confound the Tiferet-tilt observations.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
    soulDoorDelta: 0,
  };

  // Roll-side total kept high so we isolate DC-side observations.
  // Stat 20 + roll 1 = 21. Easily clears any plausible DC.
  const easyRng = { d20: () => 1, int: () => 1 };

  function tiferetState(cardBurns: readonly number[]): GameState {
    return makeState(
      { position: 'tiferet', stats: statSheet({ harmony: 20 }) },
      { pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns } },
    );
  }

  it('exposes TIFERET_BALANCE_TILT / TIFERET_LOPSIDED_TILT as locked design constants', () => {
    // Pinned by `design/per-sefirah-mechanics.md` § 3.4 Rule.
    expect(TIFERET_BALANCE_TILT).toBe(-2);
    expect(TIFERET_LOPSIDED_TILT).toBe(2);
  });

  it('0 burns: base DC, no tilt — heart accepts silent stillness', () => {
    const state = tiferetState([]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: blankMods,
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Tiferet DC = 14, no tilt → effectiveDC = 14.
    expect(result.value.outcome.effectiveDC).toBe(14);
    expect(result.value.tiferetBalance).toEqual({
      kind: 'tiferet-balance',
      tilt: 0,
      pillarsTouched: [],
      burnCount: 0,
    });
  });

  it('1 burn (Tower — both poles in one card): no tilt (rule requires ≥ 2 burns)', () => {
    // The Tower's path crosses Mercy↔Severity, but the rule explicitly
    // requires ≥ 2 burns regardless of one-card span — "the encounter is
    // about integration through pairing, not luck-of-the-hand."
    // CheckModifiers.cardBurns = 1 means total += 3 (one CARD_BURN_BONUS).
    const state = tiferetState([16]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(14);
    expect(result.value.tiferetBalance).toEqual({
      kind: 'tiferet-balance',
      tilt: 0,
      pillarsTouched: ['mercy', 'severity'],
      burnCount: 1,
    });
  });

  it('2 burns covering both Mercy and Severity (Hierophant + Hanged Man): DC −2', () => {
    // Hierophant (mercy/mercy) ∪ Hanged Man (severity/severity) = {mercy, severity}.
    const state = tiferetState([5, 12]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
    expect(result.value.tiferetBalance?.tilt).toBe(-2);
    expect(new Set(result.value.tiferetBalance?.pillarsTouched ?? [])).toEqual(
      new Set(['mercy', 'severity']),
    );
  });

  it('2 burns (Tower mercy+severity + Hanged Man severity+severity): DC −2 (horizontal-rung composes)', () => {
    // Tower (mercy/severity) ∪ Hanged Man (severity/severity) = {mercy, severity}.
    // The single horizontal-rung burn alone wouldn't qualify, but
    // paired with any second burn the union still spans both poles.
    const state = tiferetState([16, 12]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
    expect(result.value.tiferetBalance?.tilt).toBe(-2);
  });

  it('2 burns covering only Severity (Chariot + Hanged Man): DC +2 (lopsided)', () => {
    // Chariot (severity/severity) ∪ Hanged Man (severity/severity) = {severity}.
    const state = tiferetState([7, 12]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(16);
    expect(result.value.tiferetBalance).toEqual({
      kind: 'tiferet-balance',
      tilt: 2,
      pillarsTouched: ['severity'],
      burnCount: 2,
    });
  });

  it('2 burns covering only Balance (High Priestess + Temperance): DC +2 (no Mercy or Severity touched)', () => {
    // High Priestess (balance/balance) ∪ Temperance (balance/balance) = {balance}.
    // Per design: "if every burn has at least one Balance side AND no
    // burn touches both Mercy and Severity, the result is one-sided or
    // no-sided — DC +2."
    const state = tiferetState([2, 14]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(16);
    expect(result.value.tiferetBalance?.tilt).toBe(2);
    expect(new Set(result.value.tiferetBalance?.pillarsTouched ?? [])).toEqual(
      new Set(['balance']),
    );
  });

  it('3 burns spanning Severity + Balance + Mercy: DC −2', () => {
    // Chariot (severity) ∪ Priestess (balance) ∪ Hierophant (mercy)
    // = {mercy, severity, balance}. Both poles touched → balanced tilt.
    const state = tiferetState([7, 2, 5]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 3 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
    expect(result.value.tiferetBalance?.tilt).toBe(-2);
    expect(new Set(result.value.tiferetBalance?.pillarsTouched ?? [])).toEqual(
      new Set(['mercy', 'severity', 'balance']),
    );
  });

  it('composition: 2 balanced burns + shortcut + Soul Door delta stack additively (S6)', () => {
    // From the design test matrix row 8: DC = base 14 + 3 (shortcut)
    // + (-2) (soul door) + (-2) (Tiferet tilt) = 13.
    const state = tiferetState([5, 12]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: {
        ...blankMods,
        cardBurns: 2,
        shortcutPenalty: true,
        soulDoorDelta: -2,
      },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(13);
  });

  it('non-Tiferet Sefirot do not emit a tiferetBalance event (Yesod control)', () => {
    // Regression guard: the Tiferet arm must be gated on
    // `sefirah === 'tiferet'`. A Yesod resolve must NOT carry a
    // tiferetBalance field even if cardBurns happen to be staged.
    const state = makeState(
      { position: 'yesod', stats: statSheet({ intuition: 20 }) },
      { pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [5, 12] } },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'yesod',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiferetBalance).toBeUndefined();
    expect(result.value.outcome.effectiveDC).toBe(12); // Yesod base 12, no tilt
  });

  it('Tiferet tilt is DC-side, not roll-side (does not appear in flatBonus breakdown)', () => {
    // The design specifies the tilt composes with shortcut and Soul Door
    // *on the DC side*. A regression that misroutes it to flatBonus
    // would shift the score by ±2 instead of the bar — same pass/fail
    // for many rolls but a different display and a different
    // interaction with the DC-side composition test above.
    const state = tiferetState([5, 12]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: easyRng,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // flatBonus only included when > 0. A roll-side regression would
    // produce flatBonus: 2 here.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('tiferetBalance event emitted on the PASS branch (chassis renders banner regardless of outcome)', () => {
    // The mechanic shifts the bar regardless of pass/fail; the chassis
    // wants the event on either branch so it can render the prep-result
    // banner. `tiferetState` sets `harmony: 20`, so stat 20 + roll 1 +
    // cardBurn 6 = 27 clears the (eased) DC 14 − 2 = 12 → pass. The
    // dedicated fail-branch test below covers the symmetric case with
    // `harmony: 0`.
    const state = tiferetState([5, 12]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.tiferetBalance).toBeDefined();
  });

  it('tiferetBalance event emitted on the FAIL branch (regression guard for pass/fail symmetry)', () => {
    const state = makeState(
      { position: 'tiferet', stats: statSheet({ harmony: 0 }) },
      { pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [7, 12] } },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 2 },
      // Stat 0 + roll 1 + cardBurn 6 = 7 < DC 14 + 2 = 16 → fail.
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    expect(result.value.outcome.effectiveDC).toBe(16);
    expect(result.value.tiferetBalance?.tilt).toBe(2);
  });
});

// ──────────────── resolveChallenge — Netzach Declared Desire (#489) ────────────────

describe('resolveChallenge — Netzach Declared Desire (#489)', () => {
  // Netzach base DC = 12 (sefirot.ts), stat = passion.
  //
  // Bonus-eligible signs (water + Venus-ruled, design § 3.5):
  //   cancer, scorpio, pisces, taurus, libra
  // Control signs (no bonus):
  //   aries, gemini, leo, virgo, sagittarius, capricorn, aquarius
  //
  // `soulDoorDelta: 0` set explicitly throughout to bypass the
  // resolver's auto-inject — otherwise the player's zodiac would shift
  // the DC and confound the Netzach-tilt observations.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
    soulDoorDelta: 0,
  };

  function netzachState(
    overrides: Partial<PlayerState> = {},
    encounter?: NonNullable<GameState['encounter']>,
  ): GameState {
    return makeState(
      {
        position: 'netzach',
        stats: statSheet({ passion: 10 }),
        ...overrides,
      },
      encounter !== undefined ? { encounter } : {},
    );
  }

  it('exposes NETZACH_DECLARED_DESIRE_BONUS / NETZACH_RETRY_DC_TILT as locked design constants', () => {
    expect(NETZACH_DECLARED_DESIRE_BONUS).toBe(2);
    expect(NETZACH_RETRY_DC_TILT).toBe(1);
  });

  // ── Sign-conditional +2 flatBonus (5 bonus-eligible signs)

  it.each([
    ['cancer', 'water'],
    ['scorpio', 'water'],
    ['pisces', 'water'],
    ['taurus', 'Venus-ruled'],
    ['libra', 'Venus-ruled'],
  ] as const)('declared %s (%s) at Netzach: +2 flatBonus on the roll', (zodiacSign, _label) => {
    const state = netzachState({ zodiacSign, declaredDesire: 'tiferet' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(2);
  });

  // ── Control signs: no bonus

  it.each(['aries', 'gemini', 'leo', 'virgo', 'sagittarius', 'capricorn', 'aquarius'] as const)(
    'declared %s (non-water/Venus, control) at Netzach: no flatBonus',
    (zodiacSign) => {
      const state = netzachState({ zodiacSign, declaredDesire: 'tiferet' });
      const result = resolveChallenge({
        state,
        playerId: 'p1',
        sefirah: 'netzach',
        modifiers: blankMods,
        rng: { d20: () => 5, int: () => 5 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    },
  );

  it('undeclared (no declaredDesire) at Netzach: no flatBonus, even for a water sign', () => {
    // The bonus requires BOTH declaration AND eligible sign. A water
    // sign that hasn't declared their desire gets nothing.
    const state = netzachState({ zodiacSign: 'cancer' /* no declaredDesire */ });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('caller-supplied flatBonus stacks with the Netzach sign bonus', () => {
    // A future twist or Spark might bring its own flatBonus. The
    // Netzach +2 must STACK, not replace.
    const state = netzachState({ zodiacSign: 'pisces', declaredDesire: 'binah' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: { ...blankMods, flatBonus: 3 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
  });

  // ── Retry-DC penalty for undeclared retries

  it('undeclared + netzachPriorFails === 0: no retry DC tilt (first attempt)', () => {
    const state = netzachState(
      { zodiacSign: 'aries' /* undeclared */ },
      { sefirah: 'netzach', seed: 1, retryCount: 0, netzachPriorFails: 0 },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
  });

  it('undeclared + netzachPriorFails >= 1: DC +1 (Aphrodite tightens on the retry)', () => {
    const state = netzachState(
      { zodiacSign: 'aries' /* undeclared */ },
      { sefirah: 'netzach', seed: 1, retryCount: 1, netzachPriorFails: 1 },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(13);
  });

  it('declared + netzachPriorFails >= 1: NO retry DC tilt (declaration exempts)', () => {
    const state = netzachState(
      { zodiacSign: 'aries', declaredDesire: 'binah' },
      { sefirah: 'netzach', seed: 1, retryCount: 1, netzachPriorFails: 1 },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12);
  });

  // ── netzachPriorFails increments on a failed resolve

  it('failed Netzach resolve: netzachPriorFails increments on the envelope', () => {
    // Stat 0 + roll 1 = 1 < DC 12 → fail. The Netzach branch bumps
    // priorFails so a subsequent retry sees DC +1 if still undeclared.
    const state = netzachState(
      { zodiacSign: 'aries', stats: statSheet({ passion: 0 }) },
      { sefirah: 'netzach', seed: 1, retryCount: 0, netzachPriorFails: 0 },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    expect(result.value.newState.encounter?.netzachPriorFails).toBe(1);
  });

  it('failed Netzach resolve stacks the priorFails counter across attempts', () => {
    const state = netzachState(
      { zodiacSign: 'aries', stats: statSheet({ passion: 0 }) },
      { sefirah: 'netzach', seed: 1, retryCount: 2, netzachPriorFails: 2 },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    expect(result.value.newState.encounter?.netzachPriorFails).toBe(3);
  });

  it('failed Netzach resolve at a NON-Netzach Sefirah does NOT touch netzachPriorFails (control)', () => {
    // Regression guard: the increment is gated on
    // `sefirah === 'netzach'`. A failed Hod resolve must not bump it.
    const state = makeState(
      { position: 'hod', stats: statSheet({ intellect: 0 }), zodiacSign: 'aries' },
      {
        encounter: { sefirah: 'hod', seed: 1, retryCount: 0, netzachPriorFails: 5 },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // priorFails stays at 5 — Hod doesn't touch the Netzach counter.
    expect(result.value.newState.encounter?.netzachPriorFails).toBe(5);
  });

  // ── pendingStatBuff set on pass with declaration

  it('pass at Netzach with declaration (non-Netzach Sefirah): pendingStatBuff set to +1 on declared sefirah', () => {
    const state = netzachState({
      zodiacSign: 'aries',
      declaredDesire: 'tiferet',
      stats: statSheet({ passion: 20 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    const player = result.value.newState.players[0];
    expect(player?.pendingStatBuff).toEqual({ sefirah: 'tiferet', amount: 1 });
  });

  it('pass at Netzach declaring Netzach itself: pendingStatBuff amount is +2 (congruence rewarded)', () => {
    const state = netzachState({
      zodiacSign: 'aries',
      declaredDesire: 'netzach',
      stats: statSheet({ passion: 20 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    const player = result.value.newState.players[0];
    expect(player?.pendingStatBuff).toEqual({ sefirah: 'netzach', amount: 2 });
  });

  it('pass at Netzach WITHOUT declaration: no pendingStatBuff set', () => {
    const state = netzachState({
      zodiacSign: 'aries' /* undeclared */,
      stats: statSheet({ passion: 20 }),
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'netzach',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    const player = result.value.newState.players[0];
    expect(player?.pendingStatBuff).toBeUndefined();
  });

  // ── pendingStatBuff consumption at the next stat-check

  it('pendingStatBuff applies to the matching Sefirah on a later check, then clears', () => {
    // Player passed Netzach earlier, declared Tiferet → pendingStatBuff
    // = { sefirah: 'tiferet', amount: 1 }. Now they arrive at Tiferet.
    // Stat 4 (harmony) + buff 1 = effective stat 5; roll 9 → total 14;
    // Tiferet DC = 14 → pass. Without the buff: 4 + 9 = 13 < 14 → fail.
    const state = makeState({
      position: 'tiferet',
      stats: statSheet({ harmony: 4 }),
      zodiacSign: 'aries',
      pendingStatBuff: { sefirah: 'tiferet', amount: 1 },
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: blankMods,
      rng: { d20: () => 9, int: () => 9 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.outcome.total).toBe(9 + 5); // roll + buffed stat
    // Consumed regardless of pass/fail.
    const player = result.value.newState.players[0];
    expect(player?.pendingStatBuff).toBeUndefined();
  });

  it('pendingStatBuff does NOT apply to a non-matching Sefirah; buff stays staged for later', () => {
    // Player declared Tiferet but arrives at Hod first. Hod's stat
    // (intellect) is not what the buff applies to — pass through with
    // no bump, buff preserved for a later Tiferet attempt.
    const state = makeState({
      position: 'hod',
      stats: statSheet({ intellect: 4 }),
      zodiacSign: 'aries',
      pendingStatBuff: { sefirah: 'tiferet', amount: 1 },
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No stat bump: 4 + 5 = 9 (not 10).
    expect(result.value.outcome.total).toBe(9);
    // Buff preserved.
    const player = result.value.newState.players[0];
    expect(player?.pendingStatBuff).toEqual({ sefirah: 'tiferet', amount: 1 });
  });

  it('pendingStatBuff is consumed even on a failed matching check (one-shot lifetime)', () => {
    // Per design § 3.5: "consumed by the next stat-check this turn.
    // After consumption it expires." The lifetime is one-shot; failing
    // the check still spends the buff.
    const state = makeState({
      position: 'tiferet',
      stats: statSheet({ harmony: 0 }),
      zodiacSign: 'aries',
      pendingStatBuff: { sefirah: 'tiferet', amount: 1 },
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: blankMods,
      // Stat 0 + buff 1 + roll 1 = 2 < DC 14 → fail.
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    const player = result.value.newState.players[0];
    expect(player?.pendingStatBuff).toBeUndefined();
  });

  // ── Sefirah-gating regression guards

  it('non-Netzach Sefirot do not award the declared-desire bonus (Hod control)', () => {
    // The +2 flatBonus is gated on `sefirah === 'netzach'`. A Hod
    // resolve with a declared-desire player + eligible sign must NOT
    // see the bonus.
    const state = makeState({
      position: 'hod',
      stats: statSheet({ intellect: 10 }),
      zodiacSign: 'cancer',
      declaredDesire: 'netzach',
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.outcome.effectiveDC).toBe(12); // Hod base, no Netzach tilt
  });
});

// ──────────────── resolveChallenge — Gevurah Sacred Sacrifice (#487) ────────────────

describe('resolveChallenge — Gevurah Sacred Sacrifice (#487)', () => {
  // Gevurah base DC = 15 (sefirot.ts), stat = strength.
  // The dearest is `Math.max(...activePlayer.hand)` — burning that
  // card adds +2 flatBonus on top of the standard +3 cardBurn,
  // so a dearest burn nets +5 vs the non-dearest +3.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
    soulDoorDelta: 0,
  };

  it('exposes GEVURAH_DEAREST_BONUS as the locked design constant', () => {
    // Locked at +2 — composes with the standard +3 cardBurn to net the
    // +5 design intent (parity with a Spark-burn).
    expect(GEVURAH_DEAREST_BONUS).toBe(2);
  });

  it('burn-of-dearest at Gevurah: +2 flatBonus (totals +5 with cardBurn)', () => {
    // Hand [21, 5, 3] → dearest = 21. Staged burn of 21.
    // Strength 10 + roll 5 + cardBurn 3 + dearestBonus 2 = 20 ≥ DC 15.
    const state = makeState(
      {
        position: 'gevurah',
        stats: statSheet({ strength: 10 }),
        hand: [21, 5, 3],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [21] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(2);
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(3);
    expect(result.value.outcome.total).toBe(5 + 10 + 3 + 2);
    expect(result.value.outcome.pass).toBe(true);
  });

  it('burn-of-non-dearest at Gevurah: no flatBonus (just the standard cardBurn)', () => {
    // Hand [21, 5, 3] → dearest = 21. Staged burn of 5 (not dearest).
    const state = makeState(
      {
        position: 'gevurah',
        stats: statSheet({ strength: 10 }),
        hand: [21, 5, 3],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [5] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(3);
    expect(result.value.outcome.total).toBe(5 + 10 + 3);
  });

  it('multiple burns including dearest: +2 fires (once per matching arcanum)', () => {
    // Hand [21, 5, 3] → dearest = 21. Staged burns of 21 AND 5.
    // Two cardBurns = +6 from the standard count. Dearest 21 matched = +2.
    const state = makeState(
      {
        position: 'gevurah',
        stats: statSheet({ strength: 10 }),
        hand: [21, 5, 3],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [21, 5] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(2);
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(6);
    expect(result.value.outcome.total).toBe(5 + 10 + 6 + 2);
  });

  it('multiple burns without dearest: no flatBonus', () => {
    // Hand [21, 5, 3] → dearest = 21. Staged burns of 5 AND 3 (no 21).
    const state = makeState(
      {
        position: 'gevurah',
        stats: statSheet({ strength: 10 }),
        hand: [21, 5, 3],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [5, 3] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it("no burn staged at Gevurah: no flatBonus (the gate is the reducer's job)", () => {
    // The dearest-tilt mechanic is independent of the reducer's
    // gevurah-requires-burn gate. If the engine is called with no
    // staged burns (e.g. from a fixture / test / future bot bypassing
    // the reducer), the dearest evaluation simply returns no bonus.
    const state = makeState({
      position: 'gevurah',
      stats: statSheet({ strength: 10 }),
      hand: [21, 5, 3],
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('empty hand at Gevurah with a (stale) staged burn: no dearest tilt (Math.max over empty)', () => {
    // Defensive: an empty hand has no "dearest" to match against. The
    // engine returns 0 bonus; a corrupted fixture won't fall through
    // to a misleading +Infinity or NaN.
    const state = makeState(
      {
        position: 'gevurah',
        stats: statSheet({ strength: 10 }),
        hand: [],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [21] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('caller-supplied flatBonus stacks with the Gevurah dearest bonus', () => {
    // A future twist or Spark might bring its own flatBonus. The
    // dearest +2 must STACK, not replace.
    const state = makeState(
      {
        position: 'gevurah',
        stats: statSheet({ strength: 10 }),
        hand: [21, 5, 3],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [21] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'gevurah',
      modifiers: { ...blankMods, cardBurns: 1, flatBonus: 3 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5); // 3 caller + 2 dearest
  });

  it('non-Gevurah Sefirah does not award the dearest tilt (Hod control)', () => {
    // Regression guard: the dearest evaluation is gated on
    // `sefirah === 'gevurah'`. A Hod resolve with a burn-of-highest
    // must not see the +2.
    const state = makeState(
      {
        position: 'hod',
        stats: statSheet({ intellect: 10 }),
        hand: [21, 5, 3],
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [21] },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });
});

// ──────────────── resolveChallenge — Chesed Overflow (#486) ────────────────

describe('resolveChallenge — Chesed Overflow (#486)', () => {
  // Chesed base DC = 13 (sefirot.ts), stat = lovingkindness.
  //
  // Design § 3.3: "unfolding" = ≥1 gift staged. DC reduces by 2 for
  // first gift, -1 per additional, capped at -4. Encounter ALWAYS
  // grants Spark + Illumination regardless of d20 outcome ("the gift
  // gesture re-shapes the outcome"). If the d20 would have passed
  // against the UNMODIFIED DC, +1 extra Illumination ("abundance
  // beyond ask"). "Hoarding" (0 gifts) follows standard chassis in
  // this PR — design's +2-Sep / no-retry override is a follow-up.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
    soulDoorDelta: 0,
  };

  function chesedState(
    gifts: readonly { readonly arcanum: number; readonly recipientId: string }[],
    stats: Partial<Record<string, number>> = { lovingkindness: 10 },
  ): GameState {
    return makeState(
      { position: 'chesed', stats: statSheet(stats) },
      { pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, giftCards: gifts } },
    );
  }

  it('exposes CHESED_OVERFLOW_BONUS and CHESED_DC_REDUCTION_CAP as design constants', () => {
    expect(CHESED_OVERFLOW_BONUS).toBe(1);
    expect(CHESED_DC_REDUCTION_CAP).toBe(4);
  });

  it('unfolding (1 gift): DC reduced by 2 (13 → 11)', () => {
    // Design § 3.3: "reduces the effective DC by 2; every additional
    // gift past the first reduces DC by another 1, capped at −4."
    const state = chesedState([{ arcanum: 5, recipientId: 'p2' }]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(11);
  });

  it('unfolding (2 gifts): DC reduced by 3 (13 → 10)', () => {
    const state = chesedState([
      { arcanum: 5, recipientId: 'p2' },
      { arcanum: 7, recipientId: 'p3' },
    ]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(10);
  });

  it('unfolding cap (4 gifts): DC -4 only (not -5)', () => {
    const state = chesedState([
      { arcanum: 5, recipientId: 'p2' },
      { arcanum: 7, recipientId: 'p3' },
      { arcanum: 11, recipientId: 'p2' },
      { arcanum: 13, recipientId: 'p3' },
    ]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // gifts=4 → reduction = min(4+1, 4) = 4 → DC 13 - 4 = 9.
    expect(result.value.outcome.effectiveDC).toBe(9);
  });

  it('unfolding cap (5 gifts): DC still -4 (cap holds)', () => {
    const state = chesedState([
      { arcanum: 5, recipientId: 'p2' },
      { arcanum: 7, recipientId: 'p3' },
      { arcanum: 11, recipientId: 'p2' },
      { arcanum: 13, recipientId: 'p3' },
      { arcanum: 17, recipientId: 'p2' },
    ]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(9);
  });

  it('unfolding always-passes the encounter even when d20 fails the modified DC', () => {
    // Design § 3.3: "On any roll outcome, the encounter passes — the
    // Spark is granted, Illumination +1." Stat 0 + roll 1 = 1 < DC 11
    // (modified). The d20 outcome.pass is false, but the encounter
    // semantic is "passed" — Spark earned, Sefirah cleared.
    const state = chesedState([{ arcanum: 5, recipientId: 'p2' }], { lovingkindness: 0 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = result.value.newState.players[0];
    // Encounter "passes" — Sefirah cleared, Spark earned, +1 Illumination.
    expect(player?.clearedSefirot).toEqual(new Set(['chesed']));
    expect(player?.sparksHeld).toEqual(new Set(['chesed']));
    expect(result.value.newState.illumination).toBe(1);
    // Separation untouched — unfolding never adds Separation.
    expect(result.value.newState.separation).toBe(0);
  });

  it('unfolding overflow (gift + d20 passes UNMODIFIED DC): +1 extra Illumination (+2 total)', () => {
    // Stat 10 + roll 5 = 15 ≥ base DC 13 → d20 would pass unmodified.
    // With 1 gift, modified DC 11; passes that too. The overflow
    // grants +1 Illumination on top of the standard spark-earned +1,
    // so total Illumination delta = 2.
    const state = chesedState([{ arcanum: 5, recipientId: 'p2' }], { lovingkindness: 10 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.newState.illumination).toBe(2);
    // Event emitted so the chassis can render the "Abundance" banner.
    expect(result.value.chesedOverflowBonus).toEqual({
      kind: 'chesed-overflow-bonus',
      amount: 1,
    });
  });

  it('unfolding no-overflow (gift + d20 fails UNMODIFIED DC, passes modified): no bonus', () => {
    // Stat 10 + roll 2 = 12 < base DC 13 → d20 fails unmodified.
    // With 1 gift, modified DC 11; 12 ≥ 11 → passes modified. The
    // encounter passes (Spark + Illumination +1) but NO overflow
    // bonus — the gift was load-bearing, not abundance beyond ask.
    const state = chesedState([{ arcanum: 5, recipientId: 'p2' }], { lovingkindness: 10 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 2, int: () => 2 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.newState.illumination).toBe(1);
    expect(result.value.chesedOverflowBonus).toBeUndefined();
  });

  it('hoarding (0 gifts) — standard chassis: pass/fail per d20', () => {
    // No gift staged. Standard chassis applies. Stat 10 + roll 5 = 15
    // ≥ DC 13 → pass. Spark earned, Illumination +1. No overflow.
    const state = chesedState([], { lovingkindness: 10 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(13);
    expect(result.value.outcome.pass).toBe(true);
    expect(result.value.newState.illumination).toBe(1);
    expect(result.value.chesedOverflowBonus).toBeUndefined();
  });

  it('hoarding (0 gifts) — d20 fail: standard fail path (no Spark, no Illumination)', () => {
    // Design § 3.3 specifies a 'hoarding' react-branch with +2 Sep,
    // but the special-cased Separation magnitude and react-retry
    // guard ship in a follow-up. This PR's behaviour on hoarding-fail
    // is standard-chassis: outcome.pass=false, newState===state, the
    // chassis routes through accept-setback (+1 Sep) or react-retry.
    const state = chesedState([], { lovingkindness: 0 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 1, int: () => 1 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.pass).toBe(false);
    expect(result.value.newState).toBe(state);
  });

  it('UI-path: pre-supplied outcome WITHOUT chesedGiftDcReduction — engine does NOT auto-fold (no double-application)', () => {
    // Regression guard against the latent double-application bug.
    //
    // Setup: 1 gift staged, baseDC 13. UI pre-rolls with
    // `effectiveDC = 13` (no chesed reduction applied — the UI
    // doesn't know about giftCards yet). The discriminating value is
    // `total`:
    //   - With the gate in place (correct behavior): the engine does
    //     NOT auto-fold. chesedGiftDcReduction stays 0.
    //     unmodifiedDC = 13 - 0 = 13. total (13) >= 13 → overflow
    //     fires.
    //   - With a regression that removes the gate:
    //     chesedGiftDcReduction = -2 from auto-fold.
    //     unmodifiedDC = 13 - (-2) = 15. total (13) < 15 → overflow
    //     does NOT fire.
    // The discriminator is precisely `total = 13` (the single-
    // reduction unmodifiedDC) which is below the double-reduction
    // unmodifiedDC of 15.
    const state = chesedState([{ arcanum: 5, recipientId: 'p2' }], { lovingkindness: 10 });
    const preRolled = {
      rolled: 3,
      statContribution: 10,
      modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
      total: 13,
      effectiveDC: 13,
      pass: true,
    };
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chesed',
      modifiers: blankMods,
      rng: { d20: () => 3, int: () => 3 },
      outcome: preRolled,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // effectiveDC passes through unchanged — no engine-side fold.
    expect(result.value.outcome.effectiveDC).toBe(13);
    // Overflow MUST fire — total (13) meets the true unmodifiedDC of
    // 13. A regression that reintroduced the auto-fold would compute
    // unmodifiedDC = 15 and the bonus would NOT fire.
    expect(result.value.chesedOverflowBonus).toEqual({
      kind: 'chesed-overflow-bonus',
      amount: 1,
    });
  });

  it('non-Chesed Sefirah: giftCards staged is ignored (Hod control)', () => {
    // Regression guard: the gift-DC-reduction is gated on
    // `sefirah === 'chesed'`. A Hod resolve with stale giftCards must
    // NOT apply the reduction.
    const state = makeState(
      { position: 'hod', stats: statSheet({ intellect: 10 }) },
      {
        pendingModifiers: {
          ...EMPTY_PENDING_MODIFIERS,
          giftCards: [{ arcanum: 5, recipientId: 'p2' }],
        },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(12); // Hod base, no Chesed tilt
    expect(result.value.chesedOverflowBonus).toBeUndefined();
  });
});

// ──────────────── resolveChallenge — Binah Sit With Loss (#491) ────────────────

describe('resolveChallenge — Binah Sit With Loss (#491)', () => {
  // Binah base DC = 16 (sefirot.ts), stat = understanding.
  //
  // Design § 3.7: At Binah, each staged card-burn grants
  // CARD_BURN_BONUS (+3, standard) PLUS ceil(arcanum / 4) (the
  // Binah-specific extra). The extra folds into flatBonus.
  //
  // Tiers:
  //   arcanum 0–3 → +3 standard + 0 extra (ceil(0/4)=0; ceil(3/4)=1
  //                actually... ceil(0/4)=0, ceil(1/4)=1, ceil(2/4)=1,
  //                ceil(3/4)=1.) Wait — the design says "Card with
  //                arcanum 0–3: standard +3" which means EXTRA=0 for
  //                arc 0–3. So the formula is "ceil(arc/4)" applied to
  //                arc 4–7 gives 1, 8–11 gives 2, etc. — i.e. it's
  //                actually `floor((arc - 1) / 4)` or `max(0, ceil((arc -
  //                3) / 4))` or simply the truncated tier number.
  //                The spec table is: 0-3→0, 4-7→1, 8-11→2, 12-15→3,
  //                16-19→4, 20-21→5. That's `Math.max(0, Math.floor((arc
  //                + 0) / 4))` for arc 0–21 modulo edge cases... let me
  //                walk: arc=0 → 0/4 = 0 ✓. arc=3 → 3/4 = 0.75 → 0 ✓.
  //                arc=4 → 4/4 = 1 ✓. arc=7 → 7/4 = 1.75 → 1 ✓.
  //                arc=8 → 8/4 = 2 ✓. arc=15 → 15/4 = 3.75 → 3 ✓.
  //                arc=16 → 16/4 = 4 ✓. arc=19 → 19/4 = 4.75 → 4 ✓.
  //                arc=20 → 20/4 = 5 ✓. arc=21 → 21/4 = 5.25 → 5 ✓.
  //                So the formula is `Math.floor(arc / 4)`, NOT
  //                `Math.ceil(arc / 4)` despite the design's "ceil"
  //                phrasing. The design's prose says "+ ceil(arcanum / 4)"
  //                but the table tells the actual rule. The table is
  //                authoritative.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
    soulDoorDelta: 0,
  };

  function binahState(
    cardBurns: readonly number[],
    stats: Partial<Record<string, number>> = { understanding: 10 },
  ): GameState {
    return makeState(
      { position: 'binah', stats: statSheet(stats) },
      { pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns } },
    );
  }

  it.each([
    [0, 0],
    [1, 0],
    [3, 0],
    [4, 1],
    [7, 1],
    [8, 2],
    [11, 2],
    [12, 3],
    [15, 3],
    [16, 4],
    [19, 4],
    [20, 5],
    [21, 5],
  ])('binahBurnTierBonus(%i) === %i (design § 3.7 tier table)', (arcanum, expected) => {
    expect(binahBurnTierBonus(arcanum)).toBe(expected);
  });

  it('Binah burn of low-arcanum card (arc 3): standard +3, no extra flatBonus', () => {
    // Tier 0-3 = +0 extra. Card grants only the standard cardBurn.
    const state = binahState([3]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'binah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(3);
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('Binah burn of mid-arcanum card (arc 10): +5 total bonus (+3 base + +2 extra)', () => {
    // Tier 8-11 = +2 extra. Total bonus from this burn = +5.
    const state = binahState([10]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'binah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(3);
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(2);
  });

  it('Binah burn of high-arcanum card (arc 21 The World): +8 total bonus (+3 base + +5 extra)', () => {
    // Tier 20-21 = +5 extra. Highest concrete loss; the design's
    // intention is to reward burning the rank-heaviest cards.
    const state = binahState([21]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'binah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(3);
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
  });

  it('Binah multiple burns: bonus sums across all staged arcana', () => {
    // Burn arc 4 (+1) + arc 12 (+3) + arc 20 (+5) → extra = 9.
    // Total cardBurn = 3 burns * 3 = 9. flatBonus = 9.
    const state = binahState([4, 12, 20]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'binah',
      modifiers: { ...blankMods, cardBurns: 3 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(9);
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(9);
  });

  it('caller-supplied flatBonus stacks with the Binah burn-tier bonus', () => {
    // A future twist or Spark might bring its own flatBonus. The
    // Binah extra must STACK, not replace.
    const state = binahState([10]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'binah',
      modifiers: { ...blankMods, cardBurns: 1, flatBonus: 3 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 3 caller + 2 Binah extra = 5.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
  });

  it('non-Binah Sefirah: staged cardBurns get only the standard +3 (Tiferet control)', () => {
    // Regression guard: the arcanum-scaled extra is gated on
    // `sefirah === 'binah'`. A Tiferet resolve with arc-21 in
    // cardBurns must NOT see the +5 extra (only standard +3).
    const state = makeState(
      { position: 'tiferet', stats: statSheet({ harmony: 10 }) },
      { pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, cardBurns: [21] } },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'tiferet',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.cardBurn).toBe(3);
    // The +5 Binah extra is NOT in flatBonus. Tiferet may have its
    // own tilt from the burn's pillarsCrossed but no Binah extra.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('Binah with 0 burns: no extra flatBonus (empty pendingModifiers)', () => {
    // Defensive: the helper handles the empty-burns case as 0 extra.
    const state = binahState([]);
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'binah',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });
});

// ──────────────── resolveChallenge — Chokmah Act Before Thought (#490) ────────────────

describe('resolveChallenge — Chokmah Act Before Thought (#490)', () => {
  // Chokmah base DC = 16 (sefirot.ts), stat = insight.
  //
  // Design § 3.8 tilt table for `chokmahTilt(n)`:
  //   n = 0 → -3 (unhesitated flash; Athena rewards instinct)
  //   n = 1 → 0  (standard)
  //   n = 2 → +5 (overthinking)
  //   n ≥ 3 → +9 (scheming; clamped)
  // where n = modifierCountAtConfirm + chokmahPriorAttempts.
  //
  // Modifier count = cardBurns.length + sparkBurns.length +
  // assistRequests.length (per design's explicit list).
  //
  // Fire signs (Aries, Leo, Sagittarius) get +2 flatBonus on a
  // 0-modifier flash (modifierCountAtConfirm === 0). Other 9 signs
  // can take the flash but get no element bonus.

  const blankMods: CheckModifiers = {
    assistStats: [],
    cardBurns: 0,
    sparkBurns: 0,
    shortcutPenalty: false,
    soulDoorDelta: 0,
  };

  function chokmahState(
    pendingMods: Partial<GameState['pendingModifiers']> = {},
    encounterMods: Partial<NonNullable<GameState['encounter']>> = {},
    overrides: Partial<PlayerState> = {},
  ): GameState {
    return makeState(
      {
        position: 'chokmah',
        stats: statSheet({ insight: 10 }),
        zodiacSign: 'aries',
        ...overrides,
      },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS, ...pendingMods },
        encounter: { sefirah: 'chokmah', seed: 1, retryCount: 0, ...encounterMods },
      },
    );
  }

  it('exposes CHOKMAH_FLASH_BONUS as a locked design constant', () => {
    expect(CHOKMAH_FLASH_BONUS).toBe(2);
  });

  it.each([
    [0, -3],
    [1, 0],
    [2, 5],
    [3, 9],
    [4, 9],
    [10, 9],
  ])('chokmahTilt(%i) === %i (table + clamp)', (n, expected) => {
    expect(chokmahTilt(n)).toBe(expected);
  });

  it('0 modifiers staged: DC 16 → 13 (unhesitated flash)', () => {
    const state = chokmahState();
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(13);
  });

  it('1 modifier staged: DC 16 standard (no tilt)', () => {
    const state = chokmahState({ cardBurns: [5] });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(16);
  });

  it('2 modifiers staged: DC 16 → 21 (overthinking)', () => {
    const state = chokmahState({ cardBurns: [5, 7] });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(21);
  });

  it('3+ modifiers staged: DC 16 → 25 (scheming; clamped at +9)', () => {
    const state = chokmahState({ cardBurns: [5, 7, 11] });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 3 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(25);
  });

  it('4 modifiers staged: DC 16 → 25 (cap holds at +9)', () => {
    const state = chokmahState({ cardBurns: [5, 7, 11, 13] });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 4 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(25);
  });

  it('modifier count sums across all three pendingModifiers arrays', () => {
    // Design § 3.8: "Modifier counted: any item across all three
    // PendingModifiers arrays (card-burns, spark-burns, assist-
    // requests)." 1 cardBurn + 1 sparkBurn + 1 assistRequest = 3 →
    // DC + 9 = 25.
    const state = chokmahState({
      cardBurns: [5],
      sparkBurns: [{ sefirah: 'hod', sourcePlayerId: 'p1' }],
      assistRequests: ['p2'],
    });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 1, sparkBurns: 1, assistStats: [10] },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(25);
  });

  it('chokmahPriorAttempts shifts the tilt upward (carryover from prior retries)', () => {
    // Prior attempts = 2; this attempt stages 0 modifiers. Effective
    // n = 0 + 2 = 2 → tilt = +5. DC = 16 + 5 = 21.
    const state = chokmahState({}, { chokmahPriorAttempts: 2 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(21);
  });

  it('chokmahPriorAttempts + current modifiers compose (clamps at n=3+)', () => {
    // priorAttempts=2 + this attempt's 2 cardBurns = n=4 → +9 → DC 25.
    const state = chokmahState({ cardBurns: [5, 7] }, { chokmahPriorAttempts: 2 });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 2 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.effectiveDC).toBe(25);
  });

  // ── Fire-sign +2 flatBonus on 0-modifier flash

  it.each(['aries', 'leo', 'sagittarius'] as const)(
    'fire sign (%s) on 0-modifier flash: +2 flatBonus',
    (zodiacSign) => {
      const state = chokmahState({}, {}, { zodiacSign });
      const result = resolveChallenge({
        state,
        playerId: 'p1',
        sefirah: 'chokmah',
        modifiers: blankMods,
        rng: { d20: () => 5, int: () => 5 },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(2);
    },
  );

  it.each([
    'taurus',
    'gemini',
    'cancer',
    'virgo',
    'libra',
    'scorpio',
    'capricorn',
    'aquarius',
    'pisces',
  ] as const)('non-fire sign (%s) on 0-modifier flash: no flatBonus', (zodiacSign) => {
    const state = chokmahState({}, {}, { zodiacSign });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('fire sign with 1 modifier staged: NO flatBonus (flash requires 0 modifiers)', () => {
    // The fire-sign bonus is conditional on the current attempt
    // staging 0 modifiers, NOT on the total n. A fire sign who burns
    // even one card doesn't get the +2.
    const state = chokmahState({ cardBurns: [5] }, {}, { zodiacSign: 'aries' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, cardBurns: 1 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });

  it('fire sign on 0-modifier flash even with priorAttempts > 0: +2 still fires', () => {
    // Design framing: the bonus rewards "this attempt's instinct,"
    // not "total instinct across the encounter." A fire sign who
    // failed once and then strikes-with-no-modifiers gets the +2 on
    // the retry too, but the DC tilt still escalates per priorAttempts.
    const state = chokmahState({}, { chokmahPriorAttempts: 1 }, { zodiacSign: 'leo' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // DC = 16 + chokmahTilt(0 + 1) = 16 + 0 = 16.
    expect(result.value.outcome.effectiveDC).toBe(16);
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(2);
  });

  it('caller-supplied flatBonus stacks with the Chokmah fire-flash bonus', () => {
    const state = chokmahState({}, {}, { zodiacSign: 'aries' });
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'chokmah',
      modifiers: { ...blankMods, flatBonus: 3 },
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 3 caller + 2 Chokmah flash = 5.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBe(5);
  });

  it('non-Chokmah Sefirah: stale chokmahPriorAttempts is ignored (Hod control)', () => {
    // Regression guard: the tilt is gated on `sefirah === 'chokmah'`.
    // A Hod resolve with a stale chokmahPriorAttempts envelope field
    // must NOT apply any DC tilt.
    const state = makeState(
      { position: 'hod', stats: statSheet({ intellect: 10 }), zodiacSign: 'aries' },
      {
        pendingModifiers: { ...EMPTY_PENDING_MODIFIERS },
        encounter: { sefirah: 'hod', seed: 1, retryCount: 0, chokmahPriorAttempts: 5 },
      },
    );
    const result = resolveChallenge({
      state,
      playerId: 'p1',
      sefirah: 'hod',
      modifiers: blankMods,
      rng: { d20: () => 5, int: () => 5 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Hod base DC = 12, no Chokmah tilt.
    expect(result.value.outcome.effectiveDC).toBe(12);
    // Fire sign at Hod with 0 mods does NOT get the Chokmah flash bonus.
    expect(result.value.outcome.modifierBreakdown.flatBonus).toBeUndefined();
  });
});
