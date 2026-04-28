import { notFound } from 'next/navigation';
import { ShellPanel } from '@/components/shells/ShellPanel';
import { EMPTY_SHELL_STATE } from '@/engine/types';

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
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Shell Panel</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Per-Sefirah Shell pressure. Dormant placeholders, active glyphs with
        effect copy, banished struck through.
      </p>

      <Section title="All dormant (fresh game)">
        <ShellPanel shells={allDormant} />
      </Section>

      <Section title="Two active (Cruelty, Hoarding)">
        <ShellPanel shells={someActive} />
      </Section>

      <Section title="Mixed: Kether + Malkuth active, Binah banished">
        <ShellPanel shells={mixed} />
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="mt-10 rounded-lg border border-veil/20 bg-ground/50 p-4">
      <h2 className="mb-4 font-display text-sm uppercase tracking-widest opacity-60">
        {title}
      </h2>
      {children}
    </section>
  );
}
