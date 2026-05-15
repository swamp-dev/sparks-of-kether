/**
 * Flourish — decorative section divider. A symmetric pair of arcs
 * meeting at a central diamond, typeset in line with body text. Used
 * to break sections in the lobby, the stat sheet, and the threshold
 * ritual screen.
 *
 * No state, no semantics: rendered as `aria-hidden` so screen readers
 * skip it.
 */

const VIEW_W = 120;
const VIEW_H = 16;

interface FlourishProps {
  readonly color?: string;
  readonly className?: string;
}

export function Flourish({ color = 'currentColor', className }: FlourishProps): JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="presentation"
      aria-hidden="true"
      data-flourish
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left arc trailing into the center */}
      <path
        d="M 4,8 Q 30,2 56,8"
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* Right arc mirror */}
      <path
        d="M 64,8 Q 90,14 116,8"
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* Central diamond */}
      <polygon
        points="60,3 64,8 60,13 56,8"
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
}
