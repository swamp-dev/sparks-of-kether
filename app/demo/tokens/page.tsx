import { notFound } from 'next/navigation';
import { D20 } from '@/components/tokens/D20';
import { PlayerToken } from '@/components/tokens/PlayerToken';
import { ShellIcon } from '@/components/tokens/ShellIcon';
import { SparkIcon } from '@/components/tokens/SparkIcon';
import { sefirot } from '@/data';

/**
 * Dev-only render of every token: 4 player variants, 10 Sparks,
 * 10 Shells (in all three lifecycle states), and the d20 (empty +
 * a few values). Same gating pattern as `/tokens` and the other
 * `/demo/*` routes — production builds 404.
 */
export default function TokensDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Tokens</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Player tokens, Spark inventory icons, Shell pressure indicators, d20 roll glyph.
      </p>

      <div data-demo-canvas>
      <Section title="Player tokens (variants 1–4)">
        <div className="flex gap-4">
          {([1, 2, 3, 4] as const).map((v) => (
            <PlayerToken key={v} variant={v} initial={`P${v}`} className="h-12 w-12" />
          ))}
        </div>
      </Section>

      <Section title="Sparks (one per Sefirah)">
        <div className="flex flex-wrap gap-3">
          {sefirot.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <SparkIcon sefirah={s.key} className="h-10 w-10" />
              <span className="text-xs opacity-60">{s.englishName}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shells (active / dormant / banished)">
        {(['active', 'dormant', 'banished'] as const).map((status) => (
          <div key={status} className="mb-4">
            <h3 className="mb-2 text-xs uppercase tracking-widest opacity-50">{status}</h3>
            <div className="flex flex-wrap gap-3">
              {sefirot.map((s) => (
                <ShellIcon key={s.key} sefirah={s.key} status={status} className="h-10 w-10" />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="d20">
        <div className="flex items-center gap-4">
          <D20 className="h-14 w-14" />
          <D20 value={1} className="h-14 w-14" />
          <D20 value={11} className="h-14 w-14" />
          <D20 value={20} className="h-14 w-14" />
        </div>
      </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg tracking-widest opacity-90">{title}</h2>
      {children}
    </section>
  );
}
