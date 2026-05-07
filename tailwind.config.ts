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
        // `void` (#311) is the deep-indigo substrate — slightly darker
        // than `ground` and reserved for the body / atmospheric
        // substrate. `ground` remains the surface tone for cards,
        // panels, and modals layered on top of the void.
        void: '#0b0a1f', // deepest indigo — body / Substrate (#311)
        ground: '#0e0a1f', // deep-indigo app background (cards, panels)
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
        // See `docs/typography.md` for stack rationale (Fraunces / Inter /
        // Frank Ruhl Libre).
        // Fallbacks intentionally exclude CDN-resolvable font names
        // (e.g. "Frank Ruhl Libre") so a CSS-var miss cannot trigger
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
        // #311: slow opacity breath for atmospheric loops (Tree node
        // halos at rest, etc.). Symmetric in/out so the rhythm reads
        // as living rather than mechanical. Applied via the named
        // `animate-breath` animation below.
        breath: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        // Generic 0→360° rotation keyframe. Cadence is set on the
        // consuming animation utility, not the keyframe — currently
        // shared by `shell-dormant-spin` (Shell sigils at rest) and
        // `constellation-rotate` (per-sign constellation behind the
        // sign-picker stage).
        'rotate-360': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // #317: active Shell sigils tilt back and forth gently —
        // alive but unstable. ±2° wobble over ~8 s, symmetric.
        'shell-active-wobble': {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        // #317: awakening transition. The ring's stroke thickens
        // and the letter floods from transparent to coloured as a
        // dormant Shell becomes active. ~500 ms with `ease-emerge`
        // (out-expo) so the settle reads as "arrived".
        'shell-awaken': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // #317: banishing transition. The aura collapses inward
        // and the wax-seal binding draws across. ~600 ms with
        // `ease-flow` (in-out-quart) so the finality lands.
        'shell-banish': {
          '0%': { opacity: '0', transform: 'scale(1.08)' },
          '60%': { opacity: '0.85', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
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
        // #311: paired with the `breath` keyframe and the `flow`
        // easing — 6s symmetric in-out, infinite. Use under
        // `motion-safe:` so reduced-motion users see the static halo.
        breath: 'breath 6000ms cubic-bezier(0.65, 0, 0.35, 1) infinite',
        // #317: Shell-state animations. All authored under
        // `motion-safe:` at the call site so reduced-motion users
        // see the static seals.
        // #317: dormant Shell sigils rotate barely-perceptibly so the
        // seal feels asleep rather than dead — linear, full 360° over
        // ~30 s, paired with `motion-safe:` at the call site.
        'shell-dormant-spin': 'rotate-360 30s linear infinite',
        'shell-active-wobble': 'shell-active-wobble 8000ms cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'shell-awaken': 'shell-awaken 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'shell-banish': 'shell-banish 600ms cubic-bezier(0.65, 0, 0.35, 1) both',
        // #406: slow rotation for the per-sign constellation behind
        // the focused sign-picker stage. Half the shell-dormant
        // cadence (60s vs 30s) so it reads as starlight drift rather
        // than wobble. Authored under `motion-safe:` at the call site
        // so reduced-motion users see the static constellation.
        'constellation-rotate': 'rotate-360 60s linear infinite',
      },
      // #311: reserved easings. `emerge` is for things appearing on
      // screen (mounts, modals opening, halos lighting up); `flow` is
      // for state transitions between visible elements (meter fill
      // changing, stat counter ticking, panel content swapping).
      // Documented in `docs/motion.md` — pick one of these two before
      // reaching for a custom cubic-bezier.
      transitionTimingFunction: {
        emerge: 'cubic-bezier(0.22, 1, 0.36, 1)', // out-expo
        flow: 'cubic-bezier(0.65, 0, 0.35, 1)', // in-out-quart
      },
      // #311: a `breath` duration for slow atmospheric loops (Tree
      // node halos pulsing, etc.). Existing transition durations
      // (150ms / 200ms / 300ms) remain Tailwind defaults — `breath`
      // is additive, not a replacement.
      //
      // Tailwind v3 only supports `transitionDuration` here. There is
      // no `animationDuration` theme key in v3 — `duration-*` utilities
      // never affect `animation-duration`. For breathing keyframe
      // animations, use the named `animate-breath` animation defined
      // below (preferred), or the arbitrary-value escape hatch
      // `[animation-duration:6000ms]`. See `docs/motion.md`.
      transitionDuration: {
        breath: '6000ms',
      },
      // #311: per-Sefirah glow scale. Each entry composes layered
      // box-shadows in the Sefirah's colour at increasing radii so
      // the halo reads as warmth rather than a hard ring. We compose
      // with box-shadow rather than `filter: blur` because
      // filter-blur is a paint-bound operation and dramatically
      // expensive on mobile GPUs (per ticket #311). Box-shadow is
      // GPU-composited and cheap, even with multiple layers.
      //
      // Recipe: three stacked shadows — small/sharp, medium, large —
      // using `0 0 Xpx COLOR_AT_ALPHA` per layer. Consumers stack
      // these on dark surfaces where `mix-blend-mode: screen` on the
      // halo's container brightens the underlying void without
      // double-painting the colour. See `docs/motion.md` for the
      // composition guide and mobile cost notes.
      boxShadow: {
        'glow-kether':
          '0 0 8px rgba(255, 255, 255, 0.45), 0 0 18px rgba(255, 255, 255, 0.28), 0 0 36px rgba(255, 255, 255, 0.16)',
        'glow-chokmah':
          '0 0 8px rgba(192, 192, 192, 0.45), 0 0 18px rgba(192, 192, 192, 0.28), 0 0 36px rgba(192, 192, 192, 0.16)',
        // Binah is dark-form; its "glow" is a deep blue-violet halo
        // rather than a literal Binah-near-black glow. Using the
        // canonical hex would produce no visible halo on the void.
        'glow-binah':
          '0 0 8px rgba(75, 0, 130, 0.55), 0 0 18px rgba(75, 0, 130, 0.30), 0 0 36px rgba(75, 0, 130, 0.16)',
        'glow-chesed':
          '0 0 8px rgba(65, 105, 225, 0.50), 0 0 18px rgba(65, 105, 225, 0.30), 0 0 36px rgba(65, 105, 225, 0.16)',
        'glow-gevurah':
          '0 0 8px rgba(220, 20, 60, 0.50), 0 0 18px rgba(220, 20, 60, 0.30), 0 0 36px rgba(220, 20, 60, 0.16)',
        'glow-tiferet':
          '0 0 8px rgba(255, 215, 0, 0.55), 0 0 18px rgba(255, 215, 0, 0.32), 0 0 36px rgba(255, 215, 0, 0.18)',
        'glow-netzach':
          '0 0 8px rgba(34, 139, 34, 0.50), 0 0 18px rgba(34, 139, 34, 0.30), 0 0 36px rgba(34, 139, 34, 0.16)',
        'glow-hod':
          '0 0 8px rgba(255, 140, 0, 0.55), 0 0 18px rgba(255, 140, 0, 0.32), 0 0 36px rgba(255, 140, 0, 0.18)',
        'glow-yesod':
          '0 0 8px rgba(147, 112, 219, 0.50), 0 0 18px rgba(147, 112, 219, 0.30), 0 0 36px rgba(147, 112, 219, 0.16)',
        // Malkuth's canonical brown is too low-chroma to read as a
        // halo on the void. We reach for an earthier amber tone that
        // still references the Malkuth-earth correspondence without
        // disappearing.
        'glow-malkuth':
          '0 0 8px rgba(184, 115, 51, 0.50), 0 0 18px rgba(184, 115, 51, 0.30), 0 0 36px rgba(184, 115, 51, 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
