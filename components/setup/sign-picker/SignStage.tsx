'use client';
import { useMemo } from 'react';
import {
  arcana,
  letterByKey,
  pathByArcanum,
  sefirahByKey,
  soulDoorsForSign,
  type Planet,
  type SefirahKey,
  type ZodiacSign,
} from '@/data';
import { ArcanumCard } from '@/components/cards/ArcanumCard';
import { zodiacBonus } from '@/engine/zodiac-bonus';
import { Constellation } from './Constellation';

/**
 * SignStage — one zodiac sign rendered as a stage. The carousel
 * (`ZodiacSignPicker`) renders three of these at once on desktop —
 * `prev` (dim wing-left), `current` (the focused theatre stage), and
 * `next` (dim wing-right). On mobile, only the `current` is shown.
 *
 * The `current` variant unfolds the full theatre — constellation
 * background art, breathing Tiferet-gold glyph halo, ruler glyph
 * orbiting at low opacity, element + modality chips, weighted
 * stat-tilt tokens, and a row of Soul Doors with mini ArcanumCard
 * previews. The `prev` / `next` wings render as dim cards with the
 * glyph + name only — they signal "this is what's next" without
 * competing with the focused stage.
 *
 * Roles (set by the parent ZodiacSignPicker, not here): the picker
 * uses `role="radio"` on each stage button; SignStage itself just
 * forwards `ariaChecked`, `tabIndex`, etc. via its props.
 */

const TIFERET = '#ffd700';

// Planet glyphs (Unicode astrological symbols). Used for the ruler
// orbit decoration on the focused stage.
const PLANET_GLYPHS: Readonly<Record<Planet, string>> = {
  mercury: '☿',
  moon: '☽',
  venus: '♀',
  jupiter: '♃',
  mars: '♂',
  sun: '☉',
  saturn: '♄',
  pluto: '♇',
  neptune: '♆',
};

// Map ruler (planet) → Sefirah glow token. Lets the orbit pick up the
// correct per-Sefirah colour from the project's design system rather
// than introducing a new colour scale.
const PLANET_TO_SEFIRAH: Readonly<Record<Planet, SefirahKey>> = {
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

interface SignStageProps {
  readonly sign: ZodiacSign;
  /** `current` = focused theatre; `prev` / `next` = dim wings. */
  readonly stage: 'prev' | 'current' | 'next';
  readonly ariaChecked: boolean;
  readonly tabIndex: number;
  readonly disabled: boolean;
  readonly takenBy: string | undefined;
  /** Click handler — the parent treats this as "focus this stage". */
  readonly onSelect: () => void;
}

export function SignStage({
  sign,
  stage,
  ariaChecked,
  tabIndex,
  disabled,
  takenBy,
  onSelect,
}: SignStageProps): JSX.Element {
  const isCurrent = stage === 'current';
  const soulCard = useMemo(
    () =>
      arcana.find(
        (a) => a.attribution.kind === 'sign' && a.attribution.value === sign.key,
      ),
    [sign.key],
  );
  if (soulCard === undefined) {
    throw new Error(
      `SignStage: no soul card for ${sign.key} — arcana.ts and zodiac-signs.ts are out of sync`,
    );
  }
  const path = pathByArcanum(soulCard.number);
  const letter = letterByKey(soulCard.letterKey);
  const doors = soulDoorsForSign(sign.key);
  const bonusEntries = useMemo(() => {
    const bonus = zodiacBonus(sign.key);
    // Sort positive deltas before negative ones for visual stability
    // across signs — every stage's weights row reads as "wins on the
    // left, costs on the right" rather than insertion-order chaos.
    // The type predicate narrows away `undefined` so the downstream
    // map call deals in `[string, number]` without a `as number` cast.
    return Object.entries(bonus)
      .filter(
        (entry): entry is [string, number] =>
          entry[1] !== 0 && entry[1] !== undefined,
      )
      .map(([stat, delta]) => ({ stat, delta }))
      .sort((a, b) => b.delta - a.delta);
  }, [sign.key]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === ' ') {
      // WAI-ARIA radiogroup: Space "selects this radio". The picker
      // arrow-keys move focus between options, and the explicit
      // Confirm CTA commits — this matches the browser's native
      // radio-group behaviour and the APG authoring guide.
      // (`event.key === 'Spacebar'` was the DOM Level 2 form;
      // every browser in our target range emits `' '` so we don't
      // carry the legacy branch.)
      // Enter is intentionally NOT bound here so it bubbles to the
      // form / page and is handled by the visible Confirm CTA when
      // the player has tabbed to it (the more-discoverable path).
      event.preventDefault();
      if (!disabled) onSelect();
    }
  };

  return (
    <div
      data-sign={sign.key}
      data-stage={stage}
      data-ruler={sign.ruler}
      data-disabled={disabled ? 'true' : 'false'}
      role="radio"
      aria-checked={ariaChecked}
      aria-disabled={disabled || undefined}
      aria-label={`${sign.name}: ${sign.element}, ${sign.modality}, ruler ${sign.ruler}`}
      tabIndex={tabIndex}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={handleKeyDown}
      className={stageClass(stage, disabled)}
    >
      {isCurrent ? (
        <CurrentStage
          sign={sign}
          letterText={letter.glyph}
          letterName={letter.name}
          pathNumber={path.number}
          soulCardNumber={soulCard.number}
          soulCardName={soulCard.name}
          doors={doors}
          bonusEntries={bonusEntries}
          isPisces={sign.key === 'pisces'}
        />
      ) : (
        <WingStage sign={sign} />
      )}

      {takenBy !== undefined ? (
        <p
          data-taken-by
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-veil/10 px-2 py-1 text-xs uppercase tracking-widest"
        >
          Taken by {takenBy}
        </p>
      ) : null}
    </div>
  );
}

