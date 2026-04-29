import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration for Sparks of Kether.
 *
 * Color tokens follow the traditional Golden Dawn / Kabbalistic correspondences
 * documented in `reference/sefirot.md`. The `kether`/`chokmah`/... aliases are
 * the primary tokens; the `pillar-*` and `ground` tokens provide structural
 * anchors for the Tree board and UI chrome.
 */
const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // The 10 Sefirot (see reference/sefirot.md master table).
        kether: '#ffffff',
        chokmah: '#c0c0c0',
        binah: '#1a1a1a',
        chesed: '#4169e1',
        gevurah: '#dc143c',
        tiferet: '#ffd700',
        netzach: '#228b22',
        hod: '#ff8c00',
        yesod: '#9370db',
        malkuth: '#8b4513',

        // Structural tokens.
        ground: '#0e0a1f', // deep-indigo app background
        veil: '#f8f8ff', // off-white for text on indigo

        // Three-pillar accents (used by path/pillar markers).
        'pillar-mercy': '#4169e1',
        'pillar-severity': '#dc143c',
        'pillar-balance': '#ffd700',

        // Illumination / Separation meters.
        // illumination mirrors tiferet (gold light); separation mirrors
        // binah (form / shadow). If the canonical Sefirah colors change,
        // these aliases must be updated in lock-step.
        illumination: '#ffd700',
        separation: '#1a1a1a',
      },
      fontFamily: {
        // Loaded via next/font in app/layout.tsx — all self-hosted.
        // Fallbacks intentionally exclude CDN-resolvable font names
        // (e.g. "Noto Sans Hebrew") so a CSS-var miss cannot trigger
        // an external Google Fonts fetch; we degrade to generic serif
        // / sans-serif instead.
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        hebrew: ['var(--font-hebrew)', 'serif'],
      },
      // #132: gentle fade-in for newly-mounted Hand contents (the
      // open/close toggle swaps subtrees, so opacity transitions on
      // the existing element are no-ops; a keyframe runs on mount).
      // #37 adds a parallel set for engine-state transitions —
      // path travel and sefirah-clear feedback. CSS-only by design;
      // framer-motion stays a follow-up if this proves insufficient.
      keyframes: {
        'hand-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // #37: path-travel pulse. The path stroke briefly brightens
        // (and gets a gold drop-shadow) when a player traverses it,
        // then settles back to its baseline opacity. Triggered by
        // a `data-traveling` attribute that the orchestrator toggles
        // for ~600ms on a successful move. The hyphenated
        // `stroke-opacity` is the spec-correct CSS property name —
        // camelCased `strokeOpacity` works in Chrome but is dropped
        // by Firefox / Safari.
        'path-travel-pulse': {
          '0%': { 'stroke-opacity': '0.35' },
          '50%': { 'stroke-opacity': '1', filter: 'drop-shadow(0 0 6px #ffd700)' },
          '100%': { 'stroke-opacity': '0.35' },
        },
        // #37: sefirah clear pulse. Scale + glow on the node when
        // its challenge is passed. Triggered by the same data-attribute
        // pattern as path travel.
        'sefirah-clear-pulse': {
          '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 transparent)' },
          '50%': { transform: 'scale(1.08)', filter: 'drop-shadow(0 0 8px #ffd700)' },
          '100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 transparent)' },
        },
        // #161: optional starfield twinkle. Stars pulse via filter
        // brightness so their inline `opacity` (per-star variation)
        // is preserved. Applied with the `motion-safe:` variant so
        // it respects `prefers-reduced-motion: reduce` automatically.
        'atmosphere-twinkle': {
          '0%, 100%': { filter: 'brightness(0.85)' },
          '50%': { filter: 'brightness(1.3)' },
        },
        // #206: card leaves the hand (played, gifted, discarded). Mirrors
        // hand-fade-in but in reverse. The compositing layer should be
        // unmounted at the keyframe end via `onAnimationEnd`.
        'hand-fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-4px)' },
        },
        // #206: D20 roll settle. Brief gold ring fade-in/fade-out around
        // the rolled face. Triggered by toggling a `data-rolled`
        // attribute the consumer flips on roll completion.
        'd20-roll-settle': {
          '0%': { filter: 'drop-shadow(0 0 0 transparent)' },
          '40%': { filter: 'drop-shadow(0 0 8px #ffd700)' },
          '100%': { filter: 'drop-shadow(0 0 0 transparent)' },
        },
        // #206: victory glow. The Final Threshold passes; the play
        // surface gets a 2 s gold halo that fades to baseline. Triggered
        // by a top-level `data-victory` attribute.
        'victory-glow': {
          '0%': { filter: 'brightness(1) drop-shadow(0 0 0 transparent)' },
          '50%': {
            filter: 'brightness(1.15) drop-shadow(0 0 24px #ffd700)',
          },
          '100%': { filter: 'brightness(1) drop-shadow(0 0 0 transparent)' },
        },
      },
      animation: {
        'hand-fade-in': 'hand-fade-in 180ms ease-out',
        'hand-fade-out': 'hand-fade-out 180ms ease-out forwards',
        'path-travel-pulse': 'path-travel-pulse 600ms ease-out',
        'sefirah-clear-pulse': 'sefirah-clear-pulse 700ms ease-out',
        'atmosphere-twinkle': 'atmosphere-twinkle 4s ease-in-out infinite',
        'd20-roll-settle': 'd20-roll-settle 600ms ease-out',
        'victory-glow': 'victory-glow 2000ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
