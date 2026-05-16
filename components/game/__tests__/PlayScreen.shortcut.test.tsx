import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import { EMPTY_PENDING_MODIFIERS, type GameState } from '@/engine/types';

/**
 * Code-review fix (E3, #228): the `shortcut` flag was never populated
 * on `ChallengeContext` — `buildChallengeContext` returned a context
 * with no `shortcut` field, so `acceptChallengeSetback` always saw
 * `shortcut: false` and applied +1 Separation instead of the
 * design-mandated +2 on shortcut failures.
 *
 * The fix derives `shortcut` from the path the player just travelled
 * (`PlayerState.lastArrivalPathNumber`, set by `engine/movement.ts:applyMove`).
 * A path is a shortcut iff its `pillarsCrossed` is `['balance', 'balance']`
 * — i.e. paths 13 (Kether↔Tiferet), 25 (Tiferet↔Yesod), 32 (Yesod↔Malkuth).
 */

/**
 * Build a state where the active player has just travelled the named
 * path and is parked at the destination's `'prep'` challenge sub-phase
 * with miserable stats, so a Roll click is a guaranteed fail.
 *
 * Yesod is the destination — DC 12 base, +3 with shortcut = 15. Stat
 * 1 means total is at most 1 + 20 = 21; the seeded RNG (seed 1) rolls
 * a low value first, so we get a fail without needing to fight the rng.
 */
function makePrepState(opts: {
  readonly arrivalPath: number;
  readonly destination: 'yesod';
}): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: opts.destination,
          lastArrivalPathNumber: opts.arrivalPath,
          // Empty hand and no sparks so the prep panel has no burn
          // affordances to interact with — the tests just want to
          // click Roll.
          hand: [] as readonly number[],
          sparksHeld: new Set() as ReadonlySet<never>,
          // Stat 1: with even d20=13 (the highest fail roll vs DC 15)
          // total is 14 < 15. With shortcut+3 the player is going to
          // fail across most of the d20 range.
          stats: { ...p.stats, intuition: 1 },
        }
      : { ...p, position: opts.destination },
  );
  return {
    ...base,
    players,
    phase: 'challenge',
    challengeSubPhase: 'prep',
    pendingModifiers: EMPTY_PENDING_MODIFIERS,
    lastOutcome: undefined,
    separation: 0,
  };
}

describe('PlayScreen — shortcut flag drives EncounterScreen DC penalty', () => {
  it('renders the +3 shortcut DC penalty in the encounter header when arrival was via a shortcut path', () => {
    const initial = makePrepState({
      destination: 'yesod',
      arrivalPath: 25, // Tiferet→Yesod, balance/balance — shortcut
    });
    const rng = seededRng(3);
    render(<PlayScreen initialState={initial} rng={rng} />);

    // The header includes "(shortcut +3)" when context.shortcut is true.
    expect(screen.getByText(/shortcut \+3/i)).toBeInTheDocument();
  });

  it('does NOT render the shortcut DC penalty when arrival was via a non-shortcut path', () => {
    const initial = makePrepState({
      destination: 'yesod',
      arrivalPath: 30, // Hod→Yesod, severity/balance — NOT a shortcut
    });
    const rng = seededRng(3);
    render(<PlayScreen initialState={initial} rng={rng} />);

    expect(screen.queryByText(/shortcut \+3/i)).toBeNull();
  });

  it('does NOT render the shortcut DC penalty when lastArrivalPathNumber is undefined (fresh state)', () => {
    // Defensive: PlayerState's `lastArrivalPathNumber` is optional. A
    // freshly-initialised player who somehow lands in challenge phase
    // without a recorded arrival path falls through to non-shortcut.
    const base = makeFullGame({ playerCount: 2, seed: 1 });
    const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? {
            ...p,
            position: 'yesod' as const,
            // Explicitly do NOT set lastArrivalPathNumber.
            hand: [] as readonly number[],
            sparksHeld: new Set() as ReadonlySet<never>,
            stats: { ...p.stats, intuition: 10 },
          }
        : { ...p, position: 'yesod' as const },
    );
    const initial: GameState = {
      ...base,
      players,
      phase: 'challenge',
      challengeSubPhase: 'prep',
      pendingModifiers: EMPTY_PENDING_MODIFIERS,
      lastOutcome: undefined,
    };
    const rng = seededRng(3);
    render(<PlayScreen initialState={initial} rng={rng} />);

    expect(screen.queryByText(/shortcut \+3/i)).toBeNull();
  });
});

