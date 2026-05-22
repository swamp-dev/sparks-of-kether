'use client';
import { useEffect, useState } from 'react';
import { sefirot, zodiacSigns } from '@/data';
import type { GameState } from '@/engine/types';

/**
 * Act 3 — The Other Side (Dissolution & Transcendence redesign).
 *
 * After the trial gauntlet and closure confirmation, the win path
 * lands here before continuing to JourneySummary. Sequence:
 *
 *   dark   → initial render; black ground, no content
 *   bloom  → radial gold glow expands from center (600 ms)
 *   reveal → text + council row + zodiac glyphs fade in (1800 ms)
 *
 * The visual contrast mirrors the three-act arc: tense flickering
 * avatars (TrialPanel) → obliteration dark (Act 2 cinematic) →
 * unified radiant white-gold (here). Individual Sefirah colors are
 * gone; all 8 Council Sefirot appear in one unified white-gold tone
 * to signal that individual identity has dissolved back into the
 * pre-matter ground.
 *
 * The zodiac glyphs of the players dissolve at reduced opacity —
 * their individual signs fading as they merge with the Crown.
 */

interface KetherCelebrationProps {
  readonly state: GameState;
  readonly onContinue: () => void;
  readonly className?: string;
}

const zodiacByKey = new Map(zodiacSigns.map((s) => [s.key, s]));

// 8 Council Sefirot: all between Malkuth and Kether (non-inclusive).
// These are the Sefirot whose guardians form the Council of Witnesses
// during the trial gauntlet — they appear here unified, their
// individual colors dissolved into the shared white-gold ground.
const COUNCIL_SEFIROT = sefirot.filter((s) => s.key !== 'kether' && s.key !== 'malkuth');

export function KetherCelebration({
  state,
  onContinue,
  className,
}: KetherCelebrationProps): JSX.Element {
  const [stage, setStage] = useState<'dark' | 'bloom' | 'reveal'>('dark');

  useEffect(() => {
    const t1 = window.setTimeout(() => setStage('bloom'), 600);
    const t2 = window.setTimeout(() => setStage('reveal'), 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <section
      data-kether-celebration
      data-stage={stage}
      aria-label="The Crown receives you"
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ground${className ? ` ${className}` : ''}`}
    >
      {/* Radial gold bloom — appears at 'bloom' stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(212,160,23,0.20) 0%, rgba(212,160,23,0.06) 45%, transparent 72%)',
          opacity: stage !== 'dark' ? 1 : 0,
          transition: 'opacity 1200ms ease-in',
        }}
      />

      {/* White-crown inner bloom — subtler, offsets the gold warmth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, transparent 50%)',
          opacity: stage === 'reveal' ? 1 : 0,
          transition: 'opacity 1600ms ease-in',
        }}
      />

      {/* Content — fades in at 'reveal' stage */}
      <div
        data-celebration-content
        className="relative z-10 flex flex-col items-center gap-10 px-6 py-16 text-center text-veil"
        style={{
          opacity: stage === 'reveal' ? 1 : 0,
          transition: 'opacity 1000ms ease-in',
        }}
      >
        {/* Kether glyph — Crown letter כ, brilliant */}
        <div
          aria-hidden="true"
          data-kether-glyph
          className="font-display text-6xl leading-none"
          style={{
            color: 'rgba(255,248,220,0.95)',
            textShadow:
              '0 0 40px rgba(212,160,23,0.90), 0 0 80px rgba(255,255,255,0.28)',
          }}
        >
          כ
        </div>

        {/* Council row — 8 Sefirot unified in white-gold, no individual colors */}
        <div
          data-council-row
          aria-hidden="true"
          role="presentation"
          className="flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {COUNCIL_SEFIROT.map((s) => (
            <div
              key={s.key}
              data-council-sefirah={s.key}
              title={s.englishName}
              className="flex h-11 w-11 items-center justify-center rounded-full border font-display text-base leading-none"
              style={{
                borderColor: 'rgba(212,160,23,0.45)',
                background: 'rgba(212,160,23,0.07)',
                color: 'rgba(255,248,220,0.88)',
                boxShadow: '0 0 14px rgba(212,160,23,0.18)',
              }}
            >
              {s.hebrewName[0]}
            </div>
          ))}
        </div>

        {/* Headline */}
        <h1
          data-celebration-headline
          className="font-display text-3xl tracking-widest sm:text-4xl lg:text-5xl"
          style={{
            color: 'rgba(255,248,220,0.96)',
            textShadow: '0 0 28px rgba(212,160,23,0.45)',
          }}
        >
          You gave everything.
          <br />
          Kether received.
        </h1>

        {/* Subhead */}
        <p
          data-celebration-subhead
          className="max-w-sm text-sm italic opacity-70 sm:text-base"
        >
          The Crown was never a destination. It was a return.
        </p>

        {/* Player zodiac glyphs — dissolved, at reduced opacity */}
        <div aria-hidden="true" data-zodiac-drift className="flex items-center gap-6">
          {state.players.map((player) => {
            const sign = zodiacByKey.get(player.zodiacSign);
            return (
              <span
                key={player.id}
                data-zodiac-glyph={player.id}
                className="font-display text-2xl opacity-40"
                style={{ color: 'rgba(255,248,220,0.7)' }}
              >
                {sign?.glyph ?? '✦'}
              </span>
            );
          })}
        </div>

        {/* Continue → JourneySummary */}
        <button
          type="button"
          onClick={onContinue}
          data-action="celebration-continue"
          className="mt-2 rounded border border-illumination/40 px-8 py-3 font-display tracking-widest text-illumination transition-colors hover:border-illumination/70 hover:bg-illumination/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/70"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
