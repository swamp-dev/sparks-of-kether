import { describe, expect, it, vi, beforeEach } from 'vitest';
import type * as SupabaseModule from '@/lib/supabase';

let getUserResult: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'player-uid' } },
  error: null,
};
let roomResponse: { data: unknown; error: unknown } = { data: null, error: null };
let membershipResponse: { data: unknown; error: unknown } = { data: null, error: null };
let roomUpdateResult: { error: { message: string } | null } = { error: null };

let roomUpdates: unknown[] = [];

function makeServerClient() {
  return {
    auth: {
      getUser: vi.fn(async () => getUserResult),
    },
  };
}

function makeServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => roomResponse,
            }),
          }),
          update: (patch: unknown) => ({
            eq: (_col1: string, _val1: unknown) => ({
              eq: async (_col2: string, _val2: unknown) => {
                roomUpdates.push(patch);
                return roomUpdateResult;
              },
            }),
          }),
        };
      }
      if (table === 'players') {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              eq: () => ({
                maybeSingle: async () => membershipResponse,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected service-client table: ${table}`);
    },
  };
}

vi.mock('@/lib/supabase', async (importOriginal) => {
  const real = await importOriginal<typeof SupabaseModule>();
  return {
    ...real,
    createSupabaseServerClient: () => makeServerClient(),
    createSupabaseServiceClient: () => makeServiceClient(),
  };
});

function makeRequest(code: string): Request {
  return new Request(`http://localhost/api/rooms/${code}/pause`, {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
  });
}

describe('POST /api/rooms/[code]/pause', () => {
  beforeEach(() => {
    roomUpdates = [];
    getUserResult = { data: { user: { id: 'player-uid' } }, error: null };
    roomResponse = {
      data: {
        id: 'room-id',
        code: 'KETHR1',
        host_id: 'host-uid',
        state: 'playing',
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        finished_at: null,
        paused_at: null,
      },
      error: null,
    };
    membershipResponse = {
      data: { id: 'player-uid', room_id: 'room-id', nickname: 'Miriam' },
      error: null,
    };
    roomUpdateResult = { error: null };
  });

  it('returns 401 when no bearer token is provided', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/rooms/KETHR1/pause', { method: 'POST' });
    const res = await POST(req, { params: { code: 'KETHR1' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    getUserResult = { data: { user: null }, error: new Error('invalid') };
    const { POST } = await import('../route');
    const res = await POST(makeRequest('KETHR1'), { params: { code: 'KETHR1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when the room does not exist', async () => {
    roomResponse = { data: null, error: null };
    const { POST } = await import('../route');
    const res = await POST(makeRequest('NOPE12'), { params: { code: 'NOPE12' } });
    expect(res.status).toBe(404);
  });

  it('returns 409 when the room is not in playing state', async () => {
    roomResponse = {
      data: {
        id: 'room-id',
        code: 'KETHR1',
        host_id: 'host-uid',
        state: 'lobby',
        created_at: new Date().toISOString(),
        started_at: null,
        finished_at: null,
        paused_at: null,
      },
      error: null,
    };
    const { POST } = await import('../route');
    const res = await POST(makeRequest('KETHR1'), { params: { code: 'KETHR1' } });
    expect(res.status).toBe(409);
  });

  it('returns 403 when the caller is not a member of the room', async () => {
    membershipResponse = { data: null, error: null };
    const { POST } = await import('../route');
    const res = await POST(makeRequest('KETHR1'), { params: { code: 'KETHR1' } });
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates room state to paused on success', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest('KETHR1'), { params: { code: 'KETHR1' } });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(roomUpdates).toHaveLength(1);
    expect((roomUpdates[0] as Record<string, unknown>)['state']).toBe('paused');
    expect((roomUpdates[0] as Record<string, unknown>)['paused_at']).toBeTruthy();
  });
});
