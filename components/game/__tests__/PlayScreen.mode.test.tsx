import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import { EMPTY_PENDING_MODIFIERS, type GameState } from '@/engine/types';

/**
 * #278 — `EncounterScreen.mode` was hard-coded to `'hot-seat'` in
 * PlayScreen at the prep-modal mount point. The multiplayer dispatch
 * path (per-step `prep-add-modifier` events) is built and unit-tested
 * inside `EncounterScreen` (#275) but never exercised through the
 * orchestrator route.
 *
 * Contract pinned by these tests:
 *
 *   - PlayScreen accepts an optional `roomCode?: string` prop. Its
 *     presence flips the rendered EncounterScreen into multiplayer
 *     mode; its absence keeps the hot-seat default.
 *   - Multiplayer mode requires `player` per the discriminated-union
 *     props from #275 — PlayScreen must always pass the active player
 *     into EncounterScreen so this constraint is satisfied.
 *   - In multiplayer mode, each modifier change dispatches a
 *     `prep-add-modifier` (or `prep-remove-modifier`) event through
 *     `useTurn` so allies see staging in real time. The engine
 *     reducer rejects events outside `prep`, so the dispatch landing
 *     in `state.pendingModifiers` is the per-step round-trip.
 *
 * The full real-Realtime e2e through a `/rooms/[code]/play` route
 * lives downstream of #325 (joinRoom RLS fix). These tests pin the
 * mode-derivation + dispatch-wire contract here; an integration test
 * that exercises the same events through `applyClientAction` in
 * `lib/room-actions.ts` already covers the wire-format end of the
 * pipe.
 */

/**
 * Build a game state parked at Gevurah (DC 15) in `'challenge'` /
 * `'prep'` so the EncounterScreen renders the prep panel and its
 * stepper buttons. Active player has a 3-card hand so the card-burn
 * stepper has something to consume.
 */
function makeChallengeState(): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 1 });
  const activeIdx = base.players.findIndex((p) => p.id === base.activePlayerId);
  const players = base.players.map((p, idx) =>
    idx === activeIdx
      ? {
          ...p,
          position: 'gevurah' as const,
          hand: [0, 1, 2] as readonly number[],
          sparksHeld: new Set() as ReadonlySet<never>,
          stats: { ...p.stats, strength: 12 },
        }
      : p,
  );
  return {
    ...base,
    players,
    phase: 'challenge',
    challengeSubPhase: 'prep',
    pendingModifiers: EMPTY_PENDING_MODIFIERS,
    lastOutcome: undefined,
  };
}

describe('PlayScreen — EncounterScreen mode derivation (#278)', () => {
  it('renders EncounterScreen with mode="hot-seat" when no roomCode is supplied', () => {
    const initial = makeChallengeState();
    render(<PlayScreen initialState={initial} rng={seededRng(3)} />);

    const screenEl = document.querySelector('[data-encounter-screen]');
    expect(screenEl).not.toBeNull();
    expect(screenEl?.getAttribute('data-mode')).toBe('hot-seat');
  });

  it('renders EncounterScreen with mode="multiplayer" when roomCode is supplied', () => {
    const initial = makeChallengeState();
    render(<PlayScreen initialState={initial} rng={seededRng(3)} roomCode="ABCD" />);

    const screenEl = document.querySelector('[data-encounter-screen]');
    expect(screenEl).not.toBeNull();
    expect(screenEl?.getAttribute('data-mode')).toBe('multiplayer');
  });

  it('multiplayer card-burn stepper dispatches prep-add-modifier through useTurn', () => {
    // The card-burn stepper's `+` button in multiplayer mode must
    // dispatch `prep-add-modifier` through `useTurn`. The reducer
    // landing in `state.pendingModifiers.cardBurns` is the
    // observable proof the per-step event reached the wire layer.
    //
    // Observable DOM signal: EncounterScreen renders the
    // `[data-cumulative-burns]` block only when
    // `pendingModifiers.cardBurns.length > 0` (the `isRetry` flag in
    // the prep panel — surfaces "X cards burned, +Y modifier"
    // copy so a player on a retry sees what's locked in). Pre-click
    // the engine is fresh (`pendingModifiers.cardBurns` is empty);
    // after one stepper click in multiplayer mode the dispatch
    // appends to `pendingModifiers.cardBurns` and the block
    // appears. In hot-seat the dispatch is deferred to Roll and
    // the block stays absent.
    const initial = makeChallengeState();
    render(<PlayScreen initialState={initial} rng={seededRng(3)} roomCode="ABCD" />);

    // Pre-click: engine has no pending burns; the cumulative-burns
    // hint is absent.
    expect(document.querySelector('[data-cumulative-burns]')).toBeNull();

    const incBtn = document.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement | null;
    expect(incBtn).not.toBeNull();
    if (!incBtn) return;
    act(() => {
      fireEvent.click(incBtn);
    });

    // Post-click: dispatch landed on `pendingModifiers.cardBurns`,
    // so the cumulative-burns hint is now rendered. This is the
    // contract that pins the per-step round-trip — without the
    // multiplayer dispatch the engine sees no event and this
    // element never mounts.
    expect(document.querySelector('[data-cumulative-burns]')).not.toBeNull();
  });

  it('hot-seat card-burn stepper does NOT dispatch until Roll (counter-example)', () => {
    // Counter-example: in hot-seat mode the stepper updates only
    // local UI state. The engine sees no `prep-add-modifier` event
    // until Roll — at which point `submitChallenge` synthesizes the
    // burn events and confirms in one shot. So the
    // `[data-cumulative-burns]` block stays absent across stepper
    // clicks. A regression that accidentally dispatches in
    // hot-seat too would mount the block and this test catches it
    // (and would also double-count burns at Roll once
    // `submitChallenge` synthesizes them on top of the
    // already-staged dispatches).
    const initial = makeChallengeState();
    render(<PlayScreen initialState={initial} rng={seededRng(3)} />);

    expect(document.querySelector('[data-cumulative-burns]')).toBeNull();

    const incBtn = document.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement | null;
    expect(incBtn).not.toBeNull();
    if (!incBtn) return;
    act(() => {
      fireEvent.click(incBtn);
    });

    // Hot-seat default still in force AND the engine never saw an
    // event — the cumulative-burns block stays absent.
    const screenEl = document.querySelector('[data-encounter-screen]');
    expect(screenEl?.getAttribute('data-mode')).toBe('hot-seat');
    expect(document.querySelector('[data-cumulative-burns]')).toBeNull();
  });
});
