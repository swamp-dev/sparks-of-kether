'use client';

import { useEffect, useRef, useState } from 'react';
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
 * ~85% of the viewport and snaps as the user swipes.
 *
 * Clicking any thumbnail opens a lightbox: full-screen dark overlay
 * with the enlarged image, caption, and left/right navigation.
 * Keyboard: Escape closes, ArrowLeft/ArrowRight navigates.
 * Focus returns to the thumbnail button on close.
 *
 * 'use client' is required for the lightbox open/close state.
 */

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
    caption: "The opening rite. Walk Kether to Malkuth, rolling 3d6 for each Sefirah’s stat.",
  },
  {
    key: 'class',
    src: signPickerShot,
    alt: 'The zodiac sign picker — twelve classical signs, each with planetary dignities and Soul Doors.',
    caption: 'Your class. Twelve signs; planetary dignities tilt your starting stats and open Soul Doors on the Tree.',
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
    caption: "An encounter unfolds. Stat + d20 + cards versus the Sefirah’s difficulty.",
  },
];

interface FilmstripProps {
  readonly className?: string;
}

export function Filmstrip({ className }: FilmstripProps): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastOpenerRef = useRef<HTMLButtonElement | null>(null);

  const handleClose = () => {
    setOpenIndex(null);
    lastOpenerRef.current?.focus();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handlePrev = () =>
    setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i));

  const handleNext = () =>
    setOpenIndex((i) => (i !== null && i < FRAMES.length - 1 ? i + 1 : i));

  useEffect(() => {
    if (openIndex !== null) closeButtonRef.current?.focus();
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { handleClose(); return; }
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const activeFrame = openIndex !== null ? (FRAMES[openIndex] ?? null) : null;

  return (
    <>
      <section
        data-home-filmstrip
        aria-labelledby="home-filmstrip-heading"
        className={className}
      >
        <div className="mb-6 text-center">
          <h2
            id="home-filmstrip-heading"
            className="font-display text-2xl tracking-widest text-veil"
          >
            How it plays
          </h2>
          <p className="mt-2 text-sm text-veil/60">
            A walk through the surfaces in the order a player meets them.
          </p>
        </div>

        {/*
          Frames container.
          - Mobile (<sm): horizontal scroll-snap carousel. Each frame
            occupies ~85% of the visible viewport width.
          - sm and up: 2-column grid.
          - md and up: 4-column grid.

          Mobile sizing: `basis-[85vw]` + `shrink-0 grow-0` pins the
          LI to the viewport so the image resolves to `w-full` of 85vw
          rather than dictating the LI's width. The grid layout at sm
          and up overrides flex entirely — same children, no DOM branch.
        */}
        <ul
          className="
            flex w-full max-w-6xl mx-auto snap-x snap-mandatory gap-4
            overflow-x-auto px-4 pb-4
            sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0
            md:grid-cols-4
          "
        >
          {FRAMES.map((frame, i) => (
            <li
              key={frame.key}
              data-filmstrip-frame={frame.key}
              className="
                flex basis-[85vw] shrink-0 grow-0 flex-col gap-3
                snap-start
                sm:basis-auto sm:shrink sm:grow
              "
            >
              <figure className="m-0">
                <button
                  type="button"
                  aria-label={`Enlarge: ${frame.caption}`}
                  className="group w-full text-left"
                  onClick={(e) => {
                    lastOpenerRef.current = e.currentTarget;
                    setOpenIndex(i);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frame.src.src}
                    width={frame.src.width}
                    height={frame.src.height}
                    alt={frame.alt}
                    loading="lazy"
                    className="
                      h-auto w-full max-w-full cursor-zoom-in rounded-lg
                      border border-veil/15 shadow-md
                      transition-[border-color] group-hover:border-veil/35
                    "
                  />
                </button>
                <figcaption className="mt-3 text-sm leading-relaxed text-veil/75">
                  {frame.caption}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      {/* Lightbox overlay */}
      {activeFrame !== null && openIndex !== null && (
        // Backdrop: clicking the void closes; content click is stopped by
        // stopPropagation not being needed — the `e.target === e.currentTarget`
        // check in handleBackdropClick already guards the inner figure.
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Screenshot: ${activeFrame.caption}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/92"
          onClick={handleBackdropClick}
        >
          {/* Close button */}
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close lightbox"
            onClick={handleClose}
            className="
              absolute right-5 top-5 flex h-10 w-10 items-center justify-center
              rounded-full border border-veil/20 text-2xl leading-none text-veil/55
              hover:border-veil/50 hover:text-veil
              focus-visible:outline-none focus-visible:ring-1
              focus-visible:ring-veil/60
            "
          >
            &times;
          </button>

          {/* Prev arrow */}
          {openIndex > 0 && (
            <button
              type="button"
              aria-label="Previous screenshot"
              onClick={handlePrev}
              className="
                absolute left-3 top-1/2 flex h-14 w-10 -translate-y-1/2
                items-center justify-center text-4xl leading-none text-veil/45
                hover:text-veil
                focus-visible:outline-none focus-visible:ring-1
                focus-visible:ring-veil/60
              "
            >
              &#x2039;
            </button>
          )}

          {/* Enlarged image + caption */}
          <figure className="flex flex-col items-center gap-5 px-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeFrame.src.src}
              width={activeFrame.src.width}
              height={activeFrame.src.height}
              alt={activeFrame.alt}
              className="max-h-[80vh] max-w-[86vw] rounded-lg object-contain shadow-2xl"
            />
            <figcaption className="max-w-2xl text-center font-display text-sm tracking-wide text-veil/75">
              {activeFrame.caption}
            </figcaption>
          </figure>

          {/* Next arrow */}
          {openIndex < FRAMES.length - 1 && (
            <button
              type="button"
              aria-label="Next screenshot"
              onClick={handleNext}
              className="
                absolute right-3 top-1/2 flex h-14 w-10 -translate-y-1/2
                items-center justify-center text-4xl leading-none text-veil/45
                hover:text-veil
                focus-visible:outline-none focus-visible:ring-1
                focus-visible:ring-veil/60
              "
            >
              &#x203a;
            </button>
          )}
        </div>
      )}
    </>
  );
}
