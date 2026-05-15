import type { SefirahKey } from '@/data';
import { applyEvent } from './counters';
import { recycleDiscardIntoDeck } from './draws';
import type { Rng } from './rng';
import { HAND_CAP } from './setup';
import { isHoardingActive, isVanityActive } from './shells';
import type { GameState, PlayerAbilityFlags, PlayerState, Result, SpentSpark } from './types';

// ──────────────── Public types ────────────────

/**
 * Discriminated union of the ten Spark abilities. Payload varies per
 * kind: some abilities need target data (Chesed's gift, Yesod's
 * reorder, Hod's named card), most are simple one-shot activations.
 */
export type SparkAbility =
  | { readonly kind: 'chesed-grace'; readonly toPlayerId: string; readonly arcanumNumber: number }
  | { readonly kind: 'gevurah-severance' }
  | { readonly kind: 'tiferet-harmony' }
  | { readonly kind: 'hod-clarity'; readonly arcanumNumber: number }
  | { readonly kind: 'netzach-courage' }
  | { readonly kind: 'yesod-intuition'; readonly reorder: readonly number[] }
  | { readonly kind: 'binah-acceptance' }
  | { readonly kind: 'chokmah-flash' }
  | { readonly kind: 'kether-unity' }
  | { readonly kind: 'malkuth-grounding' };

export type SparkRejection =
  | { readonly kind: 'unknown-player'; readonly playerId: string }
  | { readonly kind: 'spark-not-held'; readonly sefirah: SefirahKey }
  | { readonly kind: 'payload-invalid'; readonly detail: string }
  // #56: Chesed-Grace gift would push the receiver past HAND_CAP.
  // Distinct from `payload-invalid` so the orchestrator can offer
  // the giver a different recipient instead of treating it as a
  // logic error.
  | { readonly kind: 'gift-rejected-cap-full'; readonly toPlayerId: string }
  // #17 — Shell of Chesed (Hoarding): all card gifts blocked while active.
  | { readonly kind: 'hoarding-gifts-blocked' }
  // #17 — Shell of Tiferet (Vanity): Tiferet Soul Aspect ability disabled.
  | { readonly kind: 'vanity-ability-disabled' };

// ──────────────── Helpers ────────────────

function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((p) => p.id === playerId);
}

/** Map each `SparkAbility` kind to the Sefirah whose Spark it consumes. */
const ABILITY_TO_SEFIRAH: Readonly<Record<SparkAbility['kind'], SefirahKey>> = {
  'chesed-grace': 'chesed',
  'gevurah-severance': 'gevurah',
  'tiferet-harmony': 'tiferet',
  'hod-clarity': 'hod',
  'netzach-courage': 'netzach',
  'yesod-intuition': 'yesod',
  'binah-acceptance': 'binah',
  'chokmah-flash': 'chokmah',
  'kether-unity': 'kether',
  'malkuth-grounding': 'malkuth',
};

function replacePlayer(state: GameState, next: PlayerState): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === next.id ? next : p)),
  };
}

function setFlags(
  player: PlayerState,
  patch: Partial<PlayerAbilityFlags>,
): PlayerState {
  return {
    ...player,
    pendingAbilities: { ...player.pendingAbilities, ...patch },
  };
}

function spendSparkOn(player: PlayerState, sefirah: SefirahKey): PlayerState {
  const next = new Set(player.sparksHeld);
  next.delete(sefirah);
  return { ...player, sparksHeld: next };
}

function recordSpend(state: GameState, spent: SpentSpark): GameState {
  return { ...state, spentSparks: [...state.spentSparks, spent] };
}

// ──────────────── earnSpark ────────────────

/**
 * Grant a Sefirah's Spark to a player. Called by `resolveChallenge`
 * on challenge success, and re-exported here so other modules can
 * award sparks (e.g. initial setup bonuses) without importing the
 * checks module.
 *
 * Idempotent — earning a Sefirah the player already holds is a no-op.
 * Unknown player throws (programmer error).
 */
export function earnSpark(state: GameState, playerId: string, sefirah: SefirahKey): GameState {
  const player = findPlayer(state, playerId);
  if (!player) {
    throw new Error(`earnSpark: unknown player id ${playerId}`);
  }
  if (player.sparksHeld.has(sefirah)) return state;
  const nextSparks = new Set(player.sparksHeld).add(sefirah);
  return replacePlayer(state, { ...player, sparksHeld: nextSparks });
}

// ──────────────── useSpark ────────────────

