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
    zodiac_sign: 'aries',
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
      makePlayerRow({ id: 'host-uid', nickname: 'Andy', zodiac_sign: 'aries', seat: 0 }),
      makePlayerRow({ id: 'p2', nickname: 'Bea', zodiac_sign: 'leo', seat: 1 }),
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
    expect(result.value.setups[0]?.zodiacSign).toBe('aries');
    expect(result.value.setups[1]?.zodiacSign).toBe('leo');
  });

  it('returns players in seat order regardless of input order', () => {
    const room = makeRoom();
    const players = [
      makePlayerRow({ id: 'p2', zodiac_sign: 'leo', seat: 1 }),
      makePlayerRow({ id: 'host-uid', zodiac_sign: 'aries', seat: 0 }),
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
      makePlayerRow({ id: 'host-uid', zodiac_sign: 'aries' }),
      makePlayerRow({ id: 'p2', zodiac_sign: 'leo', seat: 1 }),
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
      makePlayerRow({ id: 'host-uid', zodiac_sign: 'aries' }),
      makePlayerRow({ id: 'p2', zodiac_sign: 'leo', seat: 1 }),
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
    const players = [makePlayerRow({ id: 'host-uid', zodiac_sign: 'aries' })];
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
        zodiac_sign: 'aries',
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

  it('rejects with missing-zodiac-sign listing every offender', () => {
    const players = [
      makePlayerRow({ id: 'host-uid', zodiac_sign: 'aries' }),
      makePlayerRow({ id: 'p2', zodiac_sign: null, seat: 1 }),
      makePlayerRow({ id: 'p3', zodiac_sign: null, seat: 2 }),
    ];
    const result = validateAndBuildSetup({
      room: makeRoom(),
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('missing-zodiac-sign');
    if (result.error.kind !== 'missing-zodiac-sign') return;
    expect([...result.error.playerIds].sort()).toEqual(['p2', 'p3']);
  });

  it('rejects when two players share a zodiac sign (per design)', () => {
    // Per `design/astrological-classes.md`: "Each player must pick a
    // unique sign — duplicates are not allowed at the lobby."
    const players = [
      makePlayerRow({ id: 'host-uid', zodiac_sign: 'aries' }),
      makePlayerRow({ id: 'p2', zodiac_sign: 'aries', seat: 1 }),
    ];
    const result = validateAndBuildSetup({
      room: makeRoom(),
      players,
      callerId: 'host-uid',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('duplicate-zodiac-signs');
  });
});
