import type { Rng } from './rng';
import { HAND_CAP, STARTING_HAND_SIZE } from './setup';
import { isParalysisActive } from './shells';
import type { GameState } from './types';

/**
 * Shared draw-pile helpers (#56). Both `lib/turn-machine.ts` (post-
 * move replenishment) and `engine/sparks.ts` (Kether-Unity) need
 * recycle-when-empty behaviour, and per `design/mechanics.md`
 * § Discard recycle the recycle MUST shuffle — otherwise a player
 * who memorises the discard order can predict every subsequent
 * draw.
 *
 * Keeping the helpers here so the engine and the turn-machine share
 * one implementation. Engine boundary stays clean: `lib/` imports
 * from `engine/`, never the reverse.
 */

/** Per `design/mechanics.md` § Drawing — meditate draws 2 cards (capped at HAND_CAP). */
export const MEDITATE_DRAW = 2;

/**
 * Fisher-Yates shuffle. Pure: returns a new array; `arr` is unchanged.
 * Uses `Rng.int(min, max)` so the shuffle is deterministic for a
 * seeded RNG (tests pin specific outcomes by seed).
 */
export function shuffleArray<T>(arr: readonly T[], rng: Rng): readonly T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * If `deck` is empty and `discard` is non-empty, return a recycled
 * pair (shuffled discard becomes the new deck; discard is empty).
 * Otherwise return the inputs unchanged. Pure.
 *
 * Returning the structurally-equal input on the no-op path lets
 * callers compare references when checking whether a recycle
 * happened (e.g. for analytics or telemetry).
 */
export function recycleDiscardIntoDeck(
  deck: readonly number[],
  discard: readonly number[],
  rng: Rng,
): { readonly deck: readonly number[]; readonly discard: readonly number[] } {
  if (deck.length > 0 || discard.length === 0) {
    return { deck, discard };
  }
  return { deck: shuffleArray(discard, rng), discard: [] };
}

/**
 * Optional over-cap mode for `drawNCards`. The default (no opts /
 * `overCap: false`) preserves the pre-#291 behaviour: stop early at
 * `hardCap`. With `overCap: true`, the helper draws every requested
 * card regardless of `hardCap` — the Meditate path (#291) takes this
 * branch when the player is at or above `HAND_CAP` so meditating is
 * never a softlock. The over-cap excess is reconciled at end-of-turn
 * via `state.pendingDiscard` (set by the meditate reducer).
 */
export interface DrawOptions {
  readonly overCap?: boolean;
}

/**
 * Draw up to `count` cards from the deck into `playerId`'s hand,
 * stopping early at `hardCap` (unless `opts.overCap` is `true`).
 * Recycles the discard pile mid-fill when the deck empties (via
 * `recycleDiscardIntoDeck`). Pure: returns a new `GameState`; the
 * input is unchanged.
 *
 * Used by:
 *   - `lib/turn-machine.ts` end-of-turn `drawToHand` (refill toward
 *     `STARTING_HAND_SIZE`, hardCap = `HAND_CAP`).
 *   - `lib/turn-machine.ts` and `lib/room-actions.ts` meditate path
 *     (draw `MEDITATE_DRAW`, hardCap = `HAND_CAP`, overCap allowed).
 *
 * Silently no-ops when the player is unknown OR no cards are
 * available anywhere. With `overCap: false` (default), also no-ops
 * once the hand reaches `hardCap`. Callers that need to surface
 * "couldn't draw" feedback should compare hand sizes themselves.
 */
/**
 * Refill `playerId`'s hand toward `STARTING_HAND_SIZE` (capped at
 * `HAND_CAP`). Pure: returns a new `GameState`; the input is
 * unchanged. A hand already at or above `STARTING_HAND_SIZE` is left
 * alone (the helper is a no-op).
 *
 * `HAND_CAP` is the *gift/burn* ceiling — applied when other players
 * send cards or via spark abilities — NOT a draw ceiling. This helper
 * fills only toward `STARTING_HAND_SIZE`, so a hand already at
 * `STARTING_HAND_SIZE` (or above, via gifts) is untouched.
 *
 * #502: lifted from `lib/turn-machine.ts` into the engine layer so
 * both the hot-seat reducer and the multiplayer wire dispatcher
 * (`lib/room-actions.ts`) can share the same start-of-turn refill
 * logic. Pre-#502 the helper was private to `lib/turn-machine.ts`;
 * with the refill moved to `end-turn`, both call sites need it.
 */
export function drawToHand(
  state: GameState,
  playerId: string,
  rng: Rng,
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const need = Math.max(0, STARTING_HAND_SIZE - player.hand.length);
  return drawNCards(state, playerId, need, HAND_CAP, rng);
}

export function drawNCards(
  state: GameState,
  playerId: string,
  count: number,
  hardCap: number,
  rng: Rng,
  opts: DrawOptions = {},
): GameState {
  const pIndex = state.players.findIndex((p) => p.id === playerId);
  // `findIndex` returning ≥ 0 means the player exists at that slot in
  // the dense `players` array — `!` rather than a second guard so
  // TS narrows away the `noUncheckedIndexedAccess` undefined.
  if (pIndex === -1) return state;
  const player = state.players[pIndex]!;
  let pHand: readonly number[] = player.hand;
  let deck: readonly number[] = state.deck;
  let discard: readonly number[] = state.discardPile;
  let remaining = count;
  const allowOverCap = opts.overCap === true;
  while (remaining > 0 && (allowOverCap || pHand.length < hardCap)) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      const recycled = recycleDiscardIntoDeck(deck, discard, rng);
      deck = recycled.deck;
      discard = recycled.discard;
    }
    const top = deck[0];
    if (top === undefined) break;
    pHand = [...pHand, top];
    deck = deck.slice(1);
    remaining -= 1;
  }
  // #17: Paralysis (Shell of Chokmah) — track which arcanum numbers
  // were drawn this turn so canTravelPath can block them from being
  // played for movement on the same turn they were drawn.
  const newlyDrawn = pHand.slice(player.hand.length);
  const drawnThisTurn =
    isParalysisActive(state) && newlyDrawn.length > 0
      ? [...(state.drawnThisTurn ?? []), ...newlyDrawn]
      : state.drawnThisTurn;
  return {
    ...state,
    players: state.players.map((p, idx) =>
      idx === pIndex ? { ...player, hand: pHand } : p,
    ),
    deck,
    discardPile: discard,
    ...(drawnThisTurn !== state.drawnThisTurn ? { drawnThisTurn } : {}),
  };
}
