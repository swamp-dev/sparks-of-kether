import type { SefirahKey } from '@/data';
import { paths } from '@/data';
import { applyEvents } from './counters';
import type { GameEvent } from './events';
import type { GameState, PlayerState, Result } from './types';

/**
 * Illumination must exceed Separation by at least this margin for the
 * team to win at Kether. Per `design/mechanics.md` § Endgame.
 */
export const REQUIRED_ILLUMINATION_MARGIN = 5;

/**
 * Separation at or above this value loses the game outright. Per
 * `design/mechanics.md` § Qliphothic Pressure.
 */
export const SEPARATION_LOSS_THRESHOLD = 15;

/**
 * Outcome of `checkEndgame`. `reason` is set only on `'lost'`. Kept as
 * a flat shape (rather than a discriminated union) so test/UI callers
 * can read `.status` and `.reason` without first narrowing — the loss
 * branches all share the same shape.
 *
 * `illumination-gap` losses are NOT reported here; that branch lives
 * solely in `resolveFinalThreshold`'s success payload, where the team
 * has reached Kether but the threshold ritual fell short.
 */
export interface EndgameStatus {
  readonly status: 'ongoing' | 'won' | 'lost';
  readonly reason?: 'separation-overflow' | 'stranded';
}

/**
 * Decide whether the game has ended. Pure: derived entirely from
 * `state`. Order of checks matters — losses are evaluated before wins,
 * and a separation overflow takes precedence over stranding.
 *
 * Win:  every player at Kether AND illumination ≥ separation + margin.
 *       The team must still resolve the Final Threshold ritual to bank
 *       the win — `resolveFinalThreshold` handles the case where they
 *       arrive short of margin.
 * Loss: separation ≥ 15, OR no cards exist anywhere (stranded — the
 *       deck, every hand, and the discard pile are all empty).
 *
 * The "stranded" check is intentionally simple: if any card exists
 * somewhere, future plays / draws / gifts can in principle change the
 * picture. A stricter "no path-card chain to Kether" check is offered
 * separately as `canReachKether` for callers (e.g. UI hints, AI) that
 * need it.
 */
export function checkEndgame(state: GameState): EndgameStatus {
  if (state.separation >= SEPARATION_LOSS_THRESHOLD) {
    return { status: 'lost', reason: 'separation-overflow' };
  }

  const totalCards =
    state.deck.length +
    state.discardPile.length +
    state.players.reduce((sum, p) => sum + p.hand.length, 0);
  if (totalCards === 0) {
    return { status: 'lost', reason: 'stranded' };
  }

  const allAtKether = state.players.every((p) => p.position === 'kether');
  if (
    allAtKether &&
    state.illumination >= state.separation + REQUIRED_ILLUMINATION_MARGIN
  ) {
    return { status: 'won' };
  }

  return { status: 'ongoing' };
}

/**
 * Reachability over the Tree of Life graph using only edges whose
 * arcanum card is held *somewhere* on the team — hand, deck, or
 * discard. Each card-edge is treated as available (not consumed) for
 * the purposes of this check; we're answering "is Kether in the
 * connected component of `from`?", not "what's a concrete play
 * sequence?". Card consumption is a turn-level concern.
 *
 * Returns true when `from` is already Kether, or BFS through the
 * induced subgraph reaches it.
 */
export function canReachKether(state: GameState, from: SefirahKey): boolean {
  if (from === 'kether') return true;

  const cardPool = new Set<number>();
  for (const player of state.players) {
    for (const card of player.hand) cardPool.add(card);
  }
  for (const card of state.deck) cardPool.add(card);
  for (const card of state.discardPile) cardPool.add(card);

  const adjacency = new Map<SefirahKey, SefirahKey[]>();
  const addEdge = (a: SefirahKey, b: SefirahKey): void => {
    let neighbors = adjacency.get(a);
    if (neighbors === undefined) {
      neighbors = [];
      adjacency.set(a, neighbors);
    }
    neighbors.push(b);
  };
  for (const path of paths) {
    if (!cardPool.has(path.arcanumNumber)) continue;
    addEdge(path.from, path.to);
    addEdge(path.to, path.from);
  }

  const visited = new Set<SefirahKey>([from]);
  // 10 nodes max — array-shift queue is fine; switch to a deque if the
  // graph ever grows.
  const queue: SefirahKey[] = [from];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) break;
    if (node === 'kether') return true;
    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
  return false;
}

// ──────────────── Final Threshold ────────────────

/** A card the player commits to the Final Threshold ritual. */
export interface CardPlay {
  readonly playerId: string;
  readonly arcanumNumber: number;
}

