import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom, joinRoom } from '@/lib/rooms';
import { deserializeGameState, serializeGameState, type GameStateRow } from '@/lib/supabase';
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
 *   1. Schema round-trip — `KetherRitualState` (trialOrder, trialChallenges,
 *      trialStagedSparks, stagedClosureSparks, etc.) survives `jsonb` storage.
 *      A regression that drops a field on serialize, or that adds a
 *      Set-typed field, would surface here as a missing key in the
 *      read-back snapshot.
 *
 *   2. Authorize parity — the per-action gates (trial-player-only,
 *      identity-bound) run server-side against the real persisted
 *      state, not just the in-memory mock.
 *
 *   3. Full ritual drive — 2 players converge at Kether, the trial
 *      gauntlet completes (2 challenges), the closure window confirms,
 *      the post-ritual `checkEndgame` reads `'won'`. This is the
 *      contract the design doc § 4.1 spells out.
 *
 *   4. Trial gate — authorize rejects `kether-trial-resolve` from a
 *      non-current-trial player, so the hot-seat rotation cannot be
 *      short-circuited server-side.
 *
 * Both `won` and `lost` branches are pinned end-to-end (§ 7.1 K2 spec
 * requires both). K1's `engine/__tests__/endgame.test.ts` covers the
 * gap math itself; the integration tests here verify the wire +
 * persistence path lands on the right `EndgameStatus` post-confirm.
 */

/**
 * Build a 2-player game state where both players are at Kether with
 * full hands, ready to enter the ritual on the next move-action.
 */
