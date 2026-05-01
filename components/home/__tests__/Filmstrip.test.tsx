import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Filmstrip } from '../Filmstrip';

/**
 * Filmstrip — four captioned screenshots (#313). Renders the same
 * frames at every viewport (the carousel-vs-grid switch is CSS-
 * based, never DOM-conditional), so the test asserts the four
 * frames are present and each has caption + alt text.
 */

describe('Filmstrip', () => {
  it('renders four frames', () => {
    const { container } = render(<Filmstrip />);
    const frames = container.querySelectorAll('[data-filmstrip-frame]');
    expect(frames.length).toBe(4);
  });

  it('every frame has both an image and a caption', () => {
    const { container } = render(<Filmstrip />);
    const frames = container.querySelectorAll('[data-filmstrip-frame]');
    frames.forEach((frame) => {
      const img = frame.querySelector('img');
      const caption = frame.querySelector('figcaption');
      expect(img).not.toBeNull();
      // alt text must not be empty — these are content images, not
      // decorative ones.
      expect(img?.getAttribute('alt') ?? '').not.toBe('');
      expect(caption).not.toBeNull();
    });
  });

  it('exposes a programmatic section heading for AT users', () => {
    const { container } = render(<Filmstrip />);
    const section = container.querySelector('[data-home-filmstrip]');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-labelledby')).toBe(
      'home-filmstrip-heading',
    );
  });
});
