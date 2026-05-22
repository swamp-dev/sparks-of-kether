import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { ShellStrip } from '../ShellStrip';
import { EMPTY_SHELL_STATE } from '@/engine/types';
import type { ShellStateMap } from '@/engine/types';

/**
 * ShellStrip (#14 — collapse dormant Shells to compact strip).
 *
 * - Dormant + banished shells render as compact strip markers.
 * - Active shells render at full size with effect copy.
 * - Compact strip markers are expandable via click / Enter / Space.
 * - Only one slot is expanded at a time.
 * - Esc collapses the expanded slot.
 * - Axe-clean across all three states.
 */

function expectNoViolations(results: AxeResults): void {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => `  - [${v.id}] ${v.help} (${v.nodes.length} nodes)`)
    .join('\n');
  throw new Error(`axe found ${results.violations.length} violation(s):\n${summary}`);
}

function makeShells(overrides: Partial<ShellStateMap> = {}): ShellStateMap {
  return { ...EMPTY_SHELL_STATE, ...overrides };
}

describe('ShellStrip', () => {
  it('renders the Shell pressure panel section', () => {
    render(<ShellStrip shells={makeShells()} />);
    expect(screen.getByRole('region', { name: /shell pressure/i })).toBeInTheDocument();
  });

  it('renders one slot per Sefirah', () => {
    const { container } = render(<ShellStrip shells={makeShells()} />);
    expect(container.querySelectorAll('[data-shell-slot]').length).toBe(10);
  });

  it('dormant shells render in compact strip mode', () => {
    const { container } = render(<ShellStrip shells={makeShells()} />);
    const slot = container.querySelector('[data-shell-slot="kether"]');
    expect(slot).toHaveAttribute('data-strip-mode', 'compact');
    expect(slot).toHaveAttribute('data-status', 'dormant');
  });

  it('active shell renders in full mode with effect copy', () => {
    const { container } = render(<ShellStrip shells={makeShells({ chesed: 'active' })} />);
    const slot = container.querySelector('[data-shell-slot="chesed"]');
    expect(slot).toHaveAttribute('data-strip-mode', 'full');
    expect(slot).toHaveAttribute('data-status', 'active');
    expect(container.querySelector('[data-shell-effect="chesed"]')).not.toBeNull();
  });

  it('dormant slot has no effect copy visible', () => {
    const { container } = render(<ShellStrip shells={makeShells()} />);
    expect(container.querySelector('[data-shell-effect="kether"]')).toBeNull();
  });

  it('banished shell renders in compact strip mode', () => {
    const { container } = render(<ShellStrip shells={makeShells({ gevurah: 'banished' })} />);
    const slot = container.querySelector('[data-shell-slot="gevurah"]');
    expect(slot).toHaveAttribute('data-strip-mode', 'compact');
    expect(slot).toHaveAttribute('data-status', 'banished');
  });

  describe('compact strip — expand / collapse', () => {
    it('dormant slot provides an expand button (aria-expanded=false when closed)', () => {
      render(<ShellStrip shells={makeShells()} />);
      // Shell of Kether — Fragmentation
      const btn = screen.getByRole('button', { name: /fragmentation/i });
      expect(btn).toHaveAttribute('aria-expanded', 'false');
    });

    it('clicking the expand button opens the detail panel', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      const btn = screen.getByRole('button', { name: /fragmentation/i });
      await user.click(btn);
      expect(btn).toHaveAttribute('aria-expanded', 'true');
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).not.toBeNull();
    });

    it('clicking the same button again collapses it', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      const btn = screen.getByRole('button', { name: /fragmentation/i });
      await user.click(btn);
      await user.click(btn);
      expect(btn).toHaveAttribute('aria-expanded', 'false');
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).toBeNull();
    });

    it('opening a second slot closes the first', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      const kether = screen.getByRole('button', { name: /fragmentation/i });
      const chokmah = screen.getByRole('button', { name: /paralysis/i });
      await user.click(kether);
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).not.toBeNull();
      await user.click(chokmah);
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).toBeNull();
      expect(container.querySelector('[data-shell-expand-panel="chokmah"]')).not.toBeNull();
    });

    it('Enter on focused expand button opens the panel', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      const btn = screen.getByRole('button', { name: /fragmentation/i });
      btn.focus();
      await user.keyboard('{Enter}');
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).not.toBeNull();
    });

    it('Space on focused expand button opens the panel', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      const btn = screen.getByRole('button', { name: /fragmentation/i });
      btn.focus();
      await user.keyboard(' ');
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).not.toBeNull();
    });

    it('Esc collapses the open panel', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      const btn = screen.getByRole('button', { name: /fragmentation/i });
      await user.click(btn);
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).not.toBeNull();
      await user.keyboard('{Escape}');
      expect(container.querySelector('[data-shell-expand-panel="kether"]')).toBeNull();
    });
  });

  describe('active shell — no expand interaction', () => {
    it('active shell has no expand button', () => {
      const { container } = render(<ShellStrip shells={makeShells({ chesed: 'active' })} />);
      const slot = container.querySelector('[data-shell-slot="chesed"]') as HTMLElement;
      expect(slot.querySelector('button')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('is axe-clean with all dormant shells', async () => {
      const { container } = render(<ShellStrip shells={makeShells()} />);
      expectNoViolations(await axe(container));
    });

    it('is axe-clean with one active shell', async () => {
      const { container } = render(<ShellStrip shells={makeShells({ chesed: 'active' })} />);
      expectNoViolations(await axe(container));
    });

    it('is axe-clean with one expanded dormant shell', async () => {
      const user = userEvent.setup();
      const { container } = render(<ShellStrip shells={makeShells()} />);
      await user.click(screen.getByRole('button', { name: /fragmentation/i }));
      expectNoViolations(await axe(container));
    });
  });
});
