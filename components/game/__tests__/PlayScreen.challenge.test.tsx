import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import { EMPTY_PENDING_MODIFIERS, type GameState } from '@/engine/types';

/**
 * #385 — Integration test for pass-path Continue on a challenge.
 *
 * Pre-fix: PlayScreen's `handleChallengeResolved` returned without
 * dispatching any engine event when the player clicked Continue on a
 * passed challenge. The snapshot stayed at
 * `phase='challenge', challengeSubPhase='react'` indefinitely while
 * the modal unmounted (because `showChallenge` also short-circuited on
 * `clearedSefirot.has(position)`), leaving the player UI-less.
 *
 * Post-fix: clicking Continue dispatches `react-continue` through the
 * `turn.reactContinue()` hook method; the engine clears the challenge
 * machinery and advances to `phase: 'end'`. The modal unmounts because
 * the engine actually transitioned out of 'challenge'.
 *
 * #502: pre-#502 the post-Continue phase was `'draw'`. With the
 * start-of-turn refill (and the discrete `'draw'` phase gone), the
 * post-Continue snapshot lands in `'end'` directly.
 */

function makePassReadyState(opts: {
  readonly destination: 'yesod';
}): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex(
    (p) => p.id === base.activePlayerId,
  );
  // Stat 20 + DC 12 base (no shortcut) = guaranteed pass on any d20.
  // Empty hand / no sparks so no burn affordances clutter the modal.
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: opts.destination,
          // Non-shortcut: arrival via path 30 (Hod ↔ Yesod, severity/
          // balance) so the DC is the base 12, no +3 penalty.
          lastArrivalPathNumber: 30,
          hand: [] as readonly number[],
          sparksHeld: new Set() as ReadonlySet<never>,
          stats: { ...p.stats, intuition: 20 },
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

describe('PlayScreen — pass + Continue advances phase out of challenge (#385)', () => {
  it('clicking Continue on a passed challenge unmounts the modal AND advances phase to end', () => {
    vi.useFakeTimers();
    try {
      const initial = makePassReadyState({ destination: 'yesod' });
      // Seed 1's first d20 is high; with stat 20 vs DC 12 every roll
      // passes regardless. The seed only affects which face appears
      // on the card; the pass/fail outcome is forced by the stat
      // margin.
      const rng = seededRng(1);
      render(<PlayScreen initialState={initial} rng={rng} />);

      // Sanity: the encounter modal is mounted.
      expect(
        document.querySelector('[data-encounter-screen]'),
      ).not.toBeNull();
      // Phase wrapper data attribute reflects 'challenge'.
      expect(
        document
          .querySelector('[data-play-screen]')
          ?.getAttribute('data-phase'),
      ).toBe('challenge');

      // Click Roll — the Roll button is in the prep panel.
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      // Drive past the resolve animation.
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // The verdict is now visible; on a guaranteed pass the
      // Continue button has data-action="continue" (vs. the fail
      // branch which renders Retry / Accept buttons).
      const continueBtn = document.querySelector('[data-action="continue"]');
      if (!continueBtn) {
        throw new Error(
          'test setup: expected pass branch (stat 20 vs DC 12) but no ' +
            'Continue button rendered. The seeded d20 must have produced ' +
            'a fail somehow, or the verdict-reveal selector changed. ' +
            'Inspect [data-encounter-screen] to see the actual UI.',
        );
      }

      // Click Continue.
      act(() => {
        fireEvent.click(continueBtn as HTMLButtonElement);
      });

      // #502: after the click, modal unmounted, phase is now `'end'`
      // (pre-#502 this was `'draw'`).
      expect(document.querySelector('[data-encounter-screen]')).toBeNull();
      expect(
        document
          .querySelector('[data-play-screen]')
          ?.getAttribute('data-phase'),
      ).toBe('end');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the cleared Sefirah is recorded in the player after Continue (engine-side invariant)', () => {
    // Defensive: the engine adds the position to clearedSefirot at
    // prep-confirm (engine/checks.ts:447), not at react-continue. This
    // test pins that the cleared-set is intact post-Continue (a
    // future refactor that moved the clear to react-continue would
    // break this).
    vi.useFakeTimers();
    try {
      const initial = makePassReadyState({ destination: 'yesod' });
      const rng = seededRng(1);
      render(<PlayScreen initialState={initial} rng={rng} />);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      const continueBtn = document.querySelector('[data-action="continue"]');
      if (!continueBtn) {
        throw new Error(
          'test setup: expected pass branch but no Continue button rendered.',
        );
      }
      act(() => {
        fireEvent.click(continueBtn as HTMLButtonElement);
      });

      // The Tree marks the cleared Sefirah with data-cleared="true"
      // (TreeBoard.tsx:534). This couples to the engine's
      // post-Continue snapshot (clearedSefirot) without poking
      // private state — and confirms the engine carries
      // clearedSefirot through the react-continue teardown.
      const yesodNode = document.querySelector('[data-sefirah="yesod"]');
      expect(yesodNode).not.toBeNull();
      expect(yesodNode?.getAttribute('data-cleared')).toBe('true');
    } finally {
      vi.useRealTimers();
    }
  });
});
