import { describe, expect, it } from 'vitest';
import { validateAndBuildSetup } from '../start-game';
import type { PlayerRow, RoomRow } from '../supabase';

function makeRoom(overrides: Partial<RoomRow> = {}): RoomRow {
  return {
    id: 'room-uuid',
    code: 'ABCDEF',
    host_id: 'host-uid',
    state: 'lobby',
    created_at: 't',
    started_at: null,
    finished_at: null,
    ...overrides,
  };
}

function makePlayerRow(overrides: Partial<PlayerRow> = {}): PlayerRow {
  return {
    id: 'p1',
    room_id: 'room-uuid',
    nickname: 'Alex',
    soul_aspect: 'tiferet',
    ready: true,
    seat: 0,
    joined_at: 't',
    ...overrides,
  };
}

describe('validateAndBuildSetup', () => {
  it('builds a PlayerSetup[] for a valid lobby + host caller', () => {
    const room = makeRoom();
    const players = [
      makePlayerRow({ id: 'host-uid', nickname: 'Andy', soul_aspect: 'chesed', seat: 0 }),
      makePlayerRow({ id: 'p2', nickname: 'Bea', soul_aspect: 'gevurah', seat: 1 }),
    ];
    const result = validateAndBuildSetup({
      room,
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.setups).toHaveLength(2);
    expect(result.value.setups[0]?.id).toBe('host-uid');
    expect(result.value.setups[0]?.soulAspect).toBe('chesed');
    expect(result.value.setups[1]?.soulAspect).toBe('gevurah');
  });

  it('returns players in seat order regardless of input order', () => {
    const room = makeRoom();
    const players = [
      makePlayerRow({ id: 'p2', soul_aspect: 'gevurah', seat: 1 }),
      makePlayerRow({ id: 'host-uid', soul_aspect: 'chesed', seat: 0 }),
    ];
    const result = validateAndBuildSetup({
      room,
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.setups.map((s) => s.id)).toEqual(['host-uid', 'p2']);
  });

  it('rejects when caller is not the host', () => {
    const room = makeRoom();
    const players = [
      makePlayerRow({ id: 'host-uid', soul_aspect: 'chesed' }),
      makePlayerRow({ id: 'p2', soul_aspect: 'gevurah', seat: 1 }),
    ];
    const result = validateAndBuildSetup({
      room,
      players,
      callerId: 'p2',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('not-host');
  });

  it('rejects when room is not in lobby state', () => {
    const room = makeRoom({ state: 'playing' });
    const players = [
      makePlayerRow({ id: 'host-uid', soul_aspect: 'chesed' }),
      makePlayerRow({ id: 'p2', soul_aspect: 'gevurah', seat: 1 }),
    ];
    const result = validateAndBuildSetup({
      room,
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('not-lobby');
    if (result.error.kind !== 'not-lobby') return;
    expect(result.error.currentState).toBe('playing');
  });

  it('rejects with too-few-players when only one player is present', () => {
    const players = [makePlayerRow({ id: 'host-uid', soul_aspect: 'chesed' })];
    const result = validateAndBuildSetup({
      room: makeRoom(),
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('too-few-players');
  });

  it('rejects with too-many-players when 5+ players are present', () => {
    const players = Array.from({ length: 5 }, (_, i) =>
      makePlayerRow({
        id: i === 0 ? 'host-uid' : `p${i + 1}`,
        soul_aspect: 'chesed',
        seat: i,
      }),
    );
    const result = validateAndBuildSetup({
      room: makeRoom(),
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('too-many-players');
  });

  it('rejects with missing-soul-aspect listing every offender', () => {
    const players = [
      makePlayerRow({ id: 'host-uid', soul_aspect: 'chesed' }),
      makePlayerRow({ id: 'p2', soul_aspect: null, seat: 1 }),
      makePlayerRow({ id: 'p3', soul_aspect: null, seat: 2 }),
    ];
    const result = validateAndBuildSetup({
      room: makeRoom(),
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('missing-soul-aspect');
    if (result.error.kind !== 'missing-soul-aspect') return;
    expect([...result.error.playerIds].sort()).toEqual(['p2', 'p3']);
  });

  it('rejects when two players share a soul aspect (per design)', () => {
    // Per `design/mechanics.md` § Soul Aspect: "Soul Aspects may not
    // duplicate across players."
    const players = [
      makePlayerRow({ id: 'host-uid', soul_aspect: 'chesed' }),
      makePlayerRow({ id: 'p2', soul_aspect: 'chesed', seat: 1 }),
    ];
    const result = validateAndBuildSetup({
      room: makeRoom(),
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('duplicate-soul-aspects');
  });
});
