import { describe, expect, it, vi, beforeEach } from 'vitest';
import type * as SupabaseModule from '@/lib/supabase';

/**
 * Tests for POST /api/rooms/[code]/reset.
 *
 * The route is host-only and resets a room to lobby state by:
 *   1. Deleting all game_events rows for the room.
 *   2. Deleting the game_states row for the room.
 *   3. Setting all players' ready = false.
 *   4. Setting rooms.state = 'lobby', started_at = null, finished_at = null.
 */

let getUserResult: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'host-uid' } },
  error: null,
};
let roomResponse: { data: unknown; error: unknown } = { data: null, error: null };
let roomResetResult: { error: { message: string } | null } = { error: null };

let gameEventsDeletes = 0;
let gameStatesDeletes = 0;
let playersUpdates: unknown[] = [];
let roomUpdates: unknown[] = [];

function makeServerClient() {
  return {
    auth: {
      getUser: vi.fn(async () => getUserResult),
      setSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
    from: (table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => roomResponse,
            }),
          }),
        };
      }
      throw new Error(`unexpected server-client table: ${table}`);
    },
  };
}

function makeServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'game_events') {
        return {
          delete: () => ({
            eq: async () => {
              gameEventsDeletes += 1;
              return { error: null };
            },
          }),
        };
      }
      if (table === 'game_states') {
        return {
          delete: () => ({
            eq: async () => {
              gameStatesDeletes += 1;
              return { error: null };
            },
          }),
        };
      }
      if (table === 'players') {
        return {
          update: (patch: unknown) => ({
            eq: async () => {
              playersUpdates.push(patch);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'rooms') {
        return {
          update: (patch: unknown) => ({
            eq: async () => {
              roomUpdates.push(patch);
              return roomResetResult;
            },
          }),
        };
      }
      throw new Error(`unexpected service-client table: ${table}`);
    },
  };
}

vi.mock('@/lib/supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    createSupabaseServerClient: () => makeServerClient(),
    createSupabaseServiceClient: () => makeServiceClient(),
  };
});

import { POST } from '../route';

const playingRoom = {
  id: 'room-uuid',
  code: 'ABCDEF',
  host_id: 'host-uid',
  state: 'playing' as const,
  created_at: 't',
  started_at: '2026-01-01T00:00:00Z',
  finished_at: null,
};

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/rooms/ABCDEF/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('POST /api/rooms/[code]/reset', () => {
  beforeEach(() => {
    getUserResult = { data: { user: { id: 'host-uid' } }, error: null };
    roomResponse = { data: playingRoom, error: null };
    roomResetResult = { error: null };
    gameEventsDeletes = 0;
    gameStatesDeletes = 0;
    playersUpdates = [];
    roomUpdates = [];
  });

  it('returns 401 when bearer header is missing', async () => {
    const res = await POST(makeRequest(), { params: { code: 'ABCDEF' } });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('missing-bearer-token');
  });

  it('returns 401 when getUser rejects the token', async () => {
    getUserResult = { data: { user: null }, error: { message: 'jwt expired' } };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid-token');
  });

  it('returns 404 when room does not exist', async () => {
    roomResponse = { data: null, error: null };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not the host', async () => {
    getUserResult = { data: { user: { id: 'p2' } }, error: null };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('not-host');
    expect(gameEventsDeletes).toBe(0);
    expect(gameStatesDeletes).toBe(0);
    expect(roomUpdates).toHaveLength(0);
  });

  it('returns 200 and writes all reset operations on success', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    expect(gameEventsDeletes).toBe(1);
    expect(gameStatesDeletes).toBe(1);
    expect(playersUpdates).toHaveLength(1);
    expect(playersUpdates[0]).toEqual({ ready: false });
    expect(roomUpdates).toHaveLength(1);
    expect(roomUpdates[0]).toEqual({
      state: 'lobby',
      started_at: null,
      finished_at: null,
    });
  });

  it('resets a lobby-state room idempotently', async () => {
    roomResponse = {
      data: {
        ...playingRoom,
        state: 'lobby' as const,
        started_at: null,
      },
      error: null,
    };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(200);
    expect(gameEventsDeletes).toBe(1);
    expect(gameStatesDeletes).toBe(1);
    expect(roomUpdates).toHaveLength(1);
  });

  it('returns 500 when the rooms update fails', async () => {
    roomResetResult = { error: { message: 'db error' } };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; cause: string };
    expect(body.error).toBe('reset-failed');
    expect(body.cause).toBe('db error');
  });
});
