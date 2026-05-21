'use client';
import { useEffect, useRef, useState } from 'react';
import { sefirot } from '@/data';
import type { StatKey, ZodiacSignKey } from '@/data';
import type { EncounterAvatarKey } from '@/data/types';
import type { Rng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';
import {
  dignityRelationship,
  quoteForBlessing,
  type DignityRelationship,
} from '@/engine/sefirah-quote';
import { usePantheon } from '@/lib/settings/pantheon';
import { StatIcon } from '@/components/icons/StatIcon';
import { AvatarPortrait } from '@/components/game/encounter/AvatarPortrait';
import { D6Roll } from '@/components/challenge/D6Roll';
import { RITUAL_COPY } from './ritual-copy';
import { RitualScene } from './RitualScene';
import { RitualLedger } from './RitualLedger';

/**
 * Sefirot-blessing ritual — guided 10-step setup. Players pass
 * through Kether → Malkuth, rolling 3d6 for the stat each Sefirah
 * generates. The ritual is the game's emotional opening; copy and
 * cadence matter as much as the math.
 *
 * Flow per step:
 *   1. Avatar portrait + Sefirah essence line + invocation appear.
 *      Three dice placeholders are always visible so the layout is
 *      stable before and after rolling (#71).
 *   2. Player rolls 3d6. The dice animate then settle on actual values;
 *      the blessing quote + Next appear immediately.
 *   3. The player clicks **Next** to advance.
 *
 * "Hasten the rite" now plays a brief animation (#72): all remaining
 * dice roll simultaneously for 1500ms before jumping to the summary.
 *
 * State machine: `'awaiting' | 'rolled' | 'hastening'`. The `hastening`
 * state shows a grid of all remaining dice rolling in parallel.
 */

const ROLL_ANIMATION_MS = 700;
const HASTEN_ANIMATION_MS = 1500;

interface BlessingRitualProps {
  readonly rng: Rng;
  readonly sign: ZodiacSignKey;
  readonly onComplete: (stats: StatSheet) => void;
  readonly className?: string;
}

type StepStatus = 'awaiting' | 'rolled' | 'hastening';

interface BlessingRender {
  readonly quote: string;
  readonly tier: DignityRelationship;
}

interface HastenEntry {
  readonly sefirahKey: string;
  readonly englishName: string;
  readonly roll: readonly [number, number, number];
}

export function BlessingRitual({
  rng,
  sign,
  onComplete,
  className,
}: BlessingRitualProps): JSX.Element {
  const { pantheon } = usePantheon();
  const [stepIndex, setStepIndex] = useState(0);
  const [stats, setStats] = useState<Partial<Record<StatKey, number>>>({});
  const [stepStatus, setStepStatus] = useState<StepStatus>('awaiting');
  const [lastRoll, setLastRoll] = useState<readonly [number, number, number] | null>(null);
  const [rolling, setRolling] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blessing, setBlessing] = useState<BlessingRender | null>(null);
  const [hastenData, setHastenData] = useState<HastenEntry[] | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current);
    };
  }, []);

  const finished = stepIndex >= sefirot.length;
  const currentSefirah = finished ? null : sefirot[stepIndex];

  const handleRoll = (): void => {
    if (stepStatus !== 'awaiting') return;
    const a = rng.int(1, 6);
    const b = rng.int(1, 6);
    const c = rng.int(1, 6);
    setLastRoll([a, b, c]);
    setStepStatus('rolled');
    setRolling(true);
    if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current);
    rollTimerRef.current = setTimeout(() => {
      setRolling(false);
      rollTimerRef.current = null;
    }, ROLL_ANIMATION_MS);
    if (currentSefirah) {
      setStats((prev) => ({ ...prev, [currentSefirah.stat]: a + b + c }));
      setBlessing({
        quote: quoteForBlessing(pantheon.sefirahBlessings, currentSefirah.key, sign, rng),
        tier: dignityRelationship(currentSefirah.key, sign),
      });
    }
  };

  const handleAdvance = (): void => {
    if (stepStatus !== 'rolled') return;
    if (rollTimerRef.current !== null) {
      clearTimeout(rollTimerRef.current);
      rollTimerRef.current = null;
    }
    setStepIndex((i) => i + 1);
    setStepStatus('awaiting');
    setLastRoll(null);
    setBlessing(null);
    setRolling(false);
  };

  // #133 / #72: hasten → animate all remaining dice, then jump to summary.
  const handleSkipCeremony = (): void => {
    if (stepStatus === 'hastening') return;
    const fresh: Partial<Record<StatKey, number>> = {};
    const entries: HastenEntry[] = [];
    for (let i = stepIndex; i < sefirot.length; i++) {
      const s = sefirot[i];
      if (!s) continue;
      if (stats[s.stat] !== undefined) continue;
      const a = rng.int(1, 6);
      const b = rng.int(1, 6);
      const c = rng.int(1, 6);
      fresh[s.stat] = a + b + c;
      entries.push({ sefirahKey: s.key, englishName: s.englishName, roll: [a, b, c] });
    }
    setHastenData(entries);
    setStepStatus('hastening');
    if (rollTimerRef.current !== null) clearTimeout(rollTimerRef.current);
    rollTimerRef.current = setTimeout(() => {
      setStats((prev) => ({ ...prev, ...fresh }));
      setStepIndex(sefirot.length);
      setStepStatus('awaiting');
      setLastRoll(null);
      setBlessing(null);
      setRolling(false);
      setHastenData(null);
      rollTimerRef.current = null;
    }, HASTEN_ANIMATION_MS);
  };

  const handleContinue = (): void => {
    const missing: StatKey[] = [];
    for (const s of sefirot) {
      if (stats[s.stat] === undefined) missing.push(s.stat);
    }
    if (missing.length > 0) {
      throw new Error(`BlessingRitual: missing stats at completion: ${missing.join(', ')}`);
    }
    onComplete(stats as StatSheet);
  };

  if (finished) {
    return (
      <Summary
        stats={stats as StatSheet}
        blessingState={blessing === null ? 'null' : 'set'}
        onContinue={handleContinue}
        className={className}
      />
    );
  }

  if (!currentSefirah) {
    return <p>Ritual complete.</p>;
  }

  // Hasten animation: show all remaining dice rolling simultaneously.
  if (stepStatus === 'hastening' && hastenData !== null) {
    return (
      <section
        data-blessing-ritual
        data-step={stepIndex}
        data-sefirah={currentSefirah.key}
        data-status="hastening"
        data-blessing-state="null"
        aria-label="Hastening the rite — rolling all remaining blessings"
        className={`mx-auto max-w-5xl text-center ${className ?? ''}`}
      >
        <p className="font-display text-2xl tracking-widest opacity-70">The rite quickens…</p>
        <div
          role="status"
          aria-live="polite"
          aria-label="Rolling all remaining blessings"
          className="mt-8 flex flex-wrap justify-center gap-6"
        >
          {hastenData.map(({ sefirahKey, englishName, roll }) => (
            <div key={sefirahKey} className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {roll.map((d, j) => (
                  <D6Roll
                    key={j}
                    value={d}
                    rolling={true}
                    durationMs={HASTEN_ANIMATION_MS - 150}
                    announceToAt={false}
                    className="h-10 w-10"
                  />
                ))}
              </div>
              <span className="text-[0.6rem] uppercase tracking-widest opacity-50">
                {englishName}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const isEncounterSefirah = currentSefirah.key !== 'kether' && currentSefirah.key !== 'malkuth';
  const avatarName = isEncounterSefirah
    ? pantheon.avatarNames[currentSefirah.key as EncounterAvatarKey].primary
    : undefined;

  const copy = RITUAL_COPY[currentSefirah.key];
  return (
    <section
      data-blessing-ritual
      data-step={stepIndex}
      data-sefirah={currentSefirah.key}
      data-status={stepStatus}
      data-blessing-state={blessing === null ? 'null' : 'set'}
      aria-label={`Blessing ritual, step ${stepIndex + 1} of ${sefirot.length}: ${currentSefirah.englishName}`}
      className={`mx-auto max-w-5xl ${className ?? ''}`}
    >
      <RitualScene color={currentSefirah.color} sefirahKey={currentSefirah.key} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_2fr_1fr] md:items-start md:gap-8">
        {/* Left: avatar with ambient glow ring (#73) */}
        <div className="relative flex flex-col items-center gap-2 md:items-end md:pt-8">
          {/* Pulsing ring behind the avatar — solid color (not gradient)
              so the rendering is stable across freetype versions on CI. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center md:items-start md:justify-end md:pt-8"
          >
            <div
              className="h-40 w-40 rounded-full opacity-10 motion-safe:animate-pulse"
              style={{ background: currentSefirah.color }}
            />
          </div>
          {/* Ambient particle field — small colored dots (#73) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {PARTICLE_DOTS.map((dot, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 rounded-full motion-safe:animate-pulse"
                style={{
                  top: dot.top,
                  left: dot.left,
                  background: currentSefirah.color,
                  opacity: dot.opacity,
                  animationDelay: dot.delay,
                }}
              />
            ))}
          </div>
          <AvatarPortrait
            sefirah={currentSefirah.key}
            {...(avatarName !== undefined ? { avatarName } : {})}
            state={stepStatus === 'awaiting' ? 'prep' : 'pass'}
            size="stage"
          />
          <span
            data-sefirah-stat-label
            aria-hidden="true"
            className="text-[0.65rem] uppercase tracking-[0.25em] opacity-70"
          >
            {currentSefirah.stat}
          </span>
        </div>

        {/* Centre: ceremony — step counter, name, essence, dice, CTA */}
        <div className="relative text-center">
          {/* Decorative Hebrew glyph watermark (#73) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            <span
              className="select-none font-hebrew text-[10rem] leading-none opacity-[0.04]"
              lang="he"
              style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
            >
              {currentSefirah.hebrewName}
            </span>
          </div>

          <p className="relative text-xs uppercase tracking-widest opacity-60">
            Step {stepIndex + 1} of {sefirot.length}
          </p>

          <h2 className="relative mt-3 font-display text-3xl tracking-widest" data-sefirah-name>
            {currentSefirah.englishName}
          </h2>
          <p
            className="relative mt-1 font-hebrew text-2xl"
            lang="he"
            style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
          >
            {currentSefirah.hebrewName}
          </p>

          <p className="relative mt-4 italic opacity-80" data-essence>
            &ldquo;{copy.essence}&rdquo;
            <span className="mt-2 block text-sm not-italic opacity-90" data-invocation>
              {copy.invocation}
            </span>
          </p>

          {/* Dice row — always present to prevent layout shift (#71).
              Shows placeholder outlines before rolling, real dice after. */}
          <div className="relative mt-6 flex flex-col items-center gap-3">
            <div
              role="group"
              data-roll={lastRoll ? 'true' : 'false'}
              aria-label={
                lastRoll
                  ? `Rolled ${lastRoll[0]} + ${lastRoll[1]} + ${lastRoll[2]} = ${lastRoll[0] + lastRoll[1] + lastRoll[2]}`
                  : 'Dice pending'
              }
              className="flex gap-3"
            >
              {lastRoll
                ? lastRoll.map((d, i) => (
                    <D6Roll
                      key={i}
                      value={d}
                      rolling={rolling}
                      durationMs={ROLL_ANIMATION_MS}
                      announceToAt={false}
                      className="h-14 w-14"
                    />
                  ))
                : [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      aria-hidden="true"
                      className="h-14 w-14 rounded border border-veil/20 opacity-25"
                    />
                  ))}
            </div>

            {/* Stat total — visible after roll */}
            {lastRoll ? (
              <p
                data-stat-total={currentSefirah.stat}
                className="font-display text-3xl tabular-nums text-illumination"
              >
                {lastRoll[0] + lastRoll[1] + lastRoll[2]}
              </p>
            ) : null}

            {/* Blessing quote — visible after roll */}
            {blessing && lastRoll ? (
              <blockquote
                data-blessing-quote
                data-dignity-tier={blessing.tier}
                className="mt-2 max-w-prose px-4 text-center text-sm italic leading-relaxed opacity-90"
                style={{ color: currentSefirah.color }}
              >
                {blessing.quote}
              </blockquote>
            ) : null}

            {/* CTA — Roll or Next, always in same vertical slot */}
            {stepStatus === 'awaiting' ? (
              <button
                type="button"
                onClick={handleRoll}
                data-action="roll"
                className="cursor-pointer rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground"
              >
                Roll 3d6
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAdvance}
                data-action="advance"
                className="cursor-pointer rounded border border-illumination px-4 py-2 text-sm tracking-widest"
              >
                Next
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipCeremony}
              data-action="skip-ceremony"
              className="mt-4 cursor-pointer text-xs uppercase tracking-widest opacity-50 hover:opacity-80"
            >
              Hasten the rite — roll the rest at once
            </button>
          </div>
        </div>

        {/* Right: running ledger */}
        <RitualLedger stats={stats} currentIndex={stepIndex} />
      </div>
    </section>
  );
}

// Pre-computed particle positions so they are stable across renders.
// Random-looking but deterministic — no Math.random() in render.
const PARTICLE_DOTS: readonly {
  top: string;
  left: string;
  opacity: number;
  delay: string;
}[] = [
  { top: '12%', left: '8%', opacity: 0.6, delay: '0ms' },
  { top: '28%', left: '85%', opacity: 0.4, delay: '400ms' },
  { top: '45%', left: '4%', opacity: 0.5, delay: '800ms' },
  { top: '65%', left: '90%', opacity: 0.3, delay: '1200ms' },
  { top: '80%', left: '15%', opacity: 0.6, delay: '200ms' },
  { top: '18%', left: '72%', opacity: 0.4, delay: '600ms' },
  { top: '55%', left: '78%', opacity: 0.5, delay: '1000ms' },
  { top: '38%', left: '20%', opacity: 0.3, delay: '1400ms' },
  { top: '72%', left: '60%', opacity: 0.5, delay: '300ms' },
  { top: '8%', left: '48%', opacity: 0.4, delay: '700ms' },
];

function Summary({
  stats,
  blessingState,
  onContinue,
  className,
}: {
  stats: StatSheet;
  blessingState: 'set' | 'null';
  onContinue: () => void;
  className: string | undefined;
}): JSX.Element {
  return (
    <section
      data-blessing-ritual
      data-status="complete"
      data-blessing-state={blessingState}
      aria-label="Blessing ritual complete; final stats"
      className={`mx-auto max-w-md text-center ${className ?? ''}`}
    >
      <h2 className="font-display text-2xl tracking-widest">The Tree has spoken.</h2>
      <p className="mt-2 text-sm opacity-70">Your blessings:</p>
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-left">
        {sefirot.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2 rounded px-2 py-1"
            data-summary-row={s.stat}
          >
            <span className="text-veil opacity-80">
              <StatIcon stat={s.stat} className="h-5 w-5" />
            </span>
            <dt className="flex-1 text-sm capitalize">{s.stat}</dt>
            <dd data-summary-value={s.stat} className="font-display tabular-nums">
              {stats[s.stat]}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onContinue}
        data-action="continue"
        className="mt-6 rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground"
      >
        Continue
      </button>
    </section>
  );
}
