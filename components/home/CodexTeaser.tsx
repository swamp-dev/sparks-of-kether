import Link from 'next/link';
import { arcana, letterByKey, paths, sefirot } from '@/data';

interface CodexTeaserProps {
  readonly className?: string;
}

const PREVIEW = 5;

export function CodexTeaser({ className }: CodexTeaserProps): JSX.Element {
  const sefirotPreview = sefirot.slice(0, PREVIEW);
  const arcanaPreview = arcana.slice(0, PREVIEW);
  const pathsPreview = paths.slice(0, PREVIEW);

  return (
    <section
      data-home-codex-teaser
      aria-labelledby="home-codex-teaser-heading"
      className={className}
    >
      <div className="mb-8 text-center">
        <h2
          id="home-codex-teaser-heading"
          className="font-display text-2xl tracking-widest text-veil"
        >
          The Codex
        </h2>
        <p className="mt-2 text-sm text-veil/60">
          54 entries: 10 Sefirot, 22 Major Arcana, 22 Paths.
        </p>
      </div>

      {/* Three-column teaser with fade-out suggesting more below */}
      <div className="relative mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Sefirot */}
          <div>
            <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-veil/50">
              The 10 Sefirot
            </h3>
            <ul className="space-y-1.5">
              {sefirotPreview.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center gap-2.5 rounded border border-veil/10 px-3 py-2"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-display text-sm tracking-widest">{s.englishName}</span>
                  <span lang="he" dir="rtl" className="ml-auto font-hebrew text-sm opacity-55">
                    {s.hebrewName}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Major Arcana */}
          <div>
            <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-veil/50">
              The 22 Major Arcana
            </h3>
            <ul className="space-y-1.5">
              {arcanaPreview.map((a) => (
                <li
                  key={a.number}
                  className="flex items-center gap-2.5 rounded border border-veil/10 px-3 py-2"
                >
                  <span className="w-5 shrink-0 font-display text-xs tabular-nums opacity-45">
                    {a.number}
                  </span>
                  <span className="font-display text-sm tracking-widest">{a.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Paths */}
          <div>
            <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-veil/50">
              The 22 Paths
            </h3>
            <ul className="space-y-1.5">
              {pathsPreview.map((p) => {
                const letter = letterByKey(p.letterKey);
                return (
                  <li
                    key={p.number}
                    className="flex items-center gap-2.5 rounded border border-veil/10 px-3 py-2"
                  >
                    <span className="w-5 shrink-0 font-display text-xs tabular-nums opacity-45">
                      {p.number}
                    </span>
                    <span lang="he" dir="rtl" className="font-hebrew text-base">
                      {letter.glyph}
                    </span>
                    <span className="truncate text-xs capitalize opacity-70">
                      {p.from} ↔ {p.to}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Gradient overlay — fades the bottom rows to suggest more entries */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-void to-transparent"
        />
      </div>

      <p className="mt-8 text-center">
        <Link
          href="/codex"
          data-codex-teaser-link="explore"
          className="text-sm text-veil/60 underline-offset-2 hover:text-veil hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-veil/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          Explore all 54 entries →
        </Link>
      </p>
    </section>
  );
}
