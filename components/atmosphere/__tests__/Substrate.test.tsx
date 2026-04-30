import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Substrate } from '../Substrate';

describe('Substrate', () => {
  it('renders a fixed-position click-through layer marked decorative', () => {
    const { container } = render(<Substrate />);
    const layer = container.querySelector('[data-atmosphere="substrate"]');
    expect(layer).not.toBeNull();
    const className = layer?.getAttribute('class') ?? '';
    expect(className).toMatch(/\bfixed\b/);
    expect(className).toMatch(/\binset-0\b/);
    expect(className).toMatch(/\bpointer-events-none\b/);
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sits behind page content and behind the Starfield (deeper z-index)', () => {
    // Starfield sits at -z-10. The substrate must sit BEHIND it so the
    // stars render on top of the indigo + bloom + grain wash.
    const { container } = render(<Substrate />);
    const layer = container.querySelector('[data-atmosphere="substrate"]');
    const className = layer?.getAttribute('class') ?? '';
    expect(className).toMatch(/-z-20\b/);
  });

  it('layers a radial-gradient bloom on top of the indigo void', () => {
    // The bloom is exposed via `data-bloom-css` for test inspection
    // (jsdom drops `background: radial-gradient(...)` from `style.background`).
    const { container } = render(<Substrate />);
    const bloom = container.querySelector('[data-substrate-layer="bloom"]');
    expect(bloom).not.toBeNull();
    const css = bloom?.getAttribute('data-bloom-css') ?? '';
    expect(css).toMatch(/radial-gradient/);
    // Tiferet gold at low alpha
    expect(css).toMatch(/#ffd700/i);
  });

  it('layers a grain overlay with screen/overlay blend mode', () => {
    const { container } = render(<Substrate />);
    const grain = container.querySelector('[data-substrate-layer="grain"]');
    expect(grain).not.toBeNull();
    // Grain is decorative; should set a low-opacity blend.
    const blendMode = grain?.getAttribute('data-blend-mode') ?? '';
    expect(['overlay', 'screen']).toContain(blendMode);
  });
});
