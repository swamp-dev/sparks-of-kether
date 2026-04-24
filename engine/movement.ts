import { paths, tryPathByNumber } from '@/data';
import type { Path, SefirahKey } from '@/data';
import type { GameState, MoveRejection, MoveResult, PlayerState, Result } from './types';

// ──────────────── Pure derivations ────────────────

/**
 * Return every Sefirah directly connected to the given one by any path.
 * Order is not guaranteed; callers that need determinism should sort.
 */
export function adjacentSefirot(key: SefirahKey): readonly SefirahKey[] {
  const neighbours = new Set<SefirahKey>();
  for (const p of paths) {
    if (p.from === key) neighbours.add(p.to);
    else if (p.to === key) neighbours.add(p.from);
  }
  return [...neighbours];
}

/** Does the given path touch this Sefirah at either endpoint? */
function pathTouches(path: Path, key: SefirahKey): boolean {
  return path.from === key || path.to === key;
}

/** Find a player by id. `undefined` when absent. */
function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((p) => p.id === playerId);
}

// ──────────────── canTravelPath ────────────────

/**
 * Context a successful move validation returns so the reducer doesn't
 * re-query. `applyMove` unpacks both fields instead of calling
 * `findPlayer` / `tryPathByNumber` a second time.
 */
export interface MoveValidationContext {
  readonly path: Path;
  readonly player: PlayerState;
}

/**
 * Evaluate whether a player can travel a given path on their next move.
 * Does not mutate state or roll dice. Returns a discriminated `Result`
 * — on failure the `reason` tells the caller exactly why so the UI can
 * render a precise message.
 *
 * Rules enforced:
 *   1. The player exists.
 *   2. The path exists (numbered 11–32).
 *   3. The arcanum for that path is in the player's hand.
 *   4. The path touches the player's current Sefirah (bidirectional).
 */
export function canTravelPath(
  state: GameState,
  playerId: string,
  pathNumber: number,
): Result<MoveValidationContext, MoveRejection> {
  const player = findPlayer(state, playerId);
  if (!player) {
    return { ok: false, reason: { kind: 'unknown-player', playerId } };
  }

  const path = tryPathByNumber(pathNumber);
  if (!path) {
    return { ok: false, reason: { kind: 'unknown-path', pathNumber } };
  }

  if (!player.hand.includes(path.arcanumNumber)) {
    return {
      ok: false,
      reason: { kind: 'card-not-in-hand', arcanumNumber: path.arcanumNumber, pathNumber },
    };
  }

  if (!pathTouches(path, player.position)) {
    return {
      ok: false,
      reason: { kind: 'path-does-not-connect', from: player.position, pathNumber },
    };
  }

  return { ok: true, value: { path, player } };
}

// ──────────────── applyMove ────────────────

/**
 * Execute a move. Returns a new `GameState` on success; returns the
 * same rejection as `canTravelPath` on failure. Input state is never
 * touched on either branch.
 *
 * Success effects:
 *   - Player's position moves to the opposite endpoint of the path.
 *   - The played arcanum moves from the player's hand to the shared
 *     discard pile (one copy only, even if duplicates exist).
 *   - Other players are untouched.
 */
export function applyMove(state: GameState, playerId: string, pathNumber: number): MoveResult {
  const validation = canTravelPath(state, playerId, pathNumber);
  if (!validation.ok) return validation;
  const { path, player } = validation.value;

  const destination: SefirahKey = path.from === player.position ? path.to : path.from;
  const handIndex = player.hand.indexOf(path.arcanumNumber);
  const nextHand = [...player.hand.slice(0, handIndex), ...player.hand.slice(handIndex + 1)];

  const nextPlayer: PlayerState = {
    ...player,
    position: destination,
    hand: nextHand,
  };

  const nextState: GameState = {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? nextPlayer : p)),
    discardPile: [...state.discardPile, path.arcanumNumber],
  };

  return { ok: true, value: nextState };
}

// ──────────────── adjacentPaths ────────────────

/**
 * Every path number the given player can legally travel right now.
 * Intersection of:
 *   - Paths touching the player's current Sefirah.
 *   - Paths whose arcanum the player holds.
 *
 * Unknown player id throws — this is a programmer error (bad id), not
 * a runtime-data issue. Contrast with `canTravelPath`, which returns a
 * `Result` because the UI surfaces those failures.
 */
export function adjacentPaths(state: GameState, playerId: string): readonly number[] {
  const player = findPlayer(state, playerId);
  if (!player) {
    throw new Error(`adjacentPaths: unknown player id ${playerId}`);
  }

  const held = new Set(player.hand);
  const playable: number[] = [];
  for (const p of paths) {
    if (!pathTouches(p, player.position)) continue;
    if (!held.has(p.arcanumNumber)) continue;
    playable.push(p.number);
  }
  return playable;
}
