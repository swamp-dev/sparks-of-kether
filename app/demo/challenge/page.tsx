'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { ChallengeModal, type ChallengeResolution } from '@/components/challenge/ChallengeModal';
import { seededRng } from '@/engine/rng';

export default function ChallengeDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState<ChallengeResolution | null>(null);

  const handleResolved = (r: ChallengeResolution): void => {
    setLast(r);
    if (r.pass || r.choice === 'accept') setOpen(false);
  };

  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Challenge Modal</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Click Roll to resolve a Gevurah challenge. Seeded RNG so the result
        is reproducible across reloads.
      </p>

      {open ? (
        <div className="mx-auto mt-8 max-w-md">
          <ChallengeModal
            context={{
              sefirah: 'gevurah',
              stat: 12,
              statLabel: 'Strength',
              availableAllies: [
                { id: 'a1', name: 'Bea', stat: 10 },
                { id: 'a2', name: 'Carla', stat: 8 },
              ],
              availableCardBurns: 3,
              availableSparkBurns: 2,
            }}
            rng={seededRng(7)}
            onResolved={handleResolved}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-2">
          <p>Modal closed. Resolution: <code>{JSON.stringify(last, null, 2)}</code></p>
          <button
            type="button"
            className="rounded bg-illumination px-3 py-1 text-ground"
            onClick={() => {
              setOpen(true);
              setLast(null);
            }}
          >
            Reopen
          </button>
        </div>
      )}
    </main>
  );
}
