import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CodexIndex } from '../CodexIndex';

/**
 * #320 — Codex landing page. Three columns (Sefirot / Arcana / Paths)
 * each linking to detail pages.
 */
describe('CodexIndex', () => {
  it('renders an h1 named "Codex"', () => {
    const { getByRole } = render(<CodexIndex />);
    expect(getByRole('heading', { level: 1, name: /codex/i })).toBeInTheDocument();
  });

  it('renders 10 Sefirah links', () => {
    const { container } = render(<CodexIndex />);
    const sefirahLinks = container.querySelectorAll('a[href^="/sefirah/"]');
    expect(sefirahLinks.length).toBe(10);
  });

  it('renders 22 Arcana links', () => {
    const { container } = render(<CodexIndex />);
    const arcanaLinks = container.querySelectorAll('a[href^="/arcana/"]');
    expect(arcanaLinks.length).toBe(22);
  });

  it('renders 22 Path links', () => {
    const { container } = render(<CodexIndex />);
    const pathLinks = container.querySelectorAll('a[href^="/path/"]');
    expect(pathLinks.length).toBe(22);
  });

  it('exposes three section landmarks (one per category) for AT navigation', () => {
    const { container } = render(<CodexIndex />);
    const sections = container.querySelectorAll('section[aria-labelledby]');
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });
});
