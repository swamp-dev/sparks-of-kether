'use client';
import { useState } from 'react';
import { sefirot } from '@/data';
import type { Sefirah, StatKey } from '@/data';
import type { Rng } from '@/engine/rng';
import type { StatSheet } from '@/engine/types';
import { StatIcon } from '@/components/icons/StatIcon';
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
 *   1. Sefirah essence line + invocation appear.
 *   2. Player rolls 3d6 (or auto-rolls when entering the step;
 *      configurable later).
 *   3. The total reveals; "Receive this blessing" advances.
 * After Malkuth, a summary screen lists all 10 stats and waits for
 * an explicit "Continue" click before emitting `onComplete(statSheet)`.
 * The Continue gate (#215) ensures the user actually sees the recap
 * — pre-fix `onComplete` fired from a useEffect synchronously when
 * stepIndex crossed sefirot.length, and the parent unmounted us
 * before the Summary committed visibly.
 *
 * State machine per step: `'awaiting' → 'rolled' → 'received'`. The
 * received → next-step transition happens on the advance click.
 *
 * Pure presentation. The component takes a seeded `rng` so tests can
 * assert exact rolls. Production callers wire the engine's session
 * RNG.
 */

interface BlessingRitualProps {
  readonly rng: Rng;
  readonly onComplete: (stats: StatSheet) => void;
  readonly className?: string;
}

type StepStatus = 'awaiting' | 'rolled' | 'received';

export function BlessingRitual({
  rng,
  onComplete,
  className,
}: BlessingRitualProps): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [stats, setStats] = useState<Partial<Record<StatKey, number>>>({});
  const [stepStatus, setStepStatus] = useState<StepStatus>('awaiting');
  const [lastRoll, setLastRoll] = useState<readonly [number, number, number] | null>(null);

  const finished = stepIndex >= sefirot.length;
  const currentSefirah = finished ? null : sefirot[stepIndex];

  const handleRoll = (): void => {
    if (stepStatus !== 'awaiting') return;
    const a = rng.int(1, 6);
    const b = rng.int(1, 6);
    const c = rng.int(1, 6);
    setLastRoll([a, b, c]);
    setStepStatus('rolled');
    if (currentSefirah) {
      setStats((prev) => ({ ...prev, [currentSefirah.stat]: a + b + c }));
    }
  };

  const handleAdvance = (): void => {
    if (stepStatus !== 'rolled') return;
    // Reset for the next step. When stepIndex passes sefirot.length
    // we render the Summary panel; onComplete only fires later when
    // the user clicks Continue (#215).
    setStepIndex((i) => i + 1);
    setStepStatus('awaiting');
    setLastRoll(null);
  };

  // #133: skip-to-summary — roll all remaining Sefirot in one click,
  // preserve any stats already rolled, and jump to the summary
  // screen. Useful on repeat plays where the slow per-Sefirah
  // ceremony loses its first-time wonder.
  //
  // RNG calls live OUTSIDE the `setStats` updater (per code-reviewer)
  // because React StrictMode double-invokes functional updaters in
  // dev — that would advance the shared session RNG by 2× the
  // expected number of rolls and silently desynchronize the engine.
  // The current-step roll, if any, is already committed to `stats`
  // at roll-time (line ~61), so the `!== undefined` guard preserves
  // it without needing to consult `lastRoll` here.
  const handleSkipCeremony = (): void => {
    const fresh: Partial<Record<StatKey, number>> = {};
    for (let i = stepIndex; i < sefirot.length; i++) {
      const s = sefirot[i];
      if (!s) continue;
      if (stats[s.stat] !== undefined) continue;
      fresh[s.stat] = rng.int(1, 6) + rng.int(1, 6) + rng.int(1, 6);
    }
    setStats((prev) => ({ ...prev, ...fresh }));
    setStepIndex(sefirot.length);
    setStepStatus('awaiting');
    setLastRoll(null);
  };

  // #215: explicit Continue handler. Validates the StatSheet first
  // (the type system can't prove every stat is present; this throws
  // loudly if a future regression skips a step instead of silently
  // passing an incomplete StatSheet downstream), then fires
  // `onComplete`. Was previously a `useEffect` keyed on `stepIndex`
  // — that fired synchronously the moment the final Receive click
  // committed, and the parent unmounted us before the Summary
  // screen was visible.
  const handleContinue = (): void => {
    const missing: StatKey[] = [];
    for (const s of sefirot) {
      if (stats[s.stat] === undefined) missing.push(s.stat);
    }
    if (missing.length > 0) {
      throw new Error(
        `BlessingRitual: missing stats at completion: ${missing.join(', ')}`,
      );
    }
    onComplete(stats as StatSheet);
  };

  if (finished) {
    return (
      <Summary
        stats={stats as StatSheet}
        onContinue={handleContinue}
        className={className}
      />
    );
  }

  if (!currentSefirah) {
    // Defensive — `finished` already checks this, but TypeScript wants
    // the narrow.
    return <p>Ritual complete.</p>;
  }

  const copy = RITUAL_COPY[currentSefirah.key];
  return (
    <section
      data-blessing-ritual
      data-step={stepIndex}
      data-sefirah={currentSefirah.key}
      data-status={stepStatus}
      aria-label={`Blessing ritual, step ${stepIndex + 1} of ${sefirot.length}: ${currentSefirah.englishName}`}
      className={`mx-auto max-w-md text-center ${className ?? ''}`}
    >
      <RitualScene color={currentSefirah.color} sefirahKey={currentSefirah.key} />

      <p className="text-xs uppercase tracking-widest opacity-60">
        Step {stepIndex + 1} of {sefirot.length}
      </p>

      <SefirahHero sefirah={currentSefirah} />

      <h2 className="mt-4 font-display text-3xl tracking-widest" data-sefirah-name>
        {currentSefirah.englishName}
      </h2>
      <p
        className="mt-1 font-hebrew text-2xl"
        lang="he"
        style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
      >
        {currentSefirah.hebrewName}
      </p>
      <p className="mt-4 italic opacity-80" data-essence>
        “{copy.essence}”
      </p>
      <p className="mt-3 text-sm opacity-70" data-invocation>
        {copy.invocation}
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-widest opacity-70">
          Stat: {currentSefirah.stat}
        </span>

        {stepStatus === 'awaiting' ? (
          <button
            type="button"
            onClick={handleRoll}
            data-action="roll"
            className="rounded bg-illumination px-4 py-2 font-display tracking-widest text-ground"
          >
            Roll 3d6
          </button>
        ) : null}

        {stepStatus === 'rolled' && lastRoll ? (
          <RollDisplay
            roll={lastRoll}
            stat={currentSefirah.stat}
            onAdvance={handleAdvance}
          />
        ) : null}

        {/*
          #133: skip-to-summary affordance. Available at any step so
          a returning player can bypass the slow per-Sefirah cadence
          and jump to the summary in one click. Visually de-emphasised
          (small text-only link) so first-time players don't see it
          as the primary path.
        */}
        <button
          type="button"
          onClick={handleSkipCeremony}
          data-action="skip-ceremony"
          className="mt-4 text-xs uppercase tracking-widest opacity-50 hover:opacity-80"
        >
          Skip — roll all remaining
        </button>
      </div>

      <RitualLedger stats={stats} currentIndex={stepIndex} />
    </section>
  );
}

