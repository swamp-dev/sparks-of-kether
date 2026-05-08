import { describe, expect, it } from 'vitest';

import { pantheons, type Pantheon, type PantheonId } from '@/data/pantheons';
import { grecoRoman } from '@/data/pantheons/greco-roman';
import { avatarNames as shimAvatarNames } from '@/data/avatar-names';
import { sefirahCodex } from '@/data/codex-content';
import { sefirahFraming } from '@/data/sefirah-framing';
import { sefirahVerdicts } from '@/data/sefirah-verdicts';
import { sefirahBlessings } from '@/data/sefirah-blessings';
import type { SefirahKey } from '@/data/types';

describe('pantheons registry (#547)', () => {
  it('has exactly one entry: greco-roman', () => {
    const ids = Object.keys(pantheons) as PantheonId[];
    expect(ids).toEqual(['greco-roman']);
  });

  it('the registry entry is the same object exported by greco-roman/index', () => {
    expect(pantheons['greco-roman']).toBe(grecoRoman);
  });

  describe('greco-roman pantheon shape', () => {
    const p: Pantheon = grecoRoman;

    it('id and displayName are well-formed', () => {
      expect(p.id).toBe('greco-roman');
      expect(typeof p.displayName).toBe('string');
      expect(p.displayName.length).toBeGreaterThan(0);
    });

    it('avatarNames is the same object reference as the shim export (AC #1, #3)', () => {
      // AC #3 says "returns the same object" — identity, not deep-equal.
      // The shim re-exports the binding, so both paths resolve to the
      // same module-level reference.
      expect(p.avatarNames).toBe(shimAvatarNames);
    });

    it('sefirahCodexAvatar matches the avatar field on every Sefirah codex entry (AC #2)', () => {
      const keys: readonly SefirahKey[] = [
        'kether',
        'chokmah',
        'binah',
        'chesed',
        'gevurah',
        'tiferet',
        'netzach',
        'hod',
        'yesod',
        'malkuth',
      ];
      for (const k of keys) {
        expect(p.sefirahCodexAvatar[k]).toBe(sefirahCodex[k].avatar);
      }
    });

    it('sefirahCodexAvatar specific anchor values (AC #2)', () => {
      expect(p.sefirahCodexAvatar.tiferet).toBe('Apollo');
      expect(p.sefirahCodexAvatar.kether).toBeNull();
      expect(p.sefirahCodexAvatar.malkuth).toBe('Hestia');
      expect(p.sefirahCodexAvatar.hod).toBe('Hermes');
    });

    it('matrix slots (framing, verdicts, blessings) reference the existing top-level exports', () => {
      // A1 wires verdicts/blessings/framing as references; A4 (#550) moves them.
      expect(p.sefirahFraming).toBe(sefirahFraming);
      expect(p.sefirahVerdicts).toBe(sefirahVerdicts);
      expect(p.sefirahBlessings).toBe(sefirahBlessings);
    });
  });
});
