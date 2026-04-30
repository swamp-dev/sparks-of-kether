'use client';
import { arcanumByNumber } from '@/data';
import { HAND_CAP } from '@/engine/setup';

/**
 * #291 — DiscardPrompt: end-of-turn reconciliation UI for a player
 * who Meditated over `HAND_CAP`. Renders the active player's hand as
 * a row of "Discard this" buttons; each click invokes `onDiscard`
 * which fires the engine's `discard` event. The component is purely
 * presentational — `pendingDiscard.count` and the remaining hand are
 * supplied by the caller (`PlayScreen`), and the prompt unmounts when
 * the caller stops rendering it (i.e. when count reaches 0).
 *
 * Design choices (settled in #291):
 *   - **Player picks** which cards to shed (most respectful — no
 *     forced random pick).
 *   - **Down to `HAND_CAP`**, not `STARTING_HAND_SIZE`. The cap is
 *     the cap; players who exceed it by Meditating come back to it.
 *   - **End-of-turn**, after all other turn-end effects. Lets the
 *     player burn cards mid-turn voluntarily if they want to stay
 *     under cap.
 *
 * No countdown / reveal animation here — the prompt is functional
 * and unblocks the auto-advance to the next turn. Polish (per-card
 * arcanum art, Yesod-recovery hint) is deferred to a follow-up.
 */
export interface DiscardPromptProps {
  /** Hand cards (Major Arcana numbers 0–21). */
  readonly hand: readonly number[];
  /** Number of cards still owed; the prompt's heading reads "Shed N". */
  readonly count: number;
  /** Fired with the chosen Arcanum number. */
  readonly onDiscard: (arcanum: number) => void;
  readonly className?: string;
}

export function DiscardPrompt({
  hand,
  count,
  onDiscard,
  className,
}: DiscardPromptProps): JSX.Element {
  return (
    <div
      data-discard-prompt
      role="dialog"
      aria-label="Discard prompt"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-veil/30 bg-ground/95 px-4 py-4 text-veil shadow-lg ${className ?? ''}`}
    >
      <h2
        className="font-display text-base tracking-widest"
        aria-live="polite"
      >
        Hand over cap — shed {count} {count === 1 ? 'card' : 'cards'}
      </h2>
      <p className="mt-1 text-xs opacity-70">
        Meditation drew you over the {HAND_CAP}-card cap. Pick a card to send
        to the discard pile.
      </p>
      <ul
        data-discard-prompt-list
        className="mt-3 flex flex-wrap gap-2"
      >
        {hand.map((arcanum, idx) => {
          const meta = arcanumByNumber(arcanum);
          return (
            <li key={`${arcanum}-${idx}`}>
              <button
                type="button"
                data-action="discard"
                data-arcanum={arcanum}
                onClick={() => onDiscard(arcanum)}
                className="min-h-11 rounded border border-veil/40 px-3 py-2 text-xs hover:border-illumination focus-visible:border-illumination"
              >
                Discard {meta.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
