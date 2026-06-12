import { describe, expect, it } from 'vitest';
import { formatCreateError, formatJoinError } from '../HomeRoomForms';

describe('formatCreateError', () => {
  describe('auth-failed — network error', () => {
    it('returns a human message for "Failed to fetch" (Chrome)', () => {
      expect(formatCreateError({ kind: 'auth-failed', cause: 'Failed to fetch' })).toBe(
        "Can't reach the game server — please check your connection and try again.",
      );
    });

    it('returns a human message for Firefox NetworkError', () => {
      expect(
        formatCreateError({
          kind: 'auth-failed',
          cause: 'NetworkError when attempting to fetch resource',
        }),
      ).toBe("Can't reach the game server — please check your connection and try again.");
    });

    it('returns a human message for Safari "Load failed"', () => {
      expect(formatCreateError({ kind: 'auth-failed', cause: 'Load failed' })).toBe(
        "Can't reach the game server — please check your connection and try again.",
      );
    });
  });

  describe('auth-failed — server error', () => {
    it('passes through a Supabase-level error message', () => {
      expect(
        formatCreateError({ kind: 'auth-failed', cause: 'Anonymous sign-ins are disabled' }),
      ).toBe("Couldn't start an anonymous session. Anonymous sign-ins are disabled");
    });
  });
});

describe('formatJoinError', () => {
  describe('auth-failed — network error', () => {
    it('returns a human message for "Failed to fetch"', () => {
      expect(formatJoinError({ kind: 'auth-failed', cause: 'Failed to fetch' })).toBe(
        "Can't reach the game server — please check your connection and try again.",
      );
    });
  });

  describe('auth-failed — server error', () => {
    it('passes through a Supabase-level error message', () => {
      expect(
        formatJoinError({ kind: 'auth-failed', cause: 'Anonymous sign-ins are disabled' }),
      ).toBe("Couldn't start an anonymous session. Anonymous sign-ins are disabled");
    });
  });
});