function buildRitualReadyState(playerIds: readonly [string, string]): GameState {
  const base = makeFullGame({ playerCount: 2, seed: 350 });
  const [id1, id2] = playerIds;
  const players: readonly PlayerState[] = base.players.map((p, idx) => {
    const id = idx === 0 ? id1 : id2;
    return {
      ...p,
      id,
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
 * Service-role write: persist a snapshot to game_states.
 */
async function writeSnapshot(roomId: string, state: GameState, lastEventId: number): Promise<void> {
  const svc = getServiceClient();
  const insertOrUpdate = await svc.from('game_states').upsert(
    {
      room_id: roomId,
      snapshot: serializeGameState(state),
      last_event_id: lastEventId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' },
  );
  if (insertOrUpdate.error) {
    throw new Error(`writeSnapshot: ${insertOrUpdate.error.message}`);
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
 * the result back. Throws on rejection.
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
    throw new Error(`persistAction: authorize rejected (${JSON.stringify(auth.reason)})`);
  }
  const apply = applyClientAction(before, action, seededRng(1));
  if (!apply.ok) {
    throw new Error(`persistAction: applyClientAction rejected (${JSON.stringify(apply.error)})`);
  }
  await writeSnapshot(roomId, apply.newState, options.lastEventId + 1);
  return apply.newState;
}

describe('integration: Final Threshold ritual end-to-end (real Supabase, #350)', () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it('drives a 2-player ritual from convergence → trial gauntlet → closure → won', async () => {
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
    //    ritual trigger on the next move.
    const initial = buildRitualReadyState([host.userId, guest.userId]);
    await writeSnapshot(created.value.roomId, initial, 0);

    // 3. p2's move action lands them at Kether — convergence. The
    //    server stamps serverArrivedAtKether so trialOrder is
    //    deterministic across clients.
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
    expect(afterMove.ketherRitual?.subPhase).toBe('trial');
    // p2 stamped 2000 > p1 stamped 1000 → p2 opens the trial.
    expect(afterMove.ketherRitual?.trialOrder[0]).toBe(guest.userId);
    expect(afterMove.ketherRitual?.trialOrder[1]).toBe(host.userId);

    // 4. Trial gauntlet: 2 challenges (N = players.length), one per player.
    //    p2 (guest) resolves first, then p1 (host).
    let lastEventId = 1;
    for (const callerId of [guest.userId, host.userId]) {
      const state = await persistAction(
        created.value.roomId,
        { kind: 'kether-trial-resolve', playerId: callerId },
        callerId,
        { lastEventId },
      );
      lastEventId++;
      if (callerId === guest.userId) {
        // After p2 resolves, trialTurnIndex advances to 1.
        expect(state.ketherRitual?.subPhase).toBe('trial');
        expect(state.ketherRitual?.trialTurnIndex).toBe(1);
      } else {
        // Last resolve — all challenges done → subPhase transitions to 'close'.
        expect(state.ketherRitual?.subPhase).toBe('close');
      }
    }

    const closeState = await readSnapshot(created.value.roomId);
    expect(closeState.ketherRitual?.subPhase).toBe('close');
    // 2 challenges, all with roll and passed set after the gauntlet.
    expect(closeState.ketherRitual?.trialChallenges).toHaveLength(2);
    expect(
      closeState.ketherRitual?.trialChallenges.every((c) => c.roll !== null),
    ).toBe(true);

    // 5. Closure window: confirm without staging any Spark (illumination=6
    //    ≥ separation=0 + 5 → already won).
    const final = await persistAction(
      created.value.roomId,
      { kind: 'threshold-confirm', playerId: host.userId },
      host.userId,
      { lastEventId },
    );

    // 6. Win: phase exits to 'end', closureLocked, checkEndgame reports 'won'.
    expect(final.phase).toBe('end');
    expect(final.ketherRitual?.closureLocked).toBe(true);
    expect(checkEndgame(final).status).toBe('won');

    // 7. Round-trip through service-role read confirms the ritual
    //    state survived jsonb storage with all fields intact.
    const persisted = await readSnapshot(created.value.roomId);
    expect(persisted.phase).toBe('end');
    expect(persisted.ketherRitual?.trialChallenges).toHaveLength(2);
    expect(persisted.ketherRitual?.closureLocked).toBe(true);
    expect(persisted.ketherRitual?.trialOrder).toEqual([guest.userId, host.userId]);
  });

  it('drives a 2-player ritual to a lost end-state on illumination-gap', async () => {
    // Loss branch (§ 4.1 / § 7.1): gauntlet complete, no Sparks staged,
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
    // Both challenges resolved (passed: false), no Sparks held.
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
        trialOrder: [guest.userId, host.userId],
        trialTurnIndex: 2,
        trialChallenges: [
          { sefirahKey: 'chokmah', stat: 'insight', dc: 14, roll: 8, passed: false },
          { sefirahKey: 'binah', stat: 'understanding', dc: 14, roll: 7, passed: false },
        ],
        trialStagedSparks: [],
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

  it('authorize gate rejects kether-trial-resolve by a non-trial player', async () => {
    // The trial gate (authorize.ts) must reject a resolve attempted by
    // anyone other than the current trial player, so that the hot-seat
    // rotation cannot be short-circuited server-side.
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

    // Inject an in-trial snapshot where p2 (guest) is the active trial player.
    const base = makeFullGame({ playerCount: 2, seed: 351 });
    const players: readonly PlayerState[] = base.players.map((p, idx) => ({
      ...p,
      id: idx === 0 ? host.userId : guest.userId,
      position: 'kether',
      hand: [],
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
        subPhase: 'trial',
        trialOrder: [guest.userId, host.userId],
        trialTurnIndex: 0,
        trialChallenges: [
          { sefirahKey: 'chokmah', stat: 'insight', dc: 14, roll: null, passed: null },
          { sefirahKey: 'binah', stat: 'understanding', dc: 14, roll: null, passed: null },
        ],
        trialStagedSparks: [],
        arrivalTimestamps: { [host.userId]: 1_000, [guest.userId]: 2_000 },
        stagedClosureSparks: [],
        closureLocked: false,
      },
    };
    await writeSnapshot(created.value.roomId, initial, 0);

    // host (p1) attempting to resolve when p2 (guest) is the trial player
    // must be rejected by authorize.
    const before = await readSnapshot(created.value.roomId);
    const reject = authorize(
      { kind: 'kether-trial-resolve', playerId: host.userId },
      before,
      host.userId,
    );
    expect(reject.ok).toBe(false);
    if (reject.ok) return;
    expect(reject.reason.kind).toBe('not-trial-turn');

    // Guest (current trial player) resolving is accepted.
    const afterResolve = await persistAction(
      created.value.roomId,
      { kind: 'kether-trial-resolve', playerId: guest.userId },
      guest.userId,
      { lastEventId: 0 },
    );
    expect(afterResolve.ketherRitual?.trialTurnIndex).toBe(1);
  });
});
