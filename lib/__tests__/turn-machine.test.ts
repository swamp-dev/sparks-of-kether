import { describe, expect, it } from 'vitest';
import { seededRng } from '@/engine/rng';
import { turnReducer, type TurnSnapshot } from '../turn-machine';
import { makeFullGame, makePlayer, makeState } from '@/test/fixtures';

/**
 * Pure-reducer tests. Cover the full event × phase matrix so the
 * hook tests can stay focused on React glue. Properties from #93
 * could plug into this surface without `renderHook`.
 */

function snapshotAt(phase: TurnSnapshot['phase']): TurnSnapshot {
  return { state: makeFullGame({ playerCount: 2, seed: 1 }), phase };
}

const RNG = seededRng(1);

describe('turnReducer — phase guards', () => {
  it('rejects move when phase is not move', () => {
    const result = turnReducer(snapshotAt('challenge'), { kind: 'move', pathNumber: 32 }, RNG);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('wrong-phase');
    if (result.reason.kind !== 'wrong-phase') return;
    expect(result.reason.expected).toBe('move');
    expect(result.reason.actual).toBe('challenge');
  });

  it('rejects meditate when phase is not move', () => {
    const result = turnReducer(snapshotAt('draw'), { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(false);
  });

  it('rejects submit-challenge when phase is not challenge', () => {
    const result = turnReducer(
      snapshotAt('move'),
      {
        kind: 'submit-challenge',
        sefirah: 'gevurah',
        modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
      },
      RNG,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects accept-setback when phase is not challenge', () => {
    const result = turnReducer(
      snapshotAt('draw'),
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects draw when phase is not draw', () => {
    const result = turnReducer(snapshotAt('move'), { kind: 'draw' }, RNG);
    expect(result.ok).toBe(false);
  });

  it('rejects end-turn when phase is not end', () => {
    const result = turnReducer(snapshotAt('move'), { kind: 'end-turn' }, RNG);
    expect(result.ok).toBe(false);
  });
});

describe('turnReducer — phase transitions', () => {
  it('meditate from move → end (hand grows by up to MEDITATE_DRAW)', () => {
    // #128 fix: meditate is a complete turn-action that draws 2 cards
    // (capped at HAND_CAP) and skips the 'draw' phase. The previous
    // contract — `phase: 'draw'`, state unchanged — was broken: the
    // 'draw' handler only refilled toward STARTING_HAND_SIZE so a
    // meditating player at 4 cards saw nothing happen.
    const before = snapshotAt('move');
    const result = turnReducer(before, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.phase).toBe('end');
    // State changed (cards drew); not identity-preserved anymore.
    expect(result.value.next.state).not.toBe(before.state);
  });

  it('move into uncleared check Sefirah → challenge phase', () => {
    // Player 0 at malkuth holds card 32 ("The World", Malkuth ↔ Yesod).
    // Yesod has a check; not yet cleared in a fresh game.
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [21] });
    const state = makeState({}, { players: [player] });
    const before: TurnSnapshot = { state, phase: 'move' };
    const result = turnReducer(before, { kind: 'move', pathNumber: 32 }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.phase).toBe('challenge');
    expect(result.value.next.state.players[0]?.position).toBe('yesod');
  });

  it('move into already-cleared Sefirah → draw phase', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'malkuth',
      hand: [21],
      clearedSefirot: new Set(['yesod']),
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state, phase: 'move' },
      { kind: 'move', pathNumber: 32 },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.phase).toBe('draw');
  });

  it('accept-setback from challenge → draw phase + +1 separation', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState({}, { players: [player], separation: 3 });
    const result = turnReducer(
      { state, phase: 'challenge' },
      { kind: 'accept-setback', sefirah: 'gevurah' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.phase).toBe('draw');
    expect(result.value.next.state.separation).toBe(4);
  });

  it('end-turn from end → move phase + active player rotates', () => {
    const initial = makeFullGame({ playerCount: 2, seed: 7 });
    const result = turnReducer(
      { state: initial, phase: 'end' },
      { kind: 'end-turn' },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.phase).toBe('move');
    expect(result.value.next.state.activePlayerId).not.toBe(
      initial.activePlayerId,
    );
  });
});

