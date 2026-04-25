import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SparkIcon } from '../SparkIcon';
import { sefirot } from '@/data';

describe('SparkIcon', () => {
  it.each(sefirot.map((s) => [s.key, s.englishName] as const))(
    'renders %s spark with sefirah color and Hebrew letter',
    (key, name) => {
      const { container } = render(<SparkIcon sefirah={key} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('data-sefirah')).toBe(key);
      expect(svg?.getAttribute('aria-label')).toContain(name);
      const text = container.querySelector('text');
      expect(text?.getAttribute('lang')).toBe('he');
      expect(text?.textContent).not.toBe('');
    },
  );

  it('produces 10 distinct outputs (one per Sefirah)', () => {
    const html = sefirot.map((s) => {
      const { container } = render(<SparkIcon sefirah={s.key} />);
      return container.innerHTML;
    });
    expect(new Set(html).size).toBe(10);
  });

  it('uses 10 visually distinguishable Hebrew glyphs (not just colors)', () => {
    // Background color alone is not enough — colorblind / monochrome
    // users need a glyph difference. The first-letter heuristic
    // collides on Chokmah and Chesed (both ח); the project shorthand
    // resolves that with sefirahMarkLetter. This test guards the
    // resolution.
    const glyphs = sefirot.map((s) => {
      const { container } = render(<SparkIcon sefirah={s.key} />);
      return container.querySelector('text')?.textContent ?? '';
    });
    expect(new Set(glyphs).size).toBe(10);
  });

  it.each(sefirot.map((s) => [s.key] as const))('matches snapshot for %s', (key) => {
    const { container } = render(<SparkIcon sefirah={key} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
