import ritualShot from '@/assets/marketing/play-desktop.png';
import signPickerShot from '@/assets/marketing/play-sign-picker-desktop.png';
import midGameShot from '@/assets/marketing/play-mid-game-desktop.png';
import encounterShot from '@/assets/marketing/demo-challenge-soul-door-desktop.png';

/**
 * "How it plays" filmstrip — four captioned screenshots from the
 * game (#313). Pulls visual interest forward without forcing the
 * visitor to start a game to see what the surfaces look like.
 *
 * Desktop / tablet: 4-up grid (2×2 on tablet, 4 across on desktop).
 * Mobile: horizontal scroll-snap carousel — each screenshot fills
 * ~90% of the viewport and snaps as the user swipes.
 *
 * Captions sit below each frame in body sans; frame borders use
 * `border-veil/15` to read as a faint plate edge rather than a hard
 * box.
 *
 * Final-Threshold imagery doesn't exist as a route yet (#285 owns
 * the design), so the fourth frame uses the encounter modal's
 * Soul-Door variant — visually evocative of the dramatic stakes
 * around resolving a Sefirah, which is what the Final Threshold
 * concretises.
 *
 * Captions:
 *   1. Blessing Ritual — the opening rite, walking Kether → Malkuth.
 *   2. Class — the Zodiac sign picker; planetary dignities tilt your
 *      starting stats and open Soul Doors on the Tree.
 *   3. The play surface — Tree of Life, hand fan, team meters.
 *   4. An encounter unfolds — a Sefirah's challenge resolved with
 *      stat + d20 + cards.
 *
 * Plain `<img>` over `next/image` for the same reasons as `/about`:
 * statically-imported PNGs already optimised, server-rendered page,
 * lazy-loading not earning its bundle weight.
 */

interface FilmstripProps {
  readonly className?: string;
}

interface StaticImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

interface Frame {
  readonly key: string;
  readonly src: StaticImage;
  readonly alt: string;
  readonly caption: string;
}

const FRAMES: readonly Frame[] = [
  {
    key: 'ritual',
    src: ritualShot,
    alt: 'The Blessing Ritual mid-flow — the active Sefirah named in display type, a 3d6 stat roll prompted, the ledger filling up below.',
    caption: 'The opening rite. Walk Kether to Malkuth, rolling 3d6 for each Sefirah’s stat.',
  },
  {
    key: 'class',
    src: signPickerShot,
    alt: 'The zodiac sign picker — twelve classical signs, each with planetary dignities and Soul Doors.',
    caption:
      'Your class. Twelve signs; planetary dignities tilt your starting stats and open Soul Doors on the Tree.',
  },
  {
    key: 'mid-game',
    src: midGameShot,
    alt: 'The live play surface — Tree of Life board centre, hand fan below, team meters and turn UI to the side.',
    caption: 'The play surface. Tree, hand, meters, turn UI — all in view at once.',
  },
  {
    key: 'encounter',
    src: encounterShot,
    alt: 'A challenge modal mid-resolution, with a Soul Door bonus called out — stat plus d20 plus cards versus DC.',
    caption: 'An encounter unfolds. Stat + d20 + cards versus the Sefirah’s difficulty.',
  },
];

export function Filmstrip({ className }: FilmstripProps): JSX.Element {
  return (
    <section data-home-filmstrip aria-labelledby="home-filmstrip-heading" className={className}>
      <div className="mb-6 text-center">
        <h2 id="home-filmstrip-heading" className="font-display text-2xl tracking-widest text-veil">
          How it plays
        </h2>
        <p className="mt-2 text-sm text-veil/60">
          A walk through the surfaces in the order a player meets them.
        </p>
      </div>

      {/* Frames container.
          - Mobile (<sm): horizontal scroll-snap carousel. Each frame
            occupies ~85% of the visible viewport width; `snap-
            mandatory` makes swipes settle on the next frame.
          - sm and up: 2-column grid.
          - md and up: 4-column grid.

          `overflow-x-auto` on mobile gives the carousel; the same
          element is `overflow-visible` once the viewport hits sm,
          where the children switch to a normal grid layout.

          Mobile sizing note: a flex `<li>` containing a 1280×800
          `<img>` will size itself to the image's intrinsic width
          unless explicitly constrained — even with `w-full` on the
          image. Using a `basis` of `85vw` plus `shrink-0` and
          `grow-0` pins the LI's flex sizing to the viewport, so the
          image then resolves to `w-full` of 85vw rather than
          dictating the LI's width. The grid layout at sm and up
          overrides flex entirely (both `basis` and `flex-shrink`
          drop out under the grid), so the same children stack into
          a 2-up / 4-up grid without any DOM-level branch. */}
      <ul className="mx-auto flex w-full max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 md:grid-cols-4">
        {FRAMES.map((frame) => (
          <li
            key={frame.key}
            data-filmstrip-frame={frame.key}
            className="flex shrink-0 grow-0 basis-[85vw] snap-start flex-col gap-3 sm:shrink sm:grow sm:basis-auto"
          >
            <figure className="m-0">
              {/* Plain <img> — same rationale as /about: static PNG,
                  server-rendered page, no bundle bloat from importing
                  the next/image runtime for a marketing surface.
                  `max-w-full` is belt-and-braces to ensure the image
                  never exceeds its container width on mobile, where
                  the LI's basis is already viewport-relative. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frame.src.src}
                width={frame.src.width}
                height={frame.src.height}
                alt={frame.alt}
                loading="lazy"
                className="h-auto w-full max-w-full rounded-lg border border-veil/15 shadow-md"
              />
              <figcaption className="mt-3 text-sm leading-relaxed text-veil/75">
                {frame.caption}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
