import { notFound } from 'next/navigation';
import { TreeBoard } from '@/components/tree/TreeBoard';

/**
 * Dev-only render of the Tree of Life board. Mirrors the gating
 * pattern used by `/tokens` — production builds 404 this route so
 * unfinished UI never lands publicly.
 *
 * Reach via `/demo/tree` in development.
 */
export default function TreeDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Tree of Life</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Static board. Interactivity (move highlighting, click handlers) lands in Phase 3.
      </p>
      <div data-demo-canvas className="mx-auto mt-8 max-w-md">
        <TreeBoard className="w-full" />
      </div>
    </main>
  );
}
