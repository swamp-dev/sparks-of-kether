'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Hand } from '@/components/hand/Hand';

/**
 * Dev-only render of the Hand component in its three meaningful
 * states: own hand (always visible), other hand at lower Tree
 * (face-down), and other hand at upper Tree (face-up).
 */
export default function HandDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const ownHand: readonly number[] = [0, 2, 5, 13, 21];
  const otherHandLower: readonly number[] = [3, 7, 11, 17];
  const otherHandUpper: readonly number[] = [1, 4, 9, 18];
  const [selected, setSelected] = useState<number | undefined>(undefined);
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Hand</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Fan layout. Own hand always face-up; other hands flip face-up only when
        the owner has crossed into the upper Tree.
      </p>

      <Section title="Own hand (selectable)">
        <Hand
          hand={ownHand}
          visible={true}
          onCardSelect={(n) => setSelected(n)}
          {...(selected !== undefined ? { selectedArcanum: selected } : {})}
          ariaLabel="Your hand, 5 cards"
        />
        <p className="mt-4 text-xs opacity-60">
          Selected: {selected !== undefined ? `Arcanum ${selected}` : 'none'}
        </p>
      </Section>

      <Section title="Other player at lower Tree (private — face-down)">
        <Hand
          hand={otherHandLower}
          visible={false}
          ariaLabel="Bea's hand, 4 face-down cards"
        />
      </Section>

      <Section title="Other player at upper Tree (public — face-up)">
        <Hand
          hand={otherHandUpper}
          visible={true}
          ariaLabel="Carla's hand at Kether, 4 cards"
        />
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
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg tracking-widest opacity-90">{title}</h2>
      {children}
    </section>
  );
}