/**
 * Spend a player's Spark for its ability effect. Pure reducer — returns
 * a new `GameState` on success, or a `SparkRejection` on any failure.
 *
 * The Spark is ALWAYS removed from `sparksHeld` on a successful
 * resolution, even when the ability's effect is a no-op (e.g. Hod's
 * named card isn't held by anyone — the reveal just doesn't happen).
 * On a rejection, the state is returned unchanged and the Spark stays
 * held.
 */
export function useSpark(
  state: GameState,
  playerId: string,
  ability: SparkAbility,
  rng: Rng,
): Result<GameState, SparkRejection> {
  const player = findPlayer(state, playerId);
  if (!player) {
    return { ok: false, reason: { kind: 'unknown-player', playerId } };
  }

  const requiredSefirah = ABILITY_TO_SEFIRAH[ability.kind];
  if (!player.sparksHeld.has(requiredSefirah)) {
    return { ok: false, reason: { kind: 'spark-not-held', sefirah: requiredSefirah } };
  }

  const applied = applyAbility(state, player, ability, rng);
  if (!applied.ok) return applied;

  // Spend the Spark on the post-apply state. The acting player must
  // still exist there — no ability is allowed to remove the caller
  // from the roster. If that invariant is ever violated, throw with
  // a clear message so the bug surfaces at the mutation site.
  const postApplyPlayer = findPlayer(applied.value, playerId);
  if (!postApplyPlayer) {
    throw new Error(
      `useSpark: player ${playerId} vanished after applyAbility(${ability.kind}) — invariant violation`,
    );
  }
  const afterSpend = replacePlayer(applied.value, spendSparkOn(postApplyPlayer, requiredSefirah));
  const recorded = recordSpend(afterSpend, { playerId, sefirah: requiredSefirah });
  // Spent Sparks still contribute +1 Illumination per design/mechanics.md.
  // Routed through applyEvent so the rule lives in events.ts.
  const final = applyEvent(recorded, {
    kind: 'spark-spent',
    playerId,
    sefirah: requiredSefirah,
  });
  return { ok: true, value: final };
}

// ──────────────── Per-ability effect application ────────────────

/** Dispatch each ability to its own pure-state updater. */
function applyAbility(
  state: GameState,
  player: PlayerState,
  ability: SparkAbility,
  rng: Rng,
): Result<GameState, SparkRejection> {
  switch (ability.kind) {
    case 'chesed-grace':
      // #17: Shell of Chesed (Hoarding) — no card gifts while active.
      if (isHoardingActive(state)) {
        return { ok: false, reason: { kind: 'hoarding-gifts-blocked' } };
      }
      return applyChesedGrace(state, player, ability.toPlayerId, ability.arcanumNumber);
    case 'gevurah-severance':
      return { ok: true, value: { ...state, shellCancellationsAvailable: state.shellCancellationsAvailable + 1 } };
    case 'tiferet-harmony':
      // #17: Shell of Tiferet (Vanity) — Tiferet Soul Aspect ability disabled.
      if (isVanityActive(state)) {
        return { ok: false, reason: { kind: 'vanity-ability-disabled' } };
      }
      return { ok: true, value: replacePlayer(state, setFlags(player, { harmonyArmed: true })) };
    case 'hod-clarity':
      return applyHodClarity(state, ability.arcanumNumber);
    case 'netzach-courage':
      return { ok: true, value: replacePlayer(state, setFlags(player, { courageRetryAvailable: true })) };
    case 'yesod-intuition':
      return applyYesodIntuition(state, ability.reorder);
    case 'binah-acceptance':
      return { ok: true, value: replacePlayer(state, setFlags(player, { acceptanceArmed: true })) };
    case 'chokmah-flash':
      return {
        ok: true,
        value: replacePlayer(state, setFlags(player, { flashExtraMoves: player.pendingAbilities.flashExtraMoves + 1 })),
      };
    case 'kether-unity':
      return applyKetherUnity(state, rng);
    case 'malkuth-grounding':
      return {
        ok: true,
        value: replacePlayer(state, setFlags(player, { separationShields: player.pendingAbilities.separationShields + 1 })),
      };
  }
}

