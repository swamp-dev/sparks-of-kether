import { describe, expect, it } from 'vitest';
import type { PlayerState, GameState } from '../types';
import { adjacentSefirot, canTravelPath, applyMove, adjacentPaths } from '../movement';

// ──────────────── Fixtures ────────────────

/**
 * Minimal game-state factory for tests. Override as needed. One
 * player, default position Malkuth, default empty hand & discard.
 */
function makeState(overrides: Partial<PlayerState> = {}, extra: Partial<GameState> = {}): GameState {
  const player: PlayerState = {
    id: 'p1',
    name: 'Alex',
    position: 'malkuth',
    hand: [],
    ...overrides,
  };
  return {
    players: [player],
    discardPile: [],
    ...extra,
  };
}

// ──────────────── adjacentSefirot ────────────────

describe('adjacentSefirot', () => {
  it('returns the three Sefirot reachable from Malkuth', () => {
    // Paths out of Malkuth: 29 (Netzach↔Malkuth), 31 (Hod↔Malkuth), 32 (Yesod↔Malkuth).
    expect([...adjacentSefirot('malkuth')].sort()).toEqual(['hod', 'netzach', 'yesod']);
  });

  it('returns the three Sefirot that lead into Kether', () => {
    // Paths into Kether: 11 (from Chokmah), 12 (from Binah), 13 (from Tiferet).
    expect([...adjacentSefirot('kether')].sort()).toEqual(['binah', 'chokmah', 'tiferet']);
  });

  it('Tiferet connects through eight paths', () => {
    // Paths touching Tiferet: 13, 15, 17, 20, 22, 24, 25, 26 → eight neighbours.
    expect([...adjacentSefirot('tiferet')].sort()).toEqual([
      'binah',
      'chesed',
      'chokmah',
      'gevurah',
      'hod',
      'kether',
      'netzach',
      'yesod',
    ]);
  });
});

// ──────────────── canTravelPath ────────────────

describe('canTravelPath', () => {
  it('accepts a valid move: card in hand, path touches current position', () => {
    // The World (arcanum 21) = path 32 = Yesod ↔ Malkuth.
    const state = makeState({ position: 'malkuth', hand: [21] });
    const result = canTravelPath(state, 'p1', 32);
    expect(result.ok).toBe(true);
  });

  it('accepts travelling a path in the other direction', () => {
    // Same path 32 played from Yesod side — should be legal because
    // paths are bidirectional.
    const state = makeState({ position: 'yesod', hand: [21] });
    const result = canTravelPath(state, 'p1', 32);
    expect(result.ok).toBe(true);
  });

  it('rejects when the arcanum for that path is not in hand', () => {
    const state = makeState({ position: 'malkuth', hand: [0, 1] });
    const result = canTravelPath(state, 'p1', 32);
    expect(result).toEqual({
      ok: false,
      reason: { kind: 'card-not-in-hand', arcanumNumber: 21, pathNumber: 32 },
    });
  });

  it("rejects when the path doesn't connect the player's current position", () => {
    // Arcanum 21 / path 32 connects Yesod↔Malkuth, not Hod↔Kether.
    const state = makeState({ position: 'hod', hand: [21] });
    const result = canTravelPath(state, 'p1', 32);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.kind).toBe('path-does-not-connect');
    }
  });

  it('rejects unknown player id', () => {
    const state = makeState({ position: 'malkuth', hand: [21] });
    const result = canTravelPath(state, 'who-is-this', 32);
    expect(result).toEqual({
      ok: false,
      reason: { kind: 'unknown-player', playerId: 'who-is-this' },
    });
  });

  it('rejects path numbers outside 11–32', () => {
    const state = makeState({ position: 'malkuth', hand: [21] });
    const result = canTravelPath(state, 'p1', 999);
    expect(result).toEqual({
      ok: false,
      reason: { kind: 'unknown-path', pathNumber: 999 },
    });
  });
});

// ──────────────── applyMove ────────────────

