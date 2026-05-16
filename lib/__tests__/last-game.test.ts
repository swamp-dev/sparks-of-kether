import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LAST_GAME_KEY,
  readLastGame,
  writeLastGame,
  clearLastGame,
  type LastGame,
} from '../last-game';

// Minimal localStorage mock — just enough for round-trip testing.
function makeLocalStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      Reflect.deleteProperty(store, k);
    },
    clear: () => {
      Object.keys(store).forEach((k) => Reflect.deleteProperty(store, k));
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('last-game localStorage utilities', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorage());
  });

  it('LAST_GAME_KEY is the correct key', () => {
    expect(LAST_GAME_KEY).toBe('sok.lastGame');
  });

  describe('readLastGame', () => {
    it('returns null when key is absent', () => {
      expect(readLastGame()).toBeNull();
    });

    it('returns null when stored value is not valid JSON', () => {
      localStorage.setItem(LAST_GAME_KEY, 'not json {{{');
      expect(readLastGame()).toBeNull();
    });

    it('returns null when stored value is missing required fields', () => {
      localStorage.setItem(LAST_GAME_KEY, JSON.stringify({ code: 'ABCDEF' }));
      expect(readLastGame()).toBeNull();
    });

    it('returns null when entry is older than 30 days', () => {
      const staleEntry: LastGame = {
        code: 'STALE1',
        nickname: 'Ada',
        roomState: 'playing',
        writtenAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(LAST_GAME_KEY, JSON.stringify(staleEntry));
      expect(readLastGame()).toBeNull();
    });

    it('returns a valid recent entry', () => {
      const entry: LastGame = {
        code: 'KETHER',
        nickname: 'Miriam',
        roomState: 'playing',
        writtenAt: Date.now() - 60_000, // 1 minute ago
      };
      localStorage.setItem(LAST_GAME_KEY, JSON.stringify(entry));
      expect(readLastGame()).toEqual(entry);
    });

    it('accepts entries exactly at the 30-day boundary', () => {
      const entry: LastGame = {
        code: 'BOUND1',
        nickname: 'Yael',
        roomState: 'paused',
        writtenAt: Date.now() - 30 * 24 * 60 * 60 * 1000 + 1000, // just within
      };
      localStorage.setItem(LAST_GAME_KEY, JSON.stringify(entry));
      expect(readLastGame()).not.toBeNull();
    });

    it('returns null when localStorage throws', () => {
      const throwing = {
        ...makeLocalStorage(),
        getItem: () => {
          throw new Error('quota exceeded');
        },
      };
      vi.stubGlobal('localStorage', throwing);
      expect(readLastGame()).toBeNull();
    });
  });

  describe('writeLastGame', () => {
    it('persists the entry and readLastGame returns it', () => {
      const entry: LastGame = {
        code: 'ABCDEF',
        nickname: 'Reuben',
        roomState: 'lobby',
        writtenAt: Date.now(),
      };
      writeLastGame(entry);
      expect(readLastGame()).toEqual(entry);
    });

    it('silently ignores localStorage write errors', () => {
      const throwing = {
        ...makeLocalStorage(),
        setItem: () => {
          throw new Error('quota exceeded');
        },
      };
      vi.stubGlobal('localStorage', throwing);
      expect(() =>
        writeLastGame({
          code: 'ERR123',
          nickname: 'Test',
          roomState: 'playing',
          writtenAt: Date.now(),
        }),
      ).not.toThrow();
    });
  });

  describe('clearLastGame', () => {
    it('removes the stored entry', () => {
      writeLastGame({
        code: 'CLEAR1',
        nickname: 'Sam',
        roomState: 'playing',
        writtenAt: Date.now(),
      });
      clearLastGame();
      expect(readLastGame()).toBeNull();
    });

    it('is a no-op when nothing is stored', () => {
      expect(() => clearLastGame()).not.toThrow();
      expect(readLastGame()).toBeNull();
    });

    it('silently ignores localStorage errors', () => {
      const throwing = {
        ...makeLocalStorage(),
        removeItem: () => {
          throw new Error('private mode');
        },
      };
      vi.stubGlobal('localStorage', throwing);
      expect(() => clearLastGame()).not.toThrow();
    });
  });
});
