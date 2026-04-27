import type { SefirahKey } from '@/data';
import { applyMove } from '@/engine/movement';
import {
  acceptSetback,
  resolveChallenge,
  type CheckModifiers,
  type CheckOutcome,
} from '@/engine/checks';
import type { Rng } from '@/engine/rng';
import type { GameState, MoveRejection } from '@/engine/types';

/**
 * Client-action union — the wire format for everything a player can
 * do during a multiplayer turn. The server applies these via the
 * engine reducers; the same action shape is sent over the
 * `game_events` table so other clients see it via Realtime.
 *
 * Intentionally narrow for now: the moves the integration page
 * already exercises in single-player. Sparks, meditate, draw, and
 * end-turn coordination land in the next ticket alongside
 * server-side turn-ownership enforcement (#35).
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
    };

export type ApplyActionRejection =
  | { readonly kind: 'move'; readonly cause: MoveRejection }
  | { readonly kind: 'challenge'; readonly cause: string }
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
  }
}
