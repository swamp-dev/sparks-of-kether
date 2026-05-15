import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PillarMarker } from '../PillarMarker';

describe('PillarMarker', () => {
  it.each(['mercy', 'severity', 'balance'] as const)(
    'renders %s with a meaningful aria-label',
    (pillar) => {
      const { container } = render(<PillarMarker pillar={pillar} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('data-pillar')).toBe(pillar);
      expect(svg?.getAttribute('aria-label')).toMatch(new RegExp(pillar, 'i'));
    },
  );

  it('produces 3 distinct outputs', () => {
    const html = (['mercy', 'severity', 'balance'] as const).map((p) => {
      const { container } = render(<PillarMarker pillar={p} />);
      return container.innerHTML;
    });
    expect(new Set(html).size).toBe(3);
  });

  it.each(['mercy', 'severity', 'balance'] as const)('matches snapshot for %s', (pillar) => {
    const { container } = render(<PillarMarker pillar={pillar} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
