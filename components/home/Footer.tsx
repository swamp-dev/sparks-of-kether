import Link from 'next/link';

/**
 * Home-page footer micro-block (#313). Three links: Read the rules,
 * View source, Codex (placeholder until #320 lands).
 *
 * Renders as a small horizontal row of muted links on desktop,
 * stacking vertically on mobile. The aim is "polite credits" energy
 * — the home page's loud surfaces are the hero + portal CTA + pitch
 * columns; this is meant to fade into the substrate.
 */

interface FooterProps {
  readonly className?: string;
}

const REPO_URL = 'https://github.com/swamp-dev/sparks-of-kether';

export function Footer({ className }: FooterProps): JSX.Element {
  return (
    <footer
      data-home-footer
      className={`mx-auto flex max-w-4xl flex-col items-center gap-4 text-sm text-veil/60 sm:flex-row sm:justify-center sm:gap-8 ${className ?? ''}`}
    >
      <Link
        href="/about"
        data-footer-link="rules"
        className="
          font-sans tracking-wide hover:text-veil
          focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-veil/60 focus-visible:ring-offset-2
          focus-visible:ring-offset-void
        "
      >
        Read the rules
      </Link>
      <a
        href={REPO_URL}
        data-footer-link="source"
        target="_blank"
        rel="noopener noreferrer"
        className="
          font-sans tracking-wide hover:text-veil
          focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-veil/60 focus-visible:ring-offset-2
          focus-visible:ring-offset-void
        "
      >
        View source
      </a>
      <Link
        href="/codex"
        data-footer-link="codex"
        className="
          font-sans tracking-wide hover:text-veil
          focus-visible:outline-none focus-visible:ring-1
          focus-visible:ring-veil/60 focus-visible:ring-offset-2
          focus-visible:ring-offset-void
        "
      >
        Codex
      </Link>
    </footer>
  );
}
