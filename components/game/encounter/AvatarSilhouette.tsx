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
 *
 * Malkuth (Hestia) gets a distinct seated variant — see `HestiaSilhouette`.
 */
export function AvatarSilhouette({
  pose,
  sefirah,
  reducedMotion,
  className,
}: AvatarSilhouetteProps): JSX.Element {
  if (sefirah === 'malkuth') {
    return (
      <HestiaSilhouette
        pose={pose}
        reducedMotion={reducedMotion}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

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

  const leftArmX2: Record<AvatarPose, string> = {
    idle: '30',
    speaking: '30',
    watching: '30',
    pass: '30',
    fail: '28',
  };

  const leftArmY2: Record<AvatarPose, string> = {
    idle: '72',
    speaking: '72',
    watching: '72',
    pass: '72',
    fail: '78',
  };

  const rightArmX2: Record<AvatarPose, string> = {
    idle: '70',
    speaking: '70',
    watching: '70',
    pass: '74',
    fail: '70',
  };

  const rightArmY2: Record<AvatarPose, string> = {
    idle: '72',
    speaking: '42',
    watching: '72',
    pass: '38',
    fail: '78',
  };

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
          x2={leftArmX2[pose]}
          y2={leftArmY2[pose]}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Right arm — raised on speaking/pass */}
        <line
          x1="57"
          y1="58"
          x2={rightArmX2[pose]}
          y2={rightArmY2[pose]}
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

/**
 * Hestia / Malkuth companion silhouette (#69).
 *
 * Distinct from the standing encounter avatars: a seated figure tending a
 * small hearth flame. Design per `design/avatars.md` § 7.10 — "hearth-keeper,
 * seated or standing close to a flame, warm / low / constant energy."
 *
 * Pose states are used, but with companion-appropriate movement rather than
 * encounter drama — no triumph arch on pass, no defeat slump on fail.
 * The flame is always present (Hestia abides; the fire never goes out).
 */
function HestiaSilhouette({
  pose,
  reducedMotion,
  className,
}: Omit<AvatarSilhouetteProps, 'sefirah'>): JSX.Element {
  const bodyTransform: Record<AvatarPose, string> = {
    idle: 'translate(0,0) rotate(0,38,68)',
    speaking: 'translate(0,-3) rotate(-4,38,68)',
    watching: 'translate(2,-2) rotate(2,38,68)',
    pass: 'translate(0,-4) rotate(0,38,68)',
    fail: 'translate(1,3) rotate(4,38,68)',
  };

  // Companion halo stays warmer and more constant than encounter avatars
  const haloOpacity: Record<AvatarPose, number> = {
    idle: 0.45,
    speaking: 0.5,
    watching: 0.45,
    pass: 0.6,
    fail: 0.35,
  };

  const transitionClass = reducedMotion ? '' : 'transition-all duration-300 ease-in-out';
  const bodyOpacity = pose === 'fail' ? 0.55 : 0.75;

  return (
    <svg
      viewBox="0 0 100 160"
      aria-hidden
      data-avatar-silhouette
      data-silhouette-variant="malkuth"
      data-pose={pose}
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Halo — lower and wider than encounter avatars, centred on the seated form */}
      <ellipse
        cx="42"
        cy="72"
        rx="36"
        ry="34"
        fill="currentColor"
        opacity={haloOpacity[pose]}
        className={transitionClass}
      />

      {/* Body group — seated posture */}
      <g
        data-avatar-body
        transform={bodyTransform[pose]}
        opacity={bodyOpacity}
        className={transitionClass}
      >
        {/* Head */}
        <circle cx="38" cy="36" r="12" fill="currentColor" />

        {/* Torso — rounder than the standing humanoid */}
        <ellipse cx="38" cy="60" rx="11" ry="13" fill="currentColor" />

        {/* Left arm — resting at side / lap */}
        <line
          x1="29"
          y1="54"
          x2="20"
          y2="70"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Right arm — reaching toward the flame to tend it */}
        <line
          x1="47"
          y1="54"
          x2="60"
          y2="66"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Left upper leg — horizontal, seated */}
        <line
          x1="30"
          y1="72"
          x2="16"
          y2="76"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Left lower leg — bent down */}
        <line
          x1="16"
          y1="76"
          x2="14"
          y2="100"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Right upper leg — horizontal toward the flame side */}
        <line
          x1="46"
          y1="72"
          x2="58"
          y2="78"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Right lower leg */}
        <line
          x1="58"
          y1="78"
          x2="56"
          y2="102"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      {/* Hearth flame — always present; Hestia's fire never goes out */}
      <g data-hestia-flame className={transitionClass}>
        {/* Outer flame body */}
        <path
          d="M76 96 C70 82 70 64 76 54 C82 64 82 82 76 96 Z"
          fill="currentColor"
          opacity={0.55}
        />
        {/* Inner core — brighter */}
        <ellipse cx="76" cy="78" rx="3" ry="7" fill="currentColor" opacity={0.85} />
      </g>
    </svg>
  );
}
