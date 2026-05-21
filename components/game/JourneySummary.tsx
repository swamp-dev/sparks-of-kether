import { sefirot, zodiacSigns } from '@/data';
import type { GameState } from '@/engine/types';
import type { FinalThresholdResult } from '@/engine/endgame';

/**
 * Post-resolution screen. Renders win/loss/rejection state with a
 * brief breakdown and the per-player reflections collected during
 * the threshold ritual. Reflections are display-only — the engine
 * doesn't persist them; saving them to a journey log is a future
 * feature.
 */

interface JourneySummaryProps {
  readonly state: GameState;
  readonly outcome: FinalThresholdResult;
  readonly reflections: Readonly<Record<string, string>>;
  readonly className?: string;
}

const zodiacByKey = new Map(zodiacSigns.map((s) => [s.key, s]));

export function JourneySummary({
  state,
  outcome,
  reflections,
  className,
}: JourneySummaryProps): JSX.Element {
  if (!outcome.ok) {
    return (
      <section
        data-journey-summary
        data-status="rejected"
        aria-label="Final Threshold ritual rejected"
        className={`mx-auto max-w-md text-center${className ? ` ${className}` : ''}`}
      >
        <h2 className="font-display text-3xl tracking-widest">Not yet ready.</h2>
        <p className="mt-2 opacity-80">
          The ritual could not resolve: <code data-reason>{outcome.reason}</code>
        </p>
      </section>
    );
  }

  const { status } = outcome.value;
  const finalState = outcome.value.state;

  return (
    <section
      data-journey-summary
      data-status={status}
      aria-label={`Journey resolution: ${status}`}
      className={`mx-auto max-w-2xl text-center text-veil${className ? ` ${className}` : ''}`}
    >
      {/* Title */}
      <h2 className="font-display text-4xl tracking-widest">
        {status === 'won' ? 'The Tree is illuminated.' : 'The light fell short.'}
      </h2>
      <p className="mt-2 italic opacity-80">
        {status === 'won'
          ? 'You arrived together. The Crown received what you brought.'
          : 'Some light was given, but the Threshold required more.'}
      </p>

      {/* Sefirot decoration strip — 10 Hebrew glyphs with Sefirah colors */}
      <div aria-hidden="true" data-sefirot-strip className="mt-6 flex justify-center gap-2">
        {sefirot.map((s) => (
          <span
            key={s.key}
            data-sefirah-glyph={s.key}
            title={s.englishName}
            className="font-display text-sm leading-none"
            style={{ color: s.color, opacity: 0.7 }}
          >
            {s.hebrewName[0]}
          </span>
        ))}
      </div>

      {/* Final totals */}
      <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
        <dt className="opacity-60">Illumination</dt>
        <dd
          data-final-illumination
          data-testid="final-illumination"
          className="font-display text-xl tabular-nums"
        >
          {finalState.illumination}
        </dd>
        <dt className="opacity-60">Separation</dt>
        <dd
          data-final-separation
          data-testid="final-separation"
          className="font-display text-xl tabular-nums"
        >
          {finalState.separation}
        </dd>
      </dl>

      {/* Per-player stat breakdown with zodiac glyphs and Sefirah color dots */}
      <div className="relative mt-8 overflow-hidden rounded-lg border border-veil/20 p-4">
        {/* Ambient radial glow behind stat table */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              status === 'won'
                ? 'radial-gradient(ellipse at center, rgba(212,160,23,0.06) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(100,100,140,0.07) 0%, transparent 70%)',
          }}
        />
        <div
          className="relative grid gap-6"
          style={{ gridTemplateColumns: `repeat(${state.players.length}, 1fr)` }}
        >
          {state.players.map((player) => {
            const sign = zodiacByKey.get(player.zodiacSign);
            return (
              <div key={player.id} data-player-stats={player.id}>
                {/* Player header with zodiac glyph */}
                <div className="mb-3 flex items-center justify-center gap-2">
                  {sign && (
                    <span aria-hidden="true" className="font-display text-xl opacity-80">
                      {sign.glyph}
                    </span>
                  )}
                  <p className="text-xs uppercase tracking-widest opacity-60">{player.name}</p>
                </div>
                {/* Stat rows */}
                <dl className="space-y-1 text-left text-xs">
                  {sefirot.map((s) => {
                    const val = player.stats[s.stat];
                    return (
                      <div key={s.key} className="flex items-center gap-2">
                        <span
                          data-sefirah-dot={s.key}
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: s.color, opacity: 0.75 }}
                        />
                        <dt className="flex-1 opacity-60">{s.englishName}</dt>
                        <dd className="font-display tabular-nums">{val}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reflections */}
      <h3 className="mt-8 font-display text-lg tracking-widest opacity-90">Reflections</h3>
      <ul role="list" className="mt-3 space-y-2 text-left">
        {state.players.map((player) => {
          const text = reflections[player.id]?.trim() ?? '';
          const sign = zodiacByKey.get(player.zodiacSign);
          return (
            <li
              key={player.id}
              data-reflection-of={player.id}
              className="rounded border border-veil/20 p-3"
            >
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-60">
                {sign && <span aria-hidden="true">{sign.glyph}</span>}
                {player.name}
              </p>
              <p className="mt-1 italic opacity-90">{text === '' ? '(silent)' : `"${text}"`}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
