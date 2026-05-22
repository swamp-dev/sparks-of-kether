import { currentTrialPlayerId } from '@/engine/kether';
import type { ClientAction } from './room-actions';
import type { GameState } from '@/engine/types';

/**
 * Authorization rejection reasons. Discriminated by `kind` so callers
 * can map them to HTTP status codes (`identity-mismatch` and
 * `not-active-player` both surface as 403).
 */
export type AuthorizationRejection =
  | {
      readonly kind: 'identity-mismatch';
      readonly callerId: string;
      readonly claimedPlayerId: string;
    }
  | {
      readonly kind: 'not-active-player';
      readonly callerId: string;
      readonly activePlayerId: string;
      readonly action: ClientAction['kind'];
    }
  | {
      readonly kind: 'not-trial-turn';
      readonly callerId: string;
      readonly expectedPlayerId: string | null;
      readonly action: 'kether-trial-resolve';
    };

export type AuthorizationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: AuthorizationRejection };

/**
 * Pure authorization rule: can `callerId` perform `action` against
 * `state`?
 *
 * Rules:
 *   - Every action's `playerId` must equal `callerId`.
 *   - Turn-locked actions require the caller to be the active player.
 *   - Kether ritual actions bypass the active-player gate:
 *       - `kether-trial-resolve`: caller must be `currentTrialPlayerId`.
 *       - `kether-trial-stage-spark` / `kether-trial-unstage-spark`:
 *         any player (identity check binds them to their own Spark).
 *       - `kether-close-stage-spark` / `kether-close-unstage-spark` /
 *         `threshold-confirm`: any player.
 */
export function authorize(
  action: ClientAction,
  state: GameState,
  callerId: string,
): AuthorizationResult {
  if (action.playerId !== callerId) {
    return {
      ok: false,
      reason: {
        kind: 'identity-mismatch',
        callerId,
        claimedPlayerId: action.playerId,
      },
    };
  }

  switch (action.kind) {
    case 'kether-trial-resolve': {
      const expected = currentTrialPlayerId(state);
      if (callerId !== expected) {
        return {
          ok: false,
          reason: {
            kind: 'not-trial-turn',
            callerId,
            expectedPlayerId: expected,
            action: action.kind,
          },
        };
      }
      return { ok: true };
    }
    case 'kether-trial-stage-spark':
    case 'kether-trial-unstage-spark':
    case 'kether-close-stage-spark':
    case 'kether-close-unstage-spark':
    case 'threshold-confirm': {
      // Any player at the table may call these; identity check above
      // already binds the action to its caller. Engine reducers enforce
      // in-phase + Spark-ownership rules.
      return { ok: true };
    }
    default: {
      // All non-Kether actions are turn-locked.
      if (callerId !== state.activePlayerId) {
        return {
          ok: false,
          reason: {
            kind: 'not-active-player',
            callerId,
            activePlayerId: state.activePlayerId,
            action: action.kind,
          },
        };
      }
      return { ok: true };
    }
  }
}
