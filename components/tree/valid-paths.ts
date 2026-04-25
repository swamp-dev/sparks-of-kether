import { adjacentPaths } from '@/engine/movement';
import type { GameState } from '@/engine/types';

/**
 * Path numbers the given player can legally travel right now. Thin
 * wrapper over `engine/movement.adjacentPaths` so the UI doesn't reach
 * directly into the engine for routine derivations — it also gives us
 * a single place to layer UI-specific filters (e.g. a future Shell
 * that blocks particular movement) without touching the engine.
 *
 * Returns an empty list if the player isn't found rather than throwing
 * — UI render paths shouldn't blow up on a stale active-player id
 * during transitions; the engine's `adjacentPaths` is stricter.
 */
export function validPathsForPlayer(
  state: GameState,
  playerId: string,
): readonly number[] {
  // The pre-check guards against `adjacentPaths`'s throw on unknown
  // ids — UI render shouldn't crash on a stale active-player id during
  // a state transition. If the engine ever changes its contract (e.g.
  // returns a Result), this guard needs updating in lock-step.
  const exists = state.players.some((p) => p.id === playerId);
  if (!exists) return [];
  return adjacentPaths(state, playerId);
}
