import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import {
  acceptSetback,
  resolveChallenge,
  type CheckModifiers,
  type CheckOutcome,
} from '@/engine/checks';
import { drawNCards, MEDITATE_DRAW } from '@/engine/draws';
import type { Rng } from '@/engine/rng';
import { HAND_CAP } from '@/engine/setup';
import { endTurn } from '@/engine/turn';
import type { GameState, MoveRejection } from '@/engine/types';

/**
 * Client-action union — the wire format for everything a player can
 * do during a multiplayer turn. The server applies these via the
 * engine reducers; the same action shape is sent over the
 * `game_events` table so other clients see it via Realtime.
 *
 * Sparks, draw, and full assist coordination are still TBD — they'll
 * arrive when the multiplayer game UI starts using them. `meditate`
 * was filled in by #216 (the action otherwise silently no-opped on
 * the server because the dispatcher had no case for it).
 */
export type ClientAction =
  | {
      readonly kind: 'move';
      readonly playerId: string;
      readonly pathNumber: number;
    }
  | {
      readonly kind: 'submit-challenge';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
      readonly modifiers: CheckModifiers;
      /**
       * UI-supplied pre-rolled outcome (single-source-of-truth for
       * the d20 the player saw). The engine applies it directly so
       * server and client agree.
       */
      readonly outcome?: CheckOutcome;
    }
  | {
      readonly kind: 'accept-setback';
      readonly playerId: string;
      readonly sefirah: SefirahKey;
      readonly shortcut?: boolean;
    }
  | {
      readonly kind: 'meditate';
      readonly playerId: string;
    }
  | {
      readonly kind: 'end-turn';
      readonly playerId: string;
    };

export type ApplyActionRejection =
  | { readonly kind: 'move'; readonly cause: MoveRejection }
  | { readonly kind: 'challenge'; readonly cause: string }
  | { readonly kind: 'meditate'; readonly cause: 'hand-full' | 'unknown-player' }
  | { readonly kind: 'unknown-action' };

export type ApplyActionResult =
  | { readonly ok: true; readonly newState: GameState }
  | { readonly ok: false; readonly error: ApplyActionRejection };

/**
 * Pure: apply one client action to a game state. The server route
 * calls this; the client's useTurn hook does its own engine calls
 * for optimistic local updates. Both call the same engine reducers
 * so server and client outcomes always agree (modulo `rng` which
 * is server-authoritative — clients pre-roll outcomes and pass
 * them in).
 */
export function applyClientAction(
  state: GameState,
  action: ClientAction,
  rng: Rng,
): ApplyActionResult {
  switch (action.kind) {
    case 'move': {
      const result = applyMove(state, action.playerId, action.pathNumber);
      if (!result.ok) return { ok: false, error: { kind: 'move', cause: result.reason } };
      return { ok: true, newState: result.value };
    }
    case 'submit-challenge': {
      const result = resolveChallenge({
        state,
        playerId: action.playerId,
        sefirah: action.sefirah,
        modifiers: action.modifiers,
        rng,
        ...(action.outcome !== undefined ? { outcome: action.outcome } : {}),
      });
      if (!result.ok) {
        return {
          ok: false,
          error: { kind: 'challenge', cause: result.reason.kind },
        };
      }
      return { ok: true, newState: result.value.newState };
    }
    case 'accept-setback': {
      const newState = acceptSetback(state, {
        playerId: action.playerId,
        sefirah: action.sefirah,
        shortcut: action.shortcut ?? false,
      });
      return { ok: true, newState };
    }
    case 'meditate': {
      // Mirrors the meditate path in `lib/turn-machine.ts` so server-
      // and client-applied state agree. Reject loudly rather than
      // silently no-opping — a direct API caller (bot, replay tool,
      // future CLI) needs an explicit signal when the action could
      // not draw cards. Production callers go through `authorize`
      // first, so `unknown-player` here is a programming error or a
      // bypass; surfacing it cleanly costs nothing and matches the
      // `MoveRejection.unknown-player` precedent.
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) {
        return {
          ok: false,
          error: { kind: 'meditate', cause: 'unknown-player' },
        };
      }
      if (player.hand.length >= HAND_CAP) {
        return { ok: false, error: { kind: 'meditate', cause: 'hand-full' } };
      }
      const newState = drawNCards(
        state,
        action.playerId,
        MEDITATE_DRAW,
        HAND_CAP,
        rng,
      );
      return { ok: true, newState };
    }
    case 'end-turn': {
      return { ok: true, newState: endTurn(state) };
    }
  }
}
