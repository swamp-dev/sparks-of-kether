import { describe, expect, it } from 'vitest';
import {
  maybeActivateShell,
  banishShell,
  isShellActive,
  pickNextShellTarget,
  countShellsBy,
  isFragmentationActive,
  isParalysisActive,
  isDespairActive,
  isHoardingActive,
  isCrueltyActive,
  isVanityActive,
  isObsessionActive,
  isDeceptionActive,
  isIllusionActive,
  isInertiaActive,
  SHELL_THRESHOLD_STEP,
} from '../shells';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '../types';
import { EMPTY_SHELL_STATE } from '../types';

// ──────────────── pickNextShellTarget ────────────────

describe('pickNextShellTarget', () => {
  it('returns null when every Shell is already active or banished', () => {
    const allDecided: GameState = makeState(
      {},
      {
        shells: {
          kether: 'active',
          chokmah: 'banished',
          binah: 'active',
          chesed: 'active',
          gevurah: 'banished',
          tiferet: 'active',
          netzach: 'active',
          hod: 'banished',
          yesod: 'active',
          malkuth: 'banished',
        },
      },
    );
    expect(pickNextShellTarget(allDecided)).toBeNull();
  });

  it('picks the Sefirah with zero earned Sparks across the team', () => {
    // Player has cleared Yesod and Hod — those Sefirot have at least one
    // Spark earned. The remaining 8 are all tied at 0; tie-break is
    // "lower on the tree" → highest sefirah.number, which is Malkuth (10).
    const state = makeState({ clearedSefirot: new Set(['yesod', 'hod']) });
    expect(pickNextShellTarget(state)).toBe('malkuth');
  });

  it('breaks ties by Sefirah number descending (lower-on-tree first)', () => {
    // Skip Malkuth/Yesod by making them decided; remaining ties resolve
    // toward the next-lowest available.
    const state = makeState(
      {},
      {
        shells: {
          ...EMPTY_SHELL_STATE,
          malkuth: 'banished',
          yesod: 'banished',
        },
      },
    );
    expect(pickNextShellTarget(state)).toBe('hod');
  });

  it('counts all players when computing Spark earnings per Sefirah', () => {
    const p1 = makePlayer({ id: 'p1', clearedSefirot: new Set(['hod']) });
    const p2 = makePlayer({ id: 'p2', clearedSefirot: new Set(['hod', 'yesod']) });
    // Hod = 2, Yesod = 1, all others 0. Tie among the 0-count Sefirot
    // resolves to Malkuth (number 10).
    const state = makeState({}, { players: [p1, p2] });
    expect(pickNextShellTarget(state)).toBe('malkuth');
  });

  it('respects already-decided Shells when picking the next target', () => {
    // Malkuth is banished; the next-lowest dormant Sefirah with 0 Sparks
    // is Yesod (number 9).
    const state = makeState(
      {},
      { shells: { ...EMPTY_SHELL_STATE, malkuth: 'banished' } },
    );
    expect(pickNextShellTarget(state)).toBe('yesod');
  });
});

// ──────────────── maybeActivateShell ────────────────

describe('maybeActivateShell — threshold crossings', () => {
  it('does nothing while separation is below the first threshold (3)', () => {
    const state = makeState({}, { separation: 2 });
    const next = maybeActivateShell(state);
    expect(countShellsBy(next.shells, 'active')).toBe(0);
    expect(countShellsBy(next.shells, 'banished')).toBe(0);
  });

  it(`activates exactly one Shell when separation crosses ${SHELL_THRESHOLD_STEP}`, () => {
    const state = makeState({}, { separation: SHELL_THRESHOLD_STEP });
    const next = maybeActivateShell(state);
    expect(countShellsBy(next.shells, 'active')).toBe(1);
  });

  it('activates 2 Shells at separation 6, 3 at 9, 4 at 12', () => {
    for (const [sep, expected] of [
      [6, 2],
      [9, 3],
      [12, 4],
    ] as const) {
      const next = maybeActivateShell(makeState({}, { separation: sep }));
      expect(
        countShellsBy(next.shells, 'active') + countShellsBy(next.shells, 'banished'),
        `separation=${sep}`,
      ).toBe(expected);
    }
  });

  it('caps at 4 activations even at very high separation (game ends at 15)', () => {
    const next = maybeActivateShell(makeState({}, { separation: 30 }));
    expect(
      countShellsBy(next.shells, 'active') + countShellsBy(next.shells, 'banished'),
    ).toBe(4);
  });

  it('a single call activates exactly the shells the input separation demands (cascade across calls)', () => {
    // Each Shell activation now bumps Separation by +2 (the rule moved
    // into events.ts in #15). At sep=5, a single call has expected=1
    // and activates one Shell, raising Separation to 7. A *second*
    // call sees the new threshold (≥6) and activates another. That
    // cross-call cascade is intentional. The first call alone never
    // overshoots its input.
    const start = makeState({}, { separation: 5 });
    const after = maybeActivateShell(start);
    expect(countShellsBy(after.shells, 'active')).toBe(1);
    expect(after.separation).toBe(7);
    const next = maybeActivateShell(after);
    expect(countShellsBy(next.shells, 'active')).toBe(2);
  });
});

