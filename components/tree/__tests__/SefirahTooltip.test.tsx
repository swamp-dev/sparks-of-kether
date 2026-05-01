import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SefirahTooltip } from '../SefirahTooltip';

/**
 * #312 — Sefirah hover tooltip card.
 *
 * Surfaces, per the ticket scope:
 *   - English Sefirah name
 *   - Hebrew name (with `lang="he"` so AT pronounces it correctly)
 *   - One-line meaning (curated copy in `sefirahMeanings.ts`,
 *     sourced from `reference/sefirot.md` "Quality" column)
 *   - Current Sparks count for the team (derived from the supplied
 *     game state's per-player `sparksHeld` sets union'd, then the
 *     count of how many players held *this* Sefirah's spark)
 *
 * The tooltip itself is rendered as an HTML overlay (not SVG) so
 * Fraunces / Frank Ruhl Libre type lands at proper line-height,
 * weight, and Hebrew face — none of which is reliably available in
 * SVG `<text>` across browsers.
 *
 * Click-through to `/sefirah/[name]` is wired by the parent
 * (TreeBoard's wrapping anchor); the tooltip itself is purely
 * presentational.
 */
describe('SefirahTooltip', () => {
  it('renders English name, Hebrew name, meaning, and team Sparks count', () => {
    const { getByText, container } = render(
      <SefirahTooltip sefirahKey="tiferet" teamSparks={2} />,
    );

    expect(getByText(/Beauty/)).toBeTruthy();
    // Hebrew is rendered with lang=he so screen readers / browsers
    // can apply Hebrew-specific TTS and font fallback.
    const hebrew = container.querySelector('[lang="he"]');
    expect(hebrew?.textContent).toMatch(/תפארת/);
    // Meaning is a one-liner. We don't assert the exact wording here;
    // the meanings table below will own the canonical copy. We just
    // assert *something* is rendered as a meaning, anchored by a
    // `data-tooltip-meaning` testid.
    const meaning = container.querySelector('[data-tooltip-meaning]');
    expect(meaning?.textContent ?? '').not.toBe('');
    // Sparks count surfaced numerically.
    const sparks = container.querySelector('[data-tooltip-sparks]');
    expect(sparks?.textContent ?? '').toMatch(/2/);
  });

  it('renders a 0-spark count when no team-mate has earned the spark yet', () => {
    const { container } = render(
      <SefirahTooltip sefirahKey="hod" teamSparks={0} />,
    );
    const sparks = container.querySelector('[data-tooltip-sparks]');
    expect(sparks?.textContent ?? '').toMatch(/0/);
  });

  it('exposes a navigable role/aria so AT users can read it without hover', () => {
    // The tooltip is implemented as a `role="tooltip"` so AT users
    // see it referenced by `aria-describedby` from the Sefirah node.
    // Without this, the hover affordance is purely visual.
    const { container } = render(
      <SefirahTooltip sefirahKey="kether" teamSparks={0} />,
    );
    const tip = container.querySelector('[data-sefirah-tooltip]');
    expect(tip?.getAttribute('role')).toBe('tooltip');
  });
});
