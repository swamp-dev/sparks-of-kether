import { sefirahByKey, sefirahMarkLetter } from '@/data';
import type { SefirahKey } from '@/data';

/**
 * Spark icon — small inventory glyph showing one of the 10 Sefirah-
 * earned Sparks. Anatomy: a glowing disc in the Sefirah's color with
 * its mark letter centered, and a thin halo to read as "lit / earned".
 *
 * Used in the player's inventory row, hand-area decorations, and the
 * Final Threshold burn UI. Ticket #19's `SparkIcon` has no
 * status — adding `status?: 'earned' | 'spent'` is the expected
 * extension point when the burn UI lands.
 */

const VIEW = 28;

interface SparkIconProps {
  readonly sefirah: SefirahKey;
  readonly className?: string;
}

/**
 * Hand-tuned glyph foreground color per Sefirah. White-ish for dark
 * backgrounds (Binah's black, Saturn-ish), dark for light ones.
 */
const SPARK_FOREGROUND: Readonly<Record<SefirahKey, string>> = {
  kether: '#1a1a1a',
  chokmah: '#1a1a1a',
  binah: '#f8f8ff',
  chesed: '#f8f8ff',
  gevurah: '#f8f8ff',
  tiferet: '#1a1a1a',
  netzach: '#f8f8ff',
  hod: '#1a1a1a',
  yesod: '#f8f8ff',
  malkuth: '#f8f8ff',
};

export function SparkIcon({ sefirah, className }: SparkIconProps): JSX.Element {
  const data = sefirahByKey(sefirah);
  const fg = SPARK_FOREGROUND[sefirah];
  const glyph = sefirahMarkLetter[sefirah];
  const label = `Spark of ${data.englishName} (${data.hebrewName})`;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-token="spark"
      data-sefirah={sefirah}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      {/* Halo (soft glow ring) */}
      <circle
        cx={VIEW / 2}
        cy={VIEW / 2}
        r={VIEW / 2 - 1}
        fill="none"
        stroke={data.color}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      {/* Lit core */}
      <circle
        cx={VIEW / 2}
        cy={VIEW / 2}
        r={VIEW / 2 - 5}
        fill={data.color}
        stroke="#f8f8ff"
        strokeOpacity={0.6}
        strokeWidth={0.8}
      />
      {/* Hebrew first-letter mark */}
      <text
        x={VIEW / 2}
        y={VIEW / 2 + 5}
        textAnchor="middle"
        fontSize={13}
        fontFamily="var(--font-hebrew), serif"
        fill={fg}
        lang="he"
        style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
      >
        {glyph}
      </text>
    </svg>
  );
}
