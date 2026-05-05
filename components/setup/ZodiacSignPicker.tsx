'use client';
import { useCallback, useMemo, useState } from 'react';
import { zodiacSigns, type ZodiacSign, type ZodiacSignKey } from '@/data';
import { SignStage } from './sign-picker/SignStage';

/**
 * Safe `zodiacSigns[i]` accessor. The picker's index math only ever
 * lands on a valid in-range index (we mod by `zodiacSigns.length` and
 * the off-stage list is filtered out of the same array), but TS's
 * `noUncheckedIndexedAccess` widens the result to `T | undefined`. A
 * typed accessor narrows it once at the boundary so the body of the
 * picker can deal in plain `ZodiacSign` references.
 */
function signAt(index: number): ZodiacSign {
  const sign = zodiacSigns[index];
  if (sign === undefined) {
    throw new Error(
      `ZodiacSignPicker: out-of-range index ${index} (valid: 0..${zodiacSigns.length - 1})`,
    );
  }
  return sign;
}

/**
 * Carousel-based 12-sign picker (#314).
 *
 * The picker reads as **character creation theatre**: a horizontal
 * carousel of three visible stages on desktop (prev / current / next),
 * one full-screen stage on mobile, with the focused sign rendering
 * full theatre — constellation art, breathing Tiferet-gold glyph,
 * orbiting ruler glyph, element/modality chips, weighted stat tilts,
 * and Soul Doors as Major Arcana mini-card previews.
 *
 * **Data flow** (mostly unchanged from #212/#236):
 *   1. The picker holds the focused-sign index in local state. Aries
 *      is the default focused sign on first mount.
 *   2. Player keyboards or clicks to cycle the carousel; the focused
 *      stage is the one a player will commit to via Confirm.
 *   3. Player clicks Confirm → fires `onPick(signKey)`.
 *   4. The orchestrator (T7 / #236) feeds the chosen sign into
 *      `initializeGame` upstream — same contract as v1 (#212).
 *
 * **Keyboard model**:
 *   - ArrowRight / ArrowLeft cycle forward / backward, skipping over
 *     taken signs (the cycle scans until it finds an available one
 *     or wraps back to the original index = nothing-to-pick).
 *   - Home / End jump to the first / last available sign.
 *   - Space on the current stage selects (no commit). Enter is
 *     unbound on the stage so it doesn't accidentally short-circuit
 *     the radiogroup contract — commit happens only on the visible
 *     "Confirm <Sign>" button below the stage (where Enter fires
 *     natively because the button is a real `<button>`).
 *
 * **Accessibility**:
 *   - The carousel is a `[role="radiogroup"]`; each sign is a
 *     `[role="radio"]` with `aria-checked` mirroring the focus.
 *   - Taken signs render `aria-disabled="true"` and the cycle skips
 *     them, so a screen-reader user can't land on an unconfirmable
 *     stage.
 *   - Constellation SVGs are `aria-hidden="true"` (decorative).
 *   - Reduce-motion: the breath / orbit animations are gated by
 *     `motion-safe:` Tailwind variants — reduced-motion users see
 *     the static glyph + halo with no orbit rotation. No JS branch.
 *
 * **Multiplayer hand-off (#265)**:
 *   - `taken` map: a player can never confirm a sign their party
 *     mate already picked. The picker is single-machine on its own —
 *     #265 wires the live presence + lock at the lobby layer.
 *
 * **Pantheon seam (#293)**:
 *   - Accepts a `pantheon` prop, default `'classical'`. Today only
 *     `'classical'` is supported; the prop is the seam #293 will
 *     extend with alternate symbol packs.
 */

export type Pantheon = 'classical';

interface ZodiacSignPickerProps {
  /**
   * Map of already-taken sign keys → taker display name. Signs in
   * this map render disabled with the taker's name visible.
   */
  readonly taken?: Partial<Readonly<Record<ZodiacSignKey, string>>>;
  readonly onPick: (sign: ZodiacSignKey) => void;
  readonly className?: string;
  /**
   * Symbol pack. #293 will add Hindu / Christian / etc; today only
   * `'classical'` is supported. The prop is accepted but otherwise a
   * no-op so the seam is widely visible without a TS breakage in the
   * future PR.
   */
  readonly pantheon?: Pantheon;
}

