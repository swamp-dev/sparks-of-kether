import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { TreeBoard } from '../TreeBoard';
import { letterByKey, paths, sefirahByKey, sefirot } from '@/data';

describe('TreeBoard', () => {
  it('renders an accessible SVG root using the figure pattern', () => {
    // role=figure + child <title> exposes the overall description while
    // leaving per-node and per-path aria-labels reachable to AT.
    const { container } = render(<TreeBoard />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'figure');
    const title = svg?.querySelector('title');
    expect(title?.textContent).toMatch(/tree of life/i);
  });

  it('renders all 10 Sefirot, each with the canonical Hebrew + English name', () => {
    const { container } = render(<TreeBoard />);
    for (const sefirah of sefirot) {
      const node = container.querySelector(`[data-sefirah="${sefirah.key}"]`);
      expect(node, `node for ${sefirah.key}`).not.toBeNull();
      expect(node?.textContent).toContain(sefirah.hebrewName);
      expect(node?.textContent).toContain(sefirah.englishName);
      expect(node?.getAttribute('aria-label')).toMatch(
        new RegExp(`${sefirah.englishName}`, 'i'),
      );
    }
  });

  it('marks Hebrew text with lang="he" and an RTL style', () => {
    // SVG <text> doesn't take the HTML `dir` attribute; bidi is set
    // via the SVG-spec `direction` CSS property instead. Both belt
    // (lang for assistive tech) and suspenders (direction for visual
    // bidi) are required.
    const { container } = render(<TreeBoard />);
    const hebrewEls = container.querySelectorAll('[lang="he"]');
    expect(hebrewEls.length).toBeGreaterThan(0);
    for (const el of hebrewEls) {
      const style = (el as SVGElement).style;
      expect(style.direction).toBe('rtl');
    }
  });

  it('renders all 22 paths with labels carrying number, letter, and arcanum', () => {
    const { container } = render(<TreeBoard />);
    for (const path of paths) {
      const edge = container.querySelector(`[data-path="${path.number}"]`);
      expect(edge, `path ${path.number}`).not.toBeNull();
      const label = edge?.getAttribute('aria-label') ?? '';
      const letter = letterByKey(path.letterKey);
      const fromName = sefirahByKey(path.from).englishName;
      const toName = sefirahByKey(path.to).englishName;
      expect(label).toContain(`Path ${path.number}`);
      expect(label).toContain(letter.name);
      expect(label).toContain(`Arcanum ${path.arcanumNumber}`);
      expect(label).toContain(fromName);
      expect(label).toContain(toName);
    }
  });

  it('matches snapshot (geometry stability guard)', () => {
    const { container } = render(<TreeBoard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
