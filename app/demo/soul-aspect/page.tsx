'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { SoulAspectPicker } from '@/components/setup/SoulAspectPicker';
import type { SoulAspectKey } from '@/data';

export default function SoulAspectDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [picked, setPicked] = useState<SoulAspectKey | null>(null);
  return (
    <main className="min-h-screen bg-ground p-8 text-veil">
      <h1 className="font-display text-3xl tracking-widest">Soul Aspect</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Tiferet and Gevurah are pre-claimed in this demo. Pick from the rest.
      </p>
      <div className="mt-8">
        <SoulAspectPicker
          taken={{ tiferet: 'Andy', gevurah: 'Bea' }}
          onPick={setPicked}
        />
      </div>
      {picked ? (
        <p className="mt-6 text-center font-display tracking-widest">
          You chose: {picked}
        </p>
      ) : null}
    </main>
  );
}
