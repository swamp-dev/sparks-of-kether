import type { Metadata } from 'next';
import Link from 'next/link';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';

/**
 * Themed 404 page (#369). Replaces Next.js's bare white-on-black
 * default — any unknown URL (mistyped Sefirah, stale codex link, deep
 * link to a deleted route) used to land on the framework's untouched
 * fallback, which broke the cosmic theme cold.
 *
 * Layout: minimal — a centered display title, a quiet flavour line, a
 * primary "Codex" CTA and a secondary "Home" link. The substrate +
 * starfield from `app/layout.tsx` already paint the void; a single
 * gevurah-tinted `ColorBloom` lends the page its own warmth (severity,
 * but only as a whisper) without implying a Sefirah-specific origin.
 *
 * Server-rendered. No client state.
 *
 * Per Next.js's not-found convention, this file does not have to set
 * a 404 status itself — the framework wires the status code when
 * rendering this component for an unmatched route or after a child
 * page calls `notFound()`. (See `app/sefirah/[name]/page.tsx`,
 * `app/arcana/[id]/page.tsx`, `app/path/[id]/page.tsx`, plus the
 * dev-only demo routes that 404 in production.)
 */

export const metadata: Metadata = {
  title: '404 — Off the Tree | Sparks of Kether',
  description: 'This path does not connect any Sefirah we know.',
};

export default function NotFound(): JSX.Element {
  return (
    <main
      data-not-found
      className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center text-veil"
    >
      {/* #dc143c is the canonical `gevurah` / `pillar-severity` token
          from tailwind.config.ts — the palette colour for severity /
          form / sorrow. Apt for a "you took a wrong path" screen.
          Kept hand-keyed because `ColorBloom` accepts a hex literal,
          not a Tailwind token name (the bloom uses `color-mix()` on
          the raw string at render time). */}
      <ColorBloom color="#dc143c" position="top" intensity={0.1} />

      <p className="font-display text-sm uppercase tracking-[0.4em] opacity-60">404</p>
      <h1 className="mt-4 font-display text-4xl tracking-widest sm:text-5xl">Off the Tree</h1>
      <p className="mt-6 max-w-md text-base leading-relaxed opacity-80">
        This path does not connect any Sefirah we know. The page may have moved, the link may be
        stale, or the URL may be a misstep on the ascent.
      </p>

      <nav
        aria-label="Recover from the 404"
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-6"
      >
        <Link
          href="/codex"
          data-not-found-cta="codex"
          className="rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground"
        >
          Open the Codex
        </Link>
        <Link
          href="/"
          data-not-found-cta="home"
          className="rounded border border-veil/40 px-6 py-3 font-display tracking-widest hover:border-veil/70"
        >
          Return home
        </Link>
      </nav>
    </main>
  );
}
