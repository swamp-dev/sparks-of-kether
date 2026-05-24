import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import type * as SupabaseLib from '@/lib/supabase';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';
import type { GameState } from '@/engine/types';

/**
 * Regression tests for the multiplayer dispatch wiring in PlayScreen (#270).
 *
 * Root cause: PlayScreen called useTurn({ initialState, rng }) without
 * providing dispatchClientAction or selfPlayerId. Even after endTurn was
 * fixed to call dispatch, the options bag never carried it, so all
 * multiplayer write-through silently no-oped.
 *
 * Fix: PlayScreen creates a fire-and-forget fetch dispatch when roomCode
 * is set, and passes it (with selfPlayerId: currentPlayerId) to useTurn.
 */

// Stub the Supabase browser client so the dispatch function gets a token
// without hitting the network.
vi.mock('@/lib/supabase', async (importOriginal) => {
  const real = await importOriginal<typeof SupabaseLib>();
  return {
    ...real,
    getSupabaseBrowserClient: () => ({
      auth: {
        getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
      },
    }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlayScreen — multiplayer dispatch wiring (#270)', () => {
  it('POSTs end-turn to the events API when the active player clicks End Turn', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, eventId: 1 }), { status: 200 }));

    const baseState = makeFullGame({ playerCount: 2, seed: 1 });
    // makeFullGame starts with p1 active. Set meditatedThisTurn so the
    // "End turn" button renders without requiring a move first.
    const state: GameState = { ...baseState, meditatedThisTurn: true };
    expect(state.activePlayerId).toBe('p1');

    render(
      <PlayScreen
        initialState={state}
        rng={seededRng(1)}
        roomCode="ABCD"
        currentPlayerId="p1"
        remoteState={state}
      />,
    );

    const endTurnButton = document.querySelector('[data-action="end-turn"]') as HTMLButtonElement;
    expect(endTurnButton).not.toBeNull();
    expect(endTurnButton.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(endTurnButton);
      // Flush the async session fetch inside dispatchClientAction.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/rooms/ABCD/events');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      kind: 'end-turn',
      playerId: 'p1',
    });
  });

  it('does NOT call fetch when roomCode is absent (hot-seat mode)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const baseState = makeFullGame({ playerCount: 2, seed: 1 });
    const state: GameState = { ...baseState, meditatedThisTurn: true };

    // Hot-seat: no roomCode, no currentPlayerId.
    render(<PlayScreen initialState={state} rng={seededRng(1)} />);

    const endTurnButton = document.querySelector('[data-action="end-turn"]') as HTMLButtonElement;
    expect(endTurnButton).not.toBeNull();

    await act(async () => {
      fireEvent.click(endTurnButton);
      await Promise.resolve();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
