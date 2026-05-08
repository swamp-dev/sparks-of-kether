import { describe, expect, it } from 'vitest';

import { pantheons, type Pantheon, type PantheonId } from '@/data/pantheons';
import { grecoRoman } from '@/data/pantheons/greco-roman';
import { avatarNames as grecoRomanAvatarNames } from '@/data/pantheons/greco-roman/avatar-names';
import { sefirahFraming } from '@/data/sefirah-framing';
import { sefirahVerdicts } from '@/data/sefirah-verdicts';
import { sefirahBlessings } from '@/data/sefirah-blessings';

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

    it('avatarNames is the same object reference as the per-pantheon export', () => {
      // The registry entry is wired with the same binding the
      // per-pantheon file exports — no copy. (#549 dropped the
      // `data/avatar-names.ts` re-export shim that had previously
      // mediated this; consumers now reach the data via the registry
      // or the pantheon file directly.)
      expect(p.avatarNames).toBe(grecoRomanAvatarNames);
    });

    it('sefirahCodexAvatar pins the canonical greco-roman names', () => {
      // The codex `Voice` row reads from this map (see SefirahDetail
      // post-#549). Anchors against `design/avatars.md § 1`.
      expect(p.sefirahCodexAvatar.tiferet).toBe('Apollo');
      expect(p.sefirahCodexAvatar.kether).toBeNull();
      expect(p.sefirahCodexAvatar.malkuth).toBe('Hestia');
      expect(p.sefirahCodexAvatar.hod).toBe('Hermes');
      expect(p.sefirahCodexAvatar.chokmah).toBe('Athena');
      expect(p.sefirahCodexAvatar.binah).toBe('Demeter');
      expect(p.sefirahCodexAvatar.chesed).toBe('Zeus');
      expect(p.sefirahCodexAvatar.gevurah).toBe('Ares');
      expect(p.sefirahCodexAvatar.netzach).toBe('Aphrodite');
      expect(p.sefirahCodexAvatar.yesod).toBe('Selene');
    });

    it('matrix slots (framing, verdicts, blessings) reference the existing top-level exports', () => {
      // A1 wires verdicts/blessings/framing as references; A4 (#550) moves them.
      expect(p.sefirahFraming).toBe(sefirahFraming);
      expect(p.sefirahVerdicts).toBe(sefirahVerdicts);
      expect(p.sefirahBlessings).toBe(sefirahBlessings);
    });

    it('sefirahCodexAvatar agrees with avatarNames[*].greek for the 8 encounter sefirot', () => {
      // The two maps are independently maintained (Kether is null,
      // Malkuth's Hestia isn't in `avatarNames`), but for the 8
      // challenge avatars they must agree — drift would mean the
      // codex page names a different deity than the encounter screen.
      const encounterKeys: ReadonlyArray<keyof typeof p.avatarNames> = [
        'chokmah',
        'binah',
        'chesed',
        'gevurah',
        'tiferet',
        'netzach',
        'hod',
        'yesod',
      ];
      for (const k of encounterKeys) {
        expect(p.sefirahCodexAvatar[k]).toBe(p.avatarNames[k].greek);
      }
    });
  });
});
