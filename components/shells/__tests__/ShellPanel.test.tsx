import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ShellPanel } from '../ShellPanel';
import { EMPTY_SHELL_STATE } from '@/engine/types';
import { sefirot } from '@/data';

describe('ShellPanel — content', () => {
  it('renders a slot for every Sefirah', () => {
    const { container } = render(<ShellPanel shells={EMPTY_SHELL_STATE} />);
    for (const s of sefirot) {
      expect(
        container.querySelector(`[data-shell-slot="${s.key}"]`),
        `slot for ${s.key}`,
      ).not.toBeNull();
    }
    expect(container.querySelectorAll('[data-shell-slot]').length).toBe(10);
  });

  it('marks each slot with its status', () => {
    const shells = {
      ...EMPTY_SHELL_STATE,
      kether: 'active' as const,
      gevurah: 'banished' as const,
    };
    const { container } = render(<ShellPanel shells={shells} />);
    expect(container.querySelector('[data-shell-slot="kether"]')?.getAttribute('data-status')).toBe(
      'active',
    );
    expect(
      container.querySelector('[data-shell-slot="gevurah"]')?.getAttribute('data-status'),
    ).toBe('banished');
    // Untouched slots stay dormant.
    expect(
      container.querySelector('[data-shell-slot="malkuth"]')?.getAttribute('data-status'),
    ).toBe('dormant');
  });

  it('renders effect copy inline on active slots only', () => {
    const shells = {
      ...EMPTY_SHELL_STATE,
      gevurah: 'active' as const,
    };
    const { container } = render(<ShellPanel shells={shells} />);
    expect(container.querySelector('[data-shell-effect="gevurah"]')).not.toBeNull();
    // Dormant and banished slots don't show the effect text.
    expect(container.querySelector('[data-shell-effect="kether"]')).toBeNull();
  });

  it('uses descriptive non-traditional Shell names (per design rule)', () => {
    const shells = { ...EMPTY_SHELL_STATE, kether: 'active' as const };
    const { container } = render(<ShellPanel shells={shells} />);
    // Spot-check: descriptive ("Fragmentation"), not traditional names.
    const slot = container.querySelector('[data-shell-slot="kether"]');
    expect(slot?.textContent).toMatch(/Fragmentation/);
    // Make sure no slot leaks a traditional name. (Sample the most
    // likely culprits.)
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Thaumiel|Ghagiel|Satariel|Lilith/i);
  });

  it('banished slots strike through their keyword text', () => {
    const shells = { ...EMPTY_SHELL_STATE, kether: 'banished' as const };
    const { container } = render(<ShellPanel shells={shells} />);
    const slot = container.querySelector('[data-shell-slot="kether"]');
    const keyword = slot?.querySelector('[data-shell-keyword]');
    expect(keyword?.className).toMatch(/line-through/);
  });

  it('headingLevel prop drives the heading element so callers slot into their own hierarchy', () => {
    const { container, rerender } = render(<ShellPanel shells={EMPTY_SHELL_STATE} />);
    // Default is h3.
    expect(container.querySelector('h3')?.textContent).toBe('Shells');
    rerender(<ShellPanel shells={EMPTY_SHELL_STATE} headingLevel={2} />);
    expect(container.querySelector('h2')?.textContent).toBe('Shells');
    expect(container.querySelector('h3')).toBeNull();
  });
});

describe('ShellPanel — accessibility', () => {
  it('uses a section with an aria-label', () => {
    const { container } = render(<ShellPanel shells={EMPTY_SHELL_STATE} />);
    const section = container.querySelector('[data-shell-panel]');
    expect(section?.tagName.toLowerCase()).toBe('section');
    expect(section?.getAttribute('aria-label')).toMatch(/Shell/i);
  });

  it('each slot is keyboard-focusable and exposes the full description via aria-label', () => {
    // The slot must be tabbable AND its accessible name must carry
    // title + effect + status — a screen reader hears the full
    // context on focus rather than relying on a separate sr-only
    // span with no programmatic association.
    const shells = { ...EMPTY_SHELL_STATE, gevurah: 'active' as const };
    const { container } = render(<ShellPanel shells={shells} />);
    const slot = container.querySelector('[data-shell-slot="gevurah"]');
    expect(slot?.getAttribute('tabindex')).toBe('0');
    const aria = slot?.getAttribute('aria-label') ?? '';
    expect(aria).toMatch(/Cruelty/);
    expect(aria).toMatch(/Strength drops/);
    expect(aria).toMatch(/Status: active/);
  });
});
