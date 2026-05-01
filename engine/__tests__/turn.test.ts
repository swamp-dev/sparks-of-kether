import { describe, expect, it } from 'vitest';
import { discard, endTurn } from '../turn';
import { makePlayer, makeState } from '@/test/fixtures';

describe('endTurn', () => {
  it('advances the active player to the next seat', () => {
    const players = [
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2' }),
      makePlayer({ id: 'p3' }),
    ];
    const state = makeState({}, { players, activePlayerId: 'p1' });
    expect(endTurn(state).activePlayerId).toBe('p2');
  });

  it('wraps from the last seat back to the first', () => {
    const players = [
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2' }),
      makePlayer({ id: 'p3' }),
    ];
    const state = makeState({}, { players, activePlayerId: 'p3' });
    expect(endTurn(state).activePlayerId).toBe('p1');
  });

  it('is a no-op for a single-player state (wraps back to self)', () => {
    const state = makeState({ id: 'solo' });
    expect(endTurn(state).activePlayerId).toBe('solo');
  });

  it('preserves all other state fields untouched', () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        illumination: 4,
        separation: 2,
        deck: [1, 2, 3],
      },
    );
    const next = endTurn(state);
    expect(next.illumination).toBe(4);
    expect(next.separation).toBe(2);
    expect(next.deck).toEqual([1, 2, 3]);
    expect(next.players).toBe(state.players);
  });

  it('throws if the active id is not in the player list (corruption guard)', () => {
    const players = [makePlayer({ id: 'p1' })];
    const state = makeState({}, { players, activePlayerId: 'unknown' });
    expect(() => endTurn(state)).toThrow(/active player/i);
  });

  // #291 — the active player ends a Meditate turn over HAND_CAP. The
  // engine must refuse to advance the seat until the over-cap excess
  // is reconciled via the discard event flow. Without this guard the
  // next player would inherit a state with a stale pendingDiscard and
  // the engine's invariant ("hand size at most HAND_CAP at turn start")
  // would silently break.
  it('refuses to advance while the active player has pendingDiscard.count > 0', () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 2, requiredBy: 'end-of-turn' },
      },
    );
    const next = endTurn(state);
    // Refusal contract: the engine returns the state with the active
    // seat unchanged (no advance). pendingDiscard remains so the UI
    // can keep showing the prompt.
    expect(next.activePlayerId).toBe('p1');
    expect(next.pendingDiscard?.count).toBe(2);
  });

  // #291: room-actions and turn-machine both detect the no-advance
  // signal via reference equality (`turned === state`). Pin that
  // contract here so a future refactor that returns a structurally
  // equal but not reference equal state — e.g. adding a
  // `lastActivityAt` timestamp on every endTurn call — fails this
  // test loudly instead of silently bypassing the discard gate.
  it('returns the input state by reference when refusing to advance', () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 1, requiredBy: 'end-of-turn' },
      },
    );
    const next = endTurn(state);
    expect(next).toBe(state);
  });

  // #335 — Final Threshold pre-ritual hold (`design/final-threshold.md`
  // § 2.1). A player who has arrived at Kether while the rest of the
  // team has not is "Kether-held": their seat is skipped in
  // rotation. The hold is a derived predicate (`p.position === 'kether'
  // && state.phase !== 'kether'`); no new state field is added.
  it('skips a Kether-held player when advancing the seat (pre-ritual hold)', () => {
    const players = [
      makePlayer({ id: 'p1', position: 'malkuth' }),
      makePlayer({ id: 'p2', position: 'kether' }), // held
      makePlayer({ id: 'p3', position: 'tiferet' }),
    ];
    const state = makeState(
      {},
      { players, activePlayerId: 'p1', phase: 'move' },
    );
    // p1 → skip p2 (held) → p3.
    expect(endTurn(state).activePlayerId).toBe('p3');
  });

  it('skips multiple consecutive Kether-held seats and wraps if needed', () => {
    const players = [
      makePlayer({ id: 'p1', position: 'tiferet' }),
      makePlayer({ id: 'p2', position: 'kether' }), // held
      makePlayer({ id: 'p3', position: 'kether' }), // held
      makePlayer({ id: 'p4', position: 'malkuth' }),
    ];
    const state = makeState(
      {},
      { players, activePlayerId: 'p1', phase: 'move' },
    );
    // p1 → skip p2, p3 → p4.
    expect(endTurn(state).activePlayerId).toBe('p4');
    // From p4 → wrap → p1 (p2/p3 still held).
    const fromP4 = makeState(
      {},
      { players, activePlayerId: 'p4', phase: 'move' },
    );
    expect(endTurn(fromP4).activePlayerId).toBe('p1');
  });

  it('does NOT skip a Kether-positioned player once the ritual is active (phase === kether)', () => {
    // Once everyone is at Kether and `phase === 'kether'`, players are
    // no longer "held" — they are full participants in the ritual and
    // ordinary seat-rotation no longer applies (the witness pointer
    // advances ritual turns instead). But endTurn for `'end'` arrival
    // still touches the seat; the held-skip predicate must NOT fire.
    const players = [
      makePlayer({ id: 'p1', position: 'kether' }),
      makePlayer({ id: 'p2', position: 'kether' }),
    ];
    const state = makeState(
      {},
      { players, activePlayerId: 'p1', phase: 'kether' },
    );
    expect(endTurn(state).activePlayerId).toBe('p2');
  });

  it('clears pendingDiscard and advances seat when count reaches 0', () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 0, requiredBy: 'end-of-turn' },
      },
    );
    const next = endTurn(state);
    expect(next.activePlayerId).toBe('p2');
    // Cleared so the next turn doesn't drag the resolved record forward.
    expect(next.pendingDiscard).toBeUndefined();
  });
});

