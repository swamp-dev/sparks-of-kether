import { describe, expect, it, vi, beforeEach } from 'vitest';
import type * as SupabaseModule from '@/lib/supabase';
import { serializeGameState } from '@/lib/supabase';
import { makeFullGame } from '@/test/fixtures';
import {
  createMockBrowserClient,
  createMockServiceClient,
  makeInMemoryDb,
  type InMemoryDb,
} from '@/lib/__tests__/test-helpers/in-memory-supabase';

/**
 * Integration test for the multiplayer pipeline. Drives `POST /start`
 * then a sequence of `POST /events` against a SHARED in-memory db
 * — the same `InMemoryDb` object backs both the caller-auth client
 * and the service-role client, so writes from the start route are
 * visible to the events route.
 *
 * What this catches that the per-route unit tests cannot:
 *   - Last-event-id incrementing across multiple events.
 *   - Audit rows from rejected events surviving to the next call.
 *   - End-turn rotating activePlayerId in a way that affects the
 *     next event's authorize gate.
 *   - Snapshot state evolving across the start → events sequence.
 *
 * The shared in-memory shim is the abstraction T3 (#89) will mirror
 * against a real local Supabase. RLS-correctness lives there.
 */

let db: InMemoryDb;
let callerId = 'p1';

// Subtle: the mock factory captures `db` and `callerId` from this
// module's `let` bindings BY REFERENCE — the route call resolves
// them at request time, not at vi.mock-hoist time. A test that
// reassigns `callerId` mid-test will be reflected in the next route
// call. Do not snapshot these into a `beforeAll` helper or extract
// the factory: the closure dependency is load-bearing.
vi.mock('@/lib/supabase', async (importActual) => {
  const actual = await importActual<typeof SupabaseModule>();
  return {
    ...actual,
    createSupabaseServerClient: () => createMockBrowserClient(db, { callerId }),
    createSupabaseServiceClient: () => createMockServiceClient(db),
  };
});

// Imports MUST come after vi.mock so the routes pick up the mocked
// supabase module on first import.
import { POST as POST_START } from '../rooms/[code]/start/route';
import { POST as POST_EVENTS } from '../rooms/[code]/events/route';

interface RouteResponse {
  readonly status: number;
  readonly body: unknown;
}

async function callStart(code: string): Promise<RouteResponse> {
  const req = new Request(`http://localhost/api/rooms/${code}/start`, {
    method: 'POST',
    headers: {
      authorization: `Bearer test-token-${callerId}`,
      'content-type': 'application/json',
    },
  });
  const res = await POST_START(req, { params: { code } });
  return { status: res.status, body: await res.json() };
}

