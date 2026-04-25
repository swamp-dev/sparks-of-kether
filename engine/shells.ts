import { sefirot } from '@/data';
import type { SefirahKey } from '@/data';
import type { GameState, ShellStateMap, ShellStatus } from './types';

/**
 * Separation interval between Shell activations. Crossing each
 * multiple of this value (3, 6, 9, 12) triggers one activation.
 * The game ends at 15, so the maximum activations is 4.
 */
export const SHELL_THRESHOLD_STEP = 3;

/** Hard cap on the number of Shells that can ever activate in one game. */
export const MAX_ACTIVATIONS = 4;

// ──────────────── Read-only helpers ────────────────

/**
 * True when the named Shell is `active`. `dormant` and `banished` are both false.
 *
 * Prefer the named helpers below (`isInertiaActive`, `isHoardingActive`, …)
 * at call sites — they read clearer and match the descriptive-names rule
 * from `design/shells.md`. This generic form exists for engine internals
 * and parameterized tests.
 */
export function isShellActive(state: GameState, sefirah: SefirahKey): boolean {
  return state.shells[sefirah] === 'active';
}

/** Count Shells in a given status across the map. Useful for invariants and tests. */
export function countShellsBy(map: ShellStateMap, status: ShellStatus): number {
  // `Object.values` lets us avoid the unsafe `Object.keys as SefirahKey[]`
  // cast — we only care about the values here.
  return Object.values(map).filter((s) => s === status).length;
}

// Per-Sefirah named helpers — call sites read clearer with these.
export const isFragmentationActive = (s: GameState): boolean => isShellActive(s, 'kether');
export const isParalysisActive = (s: GameState): boolean => isShellActive(s, 'chokmah');
export const isDespairActive = (s: GameState): boolean => isShellActive(s, 'binah');
export const isHoardingActive = (s: GameState): boolean => isShellActive(s, 'chesed');
export const isCrueltyActive = (s: GameState): boolean => isShellActive(s, 'gevurah');
export const isVanityActive = (s: GameState): boolean => isShellActive(s, 'tiferet');
export const isObsessionActive = (s: GameState): boolean => isShellActive(s, 'netzach');
export const isDeceptionActive = (s: GameState): boolean => isShellActive(s, 'hod');
export const isIllusionActive = (s: GameState): boolean => isShellActive(s, 'yesod');
export const isInertiaActive = (s: GameState): boolean => isShellActive(s, 'malkuth');

// ──────────────── Target selection ────────────────

/**
 * Count Sparks earned per Sefirah across the entire team. A Sefirah
 * counts each player who has it in their `clearedSefirot` — even if
 * they later spend the Spark, the illumination still happened and
 * the Sefirah is "lit."
 */
function teamSparkCounts(state: GameState): ReadonlyMap<SefirahKey, number> {
  const counts = new Map<SefirahKey, number>();
  for (const s of sefirot) counts.set(s.key, 0);
  for (const player of state.players) {
    for (const cleared of player.clearedSefirot) {
      counts.set(cleared, (counts.get(cleared) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Choose the Sefirah whose Shell would activate next. Returns `null`
 * when every Shell is already `active` or `banished` (no candidates).
 *
 * Selection rule (`design/shells.md` § Awakening):
 *   1. Only `dormant` Shells are candidates.
 *   2. Among those, pick the Sefirah with the *fewest* team Sparks.
 *   3. Tie-break by Sefirah number descending — i.e. the lower-on-tree
 *      Sefirah wins (Malkuth=10 before Yesod=9 before Hod=8, etc).
 *
 * Exported for tests and for the orchestrator's "what's next?" UI.
 */
export function pickNextShellTarget(state: GameState): SefirahKey | null {
  const dormant = sefirot.filter((s) => state.shells[s.key] === 'dormant');
  if (dormant.length === 0) return null;

  const counts = teamSparkCounts(state);
  const sorted = [...dormant].sort((a, b) => {
    const ac = counts.get(a.key) ?? 0;
    const bc = counts.get(b.key) ?? 0;
    if (ac !== bc) return ac - bc;
    return b.number - a.number;
  });

  return sorted[0]?.key ?? null;
}

// ──────────────── Activation ────────────────

/**
 * Total Shell-thresholds the team has handled — by activating, by
 * suffering a stillborn, or by deflecting via cancellation.
 */
function thresholdsHandled(state: GameState): number {
  return (
    countShellsBy(state.shells, 'active') +
    countShellsBy(state.shells, 'banished') +
    state.shellsDeflected
  );
}

function expectedActivations(separation: number): number {
  return Math.min(MAX_ACTIVATIONS, Math.max(0, Math.floor(separation / SHELL_THRESHOLD_STEP)));
}

/**
 * Activate Shells until the team's threshold-handled count catches up
 * to the current Separation threshold. Idempotent — call after any
 * change to `state.separation` to bring Shells in sync.
 *
 * Each pass through the loop:
 *   - If the team has a banked Gevurah cancellation, consume one and
 *     increment `shellsDeflected`. The Shell stays *dormant* — it can
 *     still wake on a later threshold. Distinct from banishment.
 *   - Otherwise, pick a target via `pickNextShellTarget`. If some
 *     player has already cleared that Sefirah, mark the Shell
 *     `banished` (stillborn — see `design/shells.md`). Otherwise mark
 *     it `active`.
 *
 * Returns a fresh `GameState` (or the original reference if nothing
 * changed).
 */
export function maybeActivateShell(state: GameState): GameState {
  const expected = expectedActivations(state.separation);
  let result = state;

  while (thresholdsHandled(result) < expected) {
    if (result.shellCancellationsAvailable > 0) {
      result = {
        ...result,
        shellCancellationsAvailable: result.shellCancellationsAvailable - 1,
        shellsDeflected: result.shellsDeflected + 1,
      };
      continue;
    }

    const target = pickNextShellTarget(result);
    if (!target) {
      // No dormant Shells remain. This means external banishments
      // (e.g. via `banishShell` on Sefirah-clear) have already
      // accounted for at least as many thresholds as separation
      // demands, so there's nothing left to do. The `MAX_ACTIVATIONS`
      // cap of 4 (with 10 total Shells) makes this strictly
      // impossible to reach with `thresholdsHandled < expected`,
      // but the guard keeps us safe against future ticket changes.
      break;
    }
    const isCleared = result.players.some((p) => p.clearedSefirot.has(target));
    const newStatus: ShellStatus = isCleared ? 'banished' : 'active';
    result = {
      ...result,
      shells: { ...result.shells, [target]: newStatus },
    };
  }

  return result;
}

// ──────────────── Banishment ────────────────

/**
 * Force a Shell to `banished`. Used by:
 *   - The orchestrator when a player clears a Sefirah (the corresponding
 *     Shell is banished even if it was dormant).
 *   - Tests setting up scenarios.
 *
 * Idempotent — banishing an already-banished Shell returns the same
 * state reference.
 */
export function banishShell(state: GameState, sefirah: SefirahKey): GameState {
  if (state.shells[sefirah] === 'banished') return state;
  return {
    ...state,
    shells: { ...state.shells, [sefirah]: 'banished' },
  };
}
