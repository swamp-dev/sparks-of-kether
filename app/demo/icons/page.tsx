import { notFound } from 'next/navigation';
import { Flourish } from '@/components/icons/Flourish';
import { Meter } from '@/components/icons/Meter';
import { PillarMarker } from '@/components/icons/PillarMarker';
import { StatIcon } from '@/components/icons/StatIcon';
import { sefirot } from '@/data';

/**
 * Dev-only render of all iconography pieces from #20. Same gating
 * pattern as the other `/demo/*` routes.
 */
export default function IconsDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <main className="min-h-screen bg-ground p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Iconography</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Pillar markers, stat icons, twin meters, decorative flourishes.
      </p>

      <Section title="Pillar markers">
        <div className="flex gap-6">
          {(['mercy', 'severity', 'balance'] as const).map((p) => (
            <div key={p} className="flex flex-col items-center gap-1">
              <PillarMarker pillar={p} className="h-10 w-12" />
              <span className="text-xs uppercase tracking-widest opacity-60">{p}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Stat icons (10)">
        <div className="flex flex-wrap gap-4">
          {sefirot.map((s) => (
            <div key={s.stat} className="flex flex-col items-center gap-1">
              <div className="text-veil">
                <StatIcon stat={s.stat} className="h-8 w-8" />
              </div>
              <span className="text-xs opacity-60">{s.stat}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Meters">
        <div className="flex items-end gap-8">
          <div className="flex flex-col items-center gap-2">
            <Meter
              value={7}
              max={15}
              color="#ffd700"
              label="Illumination"
              orientation="vertical"
              className="h-32 w-4"
            />
            <span className="text-xs opacity-70">Illumination 7/15</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Meter
              value={3}
              max={15}
              color="#dc143c"
              label="Separation"
              orientation="vertical"
              className="h-32 w-4"
            />
            <span className="text-xs opacity-70">Separation 3/15</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Meter
              value={11}
              max={20}
              color="#4169e1"
              label="Demo (horizontal)"
              orientation="horizontal"
              className="h-4 w-40"
            />
            <span className="text-xs opacity-70">Horizontal 11/20</span>
          </div>
        </div>
      </Section>

      <Section title="Flourish (decorative)">
        <div className="text-veil opacity-80">
          <Flourish className="h-4 w-32" />
        </div>
      </Section>
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
