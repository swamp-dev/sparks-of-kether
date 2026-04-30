'use client';
import { useMemo, useState } from 'react';
import {
  arcana,
  pathByArcanum,
  sefirahByKey,
  soulDoorsForSign,
  zodiacSigns,
  type SefirahKey,
  type ZodiacSign,
  type ZodiacSignKey,
} from '@/data';
import { zodiacBonus } from '@/engine/zodiac-bonus';

/**
 * Hebrew transliteration form ('netzach' → 'Netzach') as used in
 * `design/soul-doors.md` § 6. The Sefirah's `englishName` is the
 * *translation* (Victory, Foundation, …); the doc and reader-facing
 * mechanics name them by transliteration. Cheap title-case is fine
 * here — the keys are single tokens with no internal capitalisation.
 */
const transliterated = (key: SefirahKey): string =>
  key.charAt(0).toUpperCase() + key.slice(1);

/**
 * 12-card picker for the player's astrological-sign class (Epic #212).
 * Replaces the six-card SoulAspectPicker with a fuller class taxonomy
 * grounded in the dignity table (`design/astrological-classes.md` § 3)
 * and the Soul Doors table (`design/soul-doors.md` § 3).
 *
 * Each card surfaces the full picture so a first-time picker chooses
 * with everything visible:
 *   - Glyph + name + Hebrew letter
 *   - Element + modality
 *   - Ruler (and the modern co-ruler for Scorpio / Pisces)
 *   - Per-stat dignity bonus deltas (rulership +1, exaltation +2,
 *     detriment −1, fall −2, modern co-rulers +1) — exactly what the
 *     engine's `zodiacBonus(sign)` returns
 *   - Soul Doors line (plural for 11 signs; singular Pisces footnote
 *     per § 6 of `design/soul-doors.md`)
 *
 * Flow:
 *   1. Player clicks a card → selection state updates locally.
 *   2. Player clicks Confirm → fires `onPick(signKey)`.
 * The picker does NOT mutate engine state. The orchestrator (T7 /
 * #236) feeds the chosen sign into `initializeGame` upstream.
 *
 * Single-player and tabletop modes pass an empty `taken` map.
 */

interface ZodiacSignPickerProps {
  /**
   * Map of already-taken sign keys → taker display name. Signs in
   * this map render disabled with the taker's name visible. Keys
   * are typed as `ZodiacSignKey` (not `string`) so a typo or stray
   * game-state field can't silently slip through.
   */
  readonly taken?: Partial<Readonly<Record<ZodiacSignKey, string>>>;
  readonly onPick: (sign: ZodiacSignKey) => void;
  readonly className?: string;
}

