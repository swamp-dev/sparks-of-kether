'use client';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import { AvatarStack, type PresencePeer } from '@/components/presence/AvatarStack';
import { PeerCursor } from '@/components/presence/PeerCursor';
import { TargetRing } from '@/components/presence/TargetRing';
import { ActionToast } from '@/components/presence/ActionToast';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import type { SefirahKey } from '@/data';

/**
 * Showroom for the #322 presence layer. Lets a reviewer see the four
 * surfaces (avatar stack, peer cursor, target ring, action toast)
 * without spinning up a real multiplayer room. Production renders a
 * 404 — this page is dev-only chrome (matches the pattern in the
 * other `/demo/*` routes).
 */

const NODE_POSITIONS: Readonly<Record<SefirahKey, { x: number; y: number }>> = {
  kether: { x: 200, y: 60 },
  chokmah: { x: 320, y: 150 },
  binah: { x: 80, y: 150 },
  chesed: { x: 320, y: 280 },
  gevurah: { x: 80, y: 280 },
  tiferet: { x: 200, y: 340 },
  netzach: { x: 320, y: 430 },
  hod: { x: 80, y: 430 },
  yesod: { x: 200, y: 490 },
  malkuth: { x: 200, y: 560 },
};

const SAMPLE_PEERS: readonly PresencePeer[] = [
  { playerId: 'p1', name: 'Andy', color: '#dc143c', glyph: '♈', online: true },
  { playerId: 'p2', name: 'Brae', color: '#4169e1', glyph: '♋', online: true },
  { playerId: 'p3', name: 'Cael', color: '#228b22', glyph: '♍', online: false },
  { playerId: 'p4', name: 'Dot', color: '#9370db', glyph: '♓', online: true },
];

export default function PresenceDemoPage(): JSX.Element {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [activeId, setActiveId] = useState('p2');
  const reduceMotion = useReduceMotion();

  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-widest">Presence Layer</h1>
        <p className="mt-2 max-w-2xl text-sm opacity-70">
          Figma-style multiplayer presence (#322): tinted cursors, avatar stack, targeted-node
          rings, action toast. Click an avatar below to set the active player.
        </p>
      </header>

      <Section title="Avatar stack">
        <p className="mb-3 text-xs opacity-60">
          Top-right of every game page during multiplayer. Click an avatar to mark them as active
          (gold ring + breath halo).
        </p>
        <AvatarStack
          peers={SAMPLE_PEERS}
          viewerPlayerId="p1"
          activePlayerId={activeId}
          onAvatarClick={setActiveId}
        />
      </Section>

      <Section title="Peer cursor">
        <p className="mb-3 text-xs opacity-60">
          Tinted SVG arrow with trailing nickname label. Label fades after 1s of stillness.
        </p>
        <div className="relative h-40 overflow-hidden rounded-lg border border-veil/20 bg-ground/50">
          <PeerCursor
            cursor={{
              playerId: 'p2',
              name: 'Brae',
              color: '#4169e1',
              x: 0.3,
              y: 0.5,
              lastUpdateTs: Date.now(),
            }}
            reduceMotion={reduceMotion}
          />
          <PeerCursor
            cursor={{
              playerId: 'p4',
              name: 'Dot',
              color: '#9370db',
              x: 0.7,
              y: 0.4,
              lastUpdateTs: Date.now(),
            }}
            reduceMotion={reduceMotion}
          />
        </div>
      </Section>

      <Section title="Target ring">
        <p className="mb-3 text-xs opacity-60">
          Thin tinted ring drawn around a Sefirah node when peers focus it. Multiple peers stack
          with progressively-larger radii.
        </p>
        <div className="rounded-lg border border-veil/20 bg-ground/50 p-2">
          <svg viewBox="0 0 400 620" className="mx-auto h-96 w-full">
            {Object.entries(NODE_POSITIONS).map(([key, pos]) => (
              <circle
                key={key}
                cx={pos.x}
                cy={pos.y}
                r={28}
                fill="rgba(255,255,255,0.08)"
                stroke="rgba(255,255,255,0.4)"
              />
            ))}
            <TargetRing
              targets={[
                { playerId: 'p2', nodeId: 'tiferet', color: '#4169e1' },
                { playerId: 'p3', nodeId: 'tiferet', color: '#228b22' },
                { playerId: 'p4', nodeId: 'malkuth', color: '#9370db' },
              ]}
              nodePositions={NODE_POSITIONS}
              reduceMotion={reduceMotion}
            />
          </svg>
        </div>
      </Section>

      <Section title="Action toast">
        <p className="mb-3 text-xs opacity-60">
          Top-center toast surfacing peer pre-action state. Auto-dismisses after 6s of staleness.
        </p>
        <ActionToast
          actions={[
            {
              playerId: 'p2',
              name: 'Brae',
              kind: 'choosing-card',
              ts: Date.now(),
            },
            {
              playerId: 'p3',
              name: 'Cael',
              kind: 'rolling',
              ts: Date.now(),
            },
          ]}
          reduceMotion={reduceMotion}
        />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg tracking-widest opacity-90">{title}</h2>
      {children}
    </section>
  );
}
