import { describe, expect, it } from 'vitest';
import { sefirahCodex, arcanumCodex, pathCodex } from '../codex-content';
import { sefirot } from '../sefirot';
import { arcana } from '../arcana';
import { paths } from '../paths';

/**
 * Codex content covers every Sefirah, Arcanum, and Path. A missing
 * key would surface as a runtime undefined when the dynamic route
 * tried to render — pin the integrity here so a content edit can't
 * silently leave a hole.
 */

describe('codex-content', () => {
  it('has a content entry for every Sefirah', () => {
    for (const s of sefirot) {
      expect(sefirahCodex[s.key], `${s.key} missing from sefirahCodex`).toBeDefined();
      expect(sefirahCodex[s.key].quote.length).toBeGreaterThan(0);
      expect(sefirahCodex[s.key].quality.length).toBeGreaterThan(0);
      expect(sefirahCodex[s.key].gameRole.length).toBeGreaterThan(0);
      expect(sefirahCodex[s.key].statDescription.length).toBeGreaterThan(0);
      expect(sefirahCodex[s.key].shellRule.length).toBeGreaterThan(0);
    }
  });

  it('has a content entry for every Major Arcanum', () => {
    for (const a of arcana) {
      expect(arcanumCodex[a.number], `arcanum ${a.number} missing`).toBeDefined();
      expect(arcanumCodex[a.number]?.meaning.length).toBeGreaterThan(0);
      expect(arcanumCodex[a.number]?.gameRole.length).toBeGreaterThan(0);
    }
  });

  it('has a content entry for every Path', () => {
    for (const p of paths) {
      expect(pathCodex[p.number], `path ${p.number} missing`).toBeDefined();
      expect(pathCodex[p.number]?.note.length).toBeGreaterThan(0);
    }
  });

  it('classifies the central-pillar paths correctly', () => {
    // Per reference/paths.md the central pillar is paths 13, 25, 32.
    expect(pathCodex[13]?.structuralRole).toBe('central-pillar');
    expect(pathCodex[25]?.structuralRole).toBe('central-pillar');
    expect(pathCodex[32]?.structuralRole).toBe('central-pillar');
  });

  it('classifies the three abyss-crossings correctly', () => {
    // Paths 14, 19, 27 per reference/paths.md.
    expect(pathCodex[14]?.structuralRole).toBe('abyss-crossing');
    expect(pathCodex[19]?.structuralRole).toBe('abyss-crossing');
    expect(pathCodex[27]?.structuralRole).toBe('abyss-crossing');
  });

  it('classifies the three openings out of Malkuth correctly', () => {
    // Paths 29, 31, 32 per reference/paths.md.
    // Path 32 is BOTH central-pillar and out-of-malkuth — we tag it as
    // central-pillar (the more specific structural role for the Codex).
    expect(pathCodex[29]?.structuralRole).toBe('out-of-malkuth');
    expect(pathCodex[31]?.structuralRole).toBe('out-of-malkuth');
    // Path 32 precedence — explicitly NOT out-of-malkuth so the
    // precedence rule is enforced by the test, not just by the
    // implementation comment. The "into-kether" precedence below
    // does the same for path 13.
    expect(pathCodex[32]?.structuralRole).not.toBe('out-of-malkuth');
  });

  it('pins anchor-point content strings against drift', () => {
    // Spot-check the highest-value content fields against the
    // reference markdown so a typo / paste-of-the-wrong-Sefirah
    // wouldn't pass the existence checks above. Three anchors:
    //   - Tiferet's quote (the most-quoted Sefirah line)
    //   - Kether's Shell name (must be "Fragmentation")
    //   - The Fool's meaning (the iconic card)
    expect(sefirahCodex.tiferet.quote).toBe(
      'Know yourself, and you know the All.',
    );
    expect(sefirahCodex.kether.shellRule).toContain('Fragmentation');
    expect(arcanumCodex[0]?.meaning).toContain('leap');
  });

  it('classifies the three paths into Kether correctly', () => {
    // Paths 11, 12, 13. Path 13 is also central-pillar — same precedence
    // call as path 32 above.
    expect(pathCodex[11]?.structuralRole).toBe('into-kether');
    expect(pathCodex[12]?.structuralRole).toBe('into-kether');
  });
});
