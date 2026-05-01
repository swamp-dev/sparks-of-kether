import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PillarStreakStrip } from '../PillarStreakStrip';
import { EMPTY_PILLAR_STREAK } from '@/engine/types';

describe('PillarStreakStrip — three-chevron triptych', () => {
  it('renders exactly three chevrons (mercy, balance, severity)', () => {
    const { container } = render(<PillarStreakStrip state={EMPTY_PILLAR_STREAK} />);
    const chevrons = container.querySelectorAll('[data-pillar-chevron]');
    expect(chevrons.length).toBe(3);
    expect(container.querySelector('[data-pillar-chevron="mercy"]')).not.toBeNull();
    expect(container.querySelector('[data-pillar-chevron="balance"]')).not.toBeNull();
    expect(
      container.querySelector('[data-pillar-chevron="severity"]'),
    ).not.toBeNull();
  });

  it('chevrons appear in left-to-right order: mercy → balance → severity', () => {
    const { container } = render(<PillarStreakStrip state={EMPTY_PILLAR_STREAK} />);
    const chevrons = Array.from(
      container.querySelectorAll('[data-pillar-chevron]'),
    );
    expect(chevrons.map((c) => c.getAttribute('data-pillar-chevron'))).toEqual([
      'mercy',
      'balance',
      'severity',
    ]);
  });

  it('renders one polygon (chevron shape) per pillar', () => {
    const { container } = render(<PillarStreakStrip state={EMPTY_PILLAR_STREAK} />);
    expect(container.querySelectorAll('svg polygon').length).toBe(3);
  });

  it('marks the current pillar active and fills the others at ratio 0', () => {
    const { container } = render(
      <PillarStreakStrip
        state={{ currentPillar: 'severity', sameCount: 2, alternationCount: 0 }}
      />,
    );
    const severity = container.querySelector('[data-pillar-chevron="severity"]');
    expect(severity?.getAttribute('data-active')).toBe('true');
    expect(severity?.getAttribute('data-fill-ratio')).toBe('0.67');

    const mercy = container.querySelector('[data-pillar-chevron="mercy"]');
    expect(mercy?.getAttribute('data-active')).toBe('false');
    expect(mercy?.getAttribute('data-fill-ratio')).toBe('0.00');

    // Balance is structurally rendered but never `active` — engine
    // doesn't streak on Balance.
    const balance = container.querySelector('[data-pillar-chevron="balance"]');
    expect(balance?.getAttribute('data-active')).toBe('false');
  });

  it('a fresh streak (0/0, no current pillar) leaves all three inactive', () => {
    const { container } = render(<PillarStreakStrip state={EMPTY_PILLAR_STREAK} />);
    for (const p of ['mercy', 'balance', 'severity'] as const) {
      const c = container.querySelector(`[data-pillar-chevron="${p}"]`);
      expect(c?.getAttribute('data-active')).toBe('false');
      expect(c?.getAttribute('data-fill-ratio')).toBe('0.00');
    }
  });

  it('streak kind reads "imbalance" when sameCount >= alternationCount', () => {
    const { container } = render(
      <PillarStreakStrip
        state={{ currentPillar: 'mercy', sameCount: 2, alternationCount: 1 }}
      />,
    );
    expect(
      container
        .querySelector('[data-pillar-streak]')
        ?.getAttribute('data-streak-kind'),
    ).toBe('imbalance');
  });

  it('streak kind reads "equilibrium" when alternationCount > sameCount', () => {
    const { container } = render(
      <PillarStreakStrip
        state={{ currentPillar: 'severity', sameCount: 1, alternationCount: 2 }}
      />,
    );
    expect(
      container
        .querySelector('[data-pillar-streak]')
        ?.getAttribute('data-streak-kind'),
    ).toBe('equilibrium');
  });

  it('streak kind reads "none" for a fresh 0/0 state (not "imbalance")', () => {
    const { container } = render(<PillarStreakStrip state={EMPTY_PILLAR_STREAK} />);
    expect(
      container
        .querySelector('[data-pillar-streak]')
        ?.getAttribute('data-streak-kind'),
    ).toBe('none');
  });
});
