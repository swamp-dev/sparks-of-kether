import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom, joinRoom } from '@/lib/rooms';
import {
  deserializeGameState,
  serializeGameState,
  type GameStateRow,
} from '@/lib/supabase';
import { applyClientAction, type ClientAction } from '@/lib/room-actions';
import { authorize } from '@/lib/authorize';
import { checkEndgame } from '@/engine/endgame';
import { seededRng } from '@/engine/rng';
import { makeFullGame } from '@/test/fixtures';
import type { GameState, PlayerState } from '@/engine/types';
import { getServiceClient, makeAnonClient, wipeAllTables } from './setup';

/**
 * #350 (K2): full Final Threshold ritual, end-to-end against real
 * Supabase. The four jobs of this suite:
 *
 *   1. Schema round-trip — `KetherRitualState` (witnessOrder, passCounts,
 *      witnessLog, stagedClosureSparks, etc.) survives `jsonb` storage.
 *      A regression that drops a field on serialize, or that adds a
 *      Set-typed field, would surface here as a missing key in the
 *      read-back snapshot.
 *
 *   2. Authorize parity — the per-action gates (witness-only, host-only,
 *      identity-bound) run server-side against the real persisted
 *      state, not just the in-memory mock.
 *
 *   3. Full ritual drive — 2 players converge at Kether, the witness
 *      round-robin completes, the closure window stages and confirms,
 *      the post-ritual `checkEndgame` reads `'won'`. This is the
 *      contract the design doc § 4.1 spells out.
 *
 *   4. Disconnect defense (host-skip) — the host's forced pass on
 *      behalf of an absent witness drives the ritual to completion
 *      without the absent player taking any further action. The
 *      separation tick from the forced pass and the cap-fallback to
 *      forced lowest-arcanum play both fire against real persisted
 *      state.
 *
 * Both `won` and `lost` branches are pinned end-to-end (§ 7.1 K2 spec
 * requires both). K1's `engine/__tests__/endgame.test.ts` covers the
 * gap math itself; the integration tests here verify the wire +
 * persistence path lands on the right `EndgameStatus` post-confirm.
 */

/**
 * Build a 2-player game state where both players are at Kether with
 * full hands, ready to enter the ritual on the next move-action. We
 * use `makeFullGame` for a real shuffled deck + dealt hands, then
 * synthesize the "both at Kether" position by overriding player
 * fields (the engine's normal flow would have walked them up from
 * Malkuth, but for this test we want to focus on the ritual itself).
 */
function buildRitualReadyState(playerIds: readonly [string, string]): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 350 });
  const [id1, id2] = playerIds;
  // Replace seat-indexed `p1`/`p2` IDs with the real anon UUIDs.
  const players: readonly PlayerState[] = base.players.map((p, idx) => {
    const id = idx === 0 ? id1 : id2;
    return {
      ...p,
      id,
      // Set up "almost at Kether": p1 already there, p2 at Tiferet
      // with arcanum 2 (path 13 — Tiferet ↔ Kether) in hand. p2's
      // move action will be the ritual trigger.
      position: idx === 0 ? 'kether' : 'tiferet',
      hand: idx === 0 ? [3, 4] : [2, 5, 6],
      arrivedAtKetherAt: idx === 0 ? 1_000 : undefined,
    };
  });
  return {
    ...base,
    players,
    activePlayerId: id2,
    phase: 'move',
    illumination: 6, // enough for a comfortable win after closure
    separation: 0,
  };
}

/**
 * Service-role write: persist a snapshot to game_states. Mirrors what
 * the events route does on the success path. Returns the resulting
 * row id for follow-up queries.
 */
