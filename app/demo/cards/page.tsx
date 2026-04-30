import { notFound } from 'next/navigation';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { arcana } from '@/data';

/**
 * Dev-only render of all 22 Major Arcana in a grid. Same gating
 * pattern as `/tokens` and `/demo/tree` — production builds 404 this
 * route so unfinished UI never lands publicly.
 *
 * Reach via `/demo/cards` in development.
 */
export default function CardsDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Major Arcana</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Symbolic-minimalist deck. Each card composes 1–3 glyphs from the
        shared vocabulary in <code>components/cards/glyphs.tsx</code>.
      </p>
      <div
        data-demo-canvas
        className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
      >
        {arcana.map((arcanum) => (
          <ArcanumCard
            key={arcanum.number}
            arcanum={arcanum}
            className="w-full"
          />
        ))}
      </div>
    </main>
  );
}
