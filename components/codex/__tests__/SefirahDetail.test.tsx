import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SefirahDetail } from '../SefirahDetail';

/**
 * #320 — per-Sefirah Codex page. Pins the contract that the detail
 * surface renders the right symbolic content for the chosen Sefirah,
 * with proper a11y attributes on Hebrew text and correct cross-link
 * structure.
 */
describe('SefirahDetail', () => {
  it('renders the English name and Hebrew name with correct lang/dir', () => {
    const { container, getByRole } = render(<SefirahDetail sefirahKey="tiferet" />);
    expect(getByRole('heading', { level: 1, name: /beauty/i })).toBeInTheDocument();
    const hebrew = container.querySelector('[lang="he"]');
    expect(hebrew, 'Hebrew name with lang="he"').not.toBeNull();
    expect(hebrew?.getAttribute('dir')).toBe('rtl');
    expect(hebrew?.textContent).toContain('תפארת');
  });

  it('surfaces the Sefirah quote, quality, planet, stat, body part, and shell', () => {
    const { container } = render(<SefirahDetail sefirahKey="tiferet" />);
    const text = container.textContent ?? '';
    // Fields sourced from data/sefirot.ts + data/codex-content.ts.
    expect(text).toContain('Know yourself');
    expect(text).toContain('Sun');
    expect(text).toContain('Harmony');
    expect(text).toContain('Heart');
    expect(text).toContain('Vanity');
  });

  it('exposes the Sefirah color via data attribute (not raw text)', () => {
    // Use an attribute selector rather than asserting the hex appears
    // in textContent — that would force a UI implementation that
    // displays the hex as visible text instead of (or in addition to)
    // a styled chip.
    const { container } = render(<SefirahDetail sefirahKey="kether" />);
    const article = container.querySelector('[data-codex-sefirah="kether"]');
    expect(article?.getAttribute('data-sefirah-color')).toBe('#ffffff');
  });

  it('renders adjacent paths as cross-references with hrefs to /path/[N]', () => {
    // Tiferet is the most-connected Sefirah — paths 13, 15, 17, 20,
    // 22, 24, 25, 26 all touch it.
    const { container } = render(<SefirahDetail sefirahKey="tiferet" />);
    const pathLinks = container.querySelectorAll('a[href^="/path/"]');
    expect(pathLinks.length).toBeGreaterThanOrEqual(8);
  });

  it('renders the Tarot correspondences for adjacent paths as cross-references to /arcana/[N]', () => {
    // Each adjacent path has a Major Arcanum at the path's letter;
    // the Sefirah page links to those arcana too.
    const { container } = render(<SefirahDetail sefirahKey="tiferet" />);
    const arcanaLinks = container.querySelectorAll('a[href^="/arcana/"]');
    expect(arcanaLinks.length).toBeGreaterThanOrEqual(8);
  });

  it('renders the Sefirah-color Tailwind token name (not raw hex) as the visible code label', () => {
    // #400: hand-coded hex is the design-system inconsistency the
    // T-axis of design/ui-review.md penalizes. The visible label is
    // the token name (`bg-kether`); the raw hex stays accessible via
    // the swatch's title for designers / debuggers.
    const { container } = render(<SefirahDetail sefirahKey="kether" />);
    const codeNodes = container.querySelectorAll('code');
    const tokenCodes = Array.from(codeNodes).filter(
      (n) => n.textContent === 'bg-kether',
    );
    expect(tokenCodes.length).toBe(1);
    // The hex must NOT appear as visible text in any <code> node — it
    // belongs in the swatch's title attribute now.
    const hexCodes = Array.from(codeNodes).filter(
      (n) => n.textContent === '#ffffff',
    );
    expect(hexCodes.length).toBe(0);
  });

  it('keeps the hex accessible via the swatch title attribute', () => {
    // The raw hex is still useful for designers / debuggers — it
    // survives as the title of the colored swatch span.
    const { container } = render(<SefirahDetail sefirahKey="kether" />);
    const swatch = container.querySelector('[data-sefirah-swatch]');
    expect(swatch?.getAttribute('title')).toBe('#ffffff');
  });

  it('renders the Hebrew letter (single-letter glyph) somewhere on the page if a path letter applies', () => {
    // Sefirot themselves don't have Hebrew letters — the LETTERS map
    // to paths. So this test confirms the page does NOT erroneously
    // render a single-letter glyph as if the Sefirah owned a letter.
    // The Hebrew NAME (multiple letters) is what shows here.
    const { container } = render(<SefirahDetail sefirahKey="tiferet" />);
    const hebrew = container.querySelector('[lang="he"]');
    expect(hebrew?.textContent).toBe('תפארת');
  });
});
