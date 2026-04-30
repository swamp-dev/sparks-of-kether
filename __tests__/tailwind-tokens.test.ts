/**
 * Guardrail tests for tailwind tokens added in #311 (atmosphere &
 * motion foundation). These assert the contract — new tokens are
 * present and shaped correctly — without rendering anything Tailwind
 * actually does at build time. The point is that a future drive-by
 * edit to `tailwind.config.ts` doesn't silently drop a token an
 * unrelated component depends on.
 *
 * If you remove or rename a token here, update both this file and
 * `docs/motion.md` in the same change.
 */

import { describe, expect, it } from 'vitest';
import config from '../tailwind.config';

const extend = config.theme?.extend ?? {};

describe('tailwind config (#311 atmosphere & motion)', () => {
  describe('colors', () => {
    it('exposes a `void` token for the deepest indigo substrate', () => {
      const colors = extend.colors as Record<string, string> | undefined;
      expect(colors?.void).toBe('#0b0a1f');
    });

    it('keeps `ground` separate from `void` (cards/panels vs body)', () => {
      const colors = extend.colors as Record<string, string> | undefined;
      expect(colors?.ground).toBe('#0e0a1f');
      expect(colors?.void).not.toBe(colors?.ground);
    });
  });

  describe('motion language', () => {
    it('exposes the `emerge` easing (out-expo) for things appearing', () => {
      const easings = extend.transitionTimingFunction as
        | Record<string, string>
        | undefined;
      expect(easings?.emerge).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    });

    it('exposes the `flow` easing (in-out-quart) for state transitions', () => {
      const easings = extend.transitionTimingFunction as
        | Record<string, string>
        | undefined;
      expect(easings?.flow).toBe('cubic-bezier(0.65, 0, 0.35, 1)');
    });

    it('exposes a `breath` duration for slow atmospheric loops', () => {
      // Tailwind v3 has no `animationDuration` theme key — `duration-*`
      // utilities only affect `transition-duration`. For animation
      // durations we ship a named `animate-breath` animation instead;
      // see `docs/motion.md`.
      const transitions = extend.transitionDuration as
        | Record<string, string>
        | undefined;
      const animations = extend.animation as Record<string, string> | undefined;
      expect(transitions?.breath).toBe('6000ms');
      expect(animations?.breath).toBe(
        'breath 6000ms cubic-bezier(0.65, 0, 0.35, 1) infinite',
      );
    });
  });

  describe('per-Sefirah glow scale', () => {
    const SEFIROT = [
      'kether',
      'chokmah',
      'binah',
      'chesed',
      'gevurah',
      'tiferet',
      'netzach',
      'hod',
      'yesod',
      'malkuth',
    ] as const;

    it.each(SEFIROT)('defines `glow-%s` as a layered box-shadow stack', (name) => {
      const shadows = extend.boxShadow as Record<string, string> | undefined;
      const recipe = shadows?.[`glow-${name}`];
      expect(recipe).toBeDefined();
      // Three stacked shadows minimum (`0 0 X COLOR, 0 0 X COLOR, ...`).
      const layers = (recipe ?? '').split(/,(?![^()]*\))/);
      expect(layers.length).toBeGreaterThanOrEqual(3);
      // Each layer is a `0 0 Xpx COLOR` shadow — no `inset`, no
      // `filter: blur` (per ticket #311 mobile-cost guidance).
      for (const layer of layers) {
        expect(layer.trim()).toMatch(/^0 0 \d+px /);
        expect(layer).not.toMatch(/inset/);
        expect(layer).not.toMatch(/blur/);
      }
    });
  });
});
