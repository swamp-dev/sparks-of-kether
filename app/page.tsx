import { Hero } from '@/components/home/Hero';
import { PrimaryCTA } from '@/components/home/PrimaryCTA';
import { ContinueGame } from '@/components/home/ContinueGame';
import { PitchColumns } from '@/components/home/PitchColumns';
import { Filmstrip } from '@/components/home/Filmstrip';
import { Footer } from '@/components/home/Footer';

/**
 * Home page (#313 — first-impression hero redesign).
 *
 * Layout, top-to-bottom:
 *
 *   1. Hero band — title + subtitle layered above a Tree-of-Life
 *      silhouette filling ~70vh on desktop, breathing halos under
 *      the substrate's ambient bloom.
 *   2. Primary CTA — single "Begin the ascent" portal that expands
 *      to reveal New / Join / Hot-seat in ≤2 taps.
 *   3. Pitch columns — three-column "What is this?" answer.
 *   4. Filmstrip — four captioned screenshots of the surfaces.
 *   5. Footer — Read the rules / View source / Codex (placeholder).
 *
 * No layout-level atmosphere component is added here — the
 * `Substrate` wired in `app/layout.tsx` provides the void + bloom +
 * grain stack already. Per the brief in #313: "Use the substrate's
 * ambient bloom — don't add another layout-level atmosphere
 * component."
 *
 * Subtitle copy: "The lightning descends. The serpent ascends." —
 * the existing flavour line from `app/tokens/page.tsx` per the
 * ticket's recommendation, lightly adjusted to two short sentences
 * so the rhythm reads as a couplet, not a comma-spliced fragment.
 *
 * Server-rendered. `PrimaryCTA` is the one client component (it
 * manages a disclosure open/closed state); everything else is
 * static.
 */

const SUBTITLE = 'The lightning descends. The serpent ascends.';

export default function HomePage(): JSX.Element {
  return (
    <main
      data-home-page
      className="relative flex min-h-screen flex-col text-veil"
    >
      {/* Hero band. Title + subtitle stack above the Tree silhouette;
          the portal CTA sits beneath. The substrate from
          `app/layout.tsx` provides the warm bloom underneath — no
          per-route atmosphere needed here. */}
      <section
        data-home-hero-band
        className="
          relative flex w-full flex-col items-center justify-start
          px-6 pt-12 sm:pt-16
        "
      >
        <h1
          className="
            text-center font-display text-5xl tracking-widest text-veil
            sm:text-6xl md:text-7xl
          "
          // Fraunces ships with the `opsz` axis enabled (see
          // `docs/typography.md`); the browser picks a higher-contrast
          // optical size automatically at this rendered size, so no
          // manual `font-variation-settings` override is needed.
        >
          Sparks of Kether
        </h1>
        <p
          data-home-subtitle
          className="
            mt-4 max-w-xl text-center font-display
            text-base italic tracking-wide text-veil/80
            sm:text-lg
          "
        >
          {SUBTITLE}
        </p>

        {/* The Tree itself. Sized to dominate the band's vertical
            real estate per the brief (~70vh on desktop). */}
        <Hero className="mt-6 sm:mt-8" />

        {/* Portal CTA sits beneath the Tree silhouette so the
            visitor's eye walks: title → subtitle → Tree → "Begin the
            ascent." The single dramatic button reads better than
            three flat CTAs at a glance; expansion preserves the
            three-options-in-≤2-taps requirement. */}
        <PrimaryCTA className="mt-10 sm:mt-12" />
        <ContinueGame />
      </section>

      {/* "What is this?" pitch — three columns, vertical-stack on
          mobile. Generous top padding so it reads as a separate beat
          rather than sitting on the hero band's heel. */}
      <PitchColumns className="mt-20 px-6 sm:mt-24 md:mt-28" />

      {/* "How it plays" filmstrip — four captioned screenshots.
          Carousel on mobile, grid on tablet/desktop. */}
      <Filmstrip className="mt-20 px-6 sm:mt-24 md:mt-28" />

      {/* Footer micro-block — Read the rules / View source / Codex
          placeholder. Padded so the page doesn't end with the
          filmstrip's last caption flush against the void. */}
      <Footer className="mt-20 mb-10 px-6 sm:mt-24" />
    </main>
  );
}