describe('turnReducer — submit-challenge meta payload', () => {
  it('returns the engine ChallengeSuccess via meta.challenge on pass', () => {
    const player = makePlayer({
      id: 'p1',
      position: 'gevurah',
      hand: [],
      stats: {
        unity: 10, insight: 10, understanding: 10, lovingkindness: 10,
        strength: 12, harmony: 10, passion: 10, intellect: 10, intuition: 10, body: 10,
      },
    });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state, phase: 'challenge' },
      {
        kind: 'submit-challenge',
        sefirah: 'gevurah',
        modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
        outcome: {
          rolled: 18,
          statContribution: 12,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 30,
          effectiveDC: 15,
          pass: true,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.phase).toBe('draw');
    expect(result.value.meta?.challenge.outcome.pass).toBe(true);
    expect(result.value.next.state.players[0]?.clearedSefirot.has('gevurah')).toBe(true);
  });

  it('failed submit-challenge stays in challenge phase + meta carries the failed outcome', () => {
    const player = makePlayer({ id: 'p1', position: 'gevurah', hand: [] });
    const state = makeState({}, { players: [player] });
    const result = turnReducer(
      { state, phase: 'challenge' },
      {
        kind: 'submit-challenge',
        sefirah: 'gevurah',
        modifiers: { assistStats: [], cardBurns: 0, sparkBurns: 0, shortcutPenalty: false },
        outcome: {
          rolled: 1,
          statContribution: 10,
          modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
          total: 11,
          effectiveDC: 15,
          pass: false,
        },
      },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Stays in challenge so the caller can retry-with-burn or accept-setback.
    expect(result.value.next.phase).toBe('challenge');
    expect(result.value.meta?.challenge.outcome.pass).toBe(false);
  });
});

describe('turnReducer — replace-state event', () => {
  it('preserves phase + replaces state wholesale', () => {
    const before = snapshotAt('challenge');
    const replacement = makeFullGame({ playerCount: 3, seed: 99 });
    const result = turnReducer(
      before,
      { kind: 'replace-state', state: replacement },
      RNG,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.state).toBe(replacement);
    expect(result.value.next.phase).toBe('challenge');
  });

  it('subsequent events use the replaced state, not the original', () => {
    // Replace-state then end-turn. The end-turn must rotate
    // activePlayerId in the REPLACED state's player list, not the
    // original. Catches a regression that would re-snapshot from
    // the wrong state value.
    const original = makeFullGame({ playerCount: 2, seed: 1 });
    const replacement = makeFullGame({ playerCount: 4, seed: 99 }); // 4 players
    const replaced = turnReducer(
      { state: original, phase: 'end' },
      { kind: 'replace-state', state: replacement },
      RNG,
    );
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;

    const advanced = turnReducer(replaced.value.next, { kind: 'end-turn' }, RNG);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    // The new active id must be a player in REPLACEMENT, not original.
    const replacementIds = new Set(replacement.players.map((p) => p.id));
    expect(replacementIds.has(advanced.value.next.state.activePlayerId)).toBe(true);
  });
});

describe('turnReducer — no-active-player guard', () => {
  it.each([
    { kind: 'meditate' as const },
    { kind: 'move' as const, pathNumber: 32 },
    { kind: 'draw' as const },
    { kind: 'end-turn' as const },
  ])('rejects $kind when state.activePlayerId is not in state.players', (event) => {
    const corruptState = makeState({}, {
      players: [makePlayer({ id: 'p1' })],
      activePlayerId: 'ghost',
    });
    // Pick a phase that would otherwise allow each event so we know
    // the rejection is due to no-active-player, not wrong-phase.
    const phase: TurnSnapshot['phase'] =
      event.kind === 'move' || event.kind === 'meditate'
        ? 'move'
        : event.kind === 'draw'
          ? 'draw'
          : 'end';
    const result = turnReducer({ state: corruptState, phase }, event, RNG);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.kind).toBe('no-active-player');
  });
});

describe('turnReducer — meditate draws 2 cards (capped at HAND_CAP) and ends the turn', () => {
  // #128: design/mechanics.md § Drawing — "Meditate (the alternative
  // to a move) draws 2 cards, but stops at 6." Pre-fix the reducer
  // advanced to 'draw' phase without changing state; players who
  // meditated then clicked Draw saw nothing because drawToHand only
  // refills toward STARTING_HAND_SIZE (4) which they already had.
  it('adds 2 cards from the deck and skips the draw phase', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [1, 2, 3, 4] });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13, 14],
      discardPile: [],
    });
    const result = turnReducer({ state, phase: 'move' }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    expect(after?.hand).toEqual([1, 2, 3, 4, 11, 12]);
    // Phase advances directly to 'end' — no separate Draw click.
    expect(result.value.next.phase).toBe('end');
  });

  it('respects HAND_CAP (6) — never draws past it', () => {
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: [1, 2, 3, 4, 5] });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13],
      discardPile: [],
    });
    const result = turnReducer({ state, phase: 'move' }, { kind: 'meditate' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.next.state.players.find((p) => p.id === 'p1');
    // Hand was 5, cap is 6: meditate draws exactly 1 (not 2).
    expect(after?.hand).toEqual([1, 2, 3, 4, 5, 11]);
  });
});

describe('turnReducer — draw event refills the active player\'s hand', () => {
  // #128: playtest report — players clicked Draw and the hand did
  // not visibly update. The reducer must (a) actually refill the
  // hand toward STARTING_HAND_SIZE when the draw phase is hit and
  // (b) return a NEW player object so React re-renders the Hand
  // component (referential-equality contract).
  it('fills hand from below STARTING_HAND_SIZE up to STARTING_HAND_SIZE', () => {
    const partialHand = [1, 2, 3]; // 3 cards, < STARTING_HAND_SIZE (4)
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: partialHand });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11, 12, 13, 14],
      discardPile: [],
    });
    const result = turnReducer({ state, phase: 'draw' }, { kind: 'draw' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value.next.state;
    const refilled = next.players.find((p) => p.id === 'p1');
    expect(refilled?.hand).toHaveLength(4);
    expect(refilled?.hand[3]).toBe(11); // top of deck appended
  });

  it('returns a fresh player object reference even when no card was drawn', () => {
    // Hand is already at cap; draw is a no-op for cards. But the UI
    // contract still needs a new player object so React notices the
    // phase transition. Otherwise the Hand component never re-renders
    // and the player thinks "I drew but nothing happened" (when in
    // fact the engine correctly did nothing).
    const fullHand = [1, 2, 3, 4];
    const player = makePlayer({ id: 'p1', position: 'malkuth', hand: fullHand });
    const state = makeState({}, {
      players: [player],
      activePlayerId: 'p1',
      deck: [11],
      discardPile: [],
    });
    const result = turnReducer({ state, phase: 'draw' }, { kind: 'draw' }, RNG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.value.next.state;
    const after = next.players.find((p) => p.id === 'p1');
    expect(after?.hand).toHaveLength(4);
    // Pin the player-object identity contract: even when no card was
    // drawn, the reducer must return a fresh player reference so a
    // future `React.memo(Hand)` (none today) would still re-render.
    expect(after).not.toBe(player);
    // Phase must advance off 'draw' regardless — that's the signal
    // that "the click was processed."
    expect(result.value.next.phase).toBe('end');
  });
});
