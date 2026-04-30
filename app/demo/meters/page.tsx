'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { TeamMeters } from '@/components/meters/TeamMeters';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';

export default function MetersDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [illum, setIllum] = useState(5);
  const [sep, setSep] = useState(3);
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <ColorBloom color="#9370db" position="center" intensity={0.1} />
      <h1 className="font-display text-3xl tracking-widest">Team Meters</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Illumination + Separation. Bump values to see CSS-transition fill plus
        the live aria announcement (visible in dev tools).
      </p>

      <div className="mt-8 flex items-start gap-12">
        <div data-demo-canvas>
          <TeamMeters
            illumination={illum}
            separation={sep}
            pillarStreak={{
              currentPillar: 'mercy',
              sameCount: 2,
              alternationCount: 0,
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Stepper
            label="Illumination"
            value={illum}
            onChange={setIllum}
          />
          <Stepper label="Separation" value={sep} onChange={setSep} />
          <button
            type="button"
            className="rounded border border-veil/30 px-3 py-1 text-xs"
            onClick={() => {
              setIllum(0);
              setSep(0);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </main>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 text-sm opacity-70">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-7 w-7 rounded border border-veil/30"
      >
        −
      </button>
      <span className="w-8 text-center font-display tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="h-7 w-7 rounded border border-veil/30"
      >
        +
      </button>
    </div>
  );
}
