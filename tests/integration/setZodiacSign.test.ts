import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom, setReady, setZodiacSign } from '@/lib/rooms';
import { getServiceClient, makeAnonClient, wipeAllTables } from './setup';

/**
 * Seat a second anonymous player (`guestUserId`) into the room via the
 * service-role client. We do NOT go through `lib/rooms.joinRoom` here:
 * its seat-calculation step reads `players` through the JOINER's
 * (still-pre-membership) auth scope, which the `players_member_select`
 * RLS policy denies — the joiner sees an empty list and re-uses
 * seat 0, colliding with the host. That's a latent bug surfaced by
 * the multi-player tests below; fixing it is outside #265's scope, so
 * we side-step here via the service role and let the integration
 * smoke focus on what #265 added (the update mutations + Realtime).
 *
 * The real app's join path is the same `joinRoom` helper, so this
 * shortcut means these tests don't exercise it. The createRoom test
 * in `tests/integration/createRoom.test.ts` already covers the
 * single-player insert; the join-collision bug needs its own ticket.
 */
async function seedSecondPlayer(
  roomId: string,
  guestUserId: string,
  nickname: string,
  seat: number,
): Promise<void> {
  const svc = getServiceClient();
  const insert = await svc.from('players').insert({
    id: guestUserId,
    room_id: roomId,
    nickname,
    zodiac_sign: null,
    ready: false,
    seat,
  });
  if (insert.error) {
    throw new Error(`seedSecondPlayer failed: ${insert.error.message}`);
  }
}

/**
 * #265 smoke: setZodiacSign + setReady against real Supabase. Validates
 * that:
 *
 *   1. The `players_self_update` RLS policy lets a player update their
 *      own row (`zodiac_sign`, `ready`).
 *   2. A NON-self update (player A trying to mutate player B's row)
 *      silently no-ops — Supabase reports success-with-empty-result
 *      rather than an error, mirroring `kickPlayer`'s RLS surface.
 *   3. Both writes round-trip through Postgres so the migration's
 *      `zodiac_sign text` column accepts the engine's
 *      ZodiacSignKey values without an enum.
 *
 * The unit tests in `lib/__tests__/rooms.test.ts` exercise the call
 * shape against a stub; this is the RLS-correctness floor.
 */

describe('integration: setZodiacSign / setReady (real Supabase)', () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it('lets the caller update their own zodiac_sign', async () => {
    const { client, userId } = await makeAnonClient();
    const create = await createRoom({ nickname: 'Andy', client });
    if (!create.ok) {
      throw new Error(`createRoom failed: ${JSON.stringify(create.error)}`);
    }

    const result = await setZodiacSign(client, {
      playerId: userId,
      sign: 'aries',
    });
    expect(result.ok).toBe(true);

    const svc = getServiceClient();
    const players = await svc
      .from('players')
      .select('id, zodiac_sign')
      .eq('id', userId)
      .single();
    expect(players.error).toBeNull();
    expect((players.data as { zodiac_sign: string | null }).zodiac_sign).toBe(
      'aries',
    );
  });

  it('lets the caller toggle their own ready flag', async () => {
    const { client, userId } = await makeAnonClient();
    const create = await createRoom({ nickname: 'Andy', client });
    if (!create.ok) {
      throw new Error(`createRoom failed: ${JSON.stringify(create.error)}`);
    }

    const r1 = await setReady(client, { playerId: userId, ready: true });
    expect(r1.ok).toBe(true);

    const svc = getServiceClient();
    const after = await svc
      .from('players')
      .select('ready')
      .eq('id', userId)
      .single();
    expect((after.data as { ready: boolean }).ready).toBe(true);
  });

  it('RLS silently no-ops when one player tries to mutate another', async () => {
    // Two anonymous players, same room. Player A then tries to update
    // player B's zodiac_sign — `players_self_update` filters on
    // `id = auth.uid()`, so no row matches and the update reports
    // success with no rows affected. The DB unchanged is the contract.
    const host = await makeAnonClient();
    const create = await createRoom({ nickname: 'Andy', client: host.client });
    if (!create.ok) {
      throw new Error(`createRoom failed: ${JSON.stringify(create.error)}`);
    }

    const guest = await makeAnonClient();
    await seedSecondPlayer(create.value.roomId, guest.userId, 'Bea', 1);

    // Guest sets their own sign — succeeds.
    await setZodiacSign(guest.client, {
      playerId: guest.userId,
      sign: 'leo',
    });
    // Host attempts to overwrite the guest's sign — no error from
    // Supabase, but no row is updated.
    const sneaky = await setZodiacSign(host.client, {
      playerId: guest.userId,
      sign: 'aries',
    });
    expect(sneaky.ok).toBe(true);

    const svc = getServiceClient();
    const guestRow = await svc
      .from('players')
      .select('zodiac_sign')
      .eq('id', guest.userId)
      .single();
    // Original pick survives.
    expect((guestRow.data as { zodiac_sign: string | null }).zodiac_sign).toBe(
      'leo',
    );
  });

  it('the supabase_realtime publication includes `players`', async () => {
    // The Realtime container only broadcasts INSERT/UPDATE/DELETE on
    // tables present in `supabase_realtime`. The 0001..0004 baseline
    // shipped without adding `players` (or `game_states`); migration
    // 0005 closes that gap. A direct catalog read keeps this honest:
    // a future migration that drops `players` from the publication
    // would silently break the lobby's cross-tab sync, and this test
    // would catch it.
    //
    // We deliberately do NOT exercise the live Realtime channel here.
    // On a freshly-booted local stack the realtime worker takes a
    // few seconds to populate its in-memory map of publication
    // tables; a test that starts a channel inside that window fires
    // SUBSCRIBED but never receives row payloads. The publication
    // membership check is the deterministic contract — the channel
    // tests in `lib/__tests__/use-lobby.test.tsx` cover the merging
    // semantics against a stub that mirrors the runtime payload.
    const svc = getServiceClient();
    const pub = await svc
      // pg_publication_tables is in the catalog schema; PostgREST
      // exposes it via the `rest/v1/rpc` route IF wired, but a
      // direct .from() works on Supabase-flavoured Postgres because
      // the catalog views are readable. We use a small RPC as the
      // narrowest surface — no need to grant the anon role anything.
      .rpc('publication_tables');

    if (pub.error) {
      // Helper RPC isn't defined; fall back to a focused query via
      // the same service-role pg connection. The test suite can run
      // either way, but we'd rather fail loud than silently skip.
      throw new Error(
        `publication_tables RPC missing — add the helper in a follow-up migration. error: ${pub.error.message}`,
      );
    }
    const tables = (pub.data as { tablename: string }[]).map(
      (r) => r.tablename,
    );
    expect(tables).toContain('players');
    expect(tables).toContain('game_states');
  });
});