describe('maybeActivateShell — stillborn (already-cleared Sefirah)', () => {
  it('flips the target to `banished` instead of `active` when the Sefirah is cleared', () => {
    // The picker normally avoids cleared Sefirot (they have ≥1 Spark
    // count, dormant uncleared ones have 0). Stillborn fires only when
    // EVERY dormant Sefirah has been cleared by some player — then the
    // picker has no clean choice and lands on a cleared one.
    //
    // Cleanest setup: clear all 10 Sefirot (count = 1 across the board),
    // separation 3 → 1 activation. Tie-break by lowest-on-tree picks
    // Malkuth (number 10), which IS cleared → stillborn.
    const state = makeState(
      {
        clearedSefirot: new Set([
          'kether',
          'chokmah',
          'binah',
          'chesed',
          'gevurah',
          'tiferet',
          'netzach',
          'hod',
          'yesod',
          'malkuth',
        ]),
      },
      { separation: 3 },
    );
    const next = maybeActivateShell(state);
    expect(next.shells.malkuth).toBe('banished');
    expect(countShellsBy(next.shells, 'active')).toBe(0);
  });
});

describe('maybeActivateShell — Gevurah cancellations', () => {
  it('deflects an activation when a cancellation is available — Shell stays dormant', () => {
    const state = makeState({}, { separation: 3, shellCancellationsAvailable: 1 });
    const next = maybeActivateShell(state);
    // No Shell is active and none is banished — the threshold was
    // deflected. The deflected count carries the bookkeeping.
    expect(countShellsBy(next.shells, 'active')).toBe(0);
    expect(countShellsBy(next.shells, 'banished')).toBe(0);
    expect(next.shellsDeflected).toBe(1);
    expect(next.shellCancellationsAvailable).toBe(0);
  });

  it('only deflects what the cancellation pool covers — extra thresholds still fire', () => {
    const state = makeState({}, { separation: 9, shellCancellationsAvailable: 1 });
    const next = maybeActivateShell(state);
    // 3 thresholds crossed; 1 deflected (cancellation); 2 real activations.
    const real =
      countShellsBy(next.shells, 'active') + countShellsBy(next.shells, 'banished');
    expect(real).toBe(2);
    expect(next.shellsDeflected).toBe(1);
    expect(next.shellCancellationsAvailable).toBe(0);
  });
});

// ──────────────── banishShell ────────────────

describe('banishShell', () => {
  it('flips an active Shell to banished', () => {
    const state = makeState({}, { shells: { ...EMPTY_SHELL_STATE, yesod: 'active' } });
    const next = banishShell(state, 'yesod');
    expect(next.shells.yesod).toBe('banished');
  });

  it('flips a dormant Shell straight to banished (stillborn)', () => {
    const state = makeState();
    const next = banishShell(state, 'yesod');
    expect(next.shells.yesod).toBe('banished');
  });

  it('is a no-op on an already-banished Shell (returns same reference)', () => {
    const state = makeState({}, { shells: { ...EMPTY_SHELL_STATE, hod: 'banished' } });
    const next = banishShell(state, 'hod');
    expect(next).toBe(state);
  });
});

// ──────────────── Effect helpers ────────────────

describe('Shell effect helpers', () => {
  it('isShellActive returns true only when status is `active`', () => {
    const dormant = makeState();
    expect(isShellActive(dormant, 'kether')).toBe(false);

    const active = makeState({}, { shells: { ...EMPTY_SHELL_STATE, kether: 'active' } });
    expect(isShellActive(active, 'kether')).toBe(true);

    const banished = makeState({}, { shells: { ...EMPTY_SHELL_STATE, kether: 'banished' } });
    expect(isShellActive(banished, 'kether')).toBe(false);
  });

  // Per-Sefirah named helpers — each just delegates to isShellActive but
  // gives call sites a more readable name.
  const cases = [
    ['kether', isFragmentationActive],
    ['chokmah', isParalysisActive],
    ['binah', isDespairActive],
    ['chesed', isHoardingActive],
    ['gevurah', isCrueltyActive],
    ['tiferet', isVanityActive],
    ['netzach', isObsessionActive],
    ['hod', isDeceptionActive],
    ['yesod', isIllusionActive],
    ['malkuth', isInertiaActive],
  ] as const;

  it.each(cases)('%s named helper matches isShellActive', (key, helper) => {
    const active = makeState({}, { shells: { ...EMPTY_SHELL_STATE, [key]: 'active' } });
    expect(helper(active)).toBe(true);

    const dormant = makeState();
    expect(helper(dormant)).toBe(false);
  });
});
