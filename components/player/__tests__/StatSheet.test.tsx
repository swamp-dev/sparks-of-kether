import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { StatSheet } from '../StatSheet';
import { makePlayer, statSheet } from '@/test/fixtures';
import { sefirot } from '@/data';

const ALL_STATS = sefirot.map((s) => s.stat);

describe('StatSheet — content', () => {
  it('renders all 10 stats with their values', () => {
    const player = makePlayer({
      name: 'Andy',
      stats: statSheet({
        unity: 12,
        insight: 10,
        understanding: 14,
        lovingkindness: 11,
        strength: 9,
        harmony: 13,
        passion: 8,
        intellect: 16,
        intuition: 7,
        body: 12,
      }),
    });
    const { container } = render(<StatSheet player={player} />);
    for (const stat of ALL_STATS) {
      const value = container.querySelector(`[data-stat-value="${stat}"]`);
      expect(value, `stat row for ${stat}`).not.toBeNull();
    }
    // Spot-check a few values render literally.
    expect(container.querySelector('[data-stat-value="intellect"]')?.textContent).toBe('16');
    expect(container.querySelector('[data-stat-value="intuition"]')?.textContent).toBe('7');
  });

  it('shows the player name in the header', () => {
    const { container } = render(
      <StatSheet player={makePlayer({ name: 'Bea' })} />,
    );
    expect(container.textContent).toContain('Bea');
  });

  it('renders a "No Sparks held" line when sparksHeld is empty', () => {
    const { container } = render(<StatSheet player={makePlayer()} />);
    expect(container.querySelector('[data-sparks-empty]')).not.toBeNull();
  });

  it('renders a Spark icon for each held Spark', () => {
    const player = makePlayer({
      sparksHeld: new Set(['kether', 'tiferet', 'malkuth']),
    });
    const { container } = render(<StatSheet player={player} />);
    const sparks = container.querySelectorAll('[data-token="spark"]');
    expect(sparks.length).toBe(3);
  });
});

describe('StatSheet — Soul Aspect bonus', () => {
  it('adds +2 to the bonus stat and renders a (+2) badge', () => {
    const player = makePlayer({
      stats: statSheet({ harmony: 12 }),
    });
    const { container } = render(
      <StatSheet player={player} soulAspect="tiferet" />,
    );
    // Tiferet's bonus stat is `harmony`; total = 12 + 2 = 14.
    const value = container.querySelector('[data-stat-value="harmony"]');
    expect(value?.textContent).toBe('14');
    const bonusBadge = container.querySelector('[data-stat-bonus="harmony"]');
    expect(bonusBadge).not.toBeNull();
    // No badge on other stats.
    expect(container.querySelector('[data-stat-bonus="strength"]')).toBeNull();
  });

  it('shows the Soul Aspect title in the header', () => {
    const player = makePlayer();
    const { container } = render(
      <StatSheet player={player} soulAspect="hod" />,
    );
    // The badge carries the aspect's data attribute and renders the
    // configured title text from data/soul-aspects.ts. The test stays
    // resilient by checking the data-attr — the title text is owned
    // by the data layer and may be re-tuned independently.
    expect(container.querySelector('[data-soul-aspect="hod"]')).not.toBeNull();
  });

  it('compact mode also reflects the Soul Aspect bonus on the matching stat', () => {
    const player = makePlayer({ stats: statSheet({ harmony: 12 }) });
    const { container } = render(
      <StatSheet player={player} soulAspect="tiferet" mode="compact" />,
    );
    // Bonus must be applied in BOTH modes; compact branch is a
    // separate code path so guard against a regression there.
    expect(
      container.querySelector('[data-stat-value="harmony"]')?.textContent,
    ).toBe('14');
    // The compact tooltip surfaces the source.
    const harmonyChip = container.querySelector('[data-stat-row="harmony"]');
    expect(harmonyChip?.getAttribute('title')).toMatch(/Soul Aspect \+2/);
  });

  it('renders without a Soul Aspect (no bonus, no badge)', () => {
    const player = makePlayer({ stats: statSheet({ harmony: 12 }) });
    const { container } = render(<StatSheet player={player} />);
    expect(container.querySelector('[data-stat-bonus="harmony"]')).toBeNull();
    expect(container.querySelector('[data-stat-value="harmony"]')?.textContent).toBe('12');
  });
});

describe('StatSheet — active stat highlight', () => {
  it('marks the activeStat row with data-active=true', () => {
    const player = makePlayer();
    const { container } = render(
      <StatSheet player={player} activeStat="strength" />,
    );
    expect(
      container.querySelector('[data-stat-row="strength"]')?.getAttribute('data-active'),
    ).toBe('true');
    // All other stats are inactive.
    expect(
      container.querySelector('[data-stat-row="unity"]')?.getAttribute('data-active'),
    ).toBe('false');
  });

  it('updates the highlight when activeStat changes', () => {
    const player = makePlayer();
    const { container, rerender } = render(
      <StatSheet player={player} activeStat="strength" />,
    );
    expect(
      container.querySelector('[data-stat-row="strength"]')?.getAttribute('data-active'),
    ).toBe('true');
    rerender(<StatSheet player={player} activeStat="harmony" />);
    expect(
      container.querySelector('[data-stat-row="strength"]')?.getAttribute('data-active'),
    ).toBe('false');
    expect(
      container.querySelector('[data-stat-row="harmony"]')?.getAttribute('data-active'),
    ).toBe('true');
  });
});

describe('StatSheet — modes', () => {
  it('compact mode collapses to a single row of stats + sparks', () => {
    const player = makePlayer({ sparksHeld: new Set(['kether']) });
    const { container } = render(
      <StatSheet player={player} mode="compact" />,
    );
    expect(container.querySelector('[data-stat-sheet]')?.getAttribute('data-mode')).toBe('compact');
    // Still all 10 stat rows present.
    for (const stat of ALL_STATS) {
      expect(container.querySelector(`[data-stat-row="${stat}"]`)).not.toBeNull();
    }
  });

  it('expanded mode is the default', () => {
    const { container } = render(<StatSheet player={makePlayer()} />);
    expect(container.querySelector('[data-stat-sheet]')?.getAttribute('data-mode')).toBe('expanded');
  });
});
