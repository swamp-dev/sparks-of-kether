import { sefirot } from '@/data';
import type { StatKey } from '@/data';
import { StatIcon } from '@/components/icons/StatIcon';

/**
 * Running ledger of which Sefirot have been blessed already plus
 * their rolled stats. Rendered below the active step in the Blessing
 * Ritual so the player sees their build accumulating rather than
 * each roll vanishing into a void.
 *
 * Each row is one Sefirah:
 *   - colour dot keyed to the Sefirah's hex
 *   - stat icon
 *   - stat name (e.g. "lovingkindness")
 *   - rolled value, or "—" if not yet blessed
 *
 * Three visual states per row:
 *   - blessed: rolled value visible, full opacity
 *   - active:  the current step; emphasised, dot glowing
 *   - pending: greyed out, "—" placeholder
 */

interface RitualLedgerProps {
  readonly stats: Partial<Record<StatKey, number>>;
  /** 0..sefirot.length — the index of the Sefirah being blessed. */
  readonly currentIndex: number;
}

export function RitualLedger({
  stats,
  currentIndex,
}: RitualLedgerProps): JSX.Element {
  return (
    <div
      data-ritual-ledger
      aria-label="Sefirot blessed so far"
      className="w-full"
    >
      <h3 className="mb-3 text-center text-xs uppercase tracking-widest opacity-60 md:text-left">
        Blessings received
      </h3>
      <ul role="list" className="space-y-1">
        {sefirot.map((s, i) => {
          const value = stats[s.stat];
          const blessed = value !== undefined;
          const active = i === currentIndex;
          const state = blessed ? 'blessed' : active ? 'active' : 'pending';
          return (
            <li
              key={s.key}
              data-ledger-row={s.key}
              data-ledger-state={state}
              className={`flex items-center gap-3 rounded px-3 py-1.5 text-sm transition-opacity ${
                state === 'pending' ? 'opacity-40' : 'opacity-100'
              } ${active ? 'border border-veil/30 bg-veil/5' : ''}`}
            >
              <span
                aria-hidden="true"
                data-ledger-dot
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: s.color,
                  boxShadow: active
                    ? `0 0 6px ${s.color}, 0 0 12px ${s.color}`
                    : undefined,
                }}
              />
              <span className="text-veil opacity-70">
                <StatIcon stat={s.stat} className="h-4 w-4" />
              </span>
              <span className="flex-1 capitalize">{s.stat}</span>
              <span
                data-ledger-value={s.stat}
                className="font-display tabular-nums"
              >
                {blessed ? value : '—'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