export function ZodiacSignPicker({
  taken,
  onPick,
  className,
}: ZodiacSignPickerProps): JSX.Element {
  const takenMap = taken ?? {};
  const [selected, setSelected] = useState<ZodiacSignKey | null>(null);

  const canConfirm = selected !== null && takenMap[selected] === undefined;

  const handleConfirm = (): void => {
    if (selected === null || takenMap[selected] !== undefined) return;
    onPick(selected);
  };

  return (
    <section
      data-zodiac-sign-picker
      aria-label="Choose your astrological sign class"
      className={className}
    >
      <header className="mb-4 text-center">
        <h2 className="font-display text-2xl tracking-widest">
          Choose your sign
        </h2>
        <p className="mt-1 text-sm opacity-70">
          Twelve classical signs. Each tilts your starting stats via planetary
          dignities and opens one or two Soul Doors on the Tree.
        </p>
      </header>
      <ul
        role="list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {zodiacSigns.map((sign) => {
          const takenBy = takenMap[sign.key];
          const disabled = takenBy !== undefined;
          const isSelected = selected === sign.key;
          return (
            <li key={sign.key}>
              <SignCard
                sign={sign}
                disabled={disabled}
                takenBy={takenBy}
                selected={isSelected}
                onSelect={() => {
                  if (!disabled) setSelected(sign.key);
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

interface SignCardProps {
  readonly sign: ZodiacSign;
  readonly disabled: boolean;
  readonly takenBy: string | undefined;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

/**
 * Each sign's accent borrows the colour of its ruling planet's
 * Sefirah — Aries (Mars → Gevurah, red), Taurus (Venus → Netzach,
 * green), etc. The five planetary co-rulers in the doubled signs
 * (Aries/Scorpio share Mars, Gemini/Virgo share Mercury,
 * Taurus/Libra share Venus, Sagittarius/Pisces share Jupiter,
 * Capricorn/Aquarius share Saturn) accept the visual repetition;
 * the glyph and name carry the per-sign identity.
 */
const RULER_TO_SEFIRAH: Readonly<Record<string, SefirahKey>> = {
  pluto: 'kether',
  neptune: 'chokmah',
  saturn: 'binah',
  jupiter: 'chesed',
  mars: 'gevurah',
  sun: 'tiferet',
  venus: 'netzach',
  mercury: 'hod',
  moon: 'yesod',
};

function SignCard({
  sign,
  disabled,
  takenBy,
  selected,
  onSelect,
}: SignCardProps): JSX.Element {
  const rulerSefirahKey = RULER_TO_SEFIRAH[sign.ruler];
  const rulerSefirahColor =
    rulerSefirahKey !== undefined
      ? sefirahByKey(rulerSefirahKey).color
      : undefined;

  // Bonus list keyed for stable rendering. We surface every non-zero
  // entry — including penalties — so the player sees the full math
  // before choosing (Pisces' −3 intellect is part of the deal, not a
  // surprise). `+`/`−` prefixes are explicit; we use U+2212 minus to
  // match the design-doc typography.
  const bonusEntries = useMemo(() => {
    const bonus = zodiacBonus(sign.key);
    return Object.entries(bonus)
      .filter(([, delta]) => delta !== 0 && delta !== undefined)
      .map(([stat, delta]) => {
        const d = delta as number;
        const sign_ = d > 0 ? '+' : '−';
        return { stat, label: `${sign_}${Math.abs(d)} ${stat}`, delta: d };
      });
  }, [sign.key]);

  // Soul Doors copy per `design/soul-doors.md` § 6. Plural form for
  // 11 signs; singular footnote for Pisces (Malkuth has no
  // Challenge, so The Moon's other endpoint isn't a Door).
  const soulDoorCopy = useMemo(() => {
    const doors = soulDoorsForSign(sign.key);
    const soulCard = arcana.find(
      (a) =>
        a.attribution.kind === 'sign' && a.attribution.value === sign.key,
    );
    if (soulCard === undefined) {
      throw new Error(
        `ZodiacSignPicker: no soul card for sign ${sign.key} — arcana.ts and zodiac-signs.ts are out of sync`,
      );
    }
    const path = pathByArcanum(soulCard.number);
    const doorNames = doors.map((k) => transliterated(k)).join(', ');
    if (sign.key === 'pisces') {
      return `Soul Door: ${doorNames} (via ${soulCard.name} / Path ${path.number} — Malkuth has no Challenge, so Pisces has one Door instead of two)`;
    }
    return `Soul Doors: ${doorNames} (via ${soulCard.name} / Path ${path.number})`;
  }, [sign.key]);

  // Idle: muted neutral border. Selected (and not disabled): saturated
  // ruler-Sefirah colour as inline border + a faint matching tint.
  // Disabled: strip the colour entirely so the muted state is
  // unmistakable.
  const inlineStyle =
    !disabled && selected && rulerSefirahColor !== undefined
      ? {
          borderColor: rulerSefirahColor,
          backgroundColor: `${rulerSefirahColor}1f`, // ~12% alpha
        }
      : undefined;

  const baseClass = disabled
    ? 'border-veil/30'
    : selected
      ? 'border-2'
      : 'border-veil/30 hover:border-veil/60';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-disabled={disabled}
      data-sign={sign.key}
      data-ruler={sign.ruler}
      data-disabled={disabled ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${baseClass} ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      }`}
      style={inlineStyle}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-lg tracking-widest">
            <span aria-hidden="true" className="mr-2 text-2xl">
              {sign.glyph}
            </span>
            {sign.name}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-widest opacity-60">
            {sign.element} · {sign.modality}
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-70" data-rulers>
          <span>Ruler: {sign.ruler}</span>
          {sign.coRuler !== undefined ? (
            <>
              <br />
              <span>Co-ruler: {sign.coRuler}</span>
            </>
          ) : null}
        </p>
      </div>

      <ul
        data-bonus-grid
        className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm"
      >
        {bonusEntries.length === 0 ? (
          <li className="col-span-2 text-xs italic opacity-60">
            No stat tilts (balanced sign)
          </li>
        ) : null}
        {bonusEntries.map((b) => (
          <li
            key={b.stat}
            className={`tabular-nums ${b.delta > 0 ? 'opacity-90' : 'opacity-70'}`}
          >
            {b.label}
          </li>
        ))}
      </ul>

      <p
        data-soul-doors
        className="mt-3 text-xs italic opacity-80"
      >
        {soulDoorCopy}
      </p>

      {takenBy !== undefined ? (
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