function stageClass(
  stage: SignStageProps['stage'],
  disabled: boolean,
): string {
  // Theatre framing: the current stage takes the full center column;
  // wings are smaller, dimmer, and pushed to the sides. Disabled
  // stages drop opacity further. The flex/grid layout itself is the
  // ZodiacSignPicker's responsibility — SignStage just owns its own
  // self-presentation.
  const base =
    'group relative flex flex-col items-center overflow-hidden rounded-xl border border-veil/15 transition-all duration-500 ease-flow';
  const disabledClass = disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer';
  if (stage === 'current') {
    return `${base} ${disabledClass} h-full w-full bg-veil/5 px-6 py-8 sm:px-10 sm:py-10`;
  }
  // Wings: shorter, dimmer, lower contrast. They serve as "next up"
  // signals, not as primary surfaces. Keep them clickable so a player
  // can jump-cycle by mouse.
  return `${base} ${disabledClass} hidden sm:flex sm:h-full sm:w-full sm:items-center sm:justify-center sm:px-4 sm:py-6 sm:opacity-60 hover:opacity-90`;
}

interface CurrentStageProps {
  readonly sign: ZodiacSign;
  readonly letterText: string;
  readonly letterName: string;
  readonly pathNumber: number;
  readonly soulCardNumber: number;
  readonly soulCardName: string;
  readonly doors: readonly SefirahKey[];
  readonly bonusEntries: readonly { readonly stat: string; readonly delta: number }[];
  readonly isPisces: boolean;
}

