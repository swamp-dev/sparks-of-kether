import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TreeBoard } from '../TreeBoard';
import { contrastTextColour } from '../contrast-text-colour';
import { letterByKey, paths, sefirahByKey, sefirot } from '@/data';
import { makeState } from '@/test/fixtures';

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

  it('renders all 10 Sefirot — each labelled with the Hebrew-name transliteration (#214 + #401)', () => {
    // #214 declutter pass: drop Hebrew script + position number from
    // the visible disc; keep one short label.
    // #401 content swap: that visible label is the Hebrew-name
    // *transliteration* (Kether, Chokmah, Binah, Chesed, Gevurah,
    // Tiferet, Netzach, Hod, Yesod, Malkuth) — the form by which
    // each Sefirah is invoked in the tradition — rather than the
    // English meaning-translation. The aria-label keeps the
    // englishName + position number for screen-reader gloss.
    const { container } = render(<TreeBoard />);
    // Precondition: with no `state` prop the player-token layer is
    // omitted entirely, so the only text descendants of each node
    // <g> are the transliteration <text> elements. If a future
    // change ever nests tokens under the node group, this assertion
    // will fail loudly instead of leaking an initial into the
    // visibleText comparison below.
    expect(container.querySelectorAll('[data-layer="players"]')).toHaveLength(0);
    for (const sefirah of sefirot) {
      const node = container.querySelector(`[data-sefirah="${sefirah.key}"]`);
      expect(node, `node for ${sefirah.key}`).not.toBeNull();
      expect(node?.textContent).toContain(sefirah.transliteration);
      expect(node?.textContent).not.toContain(sefirah.hebrewName);
      // The visible textContent of the node is exactly the
      // transliteration (whitespace-normalised; transliterations
      // happen to be single tokens but the normalisation is kept
      // for resilience).
      const visibleText = (node?.textContent ?? '').replace(/\s+/g, '').trim();
      expect(visibleText).toBe(sefirah.transliteration.replace(/\s+/g, ''));
    }
  });

  it('aria-label on each Sefirah keeps the position number for screen-reader orientation (#214)', () => {
    // Visual decluttering removes the Hebrew + number from VISIBLE
    // text, but the AT layer keeps the position number so a screen-
    // reader user can answer "where am I in the 1-10 descent?"
    // without memory. Hebrew is intentionally dropped — the data
    // layer's `hebrewName` is not part of the AT contract here.
    const { container } = render(<TreeBoard />);
    for (const sefirah of sefirot) {
      const node = container.querySelector(`[data-sefirah="${sefirah.key}"]`);
      const label = node?.getAttribute('aria-label') ?? '';
      expect(label).toContain(sefirah.englishName);
      expect(label).toContain(String(sefirah.number));
      expect(label).not.toContain(sefirah.hebrewName);
    }
  });

  it('the nodes layer renders no Hebrew text — lang="he" is reserved for other surfaces (#214)', () => {
    // Scoped to data-layer="nodes" so a future feature (e.g. a
    // legend or hover tooltip elsewhere in the SVG) can legitimately
    // include Hebrew text without breaking this regression-pin.
    const { container } = render(<TreeBoard />);
    const hebrewInNodes = container.querySelectorAll(
      '[data-layer="nodes"] [lang="he"]',
    );
    expect(hebrewInNodes.length).toBe(0);
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

  // #505: the per-path number badge layer (#136) was removed in
  // favour of relying on each path's `aria-label` for AT and the
  // path's stroke colour / connecting Sefirot for sighted players.
  // The contract is now: NO `[data-path-label]` element exists in
  // the rendered tree, at any viewport.
  it('does not render path-number badges (#505 declutter)', () => {
    const { container } = render(<TreeBoard />);
    const labels = container.querySelectorAll('[data-path-label]');
    expect(labels.length).toBe(0);
  });

  it('renders path lines below nodes — no path-labels layer (#505)', () => {
    // Post-#505 SVG layer contract: [paths] → [nodes]. The
    // `path-labels` layer is gone; the path-number information
    // remains on each `<line>`'s `aria-label` for AT.
    const { container } = render(<TreeBoard />);
    const svg = container.querySelector('svg');
    const layerOrder = Array.from(svg?.children ?? [])
      .map((child) => child.getAttribute('data-layer'))
      .filter((l): l is string => l !== null);
    const pathsIdx = layerOrder.indexOf('paths');
    const nodesIdx = layerOrder.indexOf('nodes');
    expect(pathsIdx).toBeGreaterThanOrEqual(0);
    expect(nodesIdx).toBeGreaterThan(pathsIdx);
    expect(layerOrder.indexOf('path-labels')).toBe(-1);
  });

  // #505: the breath halo's `backgroundColor: sefirah.color` overlay
  // was the source of a perceptual middle-fade behind each Sefirah
  // name. Removing the dot's fill keeps the box-shadow halo (which
  // radiates outward through the per-Sefirah `shadow-glow-{key}`
  // token) but stops the small coloured dot from mixing with the SVG
  // disc fill where the text sits. Pin the contract: halo dots must
  // carry no inline backgroundColor (or transparent) so the text
  // stays unobscured.
  it('breath halos do not paint a coloured dot over the Sefirah text (#505)', () => {
    const { container } = render(<TreeBoard state={makeState()} />);
    const halos = container.querySelectorAll<HTMLElement>('[data-breath-halo]');
    expect(halos.length).toBeGreaterThan(0);
    for (const halo of halos) {
      const bg = halo.style.backgroundColor;
      expect(bg, `halo ${halo.dataset.breathHalo} backgroundColor`).toBe('');
    }
  });

  // #505: regression pin — each Sefirah's name `<text>` must use the
  // helper-derived contrast colour (`#0e1320` or `#f8f8ff`) so the
  // text is readable against the disc fill regardless of how the
  // halo layering above evolves. Without this pin, a future change
  // to the halo or text could quietly slide the fill toward a
  // mid-luminance colour and degrade legibility on light/dark discs.
  it('Sefirah name text uses the contrast helper for fill (#505)', () => {
    const { container } = render(<TreeBoard />);
    for (const sefirah of sefirot) {
      const node = container.querySelector(`[data-sefirah="${sefirah.key}"]`);
      const text = node?.querySelector('text');
      const expected = contrastTextColour(sefirah.color);
      expect(text?.getAttribute('fill'), `text fill for ${sefirah.key}`).toBe(
        expected,
      );
    }
  });

  // #505: hover/focus glow contract — every Sefirah carries a
  // `[data-hover-glow]` span (in the state-mounted overlay) wearing
  // the matching `peer-hover:shadow-glow-{key}` and
  // `peer-focus-visible:shadow-glow-{key}` Tailwind utilities. The
  // span sits AFTER the `.peer` button so the peer selectors resolve
  // correctly. Tailwind JIT relies on the literal class names being
  // present in source.
  it('renders a hover/focus glow span per Sefirah with peer-hover and peer-focus-visible classes (#505)', () => {
    const { container } = render(<TreeBoard state={makeState()} />);
    for (const sefirah of sefirot) {
      const glow = container.querySelector(
        `[data-hover-glow="${sefirah.key}"]`,
      );
      expect(glow, `hover glow for ${sefirah.key}`).not.toBeNull();
      const className = glow?.className ?? '';
      expect(className).toContain(`peer-hover:shadow-glow-${sefirah.key}`);
      expect(className).toContain(
        `peer-focus-visible:shadow-glow-${sefirah.key}`,
      );
    }
  });

  // #289: Sefirah English-name labels were rendered BELOW each
  // circle (y = cy + NODE_RADIUS + 14), forcing the eye to make two
  // saccades — one to the colour disc, one to the name underneath.
  // Pull the label INSIDE the circle so identification is single-
  // glance. Each label <text>'s `y` must sit within the vertical
  // span of its node's circle ([cy - r, cy + r]), and the
  // `dominantBaseline` must place the text centred so the visual
  // baseline matches `cy` rather than offsetting by the font box.
  it('renders each Sefirah label INSIDE its circle (#289)', () => {
    const { container } = render(<TreeBoard />);
    const NODE_RADIUS = 28;
    const layout: Record<string, { cy: number }> = {
      kether: { cy: 60 },
      chokmah: { cy: 150 },
      binah: { cy: 150 },
      chesed: { cy: 280 },
      gevurah: { cy: 280 },
      tiferet: { cy: 340 },
      netzach: { cy: 430 },
      hod: { cy: 430 },
      yesod: { cy: 490 },
      malkuth: { cy: 560 },
    };
    for (const sefirah of sefirot) {
      const node = container.querySelector(`[data-sefirah="${sefirah.key}"]`);
      expect(node, `node for ${sefirah.key}`).not.toBeNull();
      const text = node?.querySelector('text');
      expect(text, `label text for ${sefirah.key}`).not.toBeNull();
      const yAttr = text?.getAttribute('y');
      expect(yAttr, `y attr on ${sefirah.key} label`).not.toBeNull();
      const y = Number(yAttr);
      const entry = layout[sefirah.key];
      expect(entry, `layout for ${sefirah.key}`).toBeDefined();
      const cy = entry?.cy ?? 0;
      expect(y).toBeGreaterThanOrEqual(cy - NODE_RADIUS);
      expect(y).toBeLessThanOrEqual(cy + NODE_RADIUS);
      // dominant-baseline must centre the glyph box on `y` so the
      // visual centre matches the geometric centre of the circle.
      expect(text?.getAttribute('dominant-baseline')).toBe('middle');
    }
  });

  it('matches snapshot (geometry stability guard)', () => {
    const { container } = render(<TreeBoard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// #384: the Sefirah click target on the Tree is mode-aware. Without an
// `onSefirahClick` handler (the default — used by `/codex` and the
// /demo route), each node renders an `<a href="/sefirah/{key}">` so
// click navigates to the Codex detail page. With an `onSefirahClick`
// handler (the /play mount), the node instead renders a `<button>`
// that fires the handler — no navigation, no game-state loss.
describe('TreeBoard — #384 mode-aware Sefirah click', () => {
  it('without onSefirahClick: renders <a href="/sefirah/{key}"> per node (Codex navigation default)', () => {
    const { container } = render(<TreeBoard state={makeState()} />);
    const links = container.querySelectorAll<HTMLAnchorElement>(
      'a[data-sefirah-link]',
    );
    expect(links.length).toBe(10);
    for (const link of links) {
      const key = link.getAttribute('data-sefirah-link');
      expect(link.getAttribute('href')).toBe(`/sefirah/${key}`);
    }
    expect(container.querySelectorAll('button[data-sefirah-link]').length).toBe(0);
  });

  it('with onSefirahClick: renders <button> per node (no href, no anchor)', () => {
    const onSefirahClick = vi.fn();
    const { container } = render(
      <TreeBoard state={makeState()} onSefirahClick={onSefirahClick} />,
    );
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      'button[data-sefirah-link]',
    );
    expect(buttons.length).toBe(10);
    expect(container.querySelectorAll('a[data-sefirah-link]').length).toBe(0);
    for (const button of buttons) {
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('clicking a node with onSefirahClick fires the handler with the Sefirah key — no navigation', () => {
    const onSefirahClick = vi.fn();
    const { container } = render(
      <TreeBoard state={makeState()} onSefirahClick={onSefirahClick} />,
    );
    const tiferetButton = container.querySelector<HTMLButtonElement>(
      'button[data-sefirah-link="tiferet"]',
    );
    expect(tiferetButton).not.toBeNull();
    if (tiferetButton === null) return;
    fireEvent.click(tiferetButton);
    expect(onSefirahClick).toHaveBeenCalledTimes(1);
    expect(onSefirahClick).toHaveBeenCalledWith('tiferet');
  });
});
