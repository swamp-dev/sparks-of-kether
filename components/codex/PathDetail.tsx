import Link from 'next/link';
import { arcanumByNumber, letterByKey, pathByNumber, sefirahByKey } from '@/data';
import { pathCodex, type PathStructuralRole } from '@/data/codex-content';

const STRUCTURAL_LABEL: Record<NonNullable<PathStructuralRole>, string> = {
  'central-pillar': 'Central pillar',
  'abyss-crossing': 'Abyss-crossing',
  'out-of-malkuth': 'Path out of Malkuth',
  'into-kether': 'Path into Kether',
};

/**
 * Render a Sefirah's transliteration (e.g. "Tiferet"). Sefirah keys
 * in the data layer are lowercase transliterations; capitalize the
 * first letter for display.
 */
function Translit({ sefirah }: { readonly sefirah: string }): JSX.Element {
  return <>{sefirah.charAt(0).toUpperCase() + sefirah.slice(1)}</>;
}

/**
 * Codex detail page for one of the 22 paths (numbered 11-32).
 */
export interface PathDetailProps {
  readonly pathNumber: number;
}

export function PathDetail({ pathNumber }: PathDetailProps): JSX.Element {
  const path = pathByNumber(pathNumber);
  // INVARIANT: routing guard ensures only valid path numbers reach
  // here, and the codex-content completeness test pins a content
  // entry per Path. A missing entry is a data-authoring bug; throw
  // loudly rather than silently rendering a blank note + no badge.
  const codex = pathCodex[pathNumber];
  if (codex === undefined) {
    throw new Error(
      `PathDetail: no Codex content for path ${pathNumber} — data/codex-content.ts is incomplete`,
    );
  }
  const letter = letterByKey(path.letterKey);
  const arc = arcanumByNumber(path.arcanumNumber);
  const fromSefirah = sefirahByKey(path.from);
  const toSefirah = sefirahByKey(path.to);

  return (
    <article data-codex-path={pathNumber} className="mx-auto max-w-5xl px-6 py-12 text-veil">
      <header className="mb-10 flex flex-col items-center gap-3 rounded-lg border border-veil/15 p-8 text-center">
        <div className="text-xs uppercase tracking-widest opacity-70">
          Path {pathNumber} · <Translit sefirah={fromSefirah.key} /> ↔{' '}
          <Translit sefirah={toSefirah.key} />
        </div>
        <h1 className="font-display text-5xl tracking-widest">Path {pathNumber}</h1>
        <div className="flex items-center justify-center gap-3">
          <span lang="he" dir="rtl" className="font-hebrew text-5xl">
            {letter.glyph}
          </span>
          <span className="font-display text-2xl tracking-widest opacity-80">{letter.name}</span>
        </div>
        <p className="max-w-prose text-base italic opacity-80">{codex.note}</p>
        {codex.structuralRole !== null ? (
          <span
            data-structural-role={codex.structuralRole}
            className="rounded-full border border-illumination/60 px-3 py-1 text-xs uppercase tracking-widest text-illumination/90"
          >
            {STRUCTURAL_LABEL[codex.structuralRole]}
          </span>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[3fr_2fr]">
        <section aria-labelledby="english-pane-heading" className="space-y-6">
          <h2 id="english-pane-heading" className="font-display text-2xl tracking-widest">
            Letter &amp; arcanum
          </h2>

          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-display tracking-widest opacity-70">Letter</dt>
            <dd>
              <span lang="he" dir="rtl" className="font-hebrew text-lg">
                {letter.glyph}
              </span>{' '}
              {letter.name}
            </dd>
            <dt className="font-display tracking-widest opacity-70">Meaning</dt>
            <dd>{letter.meaning}</dd>
            <dt className="font-display tracking-widest opacity-70">Gematria</dt>
            <dd className="tabular-nums">{letter.value}</dd>
            <dt className="font-display tracking-widest opacity-70">Class</dt>
            <dd className="capitalize">{letter.class}</dd>
            <dt className="font-display tracking-widest opacity-70">Attribution</dt>
            <dd className="capitalize">
              {path.attribution.kind}: {path.attribution.value}
            </dd>
            <dt className="font-display tracking-widest opacity-70">Pillars</dt>
            <dd className="capitalize">
              {path.pillarsCrossed[0]} ↔ {path.pillarsCrossed[1]}
            </dd>
          </dl>

          <section
            aria-labelledby="arcanum-heading"
            className="space-y-3 rounded border border-veil/10 p-5"
          >
            <h3 id="arcanum-heading" className="font-display text-lg tracking-widest">
              Major Arcanum
            </h3>
            <p className="text-sm leading-relaxed">
              <Link
                href={`/arcana/${arc.number}`}
                className="font-display tracking-widest underline-offset-4 hover:underline"
              >
                {arc.name}
              </Link>{' '}
              walks this path. Playing the card in the team&rsquo;s hand is what travels the path on
              the board.
            </p>
            <p className="text-xs leading-relaxed opacity-70">
              Keywords: {arc.keywords.join(', ')}.
            </p>
          </section>
        </section>

        <aside className="space-y-6">
          <section
            aria-labelledby="endpoints-heading"
            className="space-y-3 rounded border border-veil/10 p-5"
          >
            <h2 id="endpoints-heading" className="font-display text-lg tracking-widest opacity-80">
              Endpoints
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/sefirah/${fromSefirah.key}`}
                  className="underline-offset-4 hover:underline"
                >
                  <Translit sefirah={fromSefirah.key} /> · {fromSefirah.englishName}
                </Link>{' '}
                <span className="opacity-60">
                  ({fromSefirah.hebrewName} · #{fromSefirah.number})
                </span>
              </li>
              <li>
                <Link
                  href={`/sefirah/${toSefirah.key}`}
                  className="underline-offset-4 hover:underline"
                >
                  <Translit sefirah={toSefirah.key} /> · {toSefirah.englishName}
                </Link>{' '}
                <span className="opacity-60">
                  ({toSefirah.hebrewName} · #{toSefirah.number})
                </span>
              </li>
            </ul>
            <p className="text-xs leading-relaxed opacity-70">
              Travel in either direction is legal. The traditional numbering is top-down; the game
              is an ascent.
            </p>
          </section>
        </aside>
      </div>

      <footer className="mt-12 border-t border-veil/10 pt-6 text-xs opacity-60">
        <Link href="/codex" className="underline-offset-4 hover:underline">
          ← Back to Codex
        </Link>
        <span className="mx-3 opacity-40">·</span>
        From <code className="rounded bg-white/5 px-1">reference/paths.md</code> and{' '}
        <code className="rounded bg-white/5 px-1">reference/hebrew-letters.md</code>.
      </footer>
    </article>
  );
}