function CurrentStage({
  sign,
  letterText,
  letterName,
  pathNumber,
  soulCardNumber,
  soulCardName,
  doors,
  bonusEntries,
  isPisces,
}: CurrentStageProps): JSX.Element {
  return (
    <>
      {/* Constellation art — sits BEHIND the foreground stage at low
          alpha, contained inside the upper portion of the stage so it
          frames the glyph rather than crossing through the chip /
          weights / soul-door rows. The text-veil colour gives the
          stars a soft warm-white against the void substrate. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto flex h-72 w-72 max-w-full items-center justify-center text-veil sm:h-96 sm:w-96"
        aria-hidden="true"
      >
        <Constellation
          sign={sign.key}
          className="h-full w-full opacity-70"
        />
      </div>

      {/* Foreground stage content. Stack: ruler orbit + glyph at top,
          chips + Hebrew letter mid, weights + soul doors below. */}
      <div className="relative z-10 flex w-full flex-col items-center gap-5">
        <GlyphWithRuler sign={sign} />

        <div className="flex flex-col items-center gap-1">
          <h3 className="font-display text-3xl tracking-widest text-veil">
            {sign.name}
          </h3>
          <p className="text-sm uppercase tracking-[0.25em] opacity-60">
            Soul card: {soulCardName} · Path {pathNumber}
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm uppercase tracking-widest">
          <span
            data-chip="element"
            data-element={sign.element}
            className={chipClass('element', sign.element)}
          >
            {sign.element}
          </span>
          <span
            data-chip="modality"
            data-modality={sign.modality}
            className={chipClass('modality', sign.modality)}
          >
            {sign.modality}
          </span>
        </div>

        <p
          data-hebrew-letter
          lang="he"
          className="font-hebrew text-3xl text-veil"
          style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
          aria-label={`Hebrew letter ${letterName}`}
        >
          {letterText}
        </p>

        <StatWeights bonusEntries={bonusEntries} />

        <SoulDoors
          doors={doors}
          soulCardNumber={soulCardNumber}
          isPisces={isPisces}
        />
      </div>
    </>
  );
}

function GlyphWithRuler({ sign }: { readonly sign: ZodiacSign }): JSX.Element {
  const rulerSefirah = PLANET_TO_SEFIRAH[sign.ruler];
  const coRulerSefirah =
    sign.coRuler !== undefined ? PLANET_TO_SEFIRAH[sign.coRuler] : undefined;
  return (
    <div className="relative h-32 w-32 sm:h-40 sm:w-40">
      {/* Halo + glyph. Tiferet gold + breath halo per the brief. */}
      <div
        className="absolute inset-1/4 flex items-center justify-center rounded-full shadow-glow-tiferet motion-safe:animate-breath"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 flex items-center justify-center font-display text-6xl sm:text-7xl"
        style={{ color: TIFERET }}
        aria-hidden="true"
      >
        {sign.glyph}
      </div>

      {/* Ruler orbit — a small disc carrying the planet glyph,
          parked on the orbit ring at angle 0 by default. The orbit
          ring rotates under motion-safe so the glyph appears to swing
          around the sign at low opacity. */}
      <RulerOrbit
        planet={sign.ruler}
        sefirah={rulerSefirah}
        offsetDegrees={0}
        size="primary"
      />
      {sign.coRuler !== undefined && coRulerSefirah !== undefined ? (
        <RulerOrbit
          planet={sign.coRuler}
          sefirah={coRulerSefirah}
          // Park the co-ruler 180° opposite so the two orbits read as
          // a balanced pair instead of overlapping at the same point.
          offsetDegrees={180}
          size="secondary"
        />
      ) : null}
    </div>
  );
}

interface RulerOrbitProps {
  readonly planet: Planet;
  readonly sefirah: SefirahKey;
  /** Initial parking angle (degrees). Used to spread classical + co-ruler. */
  readonly offsetDegrees: number;
  readonly size: 'primary' | 'secondary';
}

