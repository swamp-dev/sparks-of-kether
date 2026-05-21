import { paths, sefirahByKey, tryPathByNumber } from '@/data';
import type { Path, SefirahKey } from '@/data';
import { applyEvent, applyEvents, recordPillarMove } from './counters';
import {
  isInertiaActive,
  isIllusionActive,
  isObsessionActive,
  isParalysisActive,
  maybeActivateShell,
} from './shells';
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

  // #17: Shell of Malkuth (Inertia) — movement costs two cards. If the
  // player holds only the path-card, they cannot move (must Meditate).
  if (isInertiaActive(state) && player.hand.length === 1) {
    return { ok: false, reason: { kind: 'inertia-one-card' } };
  }

  // #17: Shell of Chokmah (Paralysis) — cannot play a card for movement
  // on the same turn it was drawn.
  if (isParalysisActive(state) && (state.drawnThisTurn ?? []).includes(path.arcanumNumber)) {
    return {
      ok: false,
      reason: { kind: 'paralysis-drawn-this-turn', arcanumNumber: path.arcanumNumber },
    };
  }

  return { ok: true, value: { path, player } };
}

// ──────────────── applyMove ────────────────

/**
 * Optional ambient clock surface for `applyMove`. The only side-input
 * is the Kether-arrival timestamp written into
 * `PlayerState.arrivedAtKetherAt` — production uses `Date.now()`,
 * tests pass a deterministic stub so the rest of `applyMove` stays
 * pure-by-default. `undefined` (or omitted) means the engine sources
 * `Date.now()` itself; callers who pin determinism inject `now`.
 */
export interface ApplyMoveOptions {
  readonly now?: () => number;
}

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
 *   - Pillar streak updated; threshold events emitted via `applyEvents`
 *     for imbalance / equilibrium.
 *   - Downward moves (toward Malkuth) emit `move-downward` for +1 Illumination.
 *   - Arrival at Kether stamps `arrivedAtKetherAt` (#345), but only on
 *     the first such arrival — subsequent calls preserve the original
 *     timestamp so the ritual's witness-order rule (§ 2.2) reads the
 *     true arrival, not a return.
 */
// Paths adjacent to Netzach. Traveling these is blocked by Obsession.
const NETZACH_ADJACENT_PATHS = new Set([21, 24, 28, 29]);

export function applyMove(
  state: GameState,
  playerId: string,
  pathNumber: number,
  options: ApplyMoveOptions = {},
): MoveResult {
  const validation = canTravelPath(state, playerId, pathNumber);
  if (!validation.ok) return validation;
  const { path, player } = validation.value;

  const handIndex = player.hand.indexOf(path.arcanumNumber);
  const handMinusPathCard = [
    ...player.hand.slice(0, handIndex),
    ...player.hand.slice(handIndex + 1),
  ];

  // #17: Shell of Netzach (Obsession) — playing a card on a Netzach-adjacent
  // path burns the card with no movement. The card can still count for
  // assists / card-burn bonuses, but `applyMove`'s position logic is skipped.
  // Obsession takes precedence over Inertia: card burned, no movement, so
  // Inertia's 2-card cost does not apply (no movement occurs).
  if (isObsessionActive(state) && NETZACH_ADJACENT_PATHS.has(pathNumber)) {
    return {
      ok: true,
      value: {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId ? { ...player, hand: handMinusPathCard } : p,
        ),
        discardPile: [...state.discardPile, path.arcanumNumber],
      },
    };
  }

  // #17: Shell of Yesod (Illusion) — the illusory path's listed destination
  // is false. Traveling it returns the player to their origin (the path leads
  // nowhere). Card is still consumed.
  const trueDestination: SefirahKey = path.from === player.position ? path.to : path.from;
  const destination: SefirahKey =
    isIllusionActive(state) && pathNumber === state.illusoryPath
      ? player.position
      : trueDestination;

  // #17: Shell of Malkuth (Inertia) — movement costs two cards.
  // `canTravelPath` already rejected the 1-card case; here we discard the
  // last remaining card in hand as the extra cost.
  const inertiaExtra: number | undefined =
    isInertiaActive(state) && handMinusPathCard.length > 0
      ? handMinusPathCard[handMinusPathCard.length - 1]
      : undefined;
  const nextHand = inertiaExtra !== undefined ? handMinusPathCard.slice(0, -1) : handMinusPathCard;

  const fromSefirah = sefirahByKey(player.position);
  const toSefirah = sefirahByKey(destination);

  // #345: stamp the Kether arrival timestamp on the first arrival only.
  // The clock injection keeps `applyMove` deterministic in tests; in
  // production callers omit `now` and the engine sources `Date.now()`.
  // On non-Kether arrivals this branch is a no-op (the field stays
  // whatever it was, which for an MVP run is `undefined`).
  const arrivedAtKetherAt: number | undefined =
    destination === 'kether' && player.arrivedAtKetherAt === undefined
      ? (options.now ?? Date.now)()
      : player.arrivedAtKetherAt;

  const nextPlayer: PlayerState = {
    ...player,
    position: destination,
    hand: nextHand,
    // Track the path used so the challenge UI can derive whether
    // arrival was via a central-pillar shortcut (path's
    // `pillarsCrossed === ['balance', 'balance']`). Used by
    // `buildChallengeContext` in PlayScreen to set
    // `ChallengeContext.shortcut`, which in turn drives the +3 DC
    // penalty on the check and the +2 Separation tick on
    // accept-setback (vs. the regular +1 tick).
    lastArrivalPathNumber: pathNumber,
    arrivedAtKetherAt,
  };

  // Pillar streak: tracked team-wide. The destination's pillar is
  // what counts toward streaks; Balance moves are neutral.
  const streakResult = recordPillarMove(state.pillarStreak, toSefirah.pillar);

  const discardedCards =
    inertiaExtra !== undefined ? [path.arcanumNumber, inertiaExtra] : [path.arcanumNumber];

  let nextState: GameState = {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? nextPlayer : p)),
    discardPile: [...state.discardPile, ...discardedCards],
    pillarStreak: streakResult.streak,
  };
  // Fold pillar threshold events into counters.
  nextState = applyEvents(nextState, streakResult.events);
  // #17: pillar-streak-imbalance raises Separation → check Shell awakening.
  if (streakResult.events.some((e) => e.kind === 'pillar-streak-imbalance')) {
    nextState = maybeActivateShell(nextState);
  }

  // "Downward" = toward Malkuth (higher sefirah.number). Moving
  // voluntarily downward grants +1 Illumination per design/mechanics.md
  // (an act of humility).
  if (toSefirah.number > fromSefirah.number) {
    nextState = applyEvent(nextState, { kind: 'move-downward', playerId, pathNumber });
  }

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