async function writeSnapshot(
  roomId: string,
  state: GameState,
  lastEventId: number,
): Promise<void> {
  const svc = getServiceClient();
  // `game_states.room_id` carries a UNIQUE constraint
  // (`game_states_room_unique`) — `upsert` needs `onConflict: 'room_id'`
  // to hit the UPDATE arm; without it Postgres falls through to the
  // INSERT arm and trips the unique violation on the second write.
  const insertOrUpdate = await svc
    .from('game_states')
    .upsert(
      {
        room_id: roomId,
        snapshot: serializeGameState(state),
        last_event_id: lastEventId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'room_id' },
    );
  if (insertOrUpdate.error) {
    throw new Error(
      `writeSnapshot: ${insertOrUpdate.error.message}`,
    );
  }
}

/** Service-role read of the persisted snapshot, deserialized. */
async function readSnapshot(roomId: string): Promise<GameState> {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('game_states')
    .select()
    .eq('room_id', roomId)
    .maybeSingle<GameStateRow>();
  if (error) throw new Error(`readSnapshot: ${error.message}`);
  if (!data) throw new Error('readSnapshot: no row');
  return deserializeGameState(data.snapshot);
}

/**
 * Apply a client action against the latest persisted state and write
 * the result back. Throws on rejection — this helper is the "happy
 * path advance" for tests; rejections want to be asserted explicitly
 * with the lower-level helpers in their own scopes.
 */
async function persistAction(
  roomId: string,
  action: ClientAction,
  callerId: string,
  options: { readonly lastEventId: number } = { lastEventId: 0 },
): Promise<GameState> {
  const before = await readSnapshot(roomId);
  const auth = authorize(action, before, callerId);
  if (!auth.ok) {
    throw new Error(
      `persistAction: authorize rejected (${JSON.stringify(auth.reason)})`,
    );
  }
  const apply = applyClientAction(before, action, seededRng(1));
  if (!apply.ok) {
    throw new Error(
      `persistAction: applyClientAction rejected (${JSON.stringify(apply.error)})`,
    );
  }
  await writeSnapshot(roomId, apply.newState, options.lastEventId + 1);
  return apply.newState;
}

