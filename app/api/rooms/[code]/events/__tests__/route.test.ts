import { describe, expect, it, vi, beforeEach } from 'vitest';
import type * as SupabaseModule from '@/lib/supabase';

/**
 * Mocking strategy: stub both Supabase factories so the route can be
 * exercised without a live project. The fakes capture call args so
 * tests can assert the route reaches (or refuses to reach) each
 * Supabase call site.
 */

let getUserResult: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'caller-uid' } },
  error: null,
};
let setSessionCalls: { access_token: string; refresh_token: string }[] = [];
let serviceClientCreated = false;

vi.mock('@/lib/supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    createSupabaseServerClient: () => ({
      auth: {
        getUser: vi.fn(async () => getUserResult),
        setSession: vi.fn(async (args: { access_token: string; refresh_token: string }) => {
          setSessionCalls.push(args);
          return { data: { session: null }, error: null };
        }),
      },
      from: vi.fn(),
    }),
    createSupabaseServiceClient: () => {
      serviceClientCreated = true;
      return { from: vi.fn() };
    },
  };
});

import { POST } from '../route';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/rooms/ABCDEF/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/rooms/[code]/events — auth + identity gate', () => {
  beforeEach(() => {
    getUserResult = { data: { user: { id: 'caller-uid' } }, error: null };
    setSessionCalls = [];
    serviceClientCreated = false;
  });

  it('returns 401 when the bearer header is missing', async () => {
    const res = await POST(makeRequest({ kind: 'move', playerId: 'x', pathNumber: 13 }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('missing-bearer-token');
    expect(serviceClientCreated).toBe(false);
  });

  it('returns 401 when getUser rejects the token', async () => {
    getUserResult = { data: { user: null }, error: { message: 'jwt expired' } };
    const res = await POST(
      makeRequest(
        { kind: 'move', playerId: 'caller-uid', pathNumber: 13 },
        { authorization: 'Bearer bad-token' },
      ),
      { params: { code: 'ABCDEF' } },
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid-token');
    // Engine must never run when the caller can't be identified.
    expect(serviceClientCreated).toBe(false);
  });

  it('returns 403 when action.playerId does not match auth.uid()', async () => {
    getUserResult = { data: { user: { id: 'real-caller' } }, error: null };
    const res = await POST(
      makeRequest(
        { kind: 'move', playerId: 'someone-else', pathNumber: 13 },
        { authorization: 'Bearer good-token' },
      ),
      { params: { code: 'ABCDEF' } },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('identity-mismatch');
    // Crucially, the snapshot writer is never constructed — the
    // engine never folds the action under a forged identity.
    expect(serviceClientCreated).toBe(false);
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const res = await POST(makeRequest('not-json {', { authorization: 'Bearer x' }), {
      params: { code: 'ABCDEF' },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid-json');
  });

  it('returns 400 when the action shape is malformed', async () => {
    const res = await POST(
      makeRequest({ not: 'an action' }, { authorization: 'Bearer x' }),
      { params: { code: 'ABCDEF' } },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid-action-shape');
  });
});
