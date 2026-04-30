import { notFound } from 'next/navigation';
import { StatSheet } from '@/components/player/StatSheet';
import { EMPTY_ABILITY_FLAGS } from '@/engine/types';
import type { PlayerState } from '@/engine/types';

export default function StatSheetDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const player: PlayerState = {
    id: 'p1',
    name: 'Andy',
    position: 'tiferet',
    hand: [2, 5, 13],
    stats: {
      unity: 12,
      insight: 10,
      understanding: 14,
      lovingkindness: 11,
      strength: 9,
      harmony: 13,
      passion: 8,
      intellect: 16,
      intuition: 7,
      body: 12,
    },
    clearedSefirot: new Set(['malkuth', 'yesod']),
    sparksHeld: new Set(['malkuth', 'yesod', 'tiferet']),
    pendingAbilities: EMPTY_ABILITY_FLAGS,
    zodiacSign: 'aries',
  };
  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Stat Sheet</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Character panel — 10 stats and Sparks held. The gold-ringed row
        is the stat being checked this turn. Class-derived bonuses are
        folded into the stat values at game start.
      </p>

      <div data-demo-canvas>
        <Section title="Expanded — active challenge: Harmony">
          <div className="max-w-md rounded-lg border border-veil/20 bg-ground/50 p-4">
            <StatSheet player={player} activeStat="harmony" />
          </div>
        </Section>

        <Section title="Compact — orchestrator row">
          <div className="rounded-lg border border-veil/20 bg-ground/50 p-3">
            <StatSheet player={player} mode="compact" activeStat="harmony" />
          </div>
        </Section>

        <Section title="Expanded — no active stat highlight">
          <div className="max-w-md rounded-lg border border-veil/20 bg-ground/50 p-4">
            <StatSheet player={player} />
          </div>
        </Section>
      </div>
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
