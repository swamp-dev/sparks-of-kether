import { describe, expect, it } from 'vitest';
import {
  sefirot,
  arcana,
  letters,
  paths,
  soulAspects,
  sefirahByKey,
  sefirahByNumber,
  arcanumByNumber,
  pathByNumber,
  letterByKey,
  pathByArcanum,
  arcanumByPath,
} from '@/data';
import type { LetterClass, StatKey } from '@/data/types';

describe('sefirot', () => {
  it('exports exactly 10 records', () => {
    expect(sefirot).toHaveLength(10);
  });

  it('numbers 1-10, each present exactly once', () => {
    const nums = sefirot.map((s) => s.number).sort((a, b) => a - b);
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('stat keys are unique across the 10 Sefirot', () => {
    const stats = sefirot.map((s) => s.stat);
    expect(new Set(stats).size).toBe(10);
  });

  it('hex color strings are well-formed', () => {
    for (const s of sefirot) {
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('challenge kinds match role: Malkuth=no-check, Kether=collective, others=check', () => {
    for (const s of sefirot) {
      if (s.key === 'malkuth') {
        expect(s.challenge.kind).toBe('no-check');
      } else if (s.key === 'kether') {
        expect(s.challenge.kind).toBe('collective');
      } else {
        expect(s.challenge.kind).toBe('check');
        if (s.challenge.kind === 'check') {
          expect(s.challenge.dc).toBeGreaterThan(0);
        }
      }
    }
  });

  // #222: Yesod is the *first* encounter every player faces. DC 10 was
  // a 97% first-roll pass at average stat — basically auto-pass, so the
  // d20/assist/card-burn mechanics never got tested at the entry point.
  // Bumping to 12 brings Yesod into line with Hod/Netzach (also 12),
  // preserving an "entry tier" of paired DCs while making the first
  // encounter actually a check (~95% at average stat, ~70% at a low
  // roll with a -2 class fit).
  it('Yesod challenge DC is 12 — entry-tier check, not auto-pass (#222)', () => {
    const yesod = sefirot.find((s) => s.key === 'yesod');
    expect(yesod).toBeDefined();
    if (!yesod || yesod.challenge.kind !== 'check') return;
    expect(yesod.challenge.dc).toBe(12);
  });

  it('pillar partition is 3 mercy / 3 severity / 4 balance', () => {
    const counts = { mercy: 0, severity: 0, balance: 0 };
    for (const s of sefirot) {
      counts[s.pillar] += 1;
    }
    expect(counts).toEqual({ mercy: 3, severity: 3, balance: 4 });
  });

  it('sefirahByKey round-trips every record', () => {
    for (const s of sefirot) {
      expect(sefirahByKey(s.key)).toBe(s);
    }
  });

  it('sefirahByNumber round-trips every record', () => {
    for (const s of sefirot) {
      expect(sefirahByNumber(s.number)).toBe(s);
    }
  });
});

describe('hebrew letters', () => {
  it('exports exactly 22 records', () => {
    expect(letters).toHaveLength(22);
  });

  it('has 3 mothers, 7 doubles, 12 simples', () => {
    const counts = { mother: 0, double: 0, simple: 0 } satisfies Record<
      LetterClass,
      number
    >;
    for (const l of letters) {
      counts[l.class] += 1;
    }
    expect(counts.mother).toBe(3);
    expect(counts.double).toBe(7);
    expect(counts.simple).toBe(12);
  });

  it('path numbers span 11-32 exactly once each', () => {
    const nums = letters.map((l) => l.pathNumber).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 22 }, (_, i) => 11 + i));
  });

  it('gematric values are powers of 10 or single digits, nothing exotic', () => {
    const allowed = new Set([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400,
    ]);
    for (const l of letters) {
      expect(allowed.has(l.value)).toBe(true);
    }
  });

  it('letterByKey round-trips', () => {
    for (const l of letters) {
      expect(letterByKey(l.key)).toBe(l);
    }
  });
});

describe('major arcana', () => {
  it('exports exactly 22 records', () => {
    expect(arcana).toHaveLength(22);
  });

  it('numbered 0-21 exactly once', () => {
    const nums = arcana.map((a) => a.number).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 22 }, (_, i) => i));
  });

  it('arcanumByNumber round-trips', () => {
    for (const a of arcana) {
      expect(arcanumByNumber(a.number)).toBe(a);
    }
  });

  it('every arcanum letter resolves to a valid HebrewLetter', () => {
    for (const a of arcana) {
      expect(() => letterByKey(a.letterKey)).not.toThrow();
    }
  });

  it('every arcanum.pathNumber matches its letter.pathNumber', () => {
    for (const a of arcana) {
      const letter = letterByKey(a.letterKey);
      expect(a.pathNumber).toBe(letter.pathNumber);
    }
  });
});

describe('paths', () => {
  it('exports exactly 22 records numbered 11-32', () => {
    expect(paths).toHaveLength(22);
    const nums = paths.map((p) => p.number).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 22 }, (_, i) => 11 + i));
  });

  it('every endpoint is a valid Sefirah', () => {
    for (const p of paths) {
      expect(() => sefirahByKey(p.from)).not.toThrow();
      expect(() => sefirahByKey(p.to)).not.toThrow();
    }
  });

  it('no path connects a Sefirah to itself', () => {
    for (const p of paths) {
      expect(p.from).not.toBe(p.to);
    }
  });

  it('pathByNumber round-trips', () => {
    for (const p of paths) {
      expect(pathByNumber(p.number)).toBe(p);
    }
  });

  it('pillarsCrossed matches endpoint pillars', () => {
    for (const p of paths) {
      const from = sefirahByKey(p.from);
      const to = sefirahByKey(p.to);
      expect(p.pillarsCrossed[0]).toBe(from.pillar);
      expect(p.pillarsCrossed[1]).toBe(to.pillar);
    }
  });

  it('pathByArcanum and arcanumByPath are inverse', () => {
    for (const a of arcana) {
      const p = pathByArcanum(a.number);
      expect(p.arcanumNumber).toBe(a.number);
      const back = arcanumByPath(p.number);
      expect(back.number).toBe(a.number);
    }
  });

  it('path, letter, and arcanum attributions all agree', () => {
    for (const p of paths) {
      const letter = letterByKey(p.letterKey);
      const arcanum = arcanumByNumber(p.arcanumNumber);
      expect(letter.attribution).toEqual(p.attribution);
      expect(arcanum.attribution).toEqual(p.attribution);
      expect(letter.pathNumber).toBe(p.number);
      expect(arcanum.pathNumber).toBe(p.number);
    }
  });
});

describe('soul aspects', () => {
  it('exports exactly 6 records', () => {
    expect(soulAspects).toHaveLength(6);
  });

  it('keys are the six personality Sefirot (not kether/chokmah/binah/malkuth)', () => {
    const keys = soulAspects.map((a) => a.key).sort();
    expect(keys).toEqual(['chesed', 'gevurah', 'hod', 'netzach', 'tiferet', 'yesod']);
  });

  it('each aspect points to its matching Sefirah', () => {
    for (const a of soulAspects) {
      expect(a.sefirahKey).toBe(a.key);
    }
  });

  it("each aspect's bonusStat matches the linked Sefirah's stat", () => {
    const expected = new Map<string, StatKey>(sefirot.map((s) => [s.key, s.stat]));
    for (const a of soulAspects) {
      expect(a.bonusStat).toBe(expected.get(a.sefirahKey));
    }
  });
});
