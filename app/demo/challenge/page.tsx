'use client';
import { Suspense, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { ChallengeModal, type ChallengeResolution } from '@/components/challenge/ChallengeModal';
import { seededRng } from '@/engine/rng';

/**
 * Soul Door reduces a challenge DC by 2. Per `design/soul-doors.md` § 6
 * — magic number tied to a documented rule.
 */
const SOUL_DOOR_DC_DELTA = -2;

export default function ChallengeDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  // `useSearchParams()` requires the closest parent Suspense boundary
  // in App-Router pages — wrap the consumer so this page doesn't get
  // forced out of static generation (and so `next build` doesn't warn
  // / error on stricter Next.js versions). Fallback is `null` because
  // the modal is the only meaningful content; rendering nothing for a
  // tick is fine.
  return (
    <Suspense fallback={null}>
      <ChallengeDemoContent />
    </Suspense>
  );
}

function ChallengeDemoContent(): JSX.Element {
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState<ChallengeResolution | null>(null);

  // `?door=open` — render the Soul Door callout (Epic #240). Used by
  // the screenshot review spec to capture the callout deterministically;
  // also handy for manual eyeballing.
  const searchParams = useSearchParams();
  const doorOpen = searchParams.get('door') === 'open';
  const shortcut = searchParams.get('shortcut') === '1';

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
        {doorOpen ? ' Soul Door open (?door=open).' : null}
        {shortcut ? ' Shortcut applied (?shortcut=1).' : null}
      </p>

      {open ? (
        <div data-demo-canvas className="mx-auto mt-8 max-w-md">
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
              ...(doorOpen ? { soulDoorDelta: SOUL_DOOR_DC_DELTA } : {}),
              ...(shortcut ? { shortcut: true } : {}),
            }}
            rng={seededRng(7)}
            onResolved={handleResolved}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : (
        <div data-demo-canvas className="mt-8 space-y-2">
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
