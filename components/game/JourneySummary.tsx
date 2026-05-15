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
        className={`mx-auto max-w-md text-center ${className ?? ''}`}
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
      className={`mx-auto max-w-2xl text-center text-veil ${className ?? ''}`}
    >
      <h2 className="font-display text-4xl tracking-widest">
        {status === 'won' ? 'The Tree is illuminated.' : 'The light fell short.'}
      </h2>
      <p className="mt-2 italic opacity-80">
        {status === 'won'
          ? 'You arrived together. The Crown received what you brought.'
          : 'Some light was given, but the Threshold required more.'}
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
        <dt className="opacity-60">Illumination</dt>
        <dd data-final-illumination className="font-display text-xl tabular-nums">
          {finalState.illumination}
        </dd>
        <dt className="opacity-60">Separation</dt>
        <dd data-final-separation className="font-display text-xl tabular-nums">
          {finalState.separation}
        </dd>
      </dl>

      <h3 className="mt-8 font-display text-lg tracking-widest opacity-90">Reflections</h3>
      <ul role="list" className="mt-3 space-y-2 text-left">
        {state.players.map((player) => {
          const text = reflections[player.id]?.trim() ?? '';
          return (
            <li
              key={player.id}
              data-reflection-of={player.id}
              className="rounded border border-veil/20 p-3"
            >
              <p className="text-xs uppercase tracking-widest opacity-60">{player.name}</p>
              <p className="mt-1 italic opacity-90">{text === '' ? '(silent)' : `“${text}”`}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
