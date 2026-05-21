import { describe, expect, it } from 'vitest';
import { drawNCards, MEDITATE_DRAW } from '../draws';
import { HAND_CAP } from '../setup';
import { seededRng } from '../rng';
import { makePlayer, makeState } from '@/test/fixtures';

/**
 * #291 — Meditate must always succeed (no softlock at HAND_CAP). The
 * shared draw helper grows an over-cap hatch (`overCap: true`) so the
 * meditate path can pull `MEDITATE_DRAW` cards even from a full hand;
 * the over-cap excess is reconciled at end-of-turn via
 * `state.pendingDiscard`.
 *
 * Pre-#291: `drawNCards` silently early-exited when `pHand.length >=
 * hardCap`, which is what produced the at-cap-meditate softlock the
 * playtester hit (no usable paths, no draw, no end-of-turn).
 */

describe('drawNCards — over-cap mode for Meditate (#291)', () => {
  it('lands all MEDITATE_DRAW (2) cards in hand when starting at HAND_CAP', () => {
    const player = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5] });
    const state = makeState({}, { players: [player], deck: [10, 11, 12], discardPile: [] });
    expect(player.hand.length).toBe(HAND_CAP);
    const after = drawNCards(state, 'p1', MEDITATE_DRAW, HAND_CAP, seededRng(1), {
      overCap: true,
    });
    expect(after.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 10, 11]);
    expect(after.players[0]?.hand.length).toBe(HAND_CAP + MEDITATE_DRAW);
    expect(after.deck).toEqual([12]);
  });

  it('hardCap still applies when overCap is false (default behaviour preserved)', () => {
    // Pin: existing callers (end-of-turn `drawToHand`) MUST continue
    // to honour the hardCap. The over-cap flag is opt-in.
    const player = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5] });
    const state = makeState({}, { players: [player], deck: [10, 11], discardPile: [] });
    const after = drawNCards(state, 'p1', 2, HAND_CAP, seededRng(1));
    expect(after.players[0]?.hand).toEqual([1, 2, 3, 4, 5]);
    expect(after.deck).toEqual([10, 11]);
  });

  it('overCap mode still recycles discard when deck empties mid-fill', () => {
    const player = makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5] });
    const state = makeState({}, { players: [player], deck: [10], discardPile: [20, 21, 22] });
    const after = drawNCards(state, 'p1', 2, HAND_CAP, seededRng(7), {
      overCap: true,
    });
    // Hand grew by exactly 2 (10 from deck + one from recycled discard).
    expect(after.players[0]?.hand.length).toBe(HAND_CAP + 2);
    expect(after.discardPile).toHaveLength(0);
  });
});
