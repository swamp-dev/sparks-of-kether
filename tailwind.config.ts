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
      keyframes: {
        'hand-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'hand-fade-in': 'hand-fade-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
