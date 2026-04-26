/**
 * Room code generation. Six characters from a confusable-free
 * alphabet — no I, O, 0, 1, or lowercase letters — so a player
 * reading a code aloud over voice chat or transcribing it from a
 * screen doesn't fight the visual ambiguity.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

/**
 * Generate one room code. Caller is expected to retry on a unique-
 * constraint conflict; the alphabet of 32 chars × 6 positions =
 * ~1B values, so collisions in active-room space are vanishingly
 * rare.
 *
 * `rng` defaults to `Math.random` for production. Tests pass a
 * deterministic source.
 */
export function generateRoomCode(
  rng: () => number = Math.random,
): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const idx = Math.floor(rng() * ALPHABET.length);
    const ch = ALPHABET[idx];
    if (ch === undefined) {
      // Defensive — Math.floor of [0,1) * 32 is always in [0,31].
      // A misbehaving rng (returning >= 1) would otherwise produce
      // an out-of-bounds index. Fall back to the first char.
      code += ALPHABET.charAt(0);
    } else {
      code += ch;
    }
  }
  return code;
}

/**
 * Validate user-entered codes before sending them to the server.
 * Trim + uppercase + alphabet check. Returns the normalized form on
 * success, `null` on rejection.
 *
 * The client surfaces a clear error before the network round-trip;
 * the server still validates because the client is untrusted.
 */
export function normalizeRoomCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  if (trimmed.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of trimmed) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return trimmed;
}
