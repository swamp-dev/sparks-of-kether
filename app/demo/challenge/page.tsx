'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { EncounterScreen } from '@/components/game/EncounterScreen';
import { useTurn } from '@/lib/use-turn';
import { seededRng } from '@/engine/rng';
import { makeFullGame } from '@/test/fixtures';
import {
  EMPTY_PENDING_MODIFIERS,
  type GameState,
} from '@/engine/types';
import type { ChallengeContext, ChallengeResolution } from '@/lib/challenge-types';
import type { SefirahKey, ZodiacSignKey } from '@/data';

/**
 * Soul Door reduces a challenge DC by 2. Per `design/soul-doors.md` § 6
 * — magic number tied to a documented rule.
 */
const SOUL_DOOR_DC_DELTA = -2;

/**
 * Demo-only route for the EncounterScreen (#315). Replaces the
 * deprecated `ChallengeModal` that previously rendered here so the
 * design-system / visual-regression captures show the new
 * Sefirah-themed dramatic frame.
 *
 * Query params:
 *   ?door=open       — render the Soul Door callout (Epic #240) +
 *                      sign-glyph payoff (#315 § 6).
 *   ?shortcut=1      — apply the central-pillar shortcut DC penalty.
 *   ?sefirah=hod     — challenge a different Sefirah (defaults to
 *                      gevurah). Useful for eyeballing each per-
 *                      Sefirah glow recipe.
 *
 * The page mounts a real `useTurn` hook against a synthetic
 * `GameState` parked at the chosen Sefirah in the prep sub-phase,
 * matching what `EncounterScreen` would see during a live game.
 */

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

  const searchParams = useSearchParams();
  const doorOpen = searchParams.get('door') === 'open';
  const shortcut = searchParams.get('shortcut') === '1';
  const sefirahParam =
    (searchParams.get('sefirah') as SefirahKey | null) ?? 'gevurah';

  // Demo state lives behind a `useMemo` so the seeded RNG and
  // GameState identity stay stable across renders. The `useTurn`
  // reducer needs a `GameState` parked at the chosen Sefirah in the
  // `challenge.prep` sub-phase to drive `EncounterScreen`'s hot-seat
  // path.
  const initialState = useMemo<GameState>(() => {
    const base = makeFullGame({ playerCount: 2, seed: 42 });
    const activeIdx = base.players.findIndex(
      (p) => p.id === base.activePlayerId,
    );
    const players = base.players.map((p, idx) =>
      idx === activeIdx
        ? {
            ...p,
            position: sefirahParam,
            zodiacSign: 'aries' as ZodiacSignKey,
            hand: [0, 1, 2] as readonly number[],
            sparksHeld: new Set(['chesed', 'tiferet']) as ReadonlySet<
              'chesed' | 'tiferet'
            >,
            stats: { ...p.stats, strength: 12 },
          }
        : { ...p, position: sefirahParam, stats: { ...p.stats, strength: 10 } },
    );
    return {
      ...base,
      players,
      phase: 'challenge',
      challengeSubPhase: 'prep',
      pendingModifiers: EMPTY_PENDING_MODIFIERS,
      lastOutcome: undefined,
    };
  }, [sefirahParam]);

  // Sefirah / door / shortcut switches re-mount the hook so each
  // demo variant gets a fresh seeded RNG and a clean GameState.
  // `reopenTick` lets the user click Reopen to also reset. The
  // seed is derived from these inputs so the dependency array
  // expresses the dependency honestly (otherwise eslint flags
  // the unused deps; the useMemo wouldn't re-run when they
  // change).
  const [reopenTick, setReopenTick] = useState(0);
  // untested-by-design: dev-only /demo/challenge route 404s in
  // production (`notFound()` above), so the inline djb2 seed-hash is
  // exercised only by the visual-regression baselines. A unit test
  // would pin a hash that callers can't observe.
  const rng = useMemo(() => {
    // djb2-style hash of the inputs → seed. Stable per
    // (sefirah, doorOpen, shortcut, reopenTick) tuple.
    let h = 7;
    h = (h * 33 + sefirahParam.length) | 0;
    h = (h * 33 + (doorOpen ? 1 : 0)) | 0;
    h = (h * 33 + (shortcut ? 1 : 0)) | 0;
    h = (h * 33 + reopenTick) | 0;
    return seededRng(Math.abs(h) || 1);
  }, [sefirahParam, doorOpen, shortcut, reopenTick]);
  const turn = useTurn({ initialState, rng });

  const activePlayer = initialState.players.find(
    (p) => p.id === initialState.activePlayerId,
  );

  const context: ChallengeContext = useMemo(
    () => ({
      sefirah: sefirahParam,
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
      // The sign payoff banner only renders when door is open AND
      // the player carries a sign. Aries is a deterministic default
      // for the screenshot.
      ...(doorOpen ? { playerSign: 'aries' as ZodiacSignKey } : {}),
    }),
    [sefirahParam, doorOpen, shortcut],
  );

  const handleResolved = (r: ChallengeResolution): void => {
    setLast(r);
    if (r.pass || r.choice === 'accept') setOpen(false);
  };

  // Reopen restarts the encounter — `reopenTick` re-keys the rng.
  useEffect(() => {
    if (reopenTick === 0) return;
    setOpen(true);
    setLast(null);
  }, [reopenTick]);

  return (
    <main className="min-h-screen p-4 text-veil sm:p-8">
      <h1 className="font-display text-3xl tracking-widest">Encounter Screen</h1>
      <p className="mt-2 max-w-xl text-sm opacity-70">
        Click the d20 to resolve a {sefirahParam} challenge. Seeded RNG so the
        result is reproducible across reloads.
        {doorOpen ? ' Soul Door open (?door=open).' : null}
        {shortcut ? ' Shortcut applied (?shortcut=1).' : null}
      </p>

      {open ? (
        <div data-demo-canvas className="mx-auto mt-8 max-w-md">
          <EncounterScreen
            context={context}
            rng={rng}
            mode="hot-seat"
            turn={turn}
            onResolved={handleResolved}
            onCancel={() => setOpen(false)}
            {...(activePlayer ? { player: activePlayer } : {})}
          />
        </div>
      ) : (
        <div data-demo-canvas className="mt-8 space-y-2">
          <p>
            Modal closed. Resolution:{' '}
            <code>{JSON.stringify(last, null, 2)}</code>
          </p>
          <button
            type="button"
            className="rounded bg-illumination px-3 py-1 text-ground"
            onClick={() => setReopenTick((n) => n + 1)}
          >
            Reopen
          </button>
        </div>
      )}
    </main>
  );
}
