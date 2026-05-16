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
      const img = document.querySelector('[data-avatar-portrait-image]') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      // `pantheon.avatarNames[hod].primary` → `Hermes` → `hermes` (lowercase).
      // The component renders without a provider, so usePantheon()'s
      // no-provider stub returns the greco-roman default.
      expect(img?.getAttribute('src')).toBe('/portraits/hermes/large.webp');
      // The Hebrew-letter placeholder is hidden while the image renders.
      expect(document.querySelector('[data-avatar-placeholder-letter]')).toBeNull();
    });

    it('falls back to AvatarSilhouette when the image fails to load', () => {
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
      // Stage size uses AvatarSilhouette as the fallback — not the
      // Hebrew letter (that's reserved for small size).
      expect(document.querySelector('[data-avatar-silhouette]')).not.toBeNull();
      expect(document.querySelector('[data-avatar-placeholder-letter]')).toBeNull();
    });

    it('renders AvatarSilhouette for Sefirot without a commissioned portrait (kether, malkuth)', () => {
      render(<AvatarPortrait sefirah="kether" state="prep" size="stage" />);
      // Kether and Malkuth have no avatar character mapping, so no
      // image renders even at stage size. The silhouette placeholder
      // is shown instead (Hebrew letter is only for small size).
      expect(document.querySelector('[data-avatar-portrait-image]')).toBeNull();
      expect(document.querySelector('[data-avatar-silhouette]')).not.toBeNull();
      expect(document.querySelector('[data-avatar-placeholder-letter]')).toBeNull();
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
      const placeholder = document.querySelector('[data-avatar-placeholder-letter]');
      expect(placeholder).not.toBeNull();
      expect(placeholder?.textContent).toBe('ה');
    });

    it('defaults to small size when no `size` prop is supplied', () => {
      render(<AvatarPortrait sefirah="hod" state="pass" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-size')).toBe('small');
      expect(document.querySelector('[data-avatar-portrait-image]')).toBeNull();
    });

    it('does not apply the entrance animation (small variants appear mid-encounter)', () => {
      // #481: only the `stage` variant gets `animate-avatar-emerge`.
      // The small variant is used in resolve / react where the avatar
      // is already established; an emerge animation there would read
      // as re-arrival.
      render(<AvatarPortrait sefirah="hod" state="pass" size="small" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.className).not.toContain('animate-avatar-emerge');
    });
  });

  describe('entrance animation (#481)', () => {
    it('applies motion-safe:animate-avatar-emerge to the stage wrapper', () => {
      // The stage avatar slides up + scales in + fades on first mount
      // via the `avatar-emerge` keyframe in `tailwind.config.ts`.
      // Class is applied at the outermost wrapper (where data-attrs
      // live) so the entire component animates as one unit; the
      // inner frame's `animate-breath` halo is on a different element
      // and continues independently after the emerge settles.
      render(<AvatarPortrait sefirah="hod" state="prep" size="stage" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.className).toContain('motion-safe:animate-avatar-emerge');
    });

    it('keeps the breath halo on the inner frame, not the wrapper', () => {
      // Two separate animations on two separate elements — Tailwind's
      // `animation` CSS property is last-class-wins on a single
      // element, so the emerge wrapper and the breath frame must stay
      // distinct. Negative assertions use the full `motion-safe:`
      // prefix to distinguish "absent" from "present-under-prefix".
      render(<AvatarPortrait sefirah="hod" state="prep" size="stage" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      // Wrapper has emerge but NOT breath.
      expect(portrait?.className).not.toContain('motion-safe:animate-breath');
      // Inner frame has breath. The frame is the first child <div>.
      const innerFrame = portrait?.firstElementChild as HTMLElement | null;
      expect(innerFrame?.className).toContain('motion-safe:animate-breath');
      expect(innerFrame?.className).not.toContain('motion-safe:animate-avatar-emerge');
    });
  });

  describe('pose prop', () => {
    it('surfaces data-avatar-pose on the wrapper', () => {
      render(<AvatarPortrait sefirah="kether" state="prep" size="stage" pose="speaking" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-pose')).toBe('speaking');
    });

    it('defaults to data-avatar-pose="idle" when pose is omitted', () => {
      render(<AvatarPortrait sefirah="kether" state="prep" size="stage" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-pose')).toBe('idle');
    });

    it('passes pose to AvatarSilhouette at stage size', () => {
      render(<AvatarPortrait sefirah="kether" state="prep" size="stage" pose="pass" />);
      const silhouette = document.querySelector('[data-avatar-silhouette]');
      expect(silhouette?.getAttribute('data-pose')).toBe('pass');
    });
  });

  describe('per-Sefirah idle motion (#22)', () => {
    it('labels Hermes (hod) stage+idle as jitter', () => {
      render(<AvatarPortrait sefirah="hod" state="prep" size="stage" pose="idle" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-idle-motion')).toBe('jitter');
    });

    it('labels Selene (yesod) stage+idle as drift', () => {
      render(<AvatarPortrait sefirah="yesod" state="prep" size="stage" pose="idle" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-idle-motion')).toBe('drift');
    });

    it('labels Ares (gevurah) stage+idle as still', () => {
      render(<AvatarPortrait sefirah="gevurah" state="prep" size="stage" pose="idle" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-idle-motion')).toBe('still');
    });

    it('labels all other encounter sefirot stage+idle as breath', () => {
      for (const sefirah of ['chokmah', 'binah', 'chesed', 'tiferet', 'netzach'] as const) {
        render(<AvatarPortrait sefirah={sefirah} state="prep" size="stage" pose="idle" />);
        const portrait = document.querySelector('[data-avatar-portrait]');
        expect(portrait?.getAttribute('data-avatar-idle-motion')).toBe('breath');
        document.body.innerHTML = '';
      }
    });

    it('does not apply idle motion at non-idle poses (speaking, watching, pass, fail)', () => {
      for (const pose of ['speaking', 'watching', 'pass', 'fail'] as const) {
        render(<AvatarPortrait sefirah="hod" state="prep" size="stage" pose={pose} />);
        const portrait = document.querySelector('[data-avatar-portrait]');
        // Non-idle poses always fall back to breath — never jitter/drift/still
        expect(portrait?.getAttribute('data-avatar-idle-motion')).toBe('breath');
        document.body.innerHTML = '';
      }
    });

    it('suppresses breath animation on the frame for Ares (gevurah) at stage+idle', () => {
      render(<AvatarPortrait sefirah="gevurah" state="prep" size="stage" pose="idle" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      const innerFrame = portrait?.firstElementChild as HTMLElement | null;
      // Dead still — frame must NOT breathe.
      expect(innerFrame?.className).not.toContain('animate-breath');
    });

    it('small size always uses breath regardless of sefirah', () => {
      render(<AvatarPortrait sefirah="gevurah" state="prep" size="small" pose="idle" />);
      const portrait = document.querySelector('[data-avatar-portrait]');
      expect(portrait?.getAttribute('data-avatar-idle-motion')).toBe('breath');
    });
  });

  describe('caption + name label', () => {
    it('renders avatarName label when supplied', () => {
      render(<AvatarPortrait sefirah="hod" state="prep" size="stage" avatarName="Hermes" />);
      const nameLabel = document.querySelector('[data-avatar-name-label]');
      expect(nameLabel?.textContent).toBe('Hermes');
    });

    it('flags caption as data-player-response in prep state only', () => {
      const { rerender } = render(
        <AvatarPortrait sefirah="hod" state="prep" size="small" caption="The road is the road." />,
      );
      const prepCaption = document.querySelector('[data-avatar-caption]');
      expect(prepCaption?.getAttribute('data-player-response')).toBe('true');

      rerender(<AvatarPortrait sefirah="hod" state="pass" size="small" caption="Speak again." />);
      const passCaption = document.querySelector('[data-avatar-caption]');
      // Verdict caption — VerdictReveal owns the `[data-avatar-verdict]`
      // surface, so this slot is intentionally not flagged.
      expect(passCaption?.getAttribute('data-player-response')).toBeNull();
    });
  });
});
