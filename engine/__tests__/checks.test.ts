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
  type CheckModifiers,
} from '../checks';
import { makePlayer, makeState, statSheet } from '@/test/fixtures';
import type { GameState } from '../types';
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