function applyChesedGrace(
  state: GameState,
  giver: PlayerState,
  toPlayerId: string,
  arcanumNumber: number,
): Result<GameState, SparkRejection> {
  if (!giver.hand.includes(arcanumNumber)) {
    return {
      ok: false,
      reason: { kind: 'payload-invalid', detail: `giver does not hold arcanum ${arcanumNumber}` },
    };
  }
  const receiver = findPlayer(state, toPlayerId);
  if (!receiver) {
    return {
      ok: false,
      reason: { kind: 'payload-invalid', detail: `receiver ${toPlayerId} does not exist` },
    };
  }
  if (receiver.id === giver.id) {
    return {
      ok: false,
      reason: { kind: 'payload-invalid', detail: 'cannot gift to self' },
    };
  }
  // #56: HAND_CAP — receiver at cap rejects with a distinct kind so
  // the orchestrator can re-prompt the giver to pick a different
  // target rather than treating it as an invalid payload.
  if (receiver.hand.length >= HAND_CAP) {
    return {
      ok: false,
      reason: { kind: 'gift-rejected-cap-full', toPlayerId: receiver.id },
    };
  }
  const handIndex = giver.hand.indexOf(arcanumNumber);
  const nextGiver: PlayerState = {
    ...giver,
    hand: [...giver.hand.slice(0, handIndex), ...giver.hand.slice(handIndex + 1)],
  };
  const nextReceiver: PlayerState = {
    ...receiver,
    hand: [...receiver.hand, arcanumNumber],
  };
  const transferred: GameState = {
    ...state,
    players: state.players.map((p) => {
      if (p.id === giver.id) return nextGiver;
      if (p.id === receiver.id) return nextReceiver;
      return p;
    }),
  };
  // Gifts give the giver +1 Illumination per `design/mechanics.md`.
  // Routed through applyEvent so the counter rule lives in events.ts.
  const next = applyEvent(transferred, {
    kind: 'card-gifted',
    fromPlayerId: giver.id,
    toPlayerId: receiver.id,
    arcanumNumber,
  });
  return { ok: true, value: next };
}

function applyHodClarity(state: GameState, arcanumNumber: number): Result<GameState, SparkRejection> {
  const held = state.players.some((p) => p.hand.includes(arcanumNumber));
  if (!held) {
    // Spark still spent; no reveal. State unchanged except for the
    // spend bookkeeping that `useSpark` applies afterward.
    return { ok: true, value: state };
  }
  const nextRevealed = new Set(state.revealedCards).add(arcanumNumber);
  return { ok: true, value: { ...state, revealedCards: nextRevealed } };
}

function applyYesodIntuition(
  state: GameState,
  reorder: readonly number[],
): Result<GameState, SparkRejection> {
  if (reorder.length > state.deck.length) {
    return {
      ok: false,
      reason: {
        kind: 'payload-invalid',
        detail: `reorder length ${reorder.length} exceeds deck size ${state.deck.length}`,
      },
    };
  }
  const topSorted = [...state.deck.slice(0, reorder.length)].sort((a, b) => a - b);
  const reorderSorted = [...reorder].sort((a, b) => a - b);
  const samePermutation =
    topSorted.length === reorderSorted.length &&
    topSorted.every((n, i) => n === reorderSorted[i]);
  if (!samePermutation) {
    return {
      ok: false,
      reason: {
        kind: 'payload-invalid',
        detail: `reorder must be a permutation of the top ${reorder.length} cards`,
      },
    };
  }
  const nextDeck = [...reorder, ...state.deck.slice(reorder.length)];
  return { ok: true, value: { ...state, deck: nextDeck } };
}

function applyKetherUnity(state: GameState, rng: Rng): Result<GameState, SparkRejection> {
  // Draw one card for each player from the top of the deck. Players
  // already at HAND_CAP are skipped — their slot doesn't burn a card,
  // it just rolls forward to the next under-cap player (#56). If the
  // deck empties mid-distribution AND the discard pile has cards, the
  // discard pile is shuffled (via `recycleDiscardIntoDeck`) and
  // becomes the new deck. Shuffle is required: an order-preserving
  // recycle would let any player who memorised the discard predict
  // every subsequent draw.
  //
  // IMPORTANT: arcanum 0 (The Fool) is a valid card. We use `??`/explicit
  // null checks rather than truthiness, otherwise a Fool draw would be
  // silently discarded. Do NOT refactor to `card || undefined` or `!card`.
  let deck: readonly number[] = state.deck;
  let discard: readonly number[] = state.discardPile;
  const nextPlayers = state.players.map((p) => {
    if (p.hand.length >= HAND_CAP) return p;
    const recycled = recycleDiscardIntoDeck(deck, discard, rng);
    deck = recycled.deck;
    discard = recycled.discard;
    const card = deck[0];
    if (card === undefined) return p;
    deck = deck.slice(1);
    return { ...p, hand: [...p.hand, card] };
  });
  return {
    ok: true,
    value: { ...state, players: nextPlayers, deck, discardPile: discard },
  };
}
