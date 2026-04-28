'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { BlessingRitual } from '@/components/setup/BlessingRitual';
import { seededRng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';

export default function RitualDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [seed, setSeed] = useState(1);
  const [completed, setCompleted] = useState<StatSheet | null>(null);

  return (
    <main className="min-h-screen bg-ground p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Blessing Ritual</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Walk through Kether to Malkuth. 3d6 per stat. Seeded RNG so reloads
        produce the same blessings.
      </p>

      <div className="mt-8">
        <BlessingRitual
          key={seed}
          rng={seededRng(seed)}
          onComplete={setCompleted}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setSeed((s) => s + 1);
          setCompleted(null);
        }}
        className="mt-8 rounded border border-veil/30 px-4 py-1 text-xs"
      >
        Restart with new seed
      </button>

      {completed ? (
        <pre className="mt-4 rounded bg-veil/5 p-4 text-xs">
          {JSON.stringify(completed, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
