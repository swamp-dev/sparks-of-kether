import { describe, expect, it } from 'vitest';
import { diffPeerEvent, PEER_EVENT_PRIORITY } from '../use-peer-events';
import { makePlayer, makeState } from '@/test/fixtures';
import type { GameState } from '@/engine/types';

/**
 * Tests for the pure diff logic in usePeerEvents (#299).
 *
 * `diffPeerEvent(prev, next)` inspects two consecutive GameState
 * snapshots and returns the single most-significant peer event that
 * occurred, or null when nothing peer-visible changed.
 *
 * Priority (highest first): encounter > move > meditate > turn-start.
 * Turn-start is a special case: it fires when activePlayerId changes,
 * which resets the other signals, so it is returned regardless of
 * priority when it is the only detectable change.
 */

const p1 = makePlayer({ id: 'p1', name: 'Alex', position: 'malkuth' });
const p2 = makePlayer({ id: 'p2', name: 'Brae', position: 'malkuth' });

describe('diffPeerEvent', () => {
  it('returns null when nothing changed', () => {
    const state = makeState({}, { players: [p1, p2], phase: 'move' });
    expect(diffPeerEvent(state, state)).toBeNull();
  });

  it('returns null when unrelated fields change', () => {
    const prev = makeState({}, { players: [p1, p2], illumination: 0 });
    const next = makeState({}, { players: [p1, p2], illumination: 1 });
    expect(diffPeerEvent(prev, next)).toBeNull();
  });

  describe('turn-start', () => {
    it('returns turn-start when activePlayerId rotates', () => {
      const prev = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'move' });
      const next = makeState({}, { players: [p1, p2], activePlayerId: 'p2', phase: 'move' });
      const event = diffPeerEvent(prev, next);
      expect(event?.kind).toBe('turn-start');
      expect(event?.playerName).toBe('Brae');
    });

    it('includes the new active player name', () => {
      const alex = makePlayer({ id: 'p1', name: 'Alex', position: 'malkuth' });
      const cael = makePlayer({ id: 'p3', name: 'Cael', position: 'malkuth' });
      const prev = makeState({}, { players: [alex, cael], activePlayerId: 'p1', phase: 'move' });
      const next = makeState({}, { players: [alex, cael], activePlayerId: 'p3', phase: 'move' });
      expect(diffPeerEvent(prev, next)?.playerName).toBe('Cael');
    });
  });

  describe('move', () => {
    it('returns move when active player position changes', () => {
      const moved = makePlayer({ id: 'p1', name: 'Alex', position: 'tiferet' });
      const prev = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'move' });
      const next = makeState({}, { players: [moved, p2], activePlayerId: 'p1', phase: 'move' });
      const event = diffPeerEvent(prev, next);
      expect(event?.kind).toBe('move');
      expect(event?.playerName).toBe('Alex');
      expect(event?.sefirahKey).toBe('tiferet');
    });

    it('does NOT fire for non-active player position changes', () => {
      const p2moved = makePlayer({ id: 'p2', name: 'Brae', position: 'gevurah' });
      const prev = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'move' });
      const next = makeState({}, { players: [p1, p2moved], activePlayerId: 'p1', phase: 'move' });
      expect(diffPeerEvent(prev, next)).toBeNull();
    });
  });

  describe('encounter', () => {
    it('returns encounter when phase transitions to challenge', () => {
      const atHod = makePlayer({ id: 'p1', name: 'Alex', position: 'hod' });
      const prev = makeState({}, { players: [atHod, p2], activePlayerId: 'p1', phase: 'move' });
      const next = makeState({}, {
        players: [atHod, p2],
        activePlayerId: 'p1',
        phase: 'challenge',
        encounter: { sefirah: 'hod' } as GameState['encounter'],
      });
      const event = diffPeerEvent(prev, next);
      expect(event?.kind).toBe('encounter');
      expect(event?.playerName).toBe('Alex');
      expect(event?.sefirahKey).toBe('hod');
    });

    it('prefers encounter over move when both change in the same diff', () => {
      const atHod = makePlayer({ id: 'p1', name: 'Alex', position: 'hod' });
      const prev = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'move' });
      const next = makeState({}, {
        players: [atHod, p2],
        activePlayerId: 'p1',
        phase: 'challenge',
        encounter: { sefirah: 'hod' } as GameState['encounter'],
      });
      expect(diffPeerEvent(prev, next)?.kind).toBe('encounter');
    });

    it('does not fire when phase was already challenge', () => {
      const atHod = makePlayer({ id: 'p1', name: 'Alex', position: 'hod' });
      const state = makeState({}, {
        players: [atHod, p2],
        activePlayerId: 'p1',
        phase: 'challenge',
        encounter: { sefirah: 'hod' } as GameState['encounter'],
      });
      expect(diffPeerEvent(state, state)).toBeNull();
    });
  });

  describe('meditate', () => {
    it('returns meditate when meditatedThisTurn flips true', () => {
      const prev = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'end', meditatedThisTurn: false });
      const next = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'end', meditatedThisTurn: true });
      const event = diffPeerEvent(prev, next);
      expect(event?.kind).toBe('meditate');
      expect(event?.playerName).toBe('Alex');
    });

    it('does not fire when meditatedThisTurn was already true', () => {
      const state = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'end', meditatedThisTurn: true });
      expect(diffPeerEvent(state, state)).toBeNull();
    });

    it('prefers move over meditate when both change', () => {
      const moved = makePlayer({ id: 'p1', name: 'Alex', position: 'tiferet' });
      const prev = makeState({}, { players: [p1, p2], activePlayerId: 'p1', phase: 'move', meditatedThisTurn: false });
      const next = makeState({}, { players: [moved, p2], activePlayerId: 'p1', phase: 'move', meditatedThisTurn: true });
      expect(diffPeerEvent(prev, next)?.kind).toBe('move');
    });
  });

  describe('PEER_EVENT_PRIORITY', () => {
    it('ranks encounter higher than move', () => {
      expect(PEER_EVENT_PRIORITY.encounter).toBeGreaterThan(PEER_EVENT_PRIORITY.move);
    });

    it('ranks move higher than meditate', () => {
      expect(PEER_EVENT_PRIORITY.move).toBeGreaterThan(PEER_EVENT_PRIORITY.meditate);
    });

    it('ranks meditate higher than turn-start', () => {
      expect(PEER_EVENT_PRIORITY.meditate).toBeGreaterThan(PEER_EVENT_PRIORITY['turn-start']);
    });
  });
});