describe('PlayScreen — shortcut accept-setback applies +2 Separation', () => {
  it('Separation rises by 2 when the active player accepts a shortcut-path failure', () => {
    vi.useFakeTimers();
    try {
      const initial = makePrepState({
        destination: 'yesod',
        arrivalPath: 25, // shortcut
      });
      const rng = seededRng(1);
      render(<PlayScreen initialState={initial} rng={rng} />);

      // Pre-roll: Separation starts at 0.
      const sepReadout = (): Element | null =>
        document.querySelector('[data-meter-readout="separation"]');
      expect(sepReadout()?.textContent?.startsWith('0 ')).toBe(true);

      // Click Roll. With stat=1 and effective DC=15 (12+3), the seeded
      // RNG produces a failure for most rolls — verify the result
      // dynamically rather than hardcoding the d20 face.
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      // Drive past the resolve animation (800ms in default-motion mode).
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // The react sub-phase should now be visible. If the seeded roll
      // happened to pass against a stat-1 vs DC-15 setup, the test
      // setup is wrong and we should bail loudly rather than silently
      // pass on the wrong branch.
      const acceptBtn = document.querySelector('[data-fail-choice="accept"]');
      if (!acceptBtn) {
        throw new Error(
          'test setup (seed 1, stat=1, DC 12+3=15 shortcut): the ' +
            'first d20 the seeded rng produces was high enough to pass ' +
            '— total ≥ 15. ChallengeModal calls rng.d20() once on the ' +
            'Roll click. If the seed changes (or assist-stats / shells ' +
            'introduce earlier rng draws), pick a seed whose first ' +
            'd20 face is < 14 so total = 1 + roll < 15.',
        );
      }

      act(() => {
        fireEvent.click(acceptBtn as HTMLButtonElement);
      });

      // Pre-fix this would be "1 / ..." (the silent +1 default the
      // missing shortcut field produced). Post-fix the +2 shortcut tax
      // applies.
      expect(sepReadout()?.textContent?.startsWith('2 ')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  // ──────── #280: position rollback on shortcut failure ────────
  //
  // design/mechanics.md § Shortcuts: a shortcut-path failure pushes
  // the player back to the Sefirah they came from. Pre-#280 only the
  // +2 Separation tick fired; the player remained parked at the
  // destination. This test pins the rollback at the integration
  // boundary — the engine state mutation surfaces in TreeBoard's
  // `aria-label` text on the active player's token.
  it('rolls the active player back to the origin Sefirah when accepting a shortcut failure', () => {
    vi.useFakeTimers();
    try {
      const initial = makePrepState({
        destination: 'yesod',
        arrivalPath: 25, // shortcut Tiferet→Yesod
      });
      const rng = seededRng(1);
      render(<PlayScreen initialState={initial} rng={rng} />);

      // Resolve the prep modifiers + roll the d20.
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      const acceptBtn = document.querySelector('[data-fail-choice="accept"]');
      if (!acceptBtn) {
        throw new Error(
          'test setup (seed 1, stat=1, DC 12+3=15 shortcut): the ' +
            'seeded d20 rolled high enough to pass — total ≥ 15. ' +
            'PlayScreen prep-confirm consumes one rng value before ' +
            'the d20, so if the seed changes you may need to retune. ' +
            'Pick a seed whose first non-bookkeeping rng value yields ' +
            'a d20 < 14 so total = 1 + roll < 15.',
        );
      }
      act(() => {
        fireEvent.click(acceptBtn as HTMLButtonElement);
      });

      // After the rollback, the active player's token aria-label
      // should read "... at Beauty" (Tiferet) — not "at Foundation"
      // (Yesod). Query via the accessible role + name (TreeBoard
      // renders the active token as an SVG group with role="img"
      // and an aria-label that contains "(active turn)"); getByRole
      // couples to semantics rather than DOM structure.
      const activeToken = screen.getByRole('img', {
        name: /\(active turn\)/,
      });
      expect(activeToken.getAttribute('aria-label')).toMatch(/at Beauty/);
      expect(activeToken.getAttribute('aria-label')).not.toMatch(/at Foundation/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT roll back the active player on a non-shortcut failure', () => {
    vi.useFakeTimers();
    try {
      const initial = makePrepState({
        destination: 'yesod',
        arrivalPath: 30, // NOT a shortcut (Hod ↔ Yesod)
      });
      // Seed 13: after EncounterScreen consumes 2 `rng.int(0, 2)` draws
      // (one each for `pickPlayerResponse` #277 and `pickFraming` #478)
      // before the Roll click, `rollCheck` sees d20=2 — total 1+2=3 < 12,
      // guaranteed fail. Was seed 7 pre-#478 (which produced d20=1 with
      // a single prior int draw); update both the seed and any future
      // pre-d20 rng-draw additions in the same place.
      const rng = seededRng(13);
      render(<PlayScreen initialState={initial} rng={rng} />);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      const acceptBtn = document.querySelector('[data-fail-choice="accept"]');
      if (!acceptBtn) {
        throw new Error(
          'test setup (seed 13, stat=1, DC 12 non-shortcut): the ' +
            'first d20 the seeded rng produces was high enough to pass ' +
            '— total ≥ 12. Seed 13 was chosen because, after the two ' +
            'pre-d20 `rng.int(0, 2)` draws EncounterScreen consumes ' +
            '(pickPlayerResponse #277 + pickFraming #478), the d20 face ' +
            'is 2 — total 1 + 2 = 3 < 12. If new pre-d20 rng draws are ' +
            'added (more matrices, shells, assist-stats), pick a fresh ' +
            'seed whose post-draw d20 face is ≤ 10.',
        );
      }
      act(() => {
        fireEvent.click(acceptBtn as HTMLButtonElement);
      });

      // Non-shortcut: the player stays at Yesod (Foundation).
      // Query via the accessible role + name so the assertion
      // couples to semantics rather than DOM structure.
      const activeToken = screen.getByRole('img', {
        name: /\(active turn\)/,
      });
      expect(activeToken.getAttribute('aria-label')).toMatch(/at Foundation/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Separation rises by 1 when arrival was via a non-shortcut path (control)', () => {
    vi.useFakeTimers();
    try {
      const initial = makePrepState({
        destination: 'yesod',
        arrivalPath: 30, // NOT a shortcut
      });
      // Seed 13 produces d20=2 (after the 2 pre-Roll int draws — see
      // sibling test above) — guarantees fail vs DC 12 (stat 1 + 2 = 3 < 12).
      // With seed 1 (post-draw d20 high) the non-shortcut path passes
      // (1+13=14 vs DC 12) even though the same roll fails on the
      // shortcut path (vs DC 15).
      // Seed 13: after EncounterScreen consumes 2 `rng.int(0, 2)` draws
      // (one each for `pickPlayerResponse` #277 and `pickFraming` #478)
      // before the Roll click, `rollCheck` sees d20=2 — total 1+2=3 < 12,
      // guaranteed fail. Was seed 7 pre-#478 (which produced d20=1 with
      // a single prior int draw); update both the seed and any future
      // pre-d20 rng-draw additions in the same place.
      const rng = seededRng(13);
      render(<PlayScreen initialState={initial} rng={rng} />);

      const sepReadout = (): Element | null =>
        document.querySelector('[data-meter-readout="separation"]');
      expect(sepReadout()?.textContent?.startsWith('0 ')).toBe(true);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      const acceptBtn = document.querySelector('[data-fail-choice="accept"]');
      if (!acceptBtn) {
        throw new Error(
          'test setup (seed 13, stat=1, DC 12 non-shortcut): the ' +
            'first d20 the seeded rng produces was high enough to pass ' +
            '— total ≥ 12. Seed 13 was chosen because, after the two ' +
            'pre-d20 `rng.int(0, 2)` draws EncounterScreen consumes ' +
            '(pickPlayerResponse #277 + pickFraming #478), the d20 face ' +
            'is 2 — total 1 + 2 = 3 < 12. If new pre-d20 rng draws are ' +
            'added (more matrices, shells, assist-stats), pick a fresh ' +
            'seed whose post-draw d20 face is ≤ 10.',
        );
      }

      act(() => {
        fireEvent.click(acceptBtn as HTMLButtonElement);
      });

      expect(sepReadout()?.textContent?.startsWith('1 ')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
