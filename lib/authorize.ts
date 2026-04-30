import type { ClientAction } from './room-actions';
import type { GameState } from '@/engine/types';

/**
 * Authorization rejection reasons. Discriminated by `kind` so callers
 * can map them to HTTP status codes (`identity-mismatch` and
 * `not-active-player` both surface as 403; future ability-specific
 * rejections might warrant 409 / 422).
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
    };

export type AuthorizationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: AuthorizationRejection };

/**
 * Pure authorization rule: can `callerId` perform `action` against
 * `state`?
 *
 * Rules today (matches the actions we ship in #34/#35):
 *   - Every action's `playerId` must equal `callerId`. The route
 *     already enforces this against `auth.uid()` before calling, but
 *     authorize is also called in unit tests and from any future
 *     in-process consumer, so the check belongs here too.
 *   - All current actions (`move`, `prep-add-modifier`,
 *     `prep-remove-modifier`, `prep-confirm`, `react-retry`,
 *     `accept-setback`, `meditate`, `end-turn`) are turn-locked: the
 *     caller must be the active player.
 *
 * Forward-compat: out-of-turn abilities (Spark spends, Soul Aspect
 * gifts, ally assists per `design/mechanics.md` § Sparks and Soul
 * Aspects) will be added as new ClientAction variants in later
 * tickets. Those won't gate on `activePlayerId` — they'll have their
 * own preconditions (e.g. caller must hold the Spark, target must be
 * at the same Sefirah). When that lands, switch on `action.kind`
 * here and split the turn-locked check off into a helper.
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
