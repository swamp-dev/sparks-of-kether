import Link from 'next/link';
import {
  arcana,
  letterByKey,
  paths,
  sefirot,
} from '@/data';
import { toRoman } from './roman';

/**
 * Codex landing page. Three columns (Sefirot / Arcana / Paths)
 * exposing every detail page in the Codex.
 */
export function CodexIndex(): JSX.Element {
  return (
    <main
      data-codex-index
      className="mx-auto max-w-6xl px-6 py-12 text-veil"
    >
      <header className="mb-12 text-center">
        <h1 className="font-display text-5xl tracking-widest">Codex</h1>
        <p className="mx-auto mt-4 max-w-prose text-base leading-relaxed opacity-80">
          The symbolic systems behind Sparks of Kether — every Sefirah,
          every Major Arcanum, every Path. Each tile links to a
          scholarly detail page sourced from the project&rsquo;s
          reference notes.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
        {/* Sefirot column */}
        <section
          aria-labelledby="sefirot-heading"
          className="space-y-4"
        >
          <h2
            id="sefirot-heading"
            className="font-display text-2xl tracking-widest"
          >
            The 10 Sefirot
          </h2>
          <p className="text-xs leading-relaxed opacity-70">
            The nodes of the Tree of Life. Each is a stat, a
            challenge, and a Shell.
          </p>
          <ul className="space-y-2">
            {sefirot.map((s) => (
              <li key={s.key}>
                <Link
                  href={`/sefirah/${s.key}`}
                  data-codex-sefirah-link={s.key}
                  className="flex items-center gap-3 rounded border border-veil/15 p-3 transition-colors hover:border-veil/40"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-display text-base tracking-widest">
                    {s.englishName}
                  </span>
                  <span
                    lang="he"
                    dir="rtl"
                    className="font-hebrew text-base opacity-80"
                  >
                    {s.hebrewName}
                  </span>
                  <span className="ml-auto text-xs tabular-nums opacity-60">
                    #{s.number}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Arcana column */}
        <section
          aria-labelledby="arcana-heading"
          className="space-y-4"
        >
          <h2
            id="arcana-heading"
            className="font-display text-2xl tracking-widest"
          >
            The 22 Major Arcana
          </h2>
          <p className="text-xs leading-relaxed opacity-70">
            The team&rsquo;s hand. Each card walks one path on the
            Tree.
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {arcana.map((a) => {
              const letter = letterByKey(a.letterKey);
              return (
                <li key={a.number}>
                  <Link
                    href={`/arcana/${a.number}`}
                    data-codex-arcanum-link={a.number}
                    className="flex h-full flex-col items-start gap-1 rounded border border-veil/15 p-3 transition-colors hover:border-veil/40"
                  >
                    <span className="text-xs tabular-nums opacity-60">
                      {toRoman(a.number)}
                    </span>
                    <span className="font-display text-sm tracking-widest leading-tight">
                      {a.name}
                    </span>
                    <span
                      lang="he"
                      dir="rtl"
                      className="font-hebrew text-sm opacity-70"
                    >
                      {letter.glyph}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Paths column */}
        <section
          aria-labelledby="paths-heading"
          className="space-y-4"
        >
          <h2
            id="paths-heading"
            className="font-display text-2xl tracking-widest"
          >
            The 22 Paths
          </h2>
          <p className="text-xs leading-relaxed opacity-70">
            The connections between the Sefirot. Each path is one
            Hebrew letter, one Major Arcanum.
          </p>
          <ul className="space-y-2">
            {paths.map((p) => {
              const letter = letterByKey(p.letterKey);
              return (
                <li key={p.number}>
                  <Link
                    href={`/path/${p.number}`}
                    data-codex-path-link={p.number}
                    className="flex items-center gap-3 rounded border border-veil/15 p-3 transition-colors hover:border-veil/40"
                  >
                    <span className="font-display text-sm tabular-nums tracking-widest opacity-80">
                      {p.number}
                    </span>
                    <span
                      lang="he"
                      dir="rtl"
                      className="font-hebrew text-base"
                    >
                      {letter.glyph}
                    </span>
                    <span className="text-sm capitalize opacity-80">
                      {/*
                        Sefirah keys are lowercase transliterations
                        in the data layer (`tiferet`, `gevurah`,
                        etc.). `capitalize` Tailwind class title-
                        cases each word in the rendered string so
                        the index reads as scholarly transliteration
                        ("Tiferet ↔ Gevurah"), matching the detail
                        pages' Translit helper. The `↔` is a
                        non-letter so it's unaffected.
                      */}
                      {p.from} ↔ {p.to}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
