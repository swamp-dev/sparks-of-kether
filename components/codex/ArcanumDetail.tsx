import Link from 'next/link';
import {
  arcanumByNumber,
  letterByKey,
  pathByNumber,
  sefirahByKey,
} from '@/data';
import { arcanumCodex } from '@/data/codex-content';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { toRoman } from './roman';

/**
 * Codex detail page for one Major Arcanum.
 */
export interface ArcanumDetailProps {
  readonly number: number;
}

export function ArcanumDetail({ number }: ArcanumDetailProps): JSX.Element {
  const arc = arcanumByNumber(number);
  // INVARIANT: routing guard ensures only valid arcanum numbers
  // reach here, and the codex-content completeness test pins a
  // content entry per Arcanum. A missing entry is a data-authoring
  // bug; throw loudly rather than silently rendering blank prose.
  const codex = arcanumCodex[number];
  if (codex === undefined) {
    throw new Error(
      `ArcanumDetail: no Codex content for arcanum ${number} — data/codex-content.ts is incomplete`,
    );
  }
  const letter = letterByKey(arc.letterKey);
  const path = pathByNumber(arc.pathNumber);
  const fromSefirah = sefirahByKey(path.from);
  const toSefirah = sefirahByKey(path.to);

  return (
    <article
      data-codex-arcanum={number}
      className="mx-auto max-w-5xl px-6 py-12 text-veil"
    >
      <header className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-[max-content_1fr] md:items-center">
        {/* Hero card — reuses the existing card primitive. The SVG
            sizes via its 5:8 aspect ratio when given an explicit
            width; w-56 (224px) yields a ~360px-tall card that
            anchors the header without dominating it. */}
        <div className="mx-auto w-56 md:mx-0">
          <ArcanumCard number={arc.number} className="w-full" />
        </div>
        <div className="space-y-3 text-center md:text-left">
          <div className="text-xs uppercase tracking-widest opacity-70">
            Major Arcanum {toRoman(arc.number)} ·{' '}
            <span className="tabular-nums">#{arc.number}</span>
          </div>
          <h1 className="font-display text-5xl tracking-widest">
            {arc.name}
          </h1>
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <span
              lang="he"
              dir="rtl"
              className="font-hebrew text-4xl"
            >
              {letter.glyph}
            </span>
            <span className="font-display text-lg tracking-widest opacity-80">
              {letter.name}
            </span>
            <span className="opacity-60">·</span>
            <Link
              href={`/path/${path.number}`}
              className="text-base underline-offset-4 hover:underline"
            >
              Path {path.number}
            </Link>
          </div>
          <p className="max-w-prose text-base italic opacity-80">
            {codex.meaning}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[3fr_2fr]">
        <section
          aria-labelledby="english-pane-heading"
          className="space-y-6"
        >
          <h2
            id="english-pane-heading"
            className="font-display text-2xl tracking-widest"
          >
            Symbolism &amp; role
          </h2>
          <p className="leading-relaxed">{codex.gameRole}</p>

          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-display tracking-widest opacity-70">Letter</dt>
            <dd>
              <span lang="he" dir="rtl" className="font-hebrew text-lg">
                {letter.glyph}
              </span>{' '}
              {letter.name} — {letter.meaning}
            </dd>
            <dt className="font-display tracking-widest opacity-70">
              Letter value
            </dt>
            <dd className="tabular-nums">{letter.value}</dd>
            <dt className="font-display tracking-widest opacity-70">
              Letter class
            </dt>
            <dd className="capitalize">{letter.class}</dd>
            <dt className="font-display tracking-widest opacity-70">
              Attribution
            </dt>
            <dd className="capitalize">
              {arc.attribution.kind}: {arc.attribution.value}
            </dd>
          </dl>

          <section aria-labelledby="keywords-heading" className="space-y-2">
            <h3
              id="keywords-heading"
              className="font-display text-lg tracking-widest"
            >
              Keywords
            </h3>
            <ul className="flex flex-wrap gap-2 text-sm">
              {arc.keywords.map((kw) => (
                <li
                  key={kw}
                  data-keyword={kw}
                  className="rounded-full border border-veil/30 px-3 py-1 capitalize opacity-80"
                >
                  {kw}
                </li>
              ))}
            </ul>
          </section>
        </section>

        <aside className="space-y-6">
          <section
            aria-labelledby="path-pane-heading"
            className="space-y-3 rounded border border-veil/10 p-5"
          >
            <h2
              id="path-pane-heading"
              className="font-display text-lg tracking-widest opacity-80"
            >
              Path
            </h2>
            <p className="text-sm leading-relaxed">
              This card walks{' '}
              <Link
                href={`/path/${path.number}`}
                className="font-display tracking-widest underline-offset-4 hover:underline"
              >
                Path {path.number}
              </Link>{' '}
              between{' '}
              <Link
                href={`/sefirah/${fromSefirah.key}`}
                className="underline-offset-4 hover:underline"
              >
                {fromSefirah.englishName}
              </Link>{' '}
              and{' '}
              <Link
                href={`/sefirah/${toSefirah.key}`}
                className="underline-offset-4 hover:underline"
              >
                {toSefirah.englishName}
              </Link>
              .
            </p>
            <p className="text-xs leading-relaxed opacity-70">
              Pillars crossed: {path.pillarsCrossed[0]} ↔{' '}
              {path.pillarsCrossed[1]}.
            </p>
          </section>
        </aside>
      </div>

      <footer className="mt-12 border-t border-veil/10 pt-6 text-xs opacity-60">
        <Link href="/codex" className="underline-offset-4 hover:underline">
          ← Back to Codex
        </Link>
        <span className="mx-3 opacity-40">·</span>
        From{' '}
        <code className="rounded bg-white/5 px-1">reference/arcana.md</code>.
      </footer>
    </article>
  );
}