/** A spark the player burns to top up Illumination at the threshold. */
export interface SparkBurn {
  readonly playerId: string;
  readonly sefirah: SefirahKey;
}

export interface FinalThresholdInput {
  readonly state: GameState;
  readonly cardPlays: readonly CardPlay[];
  readonly sparkBurns: readonly SparkBurn[];
}

/**
 * Result of running the threshold ritual. On `'lost'`, `reason` is set
 * to `'illumination-gap'` — the team reached Kether but couldn't close
 * the margin even after burning sparks. Kept flat (parallel to
 * `EndgameStatus`) so callers don't need to narrow before reading.
 */
export interface FinalThresholdSuccess {
  readonly state: GameState;
  readonly status: 'won' | 'lost';
  readonly reason?: 'illumination-gap';
}

/**
 * Reasons resolution can't proceed. These are *programmer-or-UI*
 * level rejections (player isn't at Kether yet, attempted to play a
 * card they don't hold). Insufficient illumination is NOT a rejection
 * — it's a legitimate game outcome (`status: 'lost'`).
 *
 * `game-already-lost` defends against being called on a state where
 * separation has already overflowed: that loss takes precedence over
 * any ritual outcome, and silently ignoring it would let
 * `resolveFinalThreshold` declare a win on a state `checkEndgame`
 * already considers lost.
 */
export type FinalThresholdRejection =
  | 'not-all-at-kether'
  | 'game-already-lost'
  | 'card-not-held'
  | 'spark-not-held';

export type FinalThresholdResult = Result<
  FinalThresholdSuccess,
  FinalThresholdRejection
>;

/**
 * Resolve the Final Threshold: play any remaining cards, burn sparks
 * to top up Illumination, then evaluate the win condition.
 *
 * Card plays at Kether don't travel — they're discarded as part of
 * the ritual (the player's "one-sentence reflection" UI happens
 * outside the engine). Spark burns each contribute +1 Illumination
 * via the standard spark-spent event.
 *
 * Pre-condition: every player is at Kether. Otherwise rejection.
 */
export function resolveFinalThreshold(
  input: FinalThresholdInput,
): FinalThresholdResult {
  const { cardPlays, sparkBurns } = input;
  let workingState = input.state;

  if (workingState.separation >= SEPARATION_LOSS_THRESHOLD) {
    return { ok: false, reason: 'game-already-lost' };
  }

  if (!workingState.players.every((p) => p.position === 'kether')) {
    return { ok: false, reason: 'not-all-at-kether' };
  }

  for (const play of cardPlays) {
    const player = workingState.players.find((p) => p.id === play.playerId);
    if (player === undefined) {
      return { ok: false, reason: 'card-not-held' };
    }
    const cardIdx = player.hand.indexOf(play.arcanumNumber);
    if (cardIdx === -1) {
      return { ok: false, reason: 'card-not-held' };
    }
    const newHand = [
      ...player.hand.slice(0, cardIdx),
      ...player.hand.slice(cardIdx + 1),
    ];
    const newPlayer: PlayerState = { ...player, hand: newHand };
    workingState = {
      ...workingState,
      players: workingState.players.map((p) =>
        p.id === newPlayer.id ? newPlayer : p,
      ),
      discardPile: [...workingState.discardPile, play.arcanumNumber],
    };
  }

  const events: GameEvent[] = [];
  for (const burn of sparkBurns) {
    const player = workingState.players.find((p) => p.id === burn.playerId);
    if (player === undefined || !player.sparksHeld.has(burn.sefirah)) {
      return { ok: false, reason: 'spark-not-held' };
    }
    const newSparksHeld = new Set(player.sparksHeld);
    newSparksHeld.delete(burn.sefirah);
    const newPlayer: PlayerState = { ...player, sparksHeld: newSparksHeld };
    workingState = {
      ...workingState,
      players: workingState.players.map((p) =>
        p.id === newPlayer.id ? newPlayer : p,
      ),
      spentSparks: [
        ...workingState.spentSparks,
        { playerId: burn.playerId, sefirah: burn.sefirah },
      ],
    };
    events.push({
      kind: 'spark-spent',
      playerId: burn.playerId,
      sefirah: burn.sefirah,
    });
  }

  workingState = applyEvents(workingState, events);

  const won =
    workingState.illumination >=
    workingState.separation + REQUIRED_ILLUMINATION_MARGIN;
  return {
    ok: true,
    value: won
      ? { state: workingState, status: 'won' }
      : { state: workingState, status: 'lost', reason: 'illumination-gap' },
  };
}
