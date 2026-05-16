import type { SefirahKey } from '@/data/types';
import type { AvatarPose } from './encounter-pose';

interface AvatarSilhouetteProps {
  readonly pose: AvatarPose;
  readonly sefirah: SefirahKey;
  readonly reducedMotion: boolean;
  readonly className?: string;
}

/**
 * Pose-driven SVG silhouette placeholder for AvatarPortrait (#21).
 *
 * Renders a simple humanoid figure whose posture communicates the current
 * encounter phase. Used when the commissioned portrait asset is unavailable.
 * Each pose is visually distinct:
 *
 *   idle     — upright, hands at sides. Default between framing and roll.
 *   speaking — slight forward lean, one arm raised. Framing reveal.
 *   watching — attentive, chin raised. d20 spin.
 *   pass     — open arms, head back. Triumph.
 *   fail     — slumped forward, head down. Defeat.
 *
 * The halo ellipse brightens on pass and dims on fail. All transitions
 * are gated on the `reducedMotion` prop so reduced-motion users see
 * instant pose snaps.
 */
export function AvatarSilhouette({
  pose,
  reducedMotion,
  className,
}: AvatarSilhouetteProps): JSX.Element {
  const bodyTransform: Record<AvatarPose, string> = {
    idle: 'translate(0,0) rotate(0,50,80)',
    speaking: 'translate(0,-4) rotate(-5,50,80)',
    watching: 'translate(0,-6) rotate(3,50,80)',
    pass: 'translate(0,-8) rotate(0,50,80)',
    fail: 'translate(0,6) rotate(8,50,80)',
  };

  const haloOpacity: Record<AvatarPose, number> = {
    idle: 0.4,
    speaking: 0.5,
    watching: 0.45,
    pass: 0.85,
    fail: 0.15,
  };

  const showRaisedArm = pose === 'speaking' || pose === 'pass';
  const transitionClass = reducedMotion ? '' : 'transition-all duration-300 ease-in-out';
  const bodyOpacity = pose === 'fail' ? 0.45 : 0.75;

  return (
    <svg
      viewBox="0 0 100 160"
      aria-hidden
      data-avatar-silhouette
      data-pose={pose}
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Halo glow — brightens on pass, dims on fail */}
      <ellipse
        cx="50"
        cy="70"
        rx="34"
        ry="44"
        fill="currentColor"
        opacity={haloOpacity[pose]}
        className={transitionClass}
      />

      {/* Body group — transforms per pose */}
      <g
        data-avatar-body
        transform={bodyTransform[pose]}
        opacity={bodyOpacity}
        className={transitionClass}
      >
        {/* Head */}
        <circle cx="50" cy="38" r="14" fill="currentColor" />

        {/* Torso */}
        <rect x="43" y="52" width="14" height="36" rx="4" fill="currentColor" />

        {/* Left arm */}
        <line
          x1="43"
          y1="58"
          x2={pose === 'fail' ? '28' : '30'}
          y2={pose === 'fail' ? '78' : '72'}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Right arm — raised on speaking/pass */}
        <line
          x1="57"
          y1="58"
          x2={showRaisedArm ? (pose === 'pass' ? '74' : '70') : '70'}
          y2={showRaisedArm ? (pose === 'pass' ? '38' : '42') : pose === 'fail' ? '78' : '72'}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Left leg */}
        <line
          x1="47"
          y1="88"
          x2="40"
          y2="118"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Right leg */}
        <line
          x1="53"
          y1="88"
          x2="60"
          y2="118"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>

      {/* Pass accent: sparkles above head */}
      {pose === 'pass' && (
        <g data-pose-accent>
          <circle cx="50" cy="16" r="3" fill="currentColor" opacity={0.9} />
          <circle cx="40" cy="20" r="2" fill="currentColor" opacity={0.7} />
          <circle cx="60" cy="20" r="2" fill="currentColor" opacity={0.7} />
        </g>
      )}

      {/* Fail accent: shadow below */}
      {pose === 'fail' && (
        <ellipse
          cx="50"
          cy="132"
          rx="20"
          ry="5"
          fill="currentColor"
          opacity={0.18}
          data-pose-accent
        />
      )}
    </svg>
  );
}
