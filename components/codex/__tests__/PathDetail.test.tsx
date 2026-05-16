import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PathDetail } from '../PathDetail';

/**
 * #320 — per-Path Codex page contract.
 */
describe('PathDetail', () => {
  it('renders the path number, Hebrew letter, and connecting Sefirot for Path 22 (Justice)', () => {
    const { container, getByRole } = render(<PathDetail pathNumber={22} />);
    expect(getByRole('heading', { level: 1, name: /path 22/i })).toBeInTheDocument();
    const text = container.textContent ?? '';
    // Path 22 = Lamed = Justice = Gevurah ↔ Tiferet
    expect(text).toMatch(/Lamed|ל/);
    expect(text).toContain('Gevurah');
    expect(text).toContain('Tiferet');
  });

  it('links to the Major Arcanum walking the path', () => {
    const { container } = render(<PathDetail pathNumber={22} />);
    // Justice = arcanum 11
    const arcLink = container.querySelector('a[href="/arcana/11"]');
    expect(arcLink, 'link to /arcana/11 (Justice)').not.toBeNull();
  });

  it('links to the two Sefirot endpoints', () => {
    const { container } = render(<PathDetail pathNumber={22} />);
    expect(container.querySelector('a[href="/sefirah/gevurah"]')).not.toBeNull();
    expect(container.querySelector('a[href="/sefirah/tiferet"]')).not.toBeNull();
  });

  it('shows the structural-role badge for central-pillar paths', () => {
    // Path 13 = central pillar (High Priestess). Assert on the
    // data attribute (load-bearing test seam) rather than free
    // textContent — a buggy implementation that spelled the role
    // out in prose without rendering the badge element should
    // FAIL this test.
    const { container } = render(<PathDetail pathNumber={13} />);
    const badge = container.querySelector('[data-structural-role="central-pillar"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.toLowerCase()).toContain('central pillar');
  });

  it('shows the structural-role badge for abyss-crossing paths', () => {
    // Path 14 = abyss-crossing (Empress)
    const { container } = render(<PathDetail pathNumber={14} />);
    const badge = container.querySelector('[data-structural-role="abyss-crossing"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.toLowerCase()).toContain('abyss');
  });

  it('shows the structural-role badge for into-Kether paths', () => {
    // Path 11 = into-kether (The Fool)
    const { container } = render(<PathDetail pathNumber={11} />);
    const badge = container.querySelector('[data-structural-role="into-kether"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.toLowerCase()).toContain('into kether');
  });

  it('shows the structural-role badge for out-of-Malkuth paths', () => {
    // Path 29 = out-of-malkuth (The Moon). Path 31 same; path 32 is
    // tagged central-pillar (precedence rule), so 29 and 31 are the
    // only paths that should surface the "Path out of Malkuth" badge.
    const { container } = render(<PathDetail pathNumber={29} />);
    const badge = container.querySelector('[data-structural-role="out-of-malkuth"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.toLowerCase()).toContain('out of malkuth');
  });

  it('does NOT show a structural-role badge for ordinary paths', () => {
    // Path 19 IS abyss-crossing; pick path 15 (Emperor) which has
    // structuralRole: null per codex-content.
    const { container } = render(<PathDetail pathNumber={15} />);
    const badge = container.querySelector('[data-structural-role]');
    expect(badge, 'no structural-role badge on ordinary path').toBeNull();
  });

  it('renders the letter meaning and gematria value', () => {
    const { container } = render(<PathDetail pathNumber={22} />);
    const text = container.textContent ?? '';
    // Lamed = Ox-goad, value 30
    expect(text).toContain('Ox-goad');
    expect(text).toContain('30');
  });

  it('renders the Hebrew letter glyph with lang="he" dir="rtl"', () => {
    const { container } = render(<PathDetail pathNumber={22} />);
    const hebrew = container.querySelector('[lang="he"]');
    expect(hebrew).not.toBeNull();
    expect(hebrew?.getAttribute('dir')).toBe('rtl');
    expect(hebrew?.textContent).toContain('ל');
  });
});
