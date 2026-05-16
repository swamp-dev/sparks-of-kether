'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { BlessingRitual } from '@/components/setup/BlessingRitual';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';
import { GlyphWash } from '@/components/atmosphere/GlyphWash';
import { seededRng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';
import type { ZodiacSignKey } from '@/data';

const DEMO_SIGNS: readonly ZodiacSignKey[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

export default function RitualDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [seed, setSeed] = useState(1);
  const [sign, setSign] = useState<ZodiacSignKey>('gemini');
  const [completed, setCompleted] = useState<StatSheet | null>(null);

  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <ColorBloom color="#ffd700" position="bottom-right" intensity={0.14} />
      <GlyphWash letter="א" side="left" />
      <h1 className="font-display text-3xl tracking-widest">Blessing Ritual</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Walk through Kether to Malkuth. 3d6 per stat. Seeded RNG so reloads produce the same
        blessings. Choose a sign below to see the per-Sefirah voice calibrate to that astrological
        class (#255 / Voices Epic).
      </p>

      <label className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-widest">
        Sign:
        <select
          value={sign}
          onChange={(e) => {
            // The BlessingRitual `key` includes both seed and sign so
            // a sign change forces a fresh mount on its own — no need
            // to bump the seed too. Keep the explicit "Restart" button
            // as the seed-bumper.
            setSign(e.target.value as ZodiacSignKey);
            setCompleted(null);
          }}
          className="rounded border border-veil/30 bg-transparent px-2 py-1"
        >
          {DEMO_SIGNS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div data-demo-canvas className="mt-8">
        <BlessingRitual
          key={`${seed}-${sign}`}
          rng={seededRng(seed)}
          sign={sign}
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