describe('applyMove', () => {
  it('on success: updates position, removes card from hand, adds card to discard', () => {
    const state = makeState({ position: 'malkuth', hand: [21, 0] });
    const result = applyMove(state, 'p1', 32);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const next = result.value;
    const player = next.players.find((p) => p.id === 'p1');
    expect(player?.position).toBe('yesod');
    expect(player?.hand).toEqual([0]);
    expect(next.discardPile).toEqual([21]);
  });

  it('moves across a path in reverse when the player is on the other endpoint', () => {
    const state = makeState({ position: 'yesod', hand: [21] });
    const result = applyMove(state, 'p1', 32);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.players[0]?.position).toBe('malkuth');
  });

  it('on failure: returns the rejection and does not mutate input state', () => {
    const state = makeState({ position: 'hod', hand: [21] });
    const before = JSON.stringify(state);
    const result = applyMove(state, 'p1', 32);
    expect(result.ok).toBe(false);
    // Input unchanged:
    expect(JSON.stringify(state)).toBe(before);
  });

  it('preserves other players untouched when one player moves', () => {
    const base = makeState({ id: 'p1', hand: [21] });
    const state: GameState = {
      ...base,
      players: [
        ...base.players,
        { id: 'p2', name: 'Jordan', position: 'hod', hand: [12] },
      ],
    };
    const result = applyMove(state, 'p1', 32);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const p2 = result.value.players.find((p) => p.id === 'p2');
    expect(p2).toEqual({ id: 'p2', name: 'Jordan', position: 'hod', hand: [12] });
  });

  it('removes exactly one copy of the card if duplicates exist', () => {
    // Duplicate-hand case shouldn't happen in a real game (deck is
    // unique) but the reducer must not over-remove if it ever does.
    const state = makeState({ position: 'malkuth', hand: [21, 21, 0] });
    const result = applyMove(state, 'p1', 32);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.hand).toEqual([21, 0]);
  });

  it('stacks sequentially: second applyMove reads the updated state, not the original', () => {
    // Start at Malkuth with World (21) and Moon (18). Play 32 to Yesod,
    // then 29 (Netzach↔Malkuth) should be *rejected* because the player
    // moved away from Malkuth — proving apply #2 saw the new position.
    // Then replace with Temperance (14) — path 25 Tiferet↔Yesod — which
    // also fails because we're at Yesod, not Tiferet. Use path 30
    // (Hod↔Yesod, Sun/19) from Yesod: we don't have it. So use path 28
    // (Netzach↔Yesod, Star/17): we don't have that either. Use path 32
    // again? We just discarded 21. Rebuild with the right starter hand.
    const state = makeState({ position: 'malkuth', hand: [21, 17] });
    const first = applyMove(state, 'p1', 32);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Now at Yesod. Path 28 (Star = arcanum 17) touches Yesod.
    const second = applyMove(first.value, 'p1', 28);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const finalPlayer = second.value.players[0];
    expect(finalPlayer?.position).toBe('netzach');
    expect(finalPlayer?.hand).toEqual([]);
    expect(second.value.discardPile).toEqual([21, 17]);
  });

  it('second applyMove fails when the original-state path is no longer adjacent', () => {
    // After moving off Malkuth, a Malkuth-adjacent path should fail —
    // confirms that apply actually commits the new position.
    const state = makeState({ position: 'malkuth', hand: [21, 18] });
    const first = applyMove(state, 'p1', 32); // -> Yesod
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Path 29 (Moon = arc 18) goes Netzach↔Malkuth; the player is now at Yesod.
    const second = applyMove(first.value, 'p1', 29);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason.kind).toBe('path-does-not-connect');
  });
});

// ──────────────── adjacentPaths ────────────────

describe('adjacentPaths', () => {
  it('returns only paths the player can actually travel', () => {
    // At Malkuth, playable paths are 29 (Moon), 31 (Judgement), 32 (World).
    // Corresponding arcana: 18, 20, 21. Player holds 18 and 21 only.
    const state = makeState({ position: 'malkuth', hand: [18, 21, 5] });
    expect([...adjacentPaths(state, 'p1')].sort((a, b) => a - b)).toEqual([29, 32]);
  });

  it('returns an empty array for an empty hand', () => {
    const state = makeState({ position: 'tiferet', hand: [] });
    expect(adjacentPaths(state, 'p1')).toEqual([]);
  });

  it('returns empty when held cards are all for non-adjacent paths', () => {
    // At Malkuth but holding only cards for non-Malkuth paths.
    const state = makeState({ position: 'malkuth', hand: [0, 1, 2] }); // Fool, Magician, HP
    expect(adjacentPaths(state, 'p1')).toEqual([]);
  });

  it('throws on unknown player id (programmer error)', () => {
    const state = makeState();
    expect(() => adjacentPaths(state, 'who')).toThrow(/unknown player/i);
  });
});
