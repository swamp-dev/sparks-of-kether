import { describe, expect, it, vi, beforeEach } from 'vitest';
import type * as SupabaseModule from '@/lib/supabase';
import { serializeGameState } from '@/lib/supabase';
import { makePlayer, makeState } from '@/test/fixtures';

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
let auditInserts: { table: string; row: unknown }[] = [];
// Per-table responses for chained fluent reads.
let roomResponse: { data: unknown; error: unknown } = { data: null, error: null };
let snapshotResponse: { data: unknown; error: unknown } = { data: null, error: null };

function makeFluent(table: string) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () =>
          table === 'rooms' ? roomResponse : snapshotResponse,
      }),
    }),
    insert: (row: unknown) => {
      auditInserts.push({ table, row });
      // Real Supabase `.insert()` returns a builder that is both
      // chainable (`.select().single()`) AND awaitable. We mirror
      // both so the route's two insert call sites — direct-await
      // (audit log) and chained-then-await (event id capture) —
      // both resolve cleanly.
      const resolved = { data: { id: 1 }, error: null };
      const builder = {
        select: () => ({ single: async () => resolved }),
        then: (resolve: (v: typeof resolved) => unknown) =>
          Promise.resolve(resolved).then(resolve),
      };
      return builder;
    },
    update: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  };
}

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
      from: (table: string) => makeFluent(table),
    }),
    createSupabaseServiceClient: () => {
      serviceClientCreated = true;
      return { from: (table: string) => makeFluent(table) };
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
    auditInserts = [];
    roomResponse = { data: null, error: null };
    snapshotResponse = { data: null, error: null };
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
    const body = (await res.json()) as {
      error: string;
      reason: { kind: string; callerId: string; claimedPlayerId: string };
    };
    // Same shape as `authorize`'s identity-mismatch rejection so a
    // future refactor that collapses the two checks doesn't change
    // the JSON response contract.
    expect(body.error).toBe('unauthorized');
    expect(body.reason.kind).toBe('identity-mismatch');
    expect(body.reason.callerId).toBe('real-caller');
    expect(body.reason.claimedPlayerId).toBe('someone-else');
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

describe('POST /api/rooms/[code]/events — authorization gate (#35)', () => {
  beforeEach(() => {
    getUserResult = { data: { user: { id: 'p2' } }, error: null };
    setSessionCalls = [];
    serviceClientCreated = false;
    auditInserts = [];
    roomResponse = {
      data: {
        id: 'room-uuid',
        code: 'ABCDEF',
        host_id: 'p1',
        state: 'playing',
        created_at: 't',
        started_at: 't',
        finished_at: null,
      },
      error: null,
    };
    // Snapshot says p1 is the active player.
    const state = makeState(
      {},
      {
        players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })],
        activePlayerId: 'p1',
      },
    );
    snapshotResponse = {
      data: {
        id: 'gs-1',
        room_id: 'room-uuid',
        snapshot: serializeGameState(state),
        last_event_id: 0,
        updated_at: 't',
      },
      error: null,
    };
  });

  it('rejects a non-active caller with 403 and writes a rejected: audit row', async () => {
    const res = await POST(
      makeRequest(
        { kind: 'move', playerId: 'p2', pathNumber: 13 },
        { authorization: 'Bearer p2-token' },
      ),
      { params: { code: 'ABCDEF' } },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as {
      error: string;
      reason: { kind: string; activePlayerId: string };
    };
    expect(body.error).toBe('unauthorized');
    expect(body.reason.kind).toBe('not-active-player');
    expect(body.reason.activePlayerId).toBe('p1');

    // AC #3: rejected events must NEVER mutate state. The
    // service-role client (the only path to a snapshot UPDATE) must
    // never have been constructed.
    expect(serviceClientCreated).toBe(false);

    // Audit log: a rejected:<kind> row was inserted to game_events.
    const audit = auditInserts.find(
      (i) =>
        i.table === 'game_events' &&
        (i.row as { event_type: string }).event_type === 'rejected:move',
    );
    expect(audit).toBeDefined();
    expect((audit?.row as { player_id: string }).player_id).toBe('p2');
  });

  it('allows the active caller to submit a turn-locked action', async () => {
    getUserResult = { data: { user: { id: 'p1' } }, error: null };
    // #522: end-turn now requires phase 'end' (or 'move' + meditated).
    // Override the shared snapshot (which uses default phase 'move')
    // to a legitimate end-of-turn shape so this test exercises the
    // authorization+success path, not the new wrong-phase guard.
    const endPhaseState = makeState(
      {},
      {
        players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })],
        activePlayerId: 'p1',
        phase: 'end',
      },
    );
    snapshotResponse = {
      data: {
        id: 'gs-1',
        room_id: 'room-uuid',
        snapshot: serializeGameState(endPhaseState),
        last_event_id: 0,
        updated_at: 't',
      },
      error: null,
    };
    const res = await POST(
      makeRequest(
        { kind: 'end-turn', playerId: 'p1' },
        { authorization: 'Bearer p1-token' },
      ),
      { params: { code: 'ABCDEF' } },
    );
    // 200 → active player allowed through; engine fold ran; service
    // client constructed for the snapshot write.
    expect(res.status).toBe(200);
    expect(serviceClientCreated).toBe(true);
    // No `rejected:` audit row.
    expect(
      auditInserts.some((i) =>
        (i.row as { event_type?: string }).event_type?.startsWith('rejected:'),
      ),
    ).toBe(false);
  });

  it('returns 422 with action-rejected when end-turn fires from move-without-meditate (#522)', async () => {
    // Pin the HTTP boundary for the new wrong-phase guard. The
    // shared beforeEach snapshot is phase 'move' with no
    // meditatedThisTurn — exactly the bug case the dispatcher gate
    // now rejects. The route surfaces apply.error as 422
    // action-rejected with the dispatcher's `{ kind: 'end-turn',
    // cause: { kind: 'wrong-phase', expected, actual } }` shape
    // intact in `detail`.
    getUserResult = { data: { user: { id: 'p1' } }, error: null };
    const res = await POST(
      makeRequest(
        { kind: 'end-turn', playerId: 'p1' },
        { authorization: 'Bearer p1-token' },
      ),
      { params: { code: 'ABCDEF' } },
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      error: string;
      detail: { kind: string; cause: { kind: string; expected: string; actual: string } };
    };
    expect(body.error).toBe('action-rejected');
    expect(body.detail.kind).toBe('end-turn');
    expect(body.detail.cause.kind).toBe('wrong-phase');
    expect(body.detail.cause.expected).toBe('end');
    expect(body.detail.cause.actual).toBe('move');
    // Snapshot must NOT have been written through the service client.
    expect(serviceClientCreated).toBe(false);
    // Pin the route's audit behaviour on the 422 path: unlike the
    // 403 authorization gate (which writes a `rejected:<kind>` row
    // before returning), the dispatcher-rejected path returns
    // `apply.error` directly with no audit insert. If a future change
    // adds an audit on apply.error, this assertion fails loudly so
    // the contract change gets reviewed rather than silently shipped
    // (#592).
    expect(
      auditInserts.some((i) =>
        (i.row as { event_type?: string }).event_type?.startsWith('rejected:'),
      ),
    ).toBe(false);
  });

  it('returns a structured 500 when the engine throws on a corrupted snapshot', async () => {
    // Caller is `ghost` and IS the activePlayerId per snapshot, so
    // authorize passes — but `ghost` is not in `state.players`, so
    // `endTurn` throws inside `applyClientAction`. The route must
    // turn that into a JSON 500, not let it bubble as an unhandled
    // exception.
    getUserResult = { data: { user: { id: 'ghost' } }, error: null };
    const corruptState = makeState(
      {},
      {
        players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })],
        activePlayerId: 'ghost',
        // #522: phase 'end' so the new wrong-phase guard doesn't
        // intercept before the corrupt-state path is reached.
        phase: 'end',
      },
    );
    snapshotResponse = {
      data: {
        id: 'gs-1',
        room_id: 'room-uuid',
        snapshot: serializeGameState(corruptState),
        last_event_id: 0,
        updated_at: 't',
      },
      error: null,
    };
    const res = await POST(
      makeRequest(
        { kind: 'end-turn', playerId: 'ghost' },
        { authorization: 'Bearer ghost-token' },
      ),
      { params: { code: 'ABCDEF' } },
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; cause: string };
    expect(body.error).toBe('engine-error');
    expect(body.cause).toMatch(/active player/i);
    // Snapshot is never written.
    expect(serviceClientCreated).toBe(false);
  });
});