function RulerOrbit({
  planet,
  sefirah,
  offsetDegrees,
  size,
}: RulerOrbitProps): JSX.Element {
  // Three nested elements:
  //   1. `[data-ruler-orbit]` — the parking layer; carries the
  //      one-time `rotate(offset)` so the co-ruler orbit starts at a
  //      different clock angle than the classical ruler. Static.
  //   2. inner spin layer — applies `animate-spin` (the Tailwind
  //      keyframe rotates `transform: rotate(0..360deg)` once per
  //      cycle). Lives below the parking layer so it composes
  //      `parkingRotate * spinRotate` rather than competing on one
  //      `transform` rule (the keyframe would otherwise clobber the
  //      inline `transform`).
  //   3. disc — sits at the top of the ring (12 o'clock) and carries
  //      the planet glyph. Centered on the ring's top edge by
  //      `left-1/2 -top-2 -translate-x-1/2`.
  const sefirahColor = sefirahByKey(sefirah).color;
  const ringSizePct = size === 'primary' ? 100 : 88;
  return (
    <div
      data-ruler-orbit={planet}
      className="pointer-events-none absolute inset-0"
      style={{
        // Parking rotate: applied once, never animated. Keeps the
        // co-ruler 180° offset stable under the spinning child.
        transform: `rotate(${offsetDegrees}deg)`,
        width: `${ringSizePct}%`,
        height: `${ringSizePct}%`,
        margin: 'auto',
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 motion-safe:animate-[spin_18s_linear_infinite]">
        <div
          className="absolute left-1/2 -top-2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full text-xs"
          style={{
            // Use the Sefirah's own colour rather than Tiferet — a
            // Mars ruler glows red (Gevurah), Venus green (Netzach),
            // etc. so the orbit reads as a planetary signature.
            color: sefirahColor,
            opacity: size === 'primary' ? 0.7 : 0.55,
            // No box-shadow on wings — keep the orbit subtle, not
            // competing with the glyph halo.
            background: `${sefirahColor}1f`,
          }}
        >
          {PLANET_GLYPHS[planet]}
        </div>
      </div>
    </div>
  );
}

function chipClass(_kind: string, value: string): string {
  // Element chip colour-coding: fire = gevurah-red, water = chesed-blue,
  // air = veil-light, earth = malkuth-amber. Modality chips use a
  // common neutral chip so element is the dominant axis.
  const COLOURS: Record<string, string> = {
    fire: 'border-gevurah/60 text-gevurah',
    water: 'border-chesed/60 text-chesed',
    air: 'border-veil/60 text-veil',
    earth: 'border-malkuth/60 text-malkuth',
    cardinal: 'border-tiferet/50 text-tiferet',
    fixed: 'border-binah/50 text-veil/80',
    mutable: 'border-yesod/50 text-yesod',
  };
  const accent = COLOURS[value] ?? 'border-veil/40 text-veil/70';
  return `inline-flex items-center rounded-full border px-3 py-1 ${accent}`;
}

interface StatWeightsProps {
  readonly bonusEntries: readonly { readonly stat: string; readonly delta: number }[];
}

function StatWeights({ bonusEntries }: StatWeightsProps): JSX.Element {
  // #410: stack to one column on narrower widths (mobile center stage
  // ~375px) and split to two columns at sm+ where body text bumped to
  // `text-base` would otherwise crowd. Keeps the wins-left / costs-
  // right reading order on desktop, and a single readable column when
  // there isn't room for it.
  return (
    <ul
      data-stat-weights
      className="grid w-full max-w-md grid-cols-1 gap-x-4 gap-y-2 text-base sm:grid-cols-2"
    >
      {bonusEntries.map(({ stat, delta }) => (
        <li
          key={stat}
          data-stat-weight={stat}
          data-magnitude={delta}
          data-direction={delta > 0 ? 'positive' : 'negative'}
          className="flex items-center justify-between gap-3 rounded border border-veil/15 px-3 py-2 tabular-nums"
        >
          <span className="text-veil/80">{stat}</span>
          <span className="flex items-center gap-1">
            {Array.from({ length: Math.abs(delta) }).map((_, i) => (
              <span
                key={i}
                data-token="filled"
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  delta > 0 ? 'bg-tiferet' : 'bg-gevurah/80'
                }`}
              />
            ))}
            <span className="ml-1 text-base text-veil/60">
              {delta > 0 ? '+' : '−'}
              {Math.abs(delta)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface SoulDoorsProps {
  readonly doors: readonly SefirahKey[];
  readonly soulCardNumber: number;
  readonly isPisces: boolean;
}

function SoulDoors({
  doors,
  soulCardNumber,
  isPisces,
}: SoulDoorsProps): JSX.Element {
  // The soul card is sign-level (one Major Arcana per sign per the
  // locked attribution in `data/arcana.ts`), so it renders ONCE here.
  // The doors are Sefirah-level (the 1–2 endpoints of the soul card's
  // path that bear a check Challenge) and render as a row of chips
  // below the card. Earlier versions duplicated the card per door,
  // which read as "the same card twice" on 2-door signs (#382).
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        data-soul-card
        data-arcanum={soulCardNumber}
        className="block"
      >
        <ArcanumCard
          number={soulCardNumber}
          className="h-40 w-24 sm:h-44 sm:w-[7rem]"
        />
      </span>
      <p className="text-sm uppercase tracking-[0.25em] opacity-60">
        {doors.length === 1 ? 'Soul Door' : 'Soul Doors'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {doors.map((door) => (
          <SoulDoorChip key={door} door={door} />
        ))}
      </div>
      {isPisces ? (
        <p className="mt-1 max-w-xs text-center text-sm italic opacity-70">
          Malkuth has no Challenge — so Pisces has one Door instead of
          two (path 29 ends at Malkuth).
        </p>
      ) : null}
    </div>
  );
}

interface SoulDoorChipProps {
  readonly door: SefirahKey;
}

function SoulDoorChip({ door }: SoulDoorChipProps): JSX.Element {
  // Option B render: each Door is its own Sefirah chip carrying the
  // Hebrew glyph + transliterated name, with a Sefirah-tinted border
  // and accent dot per `data/sefirot.ts`. This makes Chokmah and
  // Tiferet (or any 2-door pairing) visually distinct without leaning
  // on the soul card to carry the difference (it is identical for both
  // — same sign).
  //
  // Glyph + label both render in `text-veil` so a darker Sefirah
  // (Binah's `#1a1a1a` is the canonical example) stays legible on the
  // dark `bg-ground/40` substrate. The Sefirah's signature colour is
  // carried by the border and the small accent dot, matching how the
  // encounter `sefirah-frame-tokens` carry per-Sefirah identity via
  // border + glow rather than text fill.
  const sefirah = sefirahByKey(door);
  return (
    <span
      data-soul-door={door}
      role="img"
      className="inline-flex items-center gap-2 rounded-full border bg-ground/40 px-3 py-1 text-veil"
      style={{ borderColor: `${sefirah.color}99` }}
      aria-label={`Soul Door: ${transliterated(door)}`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: sefirah.color }}
      />
      {/* #410 typography: bumped chip text by one step (text-xs →
          text-sm). Hebrew sits at text-lg per the +1 step rule in
          docs/typography.md so the two read as equivalent visual
          weight despite Hebrew's shorter glyph geometry. */}
      <span
        aria-hidden="true"
        lang="he"
        className="font-hebrew text-lg"
        style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
      >
        {sefirah.hebrewName}
      </span>
      <span aria-hidden="true" className="font-display text-sm uppercase tracking-widest">
        {transliterated(door)}
      </span>
    </span>
  );
}

/**
 * Hebrew transliteration form ('netzach' → 'Netzach') as used in
 * `design/soul-doors.md` § 6.
 */
function transliterated(key: SefirahKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function WingStage({ sign }: { readonly sign: ZodiacSign }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        aria-hidden="true"
        className="font-display text-5xl text-veil/70"
      >
        {sign.glyph}
      </span>
      <span className="font-display text-base tracking-widest text-veil/70">
        {sign.name}
      </span>
      <span className="text-[10px] uppercase tracking-[0.3em] opacity-50">
        {sign.element} · {sign.modality}
      </span>
    </div>
  );
}
