import { notFound } from 'next/navigation';

/**
 * Design-token gallery. Dev-only visual check that every Sefirah color
 * and typography stack is reachable from Tailwind utilities.
 *
 * Not wired into the top-level nav. Reach via `/tokens` in development.
 * Production builds 404 this route (see guard below) so token names
 * and layout are not indexed publicly.
 *
 * Display font note: the ticket allowed "Cinzel or EB Garamond" — we
 * chose Cinzel for its compressed, classical feel on headlines. If a
 * body-serif becomes desirable later, add `font-body-serif` as a
 * separate token rather than overloading `font-display`.
 */

interface Swatch {
  name: string;
  bgClass: string;
  hebrew: string;
  quality: string;
  textOnDark: boolean;
  /** Foreground-on-background contrast note, WCAG AA normal-text target is 4.5. */
  contrastNote?: string;
}

const sefirot: readonly Swatch[] = [
  { name: 'Kether', bgClass: 'bg-kether', hebrew: 'כתר', quality: 'Crown', textOnDark: false },
  { name: 'Chokmah', bgClass: 'bg-chokmah', hebrew: 'חכמה', quality: 'Wisdom', textOnDark: false },
  {
    name: 'Binah',
    bgClass: 'bg-binah',
    hebrew: 'בינה',
    quality: 'Understanding',
    textOnDark: true,
  },
  { name: 'Chesed', bgClass: 'bg-chesed', hebrew: 'חסד', quality: 'Mercy', textOnDark: true },
  { name: 'Gevurah', bgClass: 'bg-gevurah', hebrew: 'גבורה', quality: 'Severity', textOnDark: true },
  { name: 'Tiferet', bgClass: 'bg-tiferet', hebrew: 'תפארת', quality: 'Beauty', textOnDark: false },
  {
    name: 'Netzach',
    bgClass: 'bg-netzach',
    hebrew: 'נצח',
    quality: 'Victory',
    textOnDark: true,
    contrastNote: 'veil on netzach ≈ 4.1:1 — borderline AA; prefer dark text for body copy',
  },
  { name: 'Hod', bgClass: 'bg-hod', hebrew: 'הוד', quality: 'Splendor', textOnDark: false },
  {
    name: 'Yesod',
    bgClass: 'bg-yesod',
    hebrew: 'יסוד',
    quality: 'Foundation',
    textOnDark: true,
    contrastNote: 'veil on yesod ≈ 3.6:1 — AA for large text only; use dark text for body copy',
  },
  { name: 'Malkuth', bgClass: 'bg-malkuth', hebrew: 'מלכות', quality: 'Kingdom', textOnDark: true },
];

export default function TokensPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ground p-8 text-veil">
      <h1 className="mb-2 font-display text-4xl tracking-widest">Design Tokens</h1>
      <p className="mb-8 max-w-2xl text-sm opacity-60">
        Dev-only visual check for Tailwind color and typography tokens. Each Sefirah swatch pulls
        directly from <code className="rounded bg-white/10 px-1">tailwind.config.ts</code>. This
        route is disabled in production.
      </p>

      <section className="mb-10" aria-labelledby="sefirot-heading">
        <h2 id="sefirot-heading" className="mb-4 font-display text-2xl">
          Sefirot colors
        </h2>
        <div
          role="list"
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
        >
          {sefirot.map((s) => (
            <div
              key={s.name}
              role="listitem"
              aria-label={`${s.name} (${s.quality}) — ${s.bgClass}`}
              className={`${s.bgClass} rounded-lg border border-white/15 p-4 shadow-md ${
                s.textOnDark ? 'text-veil' : 'text-ground'
              }`}
            >
              <div className="font-hebrew text-2xl leading-none" dir="rtl" lang="he">
                {s.hebrew}
              </div>
              <div className="mt-2 font-display text-lg">{s.name}</div>
              <div className="mt-1 text-xs opacity-80">{s.quality}</div>
              <code className="mt-2 block text-xs opacity-70">{s.bgClass}</code>
              {s.contrastNote ? (
                <p className="mt-2 text-[0.65rem] leading-tight opacity-80">⚠ {s.contrastNote}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" aria-labelledby="pillars-heading">
        <h2 id="pillars-heading" className="mb-4 font-display text-2xl">
          Pillar accents
        </h2>
        <div role="list" className="grid grid-cols-3 gap-4">
          <div
            role="listitem"
            aria-label="Pillar of Mercy — bg-pillar-mercy"
            className="rounded-lg border border-white/15 bg-pillar-mercy p-4 text-veil"
          >
            <div className="font-display text-lg">Pillar of Mercy</div>
            <code className="text-xs opacity-80">bg-pillar-mercy</code>
          </div>
          <div
            role="listitem"
            aria-label="Pillar of Balance — bg-pillar-balance"
            className="rounded-lg border border-white/15 bg-pillar-balance p-4 text-ground"
          >
            <div className="font-display text-lg">Pillar of Balance</div>
            <code className="text-xs opacity-80">bg-pillar-balance</code>
          </div>
          <div
            role="listitem"
            aria-label="Pillar of Severity — bg-pillar-severity"
            className="rounded-lg border border-white/15 bg-pillar-severity p-4 text-veil"
          >
            <div className="font-display text-lg">Pillar of Severity</div>
            <code className="text-xs opacity-80">bg-pillar-severity</code>
          </div>
        </div>
      </section>

      <section className="mb-10" aria-labelledby="typography-heading">
        <h2 id="typography-heading" className="mb-4 font-display text-2xl">
          Typography
        </h2>
        <div className="space-y-4 rounded-lg border border-white/10 p-6">
          <div>
            <div className="mb-1 text-xs opacity-50">font-display (Cinzel, self-hosted via next/font)</div>
            <div className="font-display text-3xl tracking-widest">Sparks of Kether</div>
          </div>
          <div>
            <div className="mb-1 text-xs opacity-50">font-sans (Inter, self-hosted)</div>
            <div className="font-sans text-base">
              The lightning descends; the serpent ascends. You walk the path upward.
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs opacity-50">
              font-hebrew (Noto Sans Hebrew, self-hosted) — the 22 letters, aleph (rightmost) to
              tav (leftmost)
            </div>
            <div className="font-hebrew text-3xl" dir="rtl" lang="he">
              אבגדהוזחטיכלמנסעפצקרשת
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
