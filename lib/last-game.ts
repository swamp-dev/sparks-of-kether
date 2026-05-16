/**
 * `sok.lastGame` — localStorage bookmark for the player's most recent room.
 *
 * Written when a player creates/joins a room or when the game starts.
 * Read on the home screen to offer a "Continue Game" shortcut.
 * Cleared when the player explicitly abandons their session.
 *
 * Entries older than STALE_MS (30 days, matching the Supabase anonymous
 * session refresh-token expiry) are treated as stale and return null.
 */

export const LAST_GAME_KEY = 'sok.lastGame';

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export interface LastGame {
  readonly code: string;
  readonly nickname: string;
  readonly roomState: 'lobby' | 'playing' | 'paused';
  readonly writtenAt: number;
}

function isValidEntry(value: unknown): value is LastGame {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['code'] === 'string' &&
    typeof v['nickname'] === 'string' &&
    (v['roomState'] === 'lobby' || v['roomState'] === 'playing' || v['roomState'] === 'paused') &&
    typeof v['writtenAt'] === 'number'
  );
}

export function readLastGame(): LastGame | null {
  try {
    const raw = localStorage.getItem(LAST_GAME_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidEntry(parsed)) return null;
    if (Date.now() - parsed.writtenAt > STALE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastGame(entry: LastGame): void {
  try {
    localStorage.setItem(LAST_GAME_KEY, JSON.stringify(entry));
  } catch {
    // Private-browsing mode or quota exceeded — silently ignore.
  }
}

export function clearLastGame(): void {
  try {
    localStorage.removeItem(LAST_GAME_KEY);
  } catch {
    // Silently ignore.
  }
}
