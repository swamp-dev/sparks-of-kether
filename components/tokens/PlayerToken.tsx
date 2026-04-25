/**
 * Player token — colored circle with the player's initial, drawn on
 * top of a Sefirah node on the Tree board. Four canonical color
 * variants cover up to 4 players.
 *
 * The variant index drives the color so two players don't accidentally
 * share. Initial is rendered uppercased; if the player's name is
 * empty, falls back to the variant index (1..4).
 */

const VIEW = 36;

interface PlayerTokenProps {
  readonly variant: 1 | 2 | 3 | 4;
  readonly initial?: string;
  readonly className?: string;
}

const PLAYER_COLORS: Readonly<Record<1 | 2 | 3 | 4, string>> = {
  1: '#d4af37', // gold — Tiferet kinship
  2: '#3a8f4a', // green — Netzach
  3: '#9b88c4', // violet — Yesod
  4: '#e07b00', // orange — Hod
};

export function PlayerToken({
  variant,
  initial,
  className,
}: PlayerTokenProps): JSX.Element {
  const color = PLAYER_COLORS[variant];
  const glyph = (initial?.charAt(0) ?? String(variant)).toUpperCase();
  const label = `Player token ${variant}${initial ? ` (${initial})` : ''}`;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      data-token="player"
      data-variant={variant}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      <title>{label}</title>
      <circle
        cx={VIEW / 2}
        cy={VIEW / 2}
        r={VIEW / 2 - 2}
        fill={color}
        stroke="#0e0a1f"
        strokeWidth={2}
      />
      <text
        x={VIEW / 2}
        y={VIEW / 2 + 6}
        textAnchor="middle"
        fontSize={18}
        fontFamily="var(--font-display), serif"
        fill="#0e0a1f"
        fontWeight={600}
      >
        {glyph}
      </text>
    </svg>
  );
}