export function ZodiacSignPicker({
  taken,
  onPick,
  className,
  pantheon: _pantheon = 'classical',
}: ZodiacSignPickerProps): JSX.Element {
  // Stabilise the taken map under `taken === undefined` so the
  // useCallback below doesn't churn on every render. The reference is
  // only "new" when the caller's `taken` reference changes — exactly
  // when we want the cycle / jump helpers to recompute their skip
  // table.
  const takenMap = useMemo(() => taken ?? {}, [taken]);
  // Default focus = the first AVAILABLE sign in zodiacal order. With
  // no `taken` prop that's aries (index 0) — the original behaviour
  // and what every solo / first-player flow already gets. With aries
  // taken (e.g. P2 entering after P1 already picked aries, #370),
  // the picker anchors on taurus instead so the player never opens
  // on a sign they cannot confirm. The walk uses the same skip-table
  // the cycle helper does. If every sign were taken (12-player
  // hypothetical, not reachable with `MAX_PLAYERS_PER_ROOM = 4` per
  // `lib/rooms.ts`), we fall back to index 0; the Confirm CTA renders
  // disabled in that pathological case rather than blowing up.
  //
  // Lazy `useState` initialiser rather than a derived `useMemo` —
  // the index is the *initial* state of the picker, not a reactive
  // value. If `taken` changes after mount (a sign gets grabbed
  // mid-browse), `focusedDisabled` already reads live from
  // `takenMap[focusedSign.key]` so the Confirm CTA disables and the
  // player can cycle off — there's no need (and no UX precedent in
  // this picker) for an auto-jump.
  const [focusedIndex, setFocusedIndex] = useState<number>(() => {
    const initial = taken ?? {};
    const found = zodiacSigns.findIndex(
      (s) => initial[s.key] === undefined,
    );
    return found === -1 ? 0 : found;
  });

  const focusedSign = signAt(focusedIndex);
  const focusedDisabled = takenMap[focusedSign.key] !== undefined;

  /**
   * Cycle focus forward (`+1`) or backward (`-1`), skipping over
   * taken signs. If every sign is taken, the focus stays put — the
   * picker remains keyboard-stable but no Confirm is offered.
   */
  const cycle = useCallback(
    (direction: 1 | -1): void => {
      const total = zodiacSigns.length;
      let next = (focusedIndex + direction + total) % total;
      let attempts = 0;
      while (
        takenMap[signAt(next).key] !== undefined &&
        attempts < total
      ) {
        next = (next + direction + total) % total;
        attempts += 1;
      }
      setFocusedIndex(next);
    },
    [focusedIndex, takenMap],
  );

  const jumpTo = useCallback(
    (target: 'first' | 'last'): void => {
      const candidates =
        target === 'first'
          ? zodiacSigns.map((_, i) => i)
          : zodiacSigns.map((_, i) => zodiacSigns.length - 1 - i);
      const found = candidates.find(
        (i) => takenMap[signAt(i).key] === undefined,
      );
      if (found !== undefined) setFocusedIndex(found);
    },
    [takenMap],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        cycle(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        cycle(-1);
        break;
      case 'Home':
        event.preventDefault();
        jumpTo('first');
        break;
      case 'End':
        event.preventDefault();
        jumpTo('last');
        break;
      default:
        break;
    }
  };

  const handleConfirm = (): void => {
    if (focusedDisabled) return;
    onPick(focusedSign.key);
  };

  const selectStage = (index: number): void => {
    if (takenMap[signAt(index).key] !== undefined) return;
    setFocusedIndex(index);
  };

  // Indices of the prev / next visible wings. They wrap, so the
  // carousel reads as a ring — there's never a "dead end" at the
  // edges.
  const total = zodiacSigns.length;
  const prevIndex = (focusedIndex - 1 + total) % total;
  const nextIndex = (focusedIndex + 1) % total;

  // Off-stage signs (everything that's not prev / current / next) are
  // still rendered as hidden DOM nodes — that keeps `[data-sign]`
  // selectable for the e2e specs and integration tests, and lets a
  // multiplayer-presence layer (#265) hook into them without re-shaping
  // the DOM. Visually they sit in a zero-size, aria-hidden wrapper.
  const offStageIndices = zodiacSigns
    .map((_, i) => i)
    .filter((i) => i !== focusedIndex && i !== prevIndex && i !== nextIndex);

  return (
    <section
      data-zodiac-sign-picker
      aria-label="Choose your astrological sign class"
      className={className}
    >
      <header className="mb-6 text-center">
        <h2 className="font-display text-3xl tracking-widest text-veil">
          Choose your sign
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-70">
          Twelve archetypes. Each tilts your starting stats via planetary
          dignities and opens one or two Soul Doors on the Tree.
        </p>
      </header>

      {/*
        Screen-reader announcement region. The radiogroup contract
        normally moves DOM focus on arrow-key (native <input
        type="radio">), which triggers re-announcement of the newly-
        focused sign. Our carousel keeps focus on a fixed `tabIndex={0}`
        wrapper while the inner content swaps — without this aria-live
        region, NVDA/JAWS users wouldn't hear the sign change. The
        region is sr-only so sighted users see no visual artefact;
        polite politeness so it doesn't interrupt mid-utterance.
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-sign-picker-announce
      >
        {focusedSign.name}
      </div>

      <div
        role="radiogroup"
        aria-label="Zodiac sign carousel"
        onKeyDown={handleKeyDown}
        className="relative grid w-full items-stretch gap-3 sm:grid-cols-[1fr_2fr_1fr] sm:gap-4"
      >
        {/* Prev arrow — desktop chrome left of the carousel. Hidden on
            mobile where on-screen + swipe is the input. */}
        <button
          type="button"
          aria-label="Previous sign"
          data-direction="prev"
          onClick={() => cycle(-1)}
          className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-veil/30 bg-ground/70 p-2 text-veil/70 transition-opacity duration-200 ease-flow hover:opacity-100 sm:block sm:opacity-70"
        >
          <span aria-hidden="true">◀</span>
        </button>

        {/* Wing: prev */}
        <SignStage
          key={`prev-${signAt(prevIndex).key}`}
          sign={signAt(prevIndex)}
          stage="prev"
          ariaChecked={false}
          tabIndex={-1}
          disabled={takenMap[signAt(prevIndex).key] !== undefined}
          takenBy={takenMap[signAt(prevIndex).key]}
          onSelect={() => selectStage(prevIndex)}
        />

        {/* Current: the centre stage */}
        <SignStage
          key={`current-${focusedSign.key}`}
          sign={focusedSign}
          stage="current"
          ariaChecked={true}
          tabIndex={0}
          disabled={focusedDisabled}
          takenBy={takenMap[focusedSign.key]}
          onSelect={() => selectStage(focusedIndex)}
        />

        {/* Wing: next */}
        <SignStage
          key={`next-${signAt(nextIndex).key}`}
          sign={signAt(nextIndex)}
          stage="next"
          ariaChecked={false}
          tabIndex={-1}
          disabled={takenMap[signAt(nextIndex).key] !== undefined}
          takenBy={takenMap[signAt(nextIndex).key]}
          onSelect={() => selectStage(nextIndex)}
        />

        {/* Next arrow — symmetric to prev. */}
        <button
          type="button"
          aria-label="Next sign"
          data-direction="next"
          onClick={() => cycle(1)}
          className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-veil/30 bg-ground/70 p-2 text-veil/70 transition-opacity duration-200 ease-flow hover:opacity-100 sm:block sm:opacity-70"
        >
          <span aria-hidden="true">▶</span>
        </button>

        {/* Off-stage signs: kept in DOM so [data-sign] selectors find
            them (unit tests assert "all 12 sign cards are present" and
            integration tests query for the taken-by banner on
            arbitrary signs). The wrapper is `display: none` via the
            Tailwind `hidden` utility so the off-stage cards never
            paint, never intercept pointer events, and aren't visible
            to screen readers — the e2e specs cycle the carousel via
            keyboard / on-screen arrows to navigate to a non-default
            sign rather than synthetically clicking a hidden card. */}
        <div aria-hidden="true" className="hidden">
          {offStageIndices.map((i) => {
            const sign = signAt(i);
            const disabled = takenMap[sign.key] !== undefined;
            return (
              <SignStage
                key={`off-${sign.key}`}
                sign={sign}
                // Off-stage gets a `prev`/`next` stage variant rather
                // than `current` so the heavier decoration (constellation,
                // ruler orbit) is suppressed for cards no one's looking
                // at — performance hand-off for #265 multiplayer.
                stage={i < focusedIndex ? 'prev' : 'next'}
                ariaChecked={false}
                tabIndex={-1}
                disabled={disabled}
                takenBy={takenMap[sign.key]}
                onSelect={() => selectStage(i)}
              />
            );
          })}
        </div>
      </div>

      {/* Mobile prev / next. The Confirm CTA below names the focused
          sign and is the primary way to commit; the prev/next chevrons
          here are the mobile substitute for the desktop side-arrows.
          The aria-labels match the desktop labels — both pairs of
          buttons land on the same `cycle(-1)` / `cycle(1)` handler,
          so `getAllByRole('button', { name: /Next sign/ })` (or
          `.first()` on Playwright) is stable across viewports. */}
      <div className="mt-6 flex items-center justify-center gap-3 sm:hidden">
        <button
          type="button"
          aria-label="Previous sign"
          onClick={() => cycle(-1)}
          className="rounded-full border border-veil/30 bg-ground/70 p-3 text-veil/70"
        >
          <span aria-hidden="true">◀</span>
        </button>
        <button
          type="button"
          aria-label="Next sign"
          onClick={() => cycle(1)}
          className="rounded-full border border-veil/30 bg-ground/70 p-3 text-veil/70"
        >
          <span aria-hidden="true">▶</span>
        </button>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={focusedDisabled}
          data-action="confirm"
          className="rounded bg-illumination px-8 py-3 font-display tracking-widest text-ground transition-shadow duration-300 ease-emerge hover:shadow-glow-tiferet disabled:cursor-not-allowed disabled:opacity-30"
        >
          Confirm {focusedSign.name}
        </button>
      </div>
    </section>
  );
}
