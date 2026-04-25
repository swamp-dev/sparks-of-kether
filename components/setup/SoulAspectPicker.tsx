'use client';
import { useState } from 'react';
import { soulAspects } from '@/data';
import type { SoulAspectKey } from '@/data';
import { StatIcon } from '@/components/icons/StatIcon';

/**
 * Six-card picker for the player's Soul Aspect (class). One per
 * "personality" Sefirah (Chesed, Gevurah, Tiferet, Netzach, Hod,
 * Yesod). Aspects already taken by other players in the same room
 * are disabled with the taker's name visible.
 *
 * Flow:
 *   1. Player clicks a card → selection state updates locally.
 *   2. Player clicks Confirm → fires `onPick(aspectKey)`.
 * The picker does NOT mutate engine state. The orchestrator applies
 * the aspect (and its +2 stat bonus) upstream — which makes the
 * race-condition handling for multiplayer (Phase 5) the orchestrator's
 * concern, not the picker's.
 *
 * Single-player and tabletop modes pass an empty `taken` map.
 */

interface SoulAspectPickerProps {
  /**
   * Map of already-taken aspect keys → taker display name. Aspects
   * in this map render disabled with the taker's name visible.
   * Keys are typed as `SoulAspectKey` (not `string`) so a typo or
   * a stray game-state field can't silently slip through.
   */
  readonly taken?: Partial<Readonly<Record<SoulAspectKey, string>>>;
  readonly onPick: (aspect: SoulAspectKey) => void;
  readonly className?: string;
}

export function SoulAspectPicker({
  taken,
  onPick,
  className,
}: SoulAspectPickerProps): JSX.Element {
  const takenMap = taken ?? {};
  const [selected, setSelected] = useState<SoulAspectKey | null>(null);

  const canConfirm = selected !== null && takenMap[selected] === undefined;

  const handleConfirm = (): void => {
    if (selected === null || takenMap[selected] !== undefined) return;
    onPick(selected);
  };

  return (
    <section
      data-soul-aspect-picker
      aria-label="Choose your Soul Aspect"
      className={className}
    >
      <header className="mb-4 text-center">
        <h2 className="font-display text-2xl tracking-widest">Choose your Soul Aspect</h2>
        <p className="mt-1 text-sm opacity-70">
          The class your spirit takes for this ascent. One per player; first to
          claim it holds it.
        </p>
      </header>
      <ul
        role="list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {soulAspects.map((aspect) => {
          const takenBy = takenMap[aspect.key];
          const disabled = takenBy !== undefined;
          const isSelected = selected === aspect.key;
          return (
            <li key={aspect.key}>
              <AspectCard
                aspect={aspect}
                disabled={disabled}
                takenBy={takenBy}
                selected={isSelected}
                onSelect={() => {
                  if (!disabled) setSelected(aspect.key);
                }}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          data-action="confirm"
          className="rounded bg-illumination px-6 py-2 font-display tracking-widest text-ground disabled:cursor-not-allowed disabled:opacity-30"
        >
          Confirm
        </button>
      </div>
    </section>
  );
}

interface AspectCardProps {
  readonly aspect: typeof soulAspects[number];
  readonly disabled: boolean;
  readonly takenBy: string | undefined;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function AspectCard({
  aspect,
  disabled,
  takenBy,
  selected,
  onSelect,
}: AspectCardProps): JSX.Element {
  return (
    // aria-disabled (not `disabled`) keeps taken cards focusable so
    // AT users can read the "Taken by X" text. The `onSelect` body
    // already guards against disabled selection on click.
    <button
      type="button"
      onClick={onSelect}
      aria-disabled={disabled}
      data-aspect={aspect.key}
      data-disabled={disabled ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        selected
          ? 'border-illumination bg-illumination/10'
          : 'border-veil/30 hover:border-veil/60'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg tracking-widest">{aspect.title}</h3>
        <span className="flex items-center gap-1 text-xs uppercase tracking-widest opacity-70">
          <StatIcon stat={aspect.bonusStat} className="h-4 w-4" />
          <span data-bonus-stat>+2 {aspect.bonusStat}</span>
        </span>
      </div>
      <p className="mt-2 italic opacity-80">“{aspect.flavor}”</p>
      <p className="mt-2 text-sm">
        <span className="font-display tracking-widest">{aspect.abilityName}</span>
        : {aspect.abilityDescription}
      </p>
      <p className="mt-2 text-xs opacity-60">
        <span className="uppercase tracking-widest">Weakness</span>
        : {aspect.weaknessDescription}
      </p>
      {takenBy ? (
        <p
          data-taken-by
          className="mt-3 rounded bg-veil/10 px-2 py-1 text-xs uppercase tracking-widest"
        >
          Taken by {takenBy}
        </p>
      ) : null}
    </button>
  );
}
