import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom, joinRoom, setZodiacSign } from '@/lib/rooms';
import { validateAndBuildSetup } from '@/lib/start-game';
import { initializeGame } from '@/engine/setup';
import { seededRng } from '@/engine/rng';
import type { RoomRow, PlayerRow } from '@/lib/supabase';
import { getServiceClient, makeAnonClient, wipeAllTables } from './setup';

/**
 * #278 — start-game integration smoke for the new player-count
 * boundary cases. Tests the real `validateAndBuildSetup` →
 * `initializeGame` pipeline with actual Postgres rows to confirm:
 *
 *   1. Solo (1 player): a room with only the host starts cleanly and
 *      produces a 1-player GameState. The `too-few-players` gate was
 *      previously `players.length < 2`; #274 lowered the floor to 1.
 *
 *   2. Six players: a fully-seated 6-player room starts cleanly and
 *      produces a 6-player GameState. The `too-many-players` gate was
 *      previously `players.length > 4`; #274 raised the ceiling to 6.
 *
 * These tests call `validateAndBuildSetup` and `initializeGame`
 * directly (the same two functions the API route delegates to) rather
 * than making an HTTP request. The route-level concerns — auth header,
 * DB writes — are covered by the mocked unit suite in
 * `app/api/rooms/[code]/start/__tests__/route.test.ts`. What only
 * real Supabase can confirm is that the player rows land with the right
 * shape (zodiac_sign non-null, seat ordering, RLS cleared for the
 * count boundary cases).
 */

const SOLO_SIGN = 'aries' as const;
const SIX_PLAYER_SIGNS = ['aries', 'leo', 'gemini', 'cancer', 'taurus', 'scorpio'] as const;

