import Link from 'next/link';
import { TIFERET_GOLD } from '@/data/colors';

interface HowToPlayProps {
  readonly className?: string;
}

interface Step {
  readonly n: 1 | 2 | 3;
  readonly heading: string;
  readonly body: string;
}

const STEPS: readonly Step[] = [
  {
    n: 1,
    heading: 'Roll your stats',
    body: 'Walk Kether to Malkuth, rolling 3d6 for each Sefirah. The numbers you land on are yours for the entire ascent.',
  },
  {
    n: 2,
    heading: 'Ascend together',
    body: 'Move through the 22 paths. Each Sefirah you visit grants a Spark — a one-use ability tied to that node’s lesson. Gather Sparks. Outpace Separation.',
  },
  {
    n: 3,
    heading: 'Reach the Crown',
    body: 'Win with more Illumination than Separation. Hoard resources or fail challenges, and the Shells awaken to dim the Tree.',
  },
];

export function HowToPlay({ className }: HowToPlayProps): JSX.Element {
  return (
    <section data-home-how-to-play aria-labelledby="home-how-to-play-heading" className={className}>
      <div className="mb-10 text-center">
        <h2
          id="home-how-to-play-heading"
          className="font-display text-2xl tracking-widest text-veil"
        >
          How to play
        </h2>
        <p className="mt-2 text-sm text-veil/60">Three acts. Thirty to forty-five minutes.</p>
      </div>

      <ol className="mx-auto grid w-full max-w-4xl list-none grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((step) => (
          <li
            key={step.n}
            data-how-to-play-step={step.n}
            className="flex flex-col items-center gap-4 text-center"
          >
            <svg
              viewBox="0 0 48 48"
              className="h-12 w-12 shrink-0"
              aria-hidden="true"
              role="presentation"
            >
              <circle
                cx={24}
                cy={24}
                r={22}
                fill={TIFERET_GOLD}
                fillOpacity={0.12}
                stroke={TIFERET_GOLD}
                strokeWidth={1}
                strokeOpacity={0.45}
              />
              <text
                x={24}
                y={24}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fontFamily="var(--font-display), serif"
                fontWeight={600}
                fill={TIFERET_GOLD}
              >
                {step.n}
              </text>
            </svg>
            <h3 className="font-display text-xl tracking-widest text-veil">{step.heading}</h3>
            <p className="max-w-xs text-sm leading-relaxed text-veil/80">{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-center">
        <Link
          href="/about"
          data-how-to-play-link="rules"
          className="text-sm text-veil/60 underline-offset-2 hover:text-veil hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-veil/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          Read the full rules →
        </Link>
      </p>
    </section>
  );
}
