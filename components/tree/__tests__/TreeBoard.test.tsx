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

  // #136: playtest finding — path numbers were not visibly rendered
  // on the board; players could only see them via tooltip/AT. The
  // contract is that EVERY path's number text is in the DOM at the
  // path's midpoint and is legible (carries a halo/stroke + sits
  // ABOVE the line in render order).
  it('renders a visible number label at the midpoint of every path', () => {
    const { container } = render(<TreeBoard />);
    for (const path of paths) {
      const label = container.querySelector(
        `[data-path-label="${path.number}"]`,
      );
      expect(label, `visible label for path ${path.number}`).not.toBeNull();
      // The label's text must be the number itself.
      expect(label?.textContent).toContain(String(path.number));
    }
  });

  it('renders path-number labels above paths but below nodes (z-order)', () => {
    // SVG render order is document order. Labels must paint AFTER
    // paths (so path lines don't clip them) but BEFORE nodes (so
    // Sefirah circles cleanly cover any label that geometrically
    // sits inside a node — e.g. the central-pillar paths between
    // Tiferet and Malkuth). The `LABEL_OFFSETS` table nudges those
    // labels off-pillar; this z-order is the second line of defense.
    const { container } = render(<TreeBoard />);
    const svg = container.querySelector('svg');
    const layerOrder = Array.from(svg?.children ?? [])
      .map((child) => child.getAttribute('data-layer'))
      .filter((l): l is string => l !== null);
    const pathsIdx = layerOrder.indexOf('paths');
    const labelsIdx = layerOrder.indexOf('path-labels');
    const nodesIdx = layerOrder.indexOf('nodes');
    expect(pathsIdx).toBeGreaterThanOrEqual(0);
    expect(labelsIdx).toBeGreaterThan(pathsIdx);
    expect(nodesIdx).toBeGreaterThan(labelsIdx);
  });

  it('matches snapshot (geometry stability guard)', () => {
    const { container } = render(<TreeBoard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
