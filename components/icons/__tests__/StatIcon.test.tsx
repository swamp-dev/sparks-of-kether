import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { StatIcon } from '../StatIcon';
import { sefirot } from '@/data';

const stats = sefirot.map((s) => s.stat);

describe('StatIcon', () => {
  it.each(stats.map((s) => [s] as const))(
    '%s — renders with stat-named data attribute and aria-label',
    (stat) => {
      const { container } = render(<StatIcon stat={stat} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('data-stat')).toBe(stat);
      expect(svg?.getAttribute('aria-label')).toMatch(new RegExp(stat, 'i'));
    },
  );

  it('produces 10 distinct outputs (one per stat)', () => {
    const html = stats.map((s) => {
      const { container } = render(<StatIcon stat={s} />);
      return container.innerHTML;
    });
    expect(new Set(html).size).toBe(10);
  });

  it.each(stats.map((s) => [s] as const))('matches snapshot for %s', (stat) => {
    const { container } = render(<StatIcon stat={stat} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
