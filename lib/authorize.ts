import { currentWitnessPlayerId } from '@/engine/kether';
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
    }
  | {
      readonly kind: 'not-witness-turn';
      readonly callerId: string;
      readonly expectedPlayerId: string | null;
      readonly action:
        | 'kether-witness-play'
        | 'kether-witness-pass'
        | 'kether-host-skip-witness';
      /**
       * For `kether-host-skip-witness` only: the rejected dispatcher's
       * named `targetPlayerId` (which failed the witness check). Omitted
       * for direct `kether-witness-play` / `kether-witness-pass`
       * rejections — there `callerId` is itself the offender.
       */
      readonly targetPlayerId?: string;
    }
  | {
      readonly kind: 'not-host';
      readonly callerId: string;
      readonly hostId: string | null;
      readonly action: 'kether-host-skip-witness';
    };

export type AuthorizationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: AuthorizationRejection };

/**
 * Pure authorization rule: can `callerId` perform `action` against
 * `state`?
 *
 * Rules:
 *   - Every action's `playerId` must equal `callerId`. The route
 *     already enforces this against `auth.uid()` before calling, but
 *     authorize is also called in unit tests and from any future
 *     in-process consumer, so the check belongs here too.
 *   - Turn-locked actions (`move`, `prep-*`, `react-retry`,
 *     `react-continue`, `accept-setback`, `meditate`, `discard`,
 *     `end-turn`) require the caller to be the active player.
 *   - Kether ritual actions (#350 / `design/final-threshold.md` § 3.3
 *     and § 5.3) bypass the active-player gate in favour of per-action
 *     rules:
 *       - `kether-witness-play` / `kether-witness-pass`: the caller
 *         must be `currentWitnessPlayerId(state)` (the round-robin
 *         pointer's player). Outside the witness sub-phase the helper
 *         returns null, so any caller is rejected — the engine catches
 *         the actual phase-mismatch separately (defense-in-depth).
 *       - `kether-close-stage-spark` / `kether-close-unstage-spark` /
 *         `threshold-confirm`: any player can call. The identity
 *         check above already pins them to their own Spark / their
 *         own confirm; the engine cross-checks ownership.
 *       - `kether-host-skip-witness`: the caller must be the host
 *         (`state.players[0].id` by convention; matches `rooms.host_id`
 *         since the room's creator is seated first via `joinRoom`'s
 *         seat-pick RPC).
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
    case 'kether-witness-play':
    case 'kether-witness-pass': {
      const expected = currentWitnessPlayerId(state);
      if (callerId !== expected) {
        return {
          ok: false,
          reason: {
            kind: 'not-witness-turn',
            callerId,
            expectedPlayerId: expected,
            action: action.kind,
          },
        };
      }
      return { ok: true };
    }
    case 'kether-close-stage-spark':
    case 'kether-close-unstage-spark':
    case 'threshold-confirm': {
      // Any player at the table may stage / un-stage / confirm during
      // the closure window; the identity check above already binds the
      // action to its caller. Engine reducers enforce in-phase + Spark-
      // ownership rules.
      return { ok: true };
    }
    case 'kether-host-skip-witness': {
      const hostId = state.players[0]?.id ?? null;
      if (callerId !== hostId) {
        return {
          ok: false,
          reason: {
            kind: 'not-host',
            callerId,
            hostId,
            action: action.kind,
          },
        };
      }
      // § 7.1 gate (b): targetPlayerId must be the current witness.
      // The engine's `ketherPassCard` rejects non-witness targets too,
      // but the authorize layer is the authoritative gate per the
      // design's three-gate requirement; without this check the host
      // could probe witness identity via 422-vs-403 response shape and
      // any future caller bypassing the engine's defense-in-depth would
      // be unprotected.
      const expectedWitness = currentWitnessPlayerId(state);
      if (action.targetPlayerId !== expectedWitness) {
        return {
          ok: false,
          reason: {
            kind: 'not-witness-turn',
            callerId,
            expectedPlayerId: expectedWitness,
            action: action.kind,
            targetPlayerId: action.targetPlayerId,
          },
        };
      }
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
