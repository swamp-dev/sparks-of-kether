import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { AvatarPortrait } from '../AvatarPortrait';

/**
 * Focused tests for `AvatarPortrait` — the EncounterScreen integration
 * suite covers the size + sefirah + caption wiring; this file pins the
 * narrower contracts that live inside the component:
 *
 *   - The stage-size variant renders the commissioned portrait `<img>`
 *     with the expected `src` shape.
 *   - On image-load failure the component falls back to the Hebrew-
 *     letter placeholder. jsdom doesn't fire `load`/`error` events on
 *     `<img>` automatically, so we drive the fallback explicitly via
 *     `fireEvent.error(img)` — without that drive, no test in the suite
 *     would catch a future regression that breaks the fallback.
 *   - The small-size variant always renders the Hebrew-letter
 *     placeholder regardless of asset availability.
 */
describe('AvatarPortrait', () => {
  describe('stage size', () => {
    it('renders the commissioned portrait <img> with the per-character path', () => {
      render(<AvatarPortrait sefirah="hod" state="prep" size="stage" />);
      const img = document.querySelector(
        '[data-avatar-portrait-image]',
      ) as HTMLImageElement | null;
      expect(img).not.toBeNull();
      // `avatarNames[hod].greek` → `Hermes` → `hermes` (lowercase).
      expect(img?.getAttribute('src')).toBe('/portraits/hermes/large.webp');
      // The Hebrew-letter placeholder is hidden while the image renders.
      expect(
        document.querySelector('[data-avatar-placeholder-letter]'),
      ).toBeNull();
    });

    it('falls back to Hebrew-letter placeholder when the image fails to load', () => {
      render(<AvatarPortrait sefirah="hod" state="prep" size="stage" />);
      const img = document.querySelector('[data-avatar-portrait-image]');
      expect(img).not.toBeNull();
      // Drive the `onError` path explicitly — jsdom doesn't fire the
      // event on its own when an `<img src>` is unresolvable. This is
      // what a 404 on `/portraits/hermes/large.webp` would do in a
      // real browser.
      if (img !== null) {
        fireEvent.error(img);
      }
      expect(document.querySelector('[data-avatar-portrait-image]')).toBeNull();
      const placeholder = document.querySelector(
        '[data-avatar-placeholder-letter]',
      );
      expect(placeholder).not.toBeNull();
      // Hod's Hebrew letter mark is ה (per data/sefirah-glyphs.ts).
      expect(placeholder?.textContent).toBe('ה');
    });

    it('renders Hebrew-letter placeholder for Sefirot without a commissioned portrait (kether, malkuth)', () => {
      render(<AvatarPortrait sefirah="kether" state="prep" size="stage" />);
      // Kether and Malkuth have no avatar character mapping, so no
      // image renders even at stage size.
      expect(document.querySelector('[data-avatar-portrait-image]')).toBeNull();
      expect(
        document.querySelector('[data-avatar-placeholder-letter]'),
      ).not.toBeNull();
    });
  });

  describe('small size', () => {
    it('always renders the Hebrew-letter placeholder, never the image', () => {
      // Small variant is used by resolve / react sub-states; per the
      // ticket the image is reserved for the stage variant. A
      // regression that started rendering an image at small size
      // would visually clash with the existing layout.
      render(<AvatarPortrait sefirah="hod" state="pass" size="small" />);
      expect(document.querySelector('[data-avatar-portrait-image]')).toBeNull();
      const placeholder = document.querySelector(
        '[data-avatar-placeholder-letter]',
      );
      expect(placeholder).not.toBeNull();
      expect(placeholder?.textContent).toBe('ה');
    });

    it('defaults to small size when no `size` prop is supplied', () => {
      render(<AvatarPortrait sefirah="hod" state="pass" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-size')).toBe('small');
      expect(document.querySelector('[data-avatar-portrait-image]')).toBeNull();
    });
  });

  describe('caption + name label', () => {
    it('renders avatarName label when supplied', () => {
      render(
        <AvatarPortrait
          sefirah="hod"
          state="prep"
          size="stage"
          avatarName="Hermes"
        />,
      );
      const nameLabel = document.querySelector('[data-avatar-name-label]');
      expect(nameLabel?.textContent).toBe('Hermes');
    });

    it('flags caption as data-player-response in prep state only', () => {
      const { rerender } = render(
        <AvatarPortrait
          sefirah="hod"
          state="prep"
          size="small"
          caption="The road is the road."
        />,
      );
      const prepCaption = document.querySelector('[data-avatar-caption]');
      expect(prepCaption?.getAttribute('data-player-response')).toBe('true');

      rerender(
        <AvatarPortrait
          sefirah="hod"
          state="pass"
          size="small"
          caption="Speak again."
        />,
      );
      const passCaption = document.querySelector('[data-avatar-caption]');
      // Verdict caption — VerdictReveal owns the `[data-avatar-verdict]`
      // surface, so this slot is intentionally not flagged.
      expect(passCaption?.getAttribute('data-player-response')).toBeNull();
    });
  });
});