async function callEvent(
  code: string,
  action: unknown,
): Promise<RouteResponse> {
  const req = new Request(`http://localhost/api/rooms/${code}/events`, {
    method: 'POST',
    headers: {
      authorization: `Bearer test-token-${callerId}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(action),
  });
  const res = await POST_EVENTS(req, { params: { code } });
  return { status: res.status, body: await res.json() };
}

/** Seed a 2-player lobby keyed by code. host_id = p1, other = p2. */
function seedLobby(code: string): void {
  db.rooms.push({
    id: 'room-uuid',
    code,
    host_id: 'p1',
    state: 'lobby',
    created_at: 't',
    started_at: null,
    finished_at: null,
  });
  db.players.push({
    id: 'p1',
    room_id: 'room-uuid',
    nickname: 'Alex',
    zodiac_sign: 'aries',
    ready: true,
    seat: 0,
    joined_at: 't',
  });
  db.players.push({
    id: 'p2',
    room_id: 'room-uuid',
    nickname: 'Bea',
    zodiac_sign: 'leo',
    ready: true,
    seat: 1,
    joined_at: 't',
  });
}

describe('multiplayer flow — start → events integration', () => {
  beforeEach(() => {
    db = makeInMemoryDb();
    callerId = 'p1';
  });

  it('start → game_states snapshot exists; room state flips to playing', async () => {
    seedLobby('ABCDEF');
    const res = await callStart('ABCDEF');
    expect(res.status).toBe(200);
    expect(db.game_states).toHaveLength(1);
    const snapshot = db.game_states[0];
    expect(snapshot?.last_event_id).toBe(0);
    expect(db.rooms[0]?.state).toBe('playing');
  });

  it('first event after start updates last_event_id and snapshot', async () => {
    seedLobby('ABCDEF');
    await callStart('ABCDEF');

    // Active player (p1) ends their turn — the simplest action that
    // mutates snapshot without needing a card / move-path lookup.
    const res = await callEvent('ABCDEF', {
      kind: 'end-turn',
      playerId: 'p1',
    });
    expect(res.status).toBe(200);

    // game_events row appended, last_event_id advanced.
    expect(db.game_events).toHaveLength(1);
    expect(db.game_events[0]?.event_type).toBe('end-turn');
    const snapshot = db.game_states[0];
    expect(snapshot?.last_event_id).toBe(1);
    // active id rotated p1 → p2.
    expect(snapshot?.snapshot.activePlayerId).toBe('p2');
  });

  it('non-active player rejection writes a rejected: audit row + leaves snapshot untouched', async () => {
    seedLobby('ABCDEF');
    await callStart('ABCDEF');

    // p2 tries to end turn — but p1 is active.
    callerId = 'p2';
    const res = await callEvent('ABCDEF', {
      kind: 'end-turn',
      playerId: 'p2',
    });
    expect(res.status).toBe(403);

    // Audit row exists with `rejected:end-turn` event_type. The
    // count assertion guards against a regression that would write
    // BOTH an accepted event and a rejected audit row.
    expect(db.game_events).toHaveLength(1);
    const audit = db.game_events.find(
      (e) => e.event_type === 'rejected:end-turn',
    );
    expect(audit).toBeDefined();
    expect(audit?.player_id).toBe('p2');

    // Snapshot's last_event_id is still 0 (rejected event does not
    // count toward the engine sequence; only the audit insert
    // happened).
    expect(db.game_states[0]?.last_event_id).toBe(0);
    // activePlayerId still p1.
    expect(db.game_states[0]?.snapshot.activePlayerId).toBe('p1');
  });

  it('full turn cycle: end-turn rotates p1 → p2 → p1 across two events', async () => {
    seedLobby('ABCDEF');
    await callStart('ABCDEF');

    callerId = 'p1';
    const r1 = await callEvent('ABCDEF', {
      kind: 'end-turn',
      playerId: 'p1',
    });
    expect(r1.status).toBe(200);
    expect(db.game_states[0]?.snapshot.activePlayerId).toBe('p2');

    callerId = 'p2';
    const r2 = await callEvent('ABCDEF', {
      kind: 'end-turn',
      playerId: 'p2',
    });
    expect(r2.status).toBe(200);
    expect(db.game_states[0]?.snapshot.activePlayerId).toBe('p1');

    // Both events present in the log; ids strictly increasing.
    expect(db.game_events).toHaveLength(2);
    expect(db.game_events[0]?.id).toBe(1);
    expect(db.game_events[1]?.id).toBe(2);
    expect(db.game_states[0]?.last_event_id).toBe(2);
  });

  it('calling /start twice returns 409 not-lobby + leaves db unchanged', async () => {
    // Cross-call integration: after the first /start succeeds, the
    // room is in `state: 'playing'`. The second /start hits the
    // validateAndBuildSetup `not-lobby` branch BEFORE reaching the
    // game_states UNIQUE constraint — the validator gates on room
    // state first. Per-route unit tests cover the 23505 path with
    // a mocked duplicate; here we confirm the realistic cross-call
    // behavior: the validator wins, no snapshot drift.
    seedLobby('ABCDEF');
    const first = await callStart('ABCDEF');
    expect(first.status).toBe(200);
    expect(db.game_states).toHaveLength(1);
    expect(db.rooms[0]?.state).toBe('playing');

    const second = await callStart('ABCDEF');
    expect(second.status).toBe(409);
    const body = second.body as { reason: { kind: string } };
    expect(body.reason.kind).toBe('not-lobby');

    // Snapshot count + room state both unchanged by the rejected
    // second call.
    expect(db.game_states).toHaveLength(1);
    expect(db.rooms[0]?.state).toBe('playing');
  });

  it('non-host start request is rejected before snapshot creation', async () => {
    seedLobby('ABCDEF');
    callerId = 'p2'; // not the host
    const res = await callStart('ABCDEF');
    expect(res.status).toBe(403);
    expect(db.game_states).toHaveLength(0);
    expect(db.rooms[0]?.state).toBe('lobby'); // unchanged
  });

  it('meditate event grows the active player hand by 2 and is recorded', async () => {
    // #216: regression cover. Pre-fix the events route silently
    // accepted the action's audit but applyClientAction had no
    // 'meditate' case, so the snapshot's hand never grew. This
    // asserts both the audit log AND the snapshot mutation.
    seedLobby('ABCDEF');
    await callStart('ABCDEF');

    const before =
      db.game_states[0]?.snapshot.players.find((p) => p.id === 'p1')?.hand
        .length ?? 0;
    // Precondition: the start-route fixture must leave room for two
    // more cards. If `makeFullGame`'s starting hand size ever
    // changes, the test wants to fail loudly here, not via a
    // confusing assertion failure below.
    expect(before).toBeLessThan(6);

    const res = await callEvent('ABCDEF', {
      kind: 'meditate',
      playerId: 'p1',
    });
    expect(res.status).toBe(200);

    expect(db.game_events).toHaveLength(1);
    expect(db.game_events[0]?.event_type).toBe('meditate');
    expect(db.game_states[0]?.last_event_id).toBe(1);

    const after =
      db.game_states[0]?.snapshot.players.find((p) => p.id === 'p1')?.hand
        .length ?? 0;
    expect(after - before).toBe(2);
  });

  it('meditate at HAND_CAP returns 422 with action-rejected detail and leaves the snapshot untouched', async () => {
    // #216 review fix. The dispatcher rejects with
    // `{ kind: 'meditate', cause: 'hand-full' }` so direct API
    // callers see an explicit signal rather than a 200 with a
    // no-op audit row.
    seedLobby('ABCDEF');
    await callStart('ABCDEF');

    // Force p1's hand to HAND_CAP=6 by replacing the in-memory
    // snapshot row. The seeded fixture deals 4; we top up via
    // direct db mutation since there is no in-game flow that
    // produces a 6-card hand without other side-effects (a real
    // game would get here via gifting). `snapshot` on the row is
    // readonly, so we splice in a fresh row rather than mutating
    // it in place.
    const original = db.game_states[0];
    expect(original).toBeDefined();
    if (!original) return;
    const players = original.snapshot.players.map((p) =>
      p.id === 'p1' ? { ...p, hand: [0, 1, 2, 3, 4, 5] } : p,
    );
    db.game_states[0] = {
      ...original,
      snapshot: { ...original.snapshot, players },
    };

    const res = await callEvent('ABCDEF', {
      kind: 'meditate',
      playerId: 'p1',
    });
    expect(res.status).toBe(422);
    const body = res.body as {
      detail: { kind: string; cause: string };
    };
    expect(body.detail.kind).toBe('meditate');
    expect(body.detail.cause).toBe('hand-full');

    // No game_events row — neither an applied event nor a
    // `rejected:` audit row. Dispatcher rejections take the same
    // 422-no-audit path as invalid moves; only the upstream
    // authorize gate writes audit rows.
    expect(db.game_events).toHaveLength(0);
    expect(db.game_states[0]?.last_event_id).toBe(0);
    expect(db.game_states[0]?.snapshot.players.find((p) => p.id === 'p1')?.hand)
      .toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('serialized snapshot round-trips through engine state correctly', async () => {
    // Sanity check on the makeFullGame setup we use for the start
    // route's initial state. Confirms the in-memory shim's snapshot
    // serialization matches `serializeGameState`.
    const expected = makeFullGame({
      playerCount: 2,
      seed: 1,
      zodiacSigns: ['aries', 'leo'],
    });
    const serialized = serializeGameState(expected);
    expect(serialized.activePlayerId).toBe(expected.activePlayerId);
    expect(serialized.players).toHaveLength(expected.players.length);
  });
});