/**
 * Hero badge for the current Sefirah — large circular medallion
 * keyed to the Sefirah's colour with the Hebrew name inscribed.
 * Diameter ≥ 80 px (the ticket's threshold).
 *
 * Glyph colour is picked from the badge's relative luminance so the
 * letter stays legible across all 10 sefirah colours (Kether's white
 * and Tiferet's gold need dark glyphs; Binah's charcoal needs a
 * light one). Robust to future palette tweaks.
 */
function SefirahHero({ sefirah }: { sefirah: Sefirah }): JSX.Element {
  const glyphColor = relativeLuminance(sefirah.color) > 0.4 ? '#1a1542' : '#f8f8ff';
  return (
    <div
      data-sefirah-hero
      data-sefirah={sefirah.key}
      aria-hidden="true"
      className="mx-auto mt-2 flex h-24 w-24 items-center justify-center rounded-full"
      style={{
        backgroundColor: sefirah.color,
        boxShadow: `0 0 24px ${hexAlpha(sefirah.color, '66')}, 0 0 48px ${hexAlpha(sefirah.color, '33')}`,
      }}
    >
      <span
        className="font-hebrew text-4xl"
        lang="he"
        style={{
          color: glyphColor,
          direction: 'rtl',
          unicodeBidi: 'isolate',
        }}
      >
        {[...sefirah.hebrewName][0] ?? ''}
      </span>
    </div>
  );
}

/**
 * Append a 2-digit hex alpha to a 6-digit hex colour. Throws on
 * non-conforming input so a future palette regression is loud
 * instead of silently broken (e.g. `#fff` → `#fff66` would be
 * invalid CSS that browsers ignore).
 */
function hexAlpha(hex: string, alpha: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`hexAlpha: expected 6-digit hex, got ${hex}`);
  }
  return `${hex}${alpha}`;
}

/** WCAG-style relative luminance for a 6-digit hex colour, in [0, 1]. */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface RollDisplayProps {
  readonly roll: readonly [number, number, number];
  readonly stat: StatKey;
  readonly onAdvance: () => void;
}

function RollDisplay({ roll, stat, onAdvance }: RollDisplayProps): JSX.Element {
  const total = roll[0] + roll[1] + roll[2];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-2"
    >
      <div
        data-roll
        aria-label={`Rolled ${roll[0]} + ${roll[1]} + ${roll[2]} = ${total}`}
        className="flex gap-2 text-2xl"
      >
        {roll.map((d, i) => (
          <span
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded border border-veil/40 font-display tabular-nums"
          >
            {d}
          </span>
        ))}
      </div>
      <p
        data-stat-total={stat}
        className="font-display text-3xl tabular-nums text-illumination"
      >
        {total}
      </p>
      <button
        type="button"
        onClick={onAdvance}
        data-action="advance"
        className="rounded border border-illumination px-4 py-2 text-sm tracking-widest"
      >
        Receive this blessing
      </button>
    </div>
  );
}

function Summary({
  stats,
  onContinue,
  className,
}: {
  stats: StatSheet;
  onContinue: () => void;
  className: string | undefined;
}): JSX.Element {
  return (
    <section
      data-blessing-ritual
      data-status="complete"
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
            <dt className="flex-1 capitalize text-sm">{s.stat}</dt>
            <dd
              data-summary-value={s.stat}
              className="font-display tabular-nums"
            >
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
