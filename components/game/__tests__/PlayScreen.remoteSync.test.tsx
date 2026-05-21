import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import type { GameState } from '@/engine/types';

/**
 * Regression tests for the multiplayer turn-sync bug.
 *
 * Bug: when the active player ends their turn the server writes the new
 * GameState snapshot to `game_states`. Supabase Realtime fires on every
 * connected client. The play-page `useRoomState` hook picks up the update
 * and passes it as a new `initialState` to `<PlayScreen>`, but `useTurn`
 * ignores prop changes after mount because it seeds `useState` with a lazy
 * initializer. Non-active players are stuck on the old active player forever.
 *
 * Fix: a `remoteState` prop on `PlayScreen` that, when it changes, drives
 * `turn.setState` — the `replace-state` event path in the turn machine,
 * which already exists specifically for server-push scenarios.
 */

describe('PlayScreen — remote Realtime state sync (multiplayer bug fix)', () => {
  it('shows player 1 as active on initial render', () => {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    // makeFullGame seats p1 first and initializeGame always starts seat 0
    expect(state.activePlayerId).toBe('p1');

    render(
      <PlayScreen
        initialState={state}
        rng={seededRng(1)}
        roomCode="TEST"
        currentPlayerId="p2"
      />,
    );

    expect(document.body.textContent).toContain("Player 1's turn");
  });

  it('updates the active-player display when remoteState flips to the next player', () => {
    // Arrange: mount with p1 active (the initial state non-active clients
    // received when the page loaded).
    const p1ActiveState = makeFullGame({ playerCount: 2, seed: 1 });
    expect(p1ActiveState.activePlayerId).toBe('p1');

    // Simulate the Realtime-pushed state after player 1 ends their turn.
    // The server snapshot carries activePlayerId: 'p2'; we build it here
    // by direct field override (the engine's full endTurn path is tested
    // in engine/turn.test.ts — this test pins the UI-sync contract only).
    const p2ActiveState: GameState = { ...p1ActiveState, activePlayerId: 'p2' };

    const { rerender } = render(
      <PlayScreen
        initialState={p1ActiveState}
        rng={seededRng(1)}
        roomCode="TEST"
        currentPlayerId="p2"
        remoteState={p1ActiveState}
      />,
    );

    // Pre-push: player 1's turn is displayed.
    expect(document.body.textContent).toContain("Player 1's turn");

    // Act: Realtime fires — parent re-renders with the new snapshot.
    act(() => {
      rerender(
        <PlayScreen
          initialState={p1ActiveState}
          rng={seededRng(1)}
          roomCode="TEST"
          currentPlayerId="p2"
          remoteState={p2ActiveState}
        />,
      );
    });

    // Assert: the non-active player's screen now shows player 2's turn.
    expect(document.body.textContent).toContain("Player 2's turn");
    expect(document.body.textContent).not.toContain("Player 1's turn");
  });

  it('does not clobber active-player local changes when remoteState is undefined (hot-seat)', () => {
    // Hot-seat callers omit remoteState. There must be no effect wiring
    // that fires when remoteState is absent — specifically no accidental
    // setSnapshot({state: undefined}) call.
    const state = makeFullGame({ playerCount: 2, seed: 2 });

    const { rerender } = render(<PlayScreen initialState={state} rng={seededRng(2)} />);

    // Rerender without remoteState — should be a no-op for the turn machine.
    act(() => {
      rerender(<PlayScreen initialState={state} rng={seededRng(2)} />);
    });

    expect(document.body.textContent).toContain("Player 1's turn");
  });

  it('handles the initial remoteState push (same state as initialState) without flickering', () => {
    // The play page sets remoteState={gameState} from the first moment
    // PlayScreen mounts. The effect fires once on mount with the same state
    // that useTurn already holds — it must be idempotent (no crash, no
    // visible change).
    const state = makeFullGame({ playerCount: 2, seed: 3 });

    // No rerender needed — just confirm it mounts cleanly and shows the
    // right active player.
    render(
      <PlayScreen
        initialState={state}
        rng={seededRng(3)}
        roomCode="ROOM"
        currentPlayerId="p1"
        remoteState={state}
      />,
    );

    expect(document.body.textContent).toContain("Player 1's turn");
  });
});
