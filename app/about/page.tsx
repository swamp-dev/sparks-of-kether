import type { Metadata } from 'next';
import Link from 'next/link';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';
import homeShot from '@/assets/marketing/home-desktop.png';
import ritualShot from '@/assets/marketing/play-desktop.png';
import signPickerShot from '@/assets/marketing/play-sign-picker-desktop.png';
import midGameShot from '@/assets/marketing/play-mid-game-desktop.png';
import treeShot from '@/assets/marketing/demo-tree-desktop.png';
import cardsShot from '@/assets/marketing/demo-cards-desktop.png';
import soulDoorShot from '@/assets/marketing/demo-challenge-soul-door-desktop.png';

/**
 * Marketing landing surface. Server-rendered, no client state — the
 * page is a static read for "share this URL with a friend who's
 * curious." Operationally distinct from `/`, which is the play
 * surface (room CTAs + Hot-seat). `/about` is purely the pitch.
 */

export const metadata: Metadata = {
  title: 'Sparks of Kether — About',
  description:
    'A cooperative ascent up the Kabbalistic Tree of Life. 2–4 players ' +
    'gather Sparks together to brighten Illumination and outpace Separation.',
};

const REPO_URL = 'https://github.com/swamp-dev/sparks-of-kether';
const RULES_URL = `${REPO_URL}/blob/main/design/mechanics.md`;

export default function AboutPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12 text-veil sm:px-10 md:py-16">
      <ColorBloom color="#ffd700" position="top" intensity={0.12} />

      <header className="text-center">
        <h1 className="font-display text-5xl tracking-widest">Sparks of Kether</h1>
        <p className="mt-4 text-lg opacity-80">
          A cooperative ascent up the Kabbalistic Tree of Life.
        </p>
      </header>

      <figure className="mt-10">
        {/* Plain <img> over next/image: marketing assets are
            statically imported (already optimized PNGs) and the
            page is server-rendered, so the lazy-loading and
            optimization next/image provides isn't earning its
            bundle weight here. Avoids importing the Image runtime
            into a page that doesn't need it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={homeShot.src}
          width={homeShot.width}
          height={homeShot.height}
          alt="The Sparks of Kether landing screen — Tree of Life silhouette and room CTAs"
          className="mx-auto h-auto w-full rounded-lg border border-veil/15 shadow-xl"
        />
      </figure>

      <section className="mt-12 max-w-2xl space-y-5 self-center text-base leading-relaxed opacity-90">
        <p>
          Two to four players journey together from{' '}
          <strong>Malkuth</strong> (the material world) to{' '}
          <strong>Kether</strong> (the Crown). Along the way, each Sefirah you
          visit grants you a <strong>Spark</strong> — a lesson and a one-use
          ability — and each Spark brightens the team&rsquo;s shared{' '}
          <strong>Illumination</strong>. Fail a challenge, hoard resources, or
          take the wrong shortcut, and <strong>Separation</strong> rises
          instead; the <strong>Shells</strong> awaken and the Tree begins to dim.
        </p>
        <p>
          You win by reaching the Crown together with more Illumination than
          Separation. You lose by letting the Shells swallow the Tree. Evil
          here is separation and ignorance. Good is illumination and unity.
          The mechanics aren&rsquo;t decoration — they teach the thing.
        </p>
        <p>
          Sparks of Kether is a game-design document and a working web
          implementation, both medium-agnostic. It could be realized as a
          board game, a card game, a web app, or a computer game. The soul of
          the game lives in the symbolic system and its rules; any
          implementation is downstream.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-center font-display text-2xl tracking-widest">
          Gameplay
        </h2>
        <p className="mt-2 text-center text-sm opacity-70">
          A walk through the surfaces in the order a player meets them.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <GalleryItem
            src={ritualShot}
            alt="Blessing Ritual mid-flow — five Sefirot rolled"
            caption="The opening ritual. Walk Kether to Malkuth, rolling 3d6 for each Sefirah's stat. Atmosphere shifts hue with the active Sefirah; a running ledger keeps the build visible."
          />
          <GalleryItem
            src={signPickerShot}
            alt="Zodiac sign picker — twelve classes with stat dignities"
            caption="Your class. Twelve classical signs, each tilting your starting stats through planetary dignities and opening one or two Soul Doors on the Tree."
          />
          <GalleryItem
            src={midGameShot}
            alt="The live play surface — Tree, hand, meters, turn UI"
            caption="The play surface. Tree of Life board, hand fan, team meters, Shells row, and turn UI — everything in view at once."
          />
          <GalleryItem
            src={treeShot}
            alt="Tree of Life board"
            caption="The board. Ten Sefirot connected by twenty-two paths — the geometry the team traverses together."
          />
          <GalleryItem
            src={soulDoorShot}
            alt="Challenge modal with Soul Door callout"
            caption="A Soul Door opens. When your class's soul card aligns with the Sefirah being challenged, the DC drops by 2 — the modal calls it out verbatim."
          />
          <GalleryItem
            src={cardsShot}
            alt="Major Arcana grid"
            caption="Twenty-two path-keys. A symbolic-minimalist deck of the Major Arcana — each card a key, each key a path between Sefirot."
            className="md:col-span-2"
          />
        </div>
      </section>

      <footer className="mt-16 mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
        <Link
          href="/"
          data-about-cta="play"
          className="rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground"
        >
          Play it
        </Link>
        <a
          href={RULES_URL}
          data-about-cta="rules"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-veil/40 px-6 py-3 font-display tracking-widest hover:border-veil/70"
        >
          Read the rules
        </a>
        <a
          href={REPO_URL}
          data-about-cta="source"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-veil/40 px-6 py-3 font-display tracking-widest hover:border-veil/70"
        >
          View source
        </a>
      </footer>
    </main>
  );
}

interface StaticImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

interface GalleryItemProps {
  readonly src: StaticImage;
  readonly alt: string;
  readonly caption: string;
  readonly className?: string;
}

function GalleryItem({ src, alt, caption, className }: GalleryItemProps): JSX.Element {
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src.src}
        width={src.width}
        height={src.height}
        alt={alt}
        className="h-auto w-full rounded-lg border border-veil/15 shadow-md"
      />
      <figcaption className="mt-3 text-sm leading-relaxed opacity-75">
        {caption}
      </figcaption>
    </figure>
  );
}