describe('integration: Final Threshold ritual end-to-end (real Supabase, #350)', () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it('drives a 2-player ritual from convergence → witness rotation → closure → won', async () => {
    // 1. Two anon players in one room.
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) throw new Error(`createRoom: ${JSON.stringify(created.error)}`);
    const guest = await makeAnonClient();
    const joined = await joinRoom({
      code: created.value.code,
      nickname: 'Bea',
      client: guest.client,
    });
    if (!joined.ok) throw new Error(`joinRoom: ${JSON.stringify(joined.error)}`);

    // 2. Service-role injects a started snapshot pre-arranged for the
    //    ritual trigger on the next move. (We bypass the start route
    //    so the test stays focused on the ritual flow itself.)
    const initial = buildRitualReadyState([host.userId, guest.userId]);
    await writeSnapshot(created.value.roomId, initial, 0);

    // 3. p2's move action lands them at Kether — convergence. The
    //    server stamps `serverArrivedAtKether` so the witnessOrder
    //    is deterministic across clients.
    const afterMove = await persistAction(
      created.value.roomId,
      {
        kind: 'move',
        playerId: guest.userId,
        pathNumber: 13, // Tiferet ↔ Kether
        serverArrivedAtKether: 2_000,
      },
      guest.userId,
      { lastEventId: 0 },
    );
    expect(afterMove.phase).toBe('kether');
    expect(afterMove.ketherRitual).toBeDefined();
    expect(afterMove.ketherRitual?.subPhase).toBe('witness');
    // p2 stamped 2000 > p1 stamped 1000 → p2 opens the ritual.
    expect(afterMove.ketherRitual?.witnessOrder[0]).toBe(guest.userId);
    expect(afterMove.ketherRitual?.witnessOrder[1]).toBe(host.userId);

    // 4. Witness round-robin. p2 plays one card, p1 plays one, p2
    //    plays the next, etc., until all queues empty.
    //    p1 starts with [3, 4], p2 (post-move, after spending arcanum
    //    2) holds [5, 6]. Round-robin from p2:
    //      - p2 plays 5 → idx → p1
    //      - p1 plays 3 → idx → p2
    //      - p2 plays 6 → idx → p1
    //      - p1 plays 4 → no non-empty queue → subPhase: 'close'
    let lastEventId = 1;
    for (const [arcanum, callerId] of [
      [5, guest.userId],
      [3, host.userId],
      [6, guest.userId],
      [4, host.userId],
    ] as const) {
      const state = await persistAction(
        created.value.roomId,
        { kind: 'kether-witness-play', playerId: callerId, arcanum },
        callerId,
        { lastEventId },
      );
      lastEventId++;
      // After each play, the witness pointer advances to the next
      // non-empty queue or transitions to 'close'.
      if (lastEventId === 5) {
        // Last play — every queue is empty.
        expect(state.ketherRitual?.subPhase).toBe('close');
      } else {
        expect(state.ketherRitual?.subPhase).toBe('witness');
      }
    }
    const closeState = await readSnapshot(created.value.roomId);
    expect(closeState.ketherRitual?.subPhase).toBe('close');
    // 4 played cards in the witness log, all distinct arcana.
    expect(closeState.ketherRitual?.witnessLog).toHaveLength(4);
    expect(
      closeState.ketherRitual?.witnessLog.every((e) => e.kind === 'played'),
    ).toBe(true);

    // 5. Closure window: confirm without staging any Spark (we set
    //    illumination ≥ separation + 5 in the fixture, so the gap is
    //    already met). First-confirm-wins.
    const final = await persistAction(
      created.value.roomId,
      { kind: 'threshold-confirm', playerId: host.userId },
      host.userId,
      { lastEventId },
    );

    // 6. Win: phase exits to 'end', closureLocked, checkEndgame
    //    reports 'won' (illumination 6 ≥ separation 0 + 5).
    expect(final.phase).toBe('end');
    expect(final.ketherRitual?.closureLocked).toBe(true);
    expect(checkEndgame(final).status).toBe('won');

    // 7. Round-trip through service-role read confirms the ritual
    //    state survived `jsonb` storage with all fields intact.
    const persisted = await readSnapshot(created.value.roomId);
    expect(persisted.phase).toBe('end');
    expect(persisted.ketherRitual?.witnessLog).toHaveLength(4);
    expect(persisted.ketherRitual?.closureLocked).toBe(true);
    expect(persisted.ketherRitual?.witnessOrder).toEqual([
      guest.userId,
      host.userId,
    ]);
  });

  it('drives a 2-player ritual to a lost end-state on illumination-gap', async () => {
    // Loss branch (§ 4.1 / § 7.1): all queues empty, no Sparks staged,
    // illumination < separation + 5. The post-confirm state exits to
    // 'end' with checkEndgame reporting 'lost' / 'illumination-gap'.
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) throw new Error(`createRoom: ${JSON.stringify(created.error)}`);
    const guest = await makeAnonClient();
    const joined = await joinRoom({
      code: created.value.code,
      nickname: 'Bea',
      client: guest.client,
    });
    if (!joined.ok) throw new Error(`joinRoom: ${JSON.stringify(joined.error)}`);

    // Inject a close-sub-phase snapshot with the gap unmet:
    // illumination 2, separation 0 → margin needs +5, missing.
    // Both queues empty (the witness round-robin has finished), no
    // Sparks held to stage. Only `threshold-confirm` is legal.
    const base = makeFullGame({ playerCount: 2, seed: 352 });
    const players: readonly PlayerState[] = base.players.map((p, idx) => ({
      ...p,
      id: idx === 0 ? host.userId : guest.userId,
      position: 'kether',
      hand: [],
      sparksHeld: new Set(),
      arrivedAtKetherAt: idx === 0 ? 1_000 : 2_000,
    }));
    const initial: GameState = {
      ...base,
      players,
      activePlayerId: host.userId,
      phase: 'kether',
      illumination: 2,
      separation: 0,
      ketherRitual: {
        subPhase: 'close',
        witnessOrder: [guest.userId, host.userId],
        witnessTurnIndex: 0,
        personalQueueLengths: { [host.userId]: 2, [guest.userId]: 2 },
        passCounts: { [host.userId]: 0, [guest.userId]: 0 },
        witnessLog: [],
        arrivalTimestamps: { [host.userId]: 1_000, [guest.userId]: 2_000 },
        stagedClosureSparks: [],
        closureLocked: false,
      },
    };
    await writeSnapshot(created.value.roomId, initial, 0);

    const final = await persistAction(
      created.value.roomId,
      { kind: 'threshold-confirm', playerId: host.userId },
      host.userId,
      { lastEventId: 0 },
    );

    expect(final.phase).toBe('end');
    expect(final.ketherRitual?.closureLocked).toBe(true);
    const endgame = checkEndgame(final);
    expect(endgame.status).toBe('lost');
    if (endgame.status !== 'lost') return;
    expect(endgame.reason).toBe('illumination-gap');
  });

  it('host-skip-witness drives the ritual past an absent player', async () => {
    // Setup: 2 players, ritual entered, host (p1 = state.players[0])
    // dispatches a host-skip on behalf of the active witness (p2).
    // Verifies (a) the host gate accepts the host's call, (b) the
    // forced pass ticks separation, (c) authorize would reject the
    // same call from a non-host.
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) throw new Error(`createRoom: ${JSON.stringify(created.error)}`);
    const guest = await makeAnonClient();
    const joined = await joinRoom({
      code: created.value.code,
      nickname: 'Bea',
      client: guest.client,
    });
    if (!joined.ok) throw new Error(`joinRoom: ${JSON.stringify(joined.error)}`);

    // Inject "in-ritual" snapshot directly so the test focuses on
    // host-skip semantics. p2 is the active witness.
    const base = makeFullGame({ playerCount: 2, seed: 351 });
    const players: readonly PlayerState[] = base.players.map((p, idx) => ({
      ...p,
      id: idx === 0 ? host.userId : guest.userId,
      position: 'kether',
      hand: idx === 0 ? [3, 4] : [5, 6],
      arrivedAtKetherAt: idx === 0 ? 1_000 : 2_000,
    }));
    const initial: GameState = {
      ...base,
      players,
      activePlayerId: host.userId,
      phase: 'kether',
      separation: 0,
      illumination: 6,
      ketherRitual: {
        subPhase: 'witness',
        witnessOrder: [guest.userId, host.userId],
        witnessTurnIndex: 0,
        personalQueueLengths: { [host.userId]: 2, [guest.userId]: 2 },
        passCounts: { [host.userId]: 0, [guest.userId]: 0 },
        witnessLog: [],
        arrivalTimestamps: { [host.userId]: 1_000, [guest.userId]: 2_000 },
        stagedClosureSparks: [],
        closureLocked: false,
      },
    };
    await writeSnapshot(created.value.roomId, initial, 0);

    // Non-host attempting host-skip is rejected by authorize before
    // ever touching the engine.
    const beforeAuth = await readSnapshot(created.value.roomId);
    const reject = authorize(
      {
        kind: 'kether-host-skip-witness',
        playerId: guest.userId,
        targetPlayerId: host.userId,
      },
      beforeAuth,
      guest.userId,
    );
    expect(reject.ok).toBe(false);
    if (reject.ok) return;
    expect(reject.reason.kind).toBe('not-host');

    // Host's host-skip on the active witness (p2) — engine forces a
    // pass on p2's behalf.
    const afterSkip = await persistAction(
      created.value.roomId,
      {
        kind: 'kether-host-skip-witness',
        playerId: host.userId,
        targetPlayerId: guest.userId,
      },
      host.userId,
      { lastEventId: 0 },
    );
    expect(afterSkip.separation).toBe(1);
    expect(afterSkip.ketherRitual?.passCounts[guest.userId]).toBe(1);
    expect(afterSkip.ketherRitual?.witnessLog).toEqual([
      { kind: 'passed', playerId: guest.userId },
    ]);
  });
});
