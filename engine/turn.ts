import { isKetherHeld } from './kether';
import type { GameState } from './types';

/**
 * Advance `activePlayerId` to the next seat in `state.players` order.
 *
 * Pure: returns a new state; the input is not mutated. Wraps from the
 * last seat back to the first. Throws if `state.activePlayerId` is not
 * present in `state.players` — that's a corruption signal worth
 * surfacing loudly rather than silently resetting to seat 0.
 *
 * #291: refuses to advance while `state.pendingDiscard.count > 0`.
 * The Meditate-at-cap path (`lib/turn-machine.ts` and
 * `lib/room-actions.ts`) draws over `HAND_CAP` and sets
 * `pendingDiscard.count` equal to the over-cap excess; the active
 * player must shed those cards via the `discard` event before the
 * engine will rotate the seat. Without this guard the next player
 * would inherit a state with a stale `pendingDiscard` plus the
 * over-cap hand, breaking the engine's "hand size at most HAND_CAP
 * at turn start" invariant. Returning the input state on the refusal
 * branch lets the UI keep the discard prompt visible without any
 * extra book-keeping.
 *
 * On the success branch, `pendingDiscard` is cleared (it might have
 * been resolved to `count: 0` by the discard reducer just before the
 * end-turn click) so the next turn starts clean. `lastAction` (#292)
 * is also cleared so the next seat starts with no end-of-turn intent
 * carried over from the prior player. `meditatedThisTurn` (#503) is
 * also cleared so the next player starts their turn with their full
 * Meditate option available.
 *
 * Used by the events route's `'end-turn'` ClientAction. Single-player
 * code (`useTurn`) calls this through `applyClientAction` too so
 * single-player and multiplayer share the same advancement rule.
 *
 * Note: this reducer rotates the seat but does NOT perform the
 * start-of-turn refill (#502). The refill needs `rng` (see
 * `engine/draws.ts:drawNCards`), which is supplied by the caller's
 * dispatch context — `lib/turn-machine.ts` and `lib/room-actions.ts`
 * call this reducer and then layer the refill on top via
 * `drawToHand` / `drawNCards`. Keeping `endTurn` rng-free preserves
 * its purity for unit tests that don't care about hand contents.
 */
export function endTurn(state: GameState): GameState {
  const currentIdx = state.players.findIndex(
    (p) => p.id === state.activePlayerId,
  );
  if (currentIdx === -1) {
    throw new Error(
      `endTurn: active player "${state.activePlayerId}" is not in player list`,
    );
  }
  if (state.pendingDiscard !== undefined && state.pendingDiscard.count > 0) {
    return state;
  }
  // #335: skip Kether-held seats per `design/final-threshold.md` § 2.1.
  // A player who has arrived at Kether before the rest of the team
  // is in the pre-ritual hold — their seat is skipped in rotation,
  // their hand and stats are frozen. The held predicate is purely
  // derived (`position === 'kether' && phase !== 'kether'`); once the
  // ritual itself has begun (`phase === 'kether'`), no one is "held"
  // and the rotation is normal.
  //
  // We walk forward looking for the first non-held seat. We bound
  // the search by `players.length` so an all-held configuration —
  // structurally unreachable today (the ritual triggers when the
  // last player arrives, flipping phase to `'kether'` and ending
  // the held state for everyone) — falls back to the next index
  // rather than looping forever.
  let nextIdx = (currentIdx + 1) % state.players.length;
  for (let i = 0; i < state.players.length; i++) {
    const candidate = state.players[nextIdx];
    if (candidate === undefined) break;
    if (!isKetherHeld(state, candidate.id)) break;
    nextIdx = (nextIdx + 1) % state.players.length;
  }
  const nextPlayer = state.players[nextIdx];
  if (!nextPlayer) {
    // Unreachable: modulo by length guarantees a valid index. The
    // explicit guard is here to satisfy noUncheckedIndexedAccess
    // without a non-null assertion.
    throw new Error('endTurn: next player slot is empty (length 0?)');
  }
  return {
    ...state,
    activePlayerId: nextPlayer.id,
    pendingDiscard: undefined,
    lastAction: undefined,
    meditatedThisTurn: false,
  };
}

/**
 * Discard one named card from `playerId`'s hand. Pushes the card to
 * the discard pile (so it's eligible for Yesod-Spark recovery and the
 * regular discard recycle), decrements `pendingDiscard.count`, and
 * clears `pendingDiscard` entirely when count reaches 0.
 *
 * Silently no-ops if the player or card is unknown — defense-in-depth
 * against a stale UI click after the card was already burned by
 * something else (e.g. a Spark). Returns the input state on no-op so
 * the React-render contract stays intact.
 *
 * **Security gate**: refuses to discard unless `pendingDiscard.count
 * > 0`. Without this gate an authenticated active player could fire
 * `{ kind: 'discard', arcanum: X }` at any time and shred their own
 * hand on demand — `authorize.ts` only gates "caller is the active
 * player," not "an obligation is pending." The room-actions
 * dispatcher mirrors this check (defense in depth), but the engine
 * reducer is the authoritative enforcement point.
 *
 * #291: today only emitted by the UI's DiscardPrompt, which renders
 * when the active player ended a Meditate over-cap and now owes a
 * trim. The reducer is generic enough that a future ticket could fire
 * it for a non-Meditate over-cap path without changing this signature.
 */
export function discard(
  state: GameState,
  playerId: string,
  arcanum: number,
): GameState {
  if (state.pendingDiscard === undefined || state.pendingDiscard.count <= 0) {
    return state;
  }
  const pIndex = state.players.findIndex((p) => p.id === playerId);
  if (pIndex === -1) return state;
  const player = state.players[pIndex]!;
  const cardIdx = player.hand.findIndex((n) => n === arcanum);
  if (cardIdx === -1) return state;
  const nextHand = [
    ...player.hand.slice(0, cardIdx),
    ...player.hand.slice(cardIdx + 1),
  ];
  const nextDiscardPile = [...state.discardPile, arcanum];
  // Decrement pendingDiscard.count; clear when it hits 0 so the
  // subsequent end-turn isn't blocked.
  const remaining = (state.pendingDiscard?.count ?? 0) - 1;
  const nextPendingDiscard =
    state.pendingDiscard !== undefined && remaining > 0
      ? { ...state.pendingDiscard, count: remaining }
      : undefined;
  return {
    ...state,
    players: state.players.map((p, idx) =>
      idx === pIndex ? { ...player, hand: nextHand } : p,
    ),
    discardPile: nextDiscardPile,
    pendingDiscard: nextPendingDiscard,
  };
}
