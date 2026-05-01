/**
 * #317: Shell sigil aesthetic push.
 *
 * Pins the contracts that distinguish dormant / active / banished
 * sigils beyond the previous "tint + strikethrough" pair, plus the
 * compact-row size hierarchy and the awakening / banishing sound
 * hooks.
 *
 * Visual specifics (precise opacity values, halo rendering, the gold
 * engraved hairline) are covered by the visual-regression baselines.
 * Tests here pin **structural contracts** that the visual layer
 * builds on top of: a per-state data attribute, an aria-label that
 * announces the state, the banished caption text, and the
 * onShellAwakened / onShellBanished hooks firing on transition.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ShellPanel } from '../ShellPanel';
import { EMPTY_SHELL_STATE } from '@/engine/types';
import { sefirot } from '@/data';

describe('ShellPanel — sigil aesthetic (#317)', () => {
  describe('per-state semantic markers', () => {
    it('exposes a data-shell-state matching the status on every slot', () => {
      const shells = {
        ...EMPTY_SHELL_STATE,
        kether: 'active' as const,
        gevurah: 'banished' as const,
        // hod / yesod / netzach / chesed left dormant
      };
      const { container } = render(<ShellPanel shells={shells} />);
      // The contract: data-shell-state mirrors the engine's
      // ShellStatus literal so visual treatments key off the same
      // value the engine emits. (data-status is the legacy attribute
      // for backwards compat; data-shell-state is the canonical one.)
      const ketherSlot = container.querySelector('[data-shell-slot="kether"]');
      expect(ketherSlot?.getAttribute('data-shell-state')).toBe('active');
      const gevurahSlot = container.querySelector(
        '[data-shell-slot="gevurah"]',
      );
      expect(gevurahSlot?.getAttribute('data-shell-state')).toBe('banished');
      const hodSlot = container.querySelector('[data-shell-slot="hod"]');
      expect(hodSlot?.getAttribute('data-shell-state')).toBe('dormant');
    });

    it('aria-label distinguishes dormant from active from banished', () => {
      const shells = {
        ...EMPTY_SHELL_STATE,
        gevurah: 'active' as const,
        chesed: 'banished' as const,
      };
      const { container } = render(<ShellPanel shells={shells} />);
      const dormant = container
        .querySelector('[data-shell-slot="kether"]')
        ?.getAttribute('aria-label') ?? '';
      const active = container
        .querySelector('[data-shell-slot="gevurah"]')
        ?.getAttribute('aria-label') ?? '';
      const banished = container
        .querySelector('[data-shell-slot="chesed"]')
        ?.getAttribute('aria-label') ?? '';
      expect(dormant.toLowerCase()).toContain('dormant');
      expect(active.toLowerCase()).toContain('active');
      expect(banished.toLowerCase()).toContain('banished');
      // Active aria-label additionally carries the effect copy so
      // the player hears the consequence on focus, not just the
      // status word. Cruelty (Gevurah) drops every player's
      // Strength by 1.
      expect(active.toLowerCase()).toContain('strength');
      // Banished aria-label says "banished at <Sefirah>" — the
      // Sefirah whose clearance banished it (always the Shell's
      // own Sefirah by design).
      expect(banished.toLowerCase()).toContain('mercy');
    });
  });

  describe('banished caption', () => {
    it('renders "Banished at <SefirahName>" on banished slots only', () => {
      const shells = {
        ...EMPTY_SHELL_STATE,
        hod: 'banished' as const,
      };
      const { container } = render(<ShellPanel shells={shells} />);
      const slot = container.querySelector('[data-shell-slot="hod"]');
      const caption = slot?.querySelector('[data-shell-banished-caption]');
      expect(caption).not.toBeNull();
      expect(caption?.textContent).toMatch(/Banished at Splendor/);
    });

    it('does not render the banished caption on dormant or active slots', () => {
      const shells = {
        ...EMPTY_SHELL_STATE,
        chesed: 'active' as const,
      };
      const { container } = render(<ShellPanel shells={shells} />);
      expect(
        container.querySelector(
          '[data-shell-slot="chesed"] [data-shell-banished-caption]',
        ),
      ).toBeNull();
      expect(
        container.querySelector(
          '[data-shell-slot="kether"] [data-shell-banished-caption]',
        ),
      ).toBeNull();
    });
  });

  describe('active descriptive text uses the Sefirah colour', () => {
    it('marks the active descriptive text with the Sefirah key so the colour token can be applied', () => {
      const shells = {
        ...EMPTY_SHELL_STATE,
        gevurah: 'active' as const,
      };
      const { container } = render(<ShellPanel shells={shells} />);
      const effect = container.querySelector('[data-shell-effect="gevurah"]');
      expect(effect).not.toBeNull();
      // The descriptive copy carries the Sefirah colour as a
      // data-shell-color attribute. Tailwind's static-analysis
      // requirement means the colour utility ('text-gevurah') is
      // applied via a static lookup elsewhere in the component;
      // tests here just pin that the per-Sefirah signal exists.
      expect(effect?.getAttribute('data-shell-color')).toBe('gevurah');
    });
  });

  describe('compact-row mode size hierarchy', () => {
    it('renders dormant slots at half-size and banished at three-quarter via data-size-tier', () => {
      const shells = {
        ...EMPTY_SHELL_STATE,
        chesed: 'active' as const,
        gevurah: 'banished' as const,
      };
      const { container } = render(<ShellPanel shells={shells} compact />);
      const dormant = container.querySelector('[data-shell-slot="kether"]');
      const active = container.querySelector('[data-shell-slot="chesed"]');
      const banished = container.querySelector('[data-shell-slot="gevurah"]');
      // Size tiers map to the ticket spec: dormant 50, active 100,
      // banished 75. The data attribute is the contract; CSS
      // utilities pick the actual pixel size from this.
      expect(dormant?.getAttribute('data-size-tier')).toBe('50');
      expect(active?.getAttribute('data-size-tier')).toBe('100');
      expect(banished?.getAttribute('data-size-tier')).toBe('75');
    });

    it('non-compact (panel) mode does not apply the size tier', () => {
      const shells = { ...EMPTY_SHELL_STATE, chesed: 'active' as const };
      const { container } = render(<ShellPanel shells={shells} />);
      // In panel mode every slot is full-size; the attribute is
      // either absent or '100' so the visual layer treats them
      // uniformly.
      const dormant = container.querySelector('[data-shell-slot="kether"]');
      const tier = dormant?.getAttribute('data-size-tier');
      // Allow either 'absent' or '100' — both signify uniform sizing.
      expect(tier === null || tier === '100').toBe(true);
    });

    it('compact mode applies a strip layout (single row) rather than the panel grid', () => {
      const { container } = render(
        <ShellPanel shells={EMPTY_SHELL_STATE} compact />,
      );
      const list = container.querySelector('ul');
      expect(list?.getAttribute('data-shell-layout')).toBe('compact');
    });
  });

  describe('sound transition hooks', () => {
    it('fires onShellAwakened when a slot transitions dormant → active', () => {
      const onShellAwakened = vi.fn();
      const onShellBanished = vi.fn();
      const start = { ...EMPTY_SHELL_STATE };
      const { rerender } = render(
        <ShellPanel
          shells={start}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      // No call on initial mount — only true transitions fire the
      // hook. The hook fires via React effects, which compare prev
      // vs next.
      expect(onShellAwakened).not.toHaveBeenCalled();
      const after = { ...start, gevurah: 'active' as const };
      rerender(
        <ShellPanel
          shells={after}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      expect(onShellAwakened).toHaveBeenCalledTimes(1);
      expect(onShellAwakened).toHaveBeenCalledWith('gevurah');
      expect(onShellBanished).not.toHaveBeenCalled();
    });

    it('fires onShellBanished when a slot transitions active → banished', () => {
      const onShellAwakened = vi.fn();
      const onShellBanished = vi.fn();
      const before = { ...EMPTY_SHELL_STATE, hod: 'active' as const };
      const { rerender } = render(
        <ShellPanel
          shells={before}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      onShellAwakened.mockClear();
      const after = { ...before, hod: 'banished' as const };
      rerender(
        <ShellPanel
          shells={after}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      expect(onShellBanished).toHaveBeenCalledTimes(1);
      expect(onShellBanished).toHaveBeenCalledWith('hod');
      expect(onShellAwakened).not.toHaveBeenCalled();
    });

    it('fires onShellBanished when a slot transitions dormant → banished (stillborn)', () => {
      // Stillborn case from design/shells.md: a Shell whose Sefirah is
      // already cleared at the moment it would have woken — goes
      // straight from dormant to banished, never hitting active.
      const onShellAwakened = vi.fn();
      const onShellBanished = vi.fn();
      const start = { ...EMPTY_SHELL_STATE };
      const { rerender } = render(
        <ShellPanel
          shells={start}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      const after = { ...start, malkuth: 'banished' as const };
      rerender(
        <ShellPanel
          shells={after}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      expect(onShellBanished).toHaveBeenCalledTimes(1);
      expect(onShellBanished).toHaveBeenCalledWith('malkuth');
      expect(onShellAwakened).not.toHaveBeenCalled();
    });

    it('does not fire either hook when shells stay in the same state', () => {
      const onShellAwakened = vi.fn();
      const onShellBanished = vi.fn();
      const before = { ...EMPTY_SHELL_STATE, gevurah: 'active' as const };
      const { rerender } = render(
        <ShellPanel
          shells={before}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      onShellAwakened.mockClear();
      // Re-render with the same state — no transitions, no hooks.
      rerender(
        <ShellPanel
          shells={{ ...before }}
          onShellAwakened={onShellAwakened}
          onShellBanished={onShellBanished}
        />,
      );
      expect(onShellAwakened).not.toHaveBeenCalled();
      expect(onShellBanished).not.toHaveBeenCalled();
    });

    it('omitted hooks default to no-op (does not throw on transition)', () => {
      // Sound hooks are no-op by default per ticket — the audio
      // ticket (#321) wires them later. Omitting them must never
      // throw.
      const start = { ...EMPTY_SHELL_STATE };
      const { rerender } = render(<ShellPanel shells={start} />);
      const after = { ...start, chesed: 'active' as const };
      expect(() =>
        rerender(<ShellPanel shells={after} />),
      ).not.toThrow();
    });
  });

  describe('preserves existing contracts', () => {
    it('still renders a slot for every Sefirah', () => {
      const { container } = render(<ShellPanel shells={EMPTY_SHELL_STATE} />);
      for (const s of sefirot) {
        expect(
          container.querySelector(`[data-shell-slot="${s.key}"]`),
        ).not.toBeNull();
      }
    });

    it('keeps the descriptive (non-traditional) Shell names', () => {
      const shells = { ...EMPTY_SHELL_STATE, kether: 'active' as const };
      const { container } = render(<ShellPanel shells={shells} />);
      const text = container.textContent ?? '';
      expect(text).toMatch(/Fragmentation/);
      expect(text).not.toMatch(/Thaumiel|Ghagiel|Satariel|Lilith/i);
    });
  });
});
