import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Codex placeholder (#313). Real Codex pages — Sefirah / Arcana / Path
 * detail surfaces, Sefaria-style two-column scholarly layout — land in
 * #320. This file exists so the home-page footer's "Codex" link
 * resolves rather than 404'ing while #320 is in flight.
 *
 * Static; no client state. The page sits inside the substrate from
 * `app/layout.tsx` like every other route.
 *
 * When #320 ships real Codex pages, replace this placeholder with
 * the index route or redirect to the first detail page. Nothing in
 * CLAUDE.md needs updating — this is an `app/` route, not a doc.
 */

export const metadata: Metadata = {
  title: 'Sparks of Kether — Codex',
  description:
    'Sefirah, Arcana, and Path detail pages — coming with #320.',
};

const REPO_URL = 'https://github.com/swamp-dev/sparks-of-kether';

export default function CodexPlaceholderPage(): JSX.Element {
  return (
    <main
      data-codex-placeholder
      className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center text-veil"
    >
      <h1 className="font-display text-4xl tracking-widest">Codex</h1>
      <p className="mt-6 text-base leading-relaxed text-veil/80">
        The Codex — per-Sefirah, per-Arcanum, and per-Path detail pages
        — is not yet built. The symbolic systems live in the
        repository&rsquo;s reference notes for now.
      </p>
      <p className="mt-4 text-base leading-relaxed text-veil/60">
        Issue #320 tracks this work.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <Link
          href="/"
          className="rounded border border-veil/30 px-6 py-3 font-display tracking-widest text-veil hover:border-veil/60"
        >
          Back to home
        </Link>
        <a
          href={`${REPO_URL}/tree/main/reference`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-illumination/60 px-6 py-3 font-display tracking-widest text-illumination hover:border-illumination"
        >
          View reference notes
        </a>
      </div>
    </main>
  );
}
