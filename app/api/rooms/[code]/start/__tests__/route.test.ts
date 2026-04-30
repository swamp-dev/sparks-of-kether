import { describe, expect, it, vi, beforeEach } from 'vitest';
import type * as SupabaseModule from '@/lib/supabase';

/**
 * Mocks both Supabase clients so the route runs end-to-end against
 * controllable in-memory responses. Captures inserts/updates so the
 * tests can assert what got written.
 */

let getUserResult: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'host-uid' } },
  error: null,
};
let roomResponse: { data: unknown; error: unknown } = { data: null, error: null };
let playersResponse: { data: unknown; error: unknown } = { data: [], error: null };

let snapshotInsertResult: { error: { code?: string; message: string } | null } = {
  error: null,
};
let roomUpdateResult: { error: { message: string } | null } = { error: null };
let snapshotDeleteResult: { error: { message: string } | null } = { error: null };

let snapshotInserts: unknown[] = [];
let roomUpdates: unknown[] = [];
let snapshotDeletes = 0;

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
      if (table === 'players') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => playersResponse,
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
      if (table === 'game_states') {
        return {
          insert: async (row: unknown) => {
            snapshotInserts.push(row);
            return snapshotInsertResult;
          },
          delete: () => ({
            eq: async () => {
              snapshotDeletes += 1;
              return snapshotDeleteResult;
            },
          }),
        };
      }
      if (table === 'rooms') {
        return {
          update: (patch: unknown) => ({
            eq: async () => {
              roomUpdates.push(patch);
              return roomUpdateResult;
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

const validRoom = {
  id: 'room-uuid',
  code: 'ABCDEF',
  host_id: 'host-uid',
  state: 'lobby' as const,
  created_at: 't',
  started_at: null,
  finished_at: null,
};

const validPlayers = [
  {
    id: 'host-uid',
    room_id: 'room-uuid',
    nickname: 'Andy',
    zodiac_sign: 'aries',
    ready: true,
    seat: 0,
    joined_at: 't',
  },
  {
    id: 'p2',
    room_id: 'room-uuid',
    nickname: 'Bea',
    zodiac_sign: 'leo',
    ready: true,
    seat: 1,
    joined_at: 't',
  },
];

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/rooms/ABCDEF/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('POST /api/rooms/[code]/start', () => {
  beforeEach(() => {
    getUserResult = { data: { user: { id: 'host-uid' } }, error: null };
    roomResponse = { data: validRoom, error: null };
    playersResponse = { data: validPlayers, error: null };
    snapshotInsertResult = { error: null };
    roomUpdateResult = { error: null };
    snapshotDeleteResult = { error: null };
    snapshotInserts = [];
    roomUpdates = [];
    snapshotDeletes = 0;
  });

  it('returns 401 when bearer header is missing', async () => {
    const res = await POST(makeRequest(), { params: { code: 'ABCDEF' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 when getUser rejects the token', async () => {
    getUserResult = { data: { user: null }, error: { message: 'jwt expired' } };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not the host', async () => {
    getUserResult = { data: { user: { id: 'p2' } }, error: null };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { reason: { kind: string } };
    expect(body.reason.kind).toBe('not-host');
    expect(snapshotInserts).toHaveLength(0);
  });

  it('returns 409 when room is already playing', async () => {
    roomResponse = {
      data: { ...validRoom, state: 'playing' },
      error: null,
    };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { reason: { kind: string } };
    expect(body.reason.kind).toBe('not-lobby');
    expect(snapshotInserts).toHaveLength(0);
  });

  it('returns 422 when a player has no zodiac_sign', async () => {
    playersResponse = {
      data: [
        validPlayers[0],
        { ...validPlayers[1], zodiac_sign: null },
      ],
      error: null,
    };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      reason: { kind: string; playerIds: string[] };
    };
    expect(body.reason.kind).toBe('missing-zodiac-sign');
    expect(body.reason.playerIds).toEqual(['p2']);
    expect(snapshotInserts).toHaveLength(0);
  });

  it('returns 200 + writes snapshot + transitions room state on happy path', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(200);
    expect(snapshotInserts).toHaveLength(1);
    const inserted = snapshotInserts[0] as {
      room_id: string;
      last_event_id: number;
      snapshot: { activePlayerId: string };
    };
    expect(inserted.room_id).toBe('room-uuid');
    expect(inserted.last_event_id).toBe(0);
    expect(inserted.snapshot.activePlayerId).toBe('host-uid');

    expect(roomUpdates).toHaveLength(1);
    const updated = roomUpdates[0] as { state: string; started_at: string };
    expect(updated.state).toBe('playing');
    expect(typeof updated.started_at).toBe('string');
  });

  it('returns 409 already-started when game_states INSERT hits unique_violation', async () => {
    snapshotInsertResult = {
      error: { code: '23505', message: 'duplicate key' },
    };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('already-started');
    expect(roomUpdates).toHaveLength(0);
  });

  it('returns 422 too-few-players when only the host is in the room', async () => {
    playersResponse = {
      data: [validPlayers[0]],
      error: null,
    };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { reason: { kind: string } };
    expect(body.reason.kind).toBe('too-few-players');
    expect(snapshotInserts).toHaveLength(0);
  });

  it('returns 422 duplicate-zodiac-signs when two players share a sign', async () => {
    playersResponse = {
      data: [
        validPlayers[0],
        { ...validPlayers[1], zodiac_sign: 'aries' }, // same as host
      ],
      error: null,
    };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { reason: { kind: string } };
    expect(body.reason.kind).toBe('duplicate-zodiac-signs');
    expect(snapshotInserts).toHaveLength(0);
  });

  it('rolls back the snapshot insert when the room state UPDATE fails', async () => {
    // Recovery path: snapshot inserted but room update errors. The
    // route must DELETE the orphan game_states row so the host can
    // retry without hitting `already-started` (23505).
    roomUpdateResult = { error: { message: 'connection reset' } };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: string;
      recovered: boolean;
    };
    expect(body.error).toBe('room-state-update-failed');
    expect(body.recovered).toBe(true);
    // The orphan game_states row was deleted.
    expect(snapshotDeletes).toBe(1);
  });

  it('reports recovered:false when the rollback DELETE itself fails', async () => {
    roomUpdateResult = { error: { message: 'connection reset' } };
    snapshotDeleteResult = { error: { message: 'still down' } };
    const res = await POST(makeRequest({ authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { recovered: boolean };
    expect(body.recovered).toBe(false);
  });
});