describe('integration: start-game validation — solo + 6-player (#278)', () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  // ── Solo (1 player) ──────────────────────────────────────────────

  it('solo: validateAndBuildSetup succeeds for a 1-player room', async () => {
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Alex', client: host.client });
    if (!created.ok) throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);

    // Set host's zodiac sign using their own session (exercises RLS path).
    const signed = await setZodiacSign(host.client, {
      playerId: created.value.playerId,
      sign: SOLO_SIGN,
    });
    if (!signed.ok) throw new Error(`setZodiacSign failed: ${JSON.stringify(signed.error)}`);

    // Read back room + players via service-role (mirrors what the route does).
    const svc = getServiceClient();
    const roomRow = await svc
      .from('rooms')
      .select()
      .eq('id', created.value.roomId)
      .maybeSingle<RoomRow>();
    expect(roomRow.error).toBeNull();
    expect(roomRow.data).not.toBeNull();

    const playersRow = await svc
      .from('players')
      .select()
      .eq('room_id', created.value.roomId)
      .order('seat', { ascending: true });
    expect(playersRow.error).toBeNull();
    const players = (playersRow.data ?? []) as PlayerRow[];
    expect(players).toHaveLength(1);

    // createRoom calls signOut() internally, so host.userId is stale.
    // The authoritative host ID is on the room row.
    const result = validateAndBuildSetup({
      room: roomRow.data!,
      players,
      callerId: roomRow.data!.host_id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.setups).toHaveLength(1);
    expect(result.value.setups[0]?.zodiacSign).toBe(SOLO_SIGN);
  });

  it('solo: initializeGame produces a 1-player GameState from real player data', async () => {
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Alex', client: host.client });
    if (!created.ok) throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);

    await setZodiacSign(host.client, {
      playerId: created.value.playerId,
      sign: SOLO_SIGN,
    });

    const svc = getServiceClient();
    const roomRow = await svc
      .from('rooms')
      .select()
      .eq('id', created.value.roomId)
      .maybeSingle<RoomRow>();
    const playersRow = await svc
      .from('players')
      .select()
      .eq('room_id', created.value.roomId)
      .order('seat', { ascending: true });
    const players = (playersRow.data ?? []) as PlayerRow[];

    const validated = validateAndBuildSetup({
      room: roomRow.data!,
      players,
      callerId: roomRow.data!.host_id,
    });
    if (!validated.ok)
      throw new Error(`validateAndBuildSetup rejected: ${JSON.stringify(validated.error)}`);

    const initialState = initializeGame({
      players: validated.value.setups,
      rng: seededRng(278),
    });

    expect(initialState.players).toHaveLength(1);
    expect(initialState.players[0]?.zodiacSign).toBe(SOLO_SIGN);
    // Solo game starts with 1 deck (design: 1–2 players → 1 deck).
    expect(initialState.deck.length).toBeGreaterThan(0);
    // First player is the active player.
    expect(initialState.activePlayerId).toBe(initialState.players[0]?.id);
  });

  // ── Six players ──────────────────────────────────────────────────

  it('6-player: validateAndBuildSetup succeeds for a fully-seated room', async () => {
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);

    // Set host zodiac sign.
    await setZodiacSign(host.client, {
      playerId: created.value.playerId,
      sign: SIX_PLAYER_SIGNS[0],
    });

    // Join 5 guests and assign distinct zodiac signs.
    const guestNicknames = ['Bea', 'Cyrus', 'Dara', 'Eve', 'Felix'];
    for (let i = 0; i < guestNicknames.length; i++) {
      const guest = await makeAnonClient();
      const joined = await joinRoom({
        code: created.value.code,
        nickname: guestNicknames[i]!,
        client: guest.client,
      });
      if (!joined.ok)
        throw new Error(`joinRoom (${guestNicknames[i]}) failed: ${JSON.stringify(joined.error)}`);
      // Use service-role to set zodiac sign — avoids needing to keep
      // each guest's client alive after joinRoom's internal signOut.
      const svc = getServiceClient();
      await svc
        .from('players')
        .update({ zodiac_sign: SIX_PLAYER_SIGNS[i + 1] })
        .eq('id', joined.value.playerId);
    }

    const svc = getServiceClient();
    const roomRow = await svc
      .from('rooms')
      .select()
      .eq('id', created.value.roomId)
      .maybeSingle<RoomRow>();
    const playersRow = await svc
      .from('players')
      .select()
      .eq('room_id', created.value.roomId)
      .order('seat', { ascending: true });
    expect(playersRow.error).toBeNull();
    const players = (playersRow.data ?? []) as PlayerRow[];
    expect(players).toHaveLength(6);

    const result = validateAndBuildSetup({
      room: roomRow.data!,
      players,
      callerId: roomRow.data!.host_id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.setups).toHaveLength(6);
    // Signs must be unique across all 6.
    const assignedSigns = result.value.setups.map((s) => s.zodiacSign);
    expect(new Set(assignedSigns).size).toBe(6);
  });

  it('6-player: initializeGame produces a 6-player GameState from real player data', async () => {
    const host = await makeAnonClient();
    const created = await createRoom({ nickname: 'Andy', client: host.client });
    if (!created.ok) throw new Error(`createRoom failed: ${JSON.stringify(created.error)}`);

    await setZodiacSign(host.client, {
      playerId: created.value.playerId,
      sign: SIX_PLAYER_SIGNS[0],
    });

    const guestNicknames = ['Bea', 'Cyrus', 'Dara', 'Eve', 'Felix'];
    const guestPlayerIds: string[] = [];
    for (let i = 0; i < guestNicknames.length; i++) {
      const guest = await makeAnonClient();
      const joined = await joinRoom({
        code: created.value.code,
        nickname: guestNicknames[i]!,
        client: guest.client,
      });
      if (!joined.ok)
        throw new Error(`joinRoom (${guestNicknames[i]}) failed: ${JSON.stringify(joined.error)}`);
      guestPlayerIds.push(joined.value.playerId);
      const svc = getServiceClient();
      await svc
        .from('players')
        .update({ zodiac_sign: SIX_PLAYER_SIGNS[i + 1] })
        .eq('id', joined.value.playerId);
    }

    const svc = getServiceClient();
    const roomRow = await svc
      .from('rooms')
      .select()
      .eq('id', created.value.roomId)
      .maybeSingle<RoomRow>();
    const playersRow = await svc
      .from('players')
      .select()
      .eq('room_id', created.value.roomId)
      .order('seat', { ascending: true });
    const players = (playersRow.data ?? []) as PlayerRow[];

    const validated = validateAndBuildSetup({
      room: roomRow.data!,
      players,
      callerId: roomRow.data!.host_id,
    });
    if (!validated.ok)
      throw new Error(`validateAndBuildSetup rejected: ${JSON.stringify(validated.error)}`);

    const initialState = initializeGame({
      players: validated.value.setups,
      rng: seededRng(278),
    });

    expect(initialState.players).toHaveLength(6);
    // 5–6 players → 3 decks (design rule per mechanics.md).
    // Each deck has 78 cards; minus 3 cards dealt per player (18 cards).
    // 3*78 - 18 = 216 remaining in deck.
    expect(initialState.deck.length).toBe(3 * 78 - 6 * 3);
    expect(initialState.activePlayerId).toBe(initialState.players[0]?.id);
  });
});
