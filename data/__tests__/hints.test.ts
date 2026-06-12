import { describe, expect, it } from 'vitest';
import { HINTS } from '../hints';

describe('HINTS registry', () => {
  it('has 7 entries', () => {
    expect(HINTS).toHaveLength(7);
  });

  it('all hint IDs are unique', () => {
    const ids = HINTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('priority values are unique and match spec (10, 20, 30, 40, 50, 60, 70)', () => {
    const priorities = [...HINTS].sort((a, b) => a.priority - b.priority).map((h) => h.priority);
    expect(priorities).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it('every hint has at least one dismissibleVia entry', () => {
    HINTS.forEach((h) => {
      expect(
        h.dismissibleVia.length,
        `'${h.id}' must have at least one dismissibleVia`,
      ).toBeGreaterThan(0);
    });
  });

  it('prerequisiteId chain is valid — every referenced id exists in registry', () => {
    const ids = new Set(HINTS.map((h) => h.id));
    HINTS.forEach((h) => {
      if (h.prerequisiteId !== undefined) {
        expect(
          ids.has(h.prerequisiteId),
          `prerequisiteId '${h.prerequisiteId}' for hint '${h.id}' does not exist in registry`,
        ).toBe(true);
      }
    });
  });

  it('hint IDs match the tutorial step sequence from design doc', () => {
    const ids = [...HINTS].sort((a, b) => a.priority - b.priority).map((h) => h.id);
    expect(ids).toEqual([
      'tutorial-welcome',
      'tutorial-hand-intro',
      'tutorial-play-card',
      'tutorial-draw-replenish',
      'tutorial-meditate',
      'tutorial-challenge-intro',
      'tutorial-spark-earned',
    ]);
  });

  it('is deeply frozen (array wrapper and each entry are immutable at runtime)', () => {
    expect(Object.isFrozen(HINTS)).toBe(true);
    HINTS.forEach((h) => {
      expect(Object.isFrozen(h), `entry '${h.id}' must be frozen`).toBe(true);
    });
  });

  it('prerequisiteId chain forms a linear sequence matching the spec', () => {
    const byId = new Map(HINTS.map((h) => [h.id, h]));
    expect(byId.get('tutorial-welcome')?.prerequisiteId).toBeUndefined();
    expect(byId.get('tutorial-hand-intro')?.prerequisiteId).toBe('tutorial-welcome');
    expect(byId.get('tutorial-play-card')?.prerequisiteId).toBe('tutorial-hand-intro');
    expect(byId.get('tutorial-draw-replenish')?.prerequisiteId).toBe('tutorial-play-card');
    expect(byId.get('tutorial-meditate')?.prerequisiteId).toBe('tutorial-draw-replenish');
    expect(byId.get('tutorial-challenge-intro')?.prerequisiteId).toBe('tutorial-meditate');
    expect(byId.get('tutorial-spark-earned')?.prerequisiteId).toBe('tutorial-challenge-intro');
  });
});