describe('discard', () => {
  // #291 — once the active player has clicked Meditate over HAND_CAP,
  // they must shed the over-cap excess before the engine will let
  // their turn end. Each discard call removes one named card from
  // hand, decrements pendingDiscard.count, and pushes the card to the
  // discard pile (so it's eligible for Yesod-Spark recovery and for
  // the ordinary discard recycle).
  it('removes the named card from hand, decrements count, pushes to discard pile', () => {
    const players = [
      makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5, 6, 10, 11] }),
    ];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 2, requiredBy: 'end-of-turn' },
        discardPile: [],
      },
    );
    const after = discard(state, 'p1', 11);
    expect(after.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 6, 10]);
    expect(after.discardPile).toEqual([11]);
    expect(after.pendingDiscard?.count).toBe(1);
  });

  it('clears pendingDiscard when the final required card is discarded', () => {
    // count: 1 → discard one card → count: 0 → cleared so the engine
    // doesn't keep blocking endTurn after the player completed the
    // requirement.
    const players = [makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5, 6, 10] })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 1, requiredBy: 'end-of-turn' },
        discardPile: [],
      },
    );
    const after = discard(state, 'p1', 10);
    expect(after.pendingDiscard).toBeUndefined();
    expect(after.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('is a no-op when the named card is not in hand (defense-in-depth)', () => {
    const players = [makePlayer({ id: 'p1', hand: [1, 2, 3] })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 1, requiredBy: 'end-of-turn' },
      },
    );
    const after = discard(state, 'p1', 99);
    expect(after).toBe(state);
  });

  // #291 security gate: the dispatcher (`lib/room-actions.ts`) checks
  // pendingDiscard before dispatching, but if a `discard` event ever
  // reaches the engine reducer without an obligation pending (a stale
  // client racing the end-turn click, a future code path bypassing
  // the dispatcher, or a malicious client crafting the action
  // directly), the reducer must refuse rather than shred the player's
  // hand. Without this gate an authenticated active player could fire
  // discard events at will to destroy their own cards (gaming the
  // discard recycle, etc.).
  it('refuses to discard when no pendingDiscard obligation exists', () => {
    const players = [makePlayer({ id: 'p1', hand: [1, 2, 3, 4, 5, 6] })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        // Note: NO pendingDiscard set.
        discardPile: [],
      },
    );
    const after = discard(state, 'p1', 3);
    expect(after).toBe(state);
    expect(after.players[0]?.hand).toEqual([1, 2, 3, 4, 5, 6]);
    expect(after.discardPile).toEqual([]);
  });

  it('refuses to discard when pendingDiscard.count is already 0', () => {
    const players = [makePlayer({ id: 'p1', hand: [1, 2, 3] })];
    const state = makeState(
      {},
      {
        players,
        activePlayerId: 'p1',
        pendingDiscard: { count: 0, requiredBy: 'end-of-turn' },
        discardPile: [],
      },
    );
    const after = discard(state, 'p1', 1);
    expect(after).toBe(state);
  });
});
