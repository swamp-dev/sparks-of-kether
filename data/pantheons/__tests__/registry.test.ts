import { describe, expect, it } from 'vitest';

import { pantheons, type Pantheon, type PantheonId } from '@/data/pantheons';
import { grecoRoman } from '@/data/pantheons/greco-roman';
import { avatarNames as grecoRomanAvatarNames } from '@/data/pantheons/greco-roman/avatar-names';
import { egyptian } from '@/data/pantheons/egyptian';
import { avatarNames as egyptianAvatarNames } from '@/data/pantheons/egyptian/avatar-names';
import { sefirahFraming } from '@/data/pantheons/greco-roman/framing';
import { sefirahVerdicts } from '@/data/pantheons/greco-roman/verdicts';
import { sefirahBlessings } from '@/data/pantheons/greco-roman/blessings';

describe('pantheons registry (#547)', () => {
  it('has exactly two entries: greco-roman and egyptian', () => {
    const ids = Object.keys(pantheons) as PantheonId[];
    expect(ids.sort()).toEqual(['egyptian', 'greco-roman']);
  });

  it('the greco-roman registry entry is the same object exported by greco-roman/index', () => {
    expect(pantheons['greco-roman']).toBe(grecoRoman);
  });

  it('the egyptian registry entry is the same object exported by egyptian/index', () => {
    expect(pantheons['egyptian']).toBe(egyptian);
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

    it('matrix slots (framing, verdicts, blessings) reference the per-pantheon exports', () => {
      // A4 (#550) moved verdicts/blessings/framing under
      // `data/pantheons/greco-roman/`. The registry entry imports
      // those modules directly; this test pins identity to catch
      // accidental divergence.
      expect(p.sefirahFraming).toBe(sefirahFraming);
      expect(p.sefirahVerdicts).toBe(sefirahVerdicts);
      expect(p.sefirahBlessings).toBe(sefirahBlessings);
    });

    it('sefirahCodexAvatar agrees with avatarNames[*].primary for the 8 encounter sefirot', () => {
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
        expect(p.sefirahCodexAvatar[k]).toBe(p.avatarNames[k].primary);
      }
    });
  });

  describe('egyptian pantheon shape (#552)', () => {
    const p: Pantheon = egyptian;

    it('id and displayName are well-formed', () => {
      expect(p.id).toBe('egyptian');
      expect(typeof p.displayName).toBe('string');
      expect(p.displayName.length).toBeGreaterThan(0);
    });

    it('avatarNames is the same object reference as the per-pantheon export', () => {
      expect(p.avatarNames).toBe(egyptianAvatarNames);
    });

    it('sefirahCodexAvatar pins the canonical Egyptian names (AC #1)', () => {
      // Anchors against `reference/pantheons/egyptian.md` § 1 (#551).
      expect(p.sefirahCodexAvatar.kether).toBeNull();
      expect(p.sefirahCodexAvatar.chokmah).toBe('Amun');
      expect(p.sefirahCodexAvatar.binah).toBe('Isis');
      expect(p.sefirahCodexAvatar.chesed).toBe('Ra');
      expect(p.sefirahCodexAvatar.gevurah).toBe('Horus');
      expect(p.sefirahCodexAvatar.tiferet).toBe('Osiris');
      expect(p.sefirahCodexAvatar.netzach).toBe('Hathor');
      expect(p.sefirahCodexAvatar.hod).toBe('Thoth');
      expect(p.sefirahCodexAvatar.yesod).toBe('Khonsu');
      expect(p.sefirahCodexAvatar.malkuth).toBe('Bastet');
    });

    it('avatarNames pins canonical primary values (AC #2)', () => {
      expect(p.avatarNames.hod.primary).toBe('Thoth');
      expect(p.avatarNames.tiferet.primary).toBe('Osiris');
      expect(p.avatarNames.chesed.primary).toBe('Ra');
      expect(p.avatarNames.gevurah.primary).toBe('Horus');
      expect(p.avatarNames.netzach.primary).toBe('Hathor');
      expect(p.avatarNames.yesod.primary).toBe('Khonsu');
      expect(p.avatarNames.chokmah.primary).toBe('Amun');
      expect(p.avatarNames.binah.primary).toBe('Isis');
    });

    it('sefirahCodexAvatar agrees with avatarNames[*].primary for the 8 encounter sefirot', () => {
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
        expect(p.sefirahCodexAvatar[k]).toBe(p.avatarNames[k].primary);
      }
    });

    it('matrix fallback identity for slots not yet authored Egyptian-side (post-B3 PR 1)', () => {
      // B2 (#552) shipped names + codex avatar. B3 (#553 PR 1) ships
      // the solar quartet of the verdict matrix — `sefirahVerdicts`
      // is now Egyptian-authored, not the greco-roman fallback. The
      // remaining slots (`sefirahPlayerResponses`, `sefirahFraming`,
      // `sefirahFramingPlaceholder`, `sefirahBlessings`) continue to
      // use the greco-roman matrices until their authoring tickets
      // land (#553 PR 2 / #553 follow-up / #554 / #555).
      expect(p.sefirahFraming).toBe(sefirahFraming);
      expect(p.sefirahFramingPlaceholder).toBe(grecoRoman.sefirahFramingPlaceholder);
      expect(p.sefirahPlayerResponses).toBe(grecoRoman.sefirahPlayerResponses);
      expect(p.sefirahBlessings).toBe(sefirahBlessings);
    });

    it('sefirahVerdicts is now the hybrid Egyptian matrix (#553 PR 1)', () => {
      // Solar quartet — Egyptian-authored cells; the matrix object is
      // distinct from the greco-roman one. Contemplative cluster cells
      // still reference greco-roman until #553 PR 2.
      expect(p.sefirahVerdicts).not.toBe(grecoRoman.sefirahVerdicts);
      // Spot-check one Egyptian-authored cell — a Ra (chesed) verdict
      // line should mention solar/throne imagery; a greco-roman
      // Zeus/chesed line would not. Loose canary; full anchor checks
      // live in `data/pantheons/egyptian/__tests__/verdicts.test.ts`.
      const raAriesPass = p.sefirahVerdicts.chesed.aries.pass.join(' ').toLowerCase();
      expect(raAriesPass).toMatch(/throne|sky|sun|noon|kingdom|crown|light/);
    });
  });
});
