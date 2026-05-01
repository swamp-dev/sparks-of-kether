import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ArcanumDetail } from '../ArcanumDetail';

/**
 * #320 — per-Arcanum Codex page contract.
 */
describe('ArcanumDetail', () => {
  it('renders Roman numeral, name, Hebrew letter, and path number for The Fool (0)', () => {
    const { container, getByRole } = render(<ArcanumDetail number={0} />);
    expect(getByRole('heading', { level: 1, name: /the fool/i })).toBeInTheDocument();
    const text = container.textContent ?? '';
    expect(text).toContain('0'); // Roman / number
    expect(text).toMatch(/Aleph|א/);
    expect(text).toContain('Path 11');
  });

  it('renders the Roman numeral form correctly for double-digit cards', () => {
    const { container } = render(<ArcanumDetail number={13} />);
    const text = container.textContent ?? '';
    // Death = XIII
    expect(text).toContain('XIII');
  });

  it('renders the Hebrew letter glyph in the detail header with lang+dir', () => {
    const { container } = render(<ArcanumDetail number={13} />);
    // Death = Nun (נ). The ArcanumCard primitive ALSO renders a
    // lang="he" Hebrew letter via SVG `style={{ direction: 'rtl' }}`
    // (no `dir` attribute), so we scope the assertion to the detail
    // header's own Hebrew element by querying for a SPAN with both
    // lang and dir set — the SVG in the card is a <text>, not a span.
    const hebrew = container.querySelector('span[lang="he"][dir="rtl"]');
    expect(hebrew, 'detail header Hebrew letter span').not.toBeNull();
    expect(hebrew?.textContent).toContain('נ');
  });

  it('links to the path the card walks', () => {
    const { container } = render(<ArcanumDetail number={13} />);
    // Death walks Path 24. Page should include a link to /path/24.
    const pathLink = container.querySelector('a[href="/path/24"]');
    expect(pathLink, 'link to /path/24 (Death)').not.toBeNull();
  });

  it('links to the two Sefirot the path connects', () => {
    const { container } = render(<ArcanumDetail number={13} />);
    // Path 24 connects Tiferet ↔ Netzach.
    expect(container.querySelector('a[href="/sefirah/tiferet"]')).not.toBeNull();
    expect(container.querySelector('a[href="/sefirah/netzach"]')).not.toBeNull();
  });

  it('renders the meaning + game role text from codex-content', () => {
    const { container } = render(<ArcanumDetail number={0} />);
    const text = container.textContent ?? '';
    expect(text).toContain('leap before knowing');
  });

  it('renders the keywords list', () => {
    const { container } = render(<ArcanumDetail number={0} />);
    const text = container.textContent ?? '';
    // The Fool keywords from data/arcana.ts
    expect(text.toLowerCase()).toContain('beginnings');
    expect(text.toLowerCase()).toContain('innocence');
  });
});
