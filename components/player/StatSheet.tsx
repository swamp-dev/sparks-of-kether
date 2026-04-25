import { sefirot, soulAspectByKey } from '@/data';
import type { SoulAspectKey, StatKey } from '@/data';
import type { PlayerState } from '@/engine/types';
import { StatIcon } from '@/components/icons/StatIcon';
import { SparkIcon } from '@/components/tokens/SparkIcon';

/**
 * Player character panel — the at-a-glance view of one player's
 * stats, Soul Aspect, and Sparks held.
 *
 * Layout modes:
 *   - `compact`: a single row of stat values + Soul Aspect title + a
 *     row of Spark icons. Suitable for the orchestrator view that
 *     shows all players side-by-side.
 *   - `expanded` (default): a 2-column grid with each stat on its own
 *     row showing icon + name + value (and a small "+2" badge on the
 *     Soul Aspect's bonus stat). The active-challenge stat — if any —
 *     gets a gold border + bumped opacity so the player's eye lands
 *     on it.
 *
 * Soul Aspect bonus is rendered alongside the matching stat rather
 * than at the panel header, because the bonus is what the player
 * actually rolls with — separating it from the base value would force
 * the user to mentally add every check.
 */

const STAT_ORDER: readonly StatKey[] = sefirot.map((s) => s.stat);

interface StatSheetProps {
  readonly player: PlayerState;
  readonly soulAspect?: SoulAspectKey;
  /** Highlights the named stat (e.g. the stat being rolled this turn). */
  readonly activeStat?: StatKey;
  readonly mode?: 'compact' | 'expanded';
  readonly className?: string;
}

export function StatSheet({
  player,
  soulAspect,
  activeStat,
  mode = 'expanded',
  className,
}: StatSheetProps): JSX.Element {
  const aspect = soulAspect ? soulAspectByKey(soulAspect) : null;
  const ariaLabel = `${player.name}'s character sheet${aspect ? `, ${aspect.title}` : ''}`;
  return (
    // <section> with an aria-label gets an implicit ARIA `region`
    // role; an explicit `role="region"` would be redundant noise.
    <section
      aria-label={ariaLabel}
      data-stat-sheet
      data-mode={mode}
      data-player={player.id}
      className={className}
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg tracking-widest">{player.name}</h3>
        {aspect ? (
          <span
            data-soul-aspect={aspect.key}
            className="text-xs uppercase tracking-widest opacity-70"
            title={aspect.flavor}
          >
            {aspect.title}
          </span>
        ) : null}
      </header>
      {mode === 'compact' ? (
        <CompactBody
          player={player}
          aspect={aspect}
          activeStat={activeStat}
        />
      ) : (
        <ExpandedBody
          player={player}
          aspect={aspect}
          activeStat={activeStat}
        />
      )}
    </section>
  );
}

interface BodyProps {
  readonly player: PlayerState;
  readonly aspect: ReturnType<typeof soulAspectByKey> | null;
  readonly activeStat: StatKey | undefined;
}

function ExpandedBody({ player, aspect, activeStat }: BodyProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {STAT_ORDER.map((stat) => {
        const baseValue = player.stats[stat];
        const isBonus = aspect?.bonusStat === stat;
        const total = baseValue + (isBonus ? 2 : 0);
        const isActive = activeStat === stat;
        return (
          <div
            key={stat}
            data-stat-row={stat}
            data-active={isActive ? 'true' : 'false'}
            className={`flex items-center gap-2 rounded px-2 py-1 ${
              isActive ? 'bg-illumination/10 ring-1 ring-illumination' : ''
            }`}
          >
            <span className="text-veil opacity-80">
              <StatIcon stat={stat} className="h-5 w-5" />
            </span>
            <span className="flex-1 text-sm capitalize">{stat}</span>
            <span className="font-display text-sm tabular-nums">
              <span data-stat-value={stat}>{total}</span>
              {isBonus ? (
                <span
                  data-stat-bonus={stat}
                  className="ml-1 text-xs opacity-60"
                  title={`Soul Aspect +2 (base ${baseValue})`}
                  aria-label="Soul Aspect bonus, +2"
                >
                  (+2)
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
      <div className="col-span-2 mt-2">
        <SparksRow player={player} />
      </div>
    </div>
  );
}

function CompactBody({ player, aspect, activeStat }: BodyProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {STAT_ORDER.map((stat) => {
        const isBonus = aspect?.bonusStat === stat;
        const total = player.stats[stat] + (isBonus ? 2 : 0);
        const isActive = activeStat === stat;
        return (
          <span
            key={stat}
            data-stat-row={stat}
            data-active={isActive ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
              isActive ? 'bg-illumination/15 ring-1 ring-illumination' : ''
            }`}
            title={`${stat} ${total}${isBonus ? ' (Soul Aspect +2)' : ''}`}
          >
            <span className="text-veil opacity-70">
              <StatIcon stat={stat} className="h-3 w-3" />
            </span>
            <span data-stat-value={stat} className="font-display tabular-nums">
              {total}
            </span>
          </span>
        );
      })}
      <SparksRow player={player} />
    </div>
  );
}

function SparksRow({ player }: { player: PlayerState }): JSX.Element {
  const sparks = [...player.sparksHeld];
  if (sparks.length === 0) {
    return (
      <p className="text-xs opacity-50" data-sparks-empty>
        No Sparks held
      </p>
    );
  }
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-sparks-row
      aria-label={`${sparks.length} Spark${sparks.length === 1 ? '' : 's'} held`}
    >
      {sparks.map((sefirah) => (
        <SparkIcon key={sefirah} sefirah={sefirah} className="h-6 w-6" />
      ))}
    </div>
  );
}
