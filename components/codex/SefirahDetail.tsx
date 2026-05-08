import Link from 'next/link';
import {
  arcanumByNumber,
  letterByKey,
  paths,
  sefirahByKey,
  type SefirahKey,
} from '@/data';
import { sefirahCodex } from '@/data/codex-content';
import { pantheons } from '@/data/pantheons';

/**
 * Codex detail page for one Sefirah. Sefaria-style scholarly layout
 * adapted for a single-pillar Sefirah focus: hero strip across the
 * top with the node + Hebrew name + quote; English-content pane
 * (game role, stat, body, Shell rule); Hebrew side-pane; cross-ref
 * rail listing every adjacent path with its arcanum.
 *
 * Hebrew text carries `lang="he" dir="rtl"`. The page is fully
 * static — the dynamic route at `app/sefirah/[name]/page.tsx`
 * picks the key and renders this component.
 */
export interface SefirahDetailProps {
  readonly sefirahKey: SefirahKey;
}

export function SefirahDetail({ sefirahKey }: SefirahDetailProps): JSX.Element {
  const sefirah = sefirahByKey(sefirahKey);
  const codex = sefirahCodex[sefirahKey];
  // Codex pages are statically prerendered against the greco-roman
  // pantheon — they have no interactivity that requires the active
  // pantheon. Reading the registry's greco-roman entry directly keeps
  // this a server component with zero JS cost. Phase C1 (#557) re-
  // introduces a client boundary at a higher level if and when codex
  // pages need to track the active pantheon at runtime.
  const codexAvatar = pantheons['greco-roman'].sefirahCodexAvatar[sefirahKey];

  // Adjacent paths — every path that touches this Sefirah, in
  // ascending path number for stable rendering.
  const adjacentPaths = paths
    .filter((p) => p.from === sefirahKey || p.to === sefirahKey)
    .slice()
    .sort((a, b) => a.number - b.number);

  return (
    <article
      data-codex-sefirah={sefirahKey}
      data-sefirah-color={sefirah.color}
      className="mx-auto max-w-5xl px-6 py-12 text-veil"
    >
      {/* Hero strip — colored by the Sefirah's own token. */}
      <header
        data-sefirah-hero
        className="mb-10 flex flex-col items-center gap-3 rounded-lg border border-veil/15 p-8 text-center"
        style={{
          backgroundColor: `${sefirah.color}1a`, // ~10% alpha
          borderColor: `${sefirah.color}66`,
        }}
      >
        <div className="text-xs uppercase tracking-widest opacity-70">
          Sefirah {sefirah.number} of 10 · Pillar of {sefirah.pillar}
        </div>
        <h1 className="font-display text-5xl tracking-widest">
          {sefirah.englishName}
        </h1>
        <p
          lang="he"
          dir="rtl"
          className="font-hebrew text-3xl"
        >
          {sefirah.hebrewName}
        </p>
        <p className="mt-2 max-w-xl text-base italic text-veil/80">
          &ldquo;{codex.quote}&rdquo;
        </p>
      </header>

      {/* Two-pane scholarly layout: English (left) + Hebrew /
          correspondences (right rail). On mobile collapses to a
          single column. */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[3fr_2fr]">
        {/* English content pane */}
        <section aria-labelledby="english-pane-heading" className="space-y-6">
          <h2
            id="english-pane-heading"
            className="font-display text-2xl tracking-widest"
          >
            Meaning &amp; role
          </h2>
          <p className="leading-relaxed">{codex.quality}.</p>
          <p className="leading-relaxed">{codex.gameRole}</p>

          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-display tracking-widest opacity-70">Number</dt>
            <dd className="tabular-nums">{sefirah.number}</dd>
            <dt className="font-display tracking-widest opacity-70">Pillar</dt>
            <dd className="capitalize">{sefirah.pillar}</dd>
            <dt className="font-display tracking-widest opacity-70">Planet</dt>
            <dd>{sefirah.planet}</dd>
            <dt className="font-display tracking-widest opacity-70">Color</dt>
            <dd>
              <span
                aria-hidden="true"
                data-sefirah-swatch
                title={sefirah.color}
                className="mr-2 inline-block h-3 w-3 rounded-sm align-middle"
                style={{ backgroundColor: sefirah.color }}
              />
              <code>{`bg-${sefirahKey}`}</code>
            </dd>
            <dt className="font-display tracking-widest opacity-70">Body</dt>
            <dd>{sefirah.bodyPart}</dd>
            <dt className="font-display tracking-widest opacity-70">Stat</dt>
            <dd className="capitalize">{sefirah.stat}</dd>
            {/*
              #409 — the avatar (per design/avatars.md § 1) closes
              the loop between the codex and the encounter system.
              For Kether the Final Threshold is collective so there
              is no single deity — render the in-doc descriptor.
              Follow-up: a /avatar/[name] page or "See in encounter"
              link per the ticket's optional affordance.
            */}
            <dt className="font-display tracking-widest opacity-70">Voice</dt>
            <dd data-sefirah-voice>
              {codexAvatar === null ? (
                <em className="opacity-80">The team becomes the avatar</em>
              ) : (
                codexAvatar
              )}
            </dd>
          </dl>

          <section aria-labelledby="stat-heading" className="space-y-2">
            <h3
              id="stat-heading"
              className="font-display text-lg tracking-widest"
            >
              Stat — {sefirah.stat}
            </h3>
            <p className="text-sm leading-relaxed">{codex.statDescription}</p>
          </section>

          <section aria-labelledby="shell-heading" className="space-y-2">
            <h3
              id="shell-heading"
              className="font-display text-lg tracking-widest"
            >
              Shell of {sefirah.englishName} — {sefirah.shellKeyword}
            </h3>
            <p className="text-sm leading-relaxed">{codex.shellRule}</p>
          </section>
        </section>

        {/* Right rail: Hebrew + cross-references */}
        <aside aria-labelledby="hebrew-pane-heading" className="space-y-8">
          <section className="space-y-3 rounded border border-veil/10 p-5">
            <h2
              id="hebrew-pane-heading"
              className="font-display text-lg tracking-widest opacity-80"
            >
              Hebrew
            </h2>
            <div className="text-center">
              <span
                lang="he"
                dir="rtl"
                className="font-hebrew text-5xl"
              >
                {sefirah.hebrewName}
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-70">
              The Hebrew name is the canonical form. The English gloss
              (e.g. &ldquo;{sefirah.englishName}&rdquo;) is one of many
              translations and varies across traditions.
            </p>
          </section>

          <section
            aria-labelledby="adjacent-paths-heading"
            className="space-y-3 rounded border border-veil/10 p-5"
          >
            <h2
              id="adjacent-paths-heading"
              className="font-display text-lg tracking-widest opacity-80"
            >
              Adjacent paths ({adjacentPaths.length})
            </h2>
            <ul className="space-y-2 text-sm">
              {adjacentPaths.map((path) => {
                const otherKey = path.from === sefirahKey ? path.to : path.from;
                const other = sefirahByKey(otherKey);
                const arc = arcanumByNumber(path.arcanumNumber);
                const letter = letterByKey(path.letterKey);
                return (
                  <li
                    key={path.number}
                    className="flex items-baseline gap-2 leading-relaxed"
                  >
                    <Link
                      href={`/path/${path.number}`}
                      className="font-display tracking-widest underline-offset-4 hover:underline"
                    >
                      Path {path.number}
                    </Link>
                    <span className="opacity-60">·</span>
                    <span lang="he" dir="rtl" className="font-hebrew text-base">
                      {letter.glyph}
                    </span>
                    <span className="opacity-60">·</span>
                    <Link
                      href={`/arcana/${arc.number}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {arc.name}
                    </Link>
                    <span className="opacity-60">→</span>
                    <Link
                      href={`/sefirah/${otherKey}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {other.englishName}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>

      {/* Footer crumb */}
      <footer className="mt-12 border-t border-veil/10 pt-6 text-xs opacity-60">
        <Link href="/codex" className="underline-offset-4 hover:underline">
          ← Back to Codex
        </Link>
        <span className="mx-3 opacity-40">·</span>
        From{' '}
        <code className="rounded bg-white/5 px-1">reference/sefirot.md</code>,{' '}
        <code className="rounded bg-white/5 px-1">data/codex-content.ts</code>, and{' '}
        <code className="rounded bg-white/5 px-1">data/pantheons/</code>.
      </footer>
    </article>
  );
}
