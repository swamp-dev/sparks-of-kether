import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetSupabaseClientForTests,
  createSupabaseServerClient,
  deserializeGameState,
  getSupabaseBrowserClient,
  getSupabaseClient,
  serializeGameState,
} from '../supabase';
import type { SerializedGameState } from '../supabase';
import { makePlayer, makeState } from '@/test/fixtures';

describe('supabase client wrapper', () => {
  const originalUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const originalKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  beforeEach(() => {
    __resetSupabaseClientForTests();
  });

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env['NEXT_PUBLIC_SUPABASE_URL'] = originalUrl;
    } else {
      delete process.env['NEXT_PUBLIC_SUPABASE_URL'];
    }
    if (originalKey !== undefined) {
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = originalKey;
    } else {
      delete process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    }
  });

  it('throws a clear error when env vars are missing', () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL'];
    delete process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    expect(() => getSupabaseClient()).toThrow(/env vars missing/);
  });

  it('returns a usable client when env vars are set', () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
    const client = getSupabaseClient();
    // We don't make a network call in unit tests — just confirm the
    // client surfaces the typed table accessors.
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
    const builder = client.from('rooms');
    expect(typeof builder.select).toBe('function');
  });

  it('caches the browser client across calls', () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
    expect(getSupabaseBrowserClient()).toBe(getSupabaseBrowserClient());
    // Back-compat alias points at the same singleton.
    expect(getSupabaseClient()).toBe(getSupabaseBrowserClient());
  });

  it('createSupabaseServerClient does NOT cache — fresh per call', () => {
    // Server clients must not share auth state across requests.
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
    const a = createSupabaseServerClient();
    const b = createSupabaseServerClient();
    expect(a).not.toBe(b);
  });
});

describe('serializeGameState / deserializeGameState', () => {
  it('round-trips a fresh state without losing Set members', () => {
    const original = makeState({
      clearedSefirot: new Set(['malkuth', 'yesod']),
      sparksHeld: new Set(['hod', 'netzach']),
    });
    const serialized = serializeGameState(original);
    // Sets become arrays at the persistence boundary (JSON-safe).
    expect(serialized.players[0]?.clearedSefirot).toEqual(['malkuth', 'yesod']);
    expect(serialized.players[0]?.sparksHeld).toEqual(['hod', 'netzach']);
    expect(serialized.revealedCards).toEqual([]);

    const restored = deserializeGameState(serialized);
    expect(restored.players[0]?.clearedSefirot.has('malkuth')).toBe(true);
    expect(restored.players[0]?.clearedSefirot.has('yesod')).toBe(true);
    expect(restored.players[0]?.sparksHeld.has('hod')).toBe(true);
    expect(restored.revealedCards.size).toBe(0);
  });

  it('preserves all top-level scalar fields', () => {
    const original = makeState(
      {},
      {
        illumination: 7,
        separation: 4,
        shellCancellationsAvailable: 2,
        shellsDeflected: 1,
      },
    );
    const restored = deserializeGameState(serializeGameState(original));
    expect(restored.illumination).toBe(7);
    expect(restored.separation).toBe(4);
    expect(restored.shellCancellationsAvailable).toBe(2);
    expect(restored.shellsDeflected).toBe(1);
  });

  it('preserves pillarStreak, shells, and pendingAbilities round-trip', () => {
    const original = makeState(
      {},
      {
        pillarStreak: {
          currentPillar: 'mercy',
          sameCount: 2,
          alternationCount: 1,
        },
      },
    );
    const restored = deserializeGameState(serializeGameState(original));
    expect(restored.pillarStreak.currentPillar).toBe('mercy');
    expect(restored.pillarStreak.sameCount).toBe(2);
    expect(restored.pillarStreak.alternationCount).toBe(1);
    expect(restored.shells.kether).toBe('dormant');
    expect(restored.players[0]?.pendingAbilities.harmonyArmed).toBe(false);
  });

  it('serialized form is JSON-stringify-safe (Sets would throw)', () => {
    const state = makeState(
      {},
      {
        players: [
          makePlayer({
            id: 'p1',
            sparksHeld: new Set(['kether']),
            clearedSefirot: new Set(['kether']),
          }),
        ],
        revealedCards: new Set([5, 10]),
      },
    );
    const serialized = serializeGameState(state);
    // Plain JSON.stringify would silently drop Set entries; with
    // the array form, we get the actual data back.
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json) as SerializedGameState;
    expect(parsed.revealedCards).toEqual([5, 10]);
    expect(parsed.players[0]?.sparksHeld).toEqual(['kether']);
  });
});
