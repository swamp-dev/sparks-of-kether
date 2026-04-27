import type { GameState } from './types';

/**
 * Advance `activePlayerId` to the next seat in `state.players` order.
 *
 * Pure: returns a new state; the input is not mutated. Wraps from the
 * last seat back to the first. Throws if `state.activePlayerId` is not
 * present in `state.players` — that's a corruption signal worth
 * surfacing loudly rather than silently resetting to seat 0.
 *
 * Used by the events route's `'end-turn'` ClientAction. Single-player
 * code (`useTurn`) calls this through `applyClientAction` too so
 * single-player and multiplayer share the same advancement rule.
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
  const nextIdx = (currentIdx + 1) % state.players.length;
  const nextPlayer = state.players[nextIdx];
  if (!nextPlayer) {
    // Unreachable: modulo by length guarantees a valid index. The
    // explicit guard is here to satisfy noUncheckedIndexedAccess
    // without a non-null assertion.
    throw new Error('endTurn: next player slot is empty (length 0?)');
  }
  return { ...state, activePlayerId: nextPlayer.id };
}
