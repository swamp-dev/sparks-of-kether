import { notFound } from 'next/navigation';
import { ShellPanel } from '@/components/shells/ShellPanel';
import { EMPTY_SHELL_STATE } from '@/engine/types';

/**
 * Demo / visual-baseline page for the Shell panel. Renders the panel
 * across the full state matrix (all dormant / mixed states / a
 * compact-row variant) so the visual-regression suite captures every
 * register defined by #317.
 *
 * Dev-only route — `notFound()` in production.
 */
export default function ShellPanelDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const allDormant = EMPTY_SHELL_STATE;
  const someActive = {
    ...EMPTY_SHELL_STATE,
    gevurah: 'active' as const,
    chesed: 'active' as const,
  };
  const mixed = {
    ...EMPTY_SHELL_STATE,
    kether: 'active' as const,
    binah: 'banished' as const,
    malkuth: 'active' as const,
  };
  // Mid-game realistic spread for the compact-row showcase.
  // Two active (Cruelty + Hoarding pressing the team), one
  // banished (Hod cleared early), the rest dormant.
  const compactSample = {
    ...EMPTY_SHELL_STATE,
    chesed: 'active' as const,
    gevurah: 'active' as const,
    hod: 'banished' as const,
  };
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Shell Panel</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Per-Sefirah Shell pressure. Dormant seals carry a faded ring in the Sefirah&rsquo;s colour
        with a hairline letter; active seals fill in full colour with a halo and effect copy;
        banished seals are sealed shut with a gold engraved hairline and a wax-stamp binding line.
      </p>

      <div data-demo-canvas>
        <Section title="All dormant (fresh game)">
          <ShellPanel shells={allDormant} />
        </Section>

        <Section title="Two active (Cruelty, Hoarding)">
          <ShellPanel shells={someActive} />
        </Section>

        <Section title="Mixed: Kether + Malkuth active, Binah banished">
          <ShellPanel shells={mixed} />
        </Section>

        <Section title="Compact row — size hierarchy (active 100%, banished 75%, dormant 50%)">
          <ShellPanel shells={compactSample} compact />
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="mt-10 rounded-lg border border-veil/20 bg-ground/50 p-4">
      <h2 className="mb-4 font-display text-sm uppercase tracking-widest opacity-60">{title}</h2>
      {children}
    </section>
  );
}
