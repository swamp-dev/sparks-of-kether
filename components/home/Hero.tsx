import { sefirot } from '@/data/sefirot';
import { paths } from '@/data/paths';
import { TREE_VIEW_H, TREE_VIEW_W, treeNodeLayout } from '@/data/tree-layout';
import { TIFERET_GOLD, VEIL } from '@/data/colors';
import type { SefirahKey } from '@/data';

/**
 * Tree-of-Life hero for the home page (#313). Stripped-down rendering
 * of the play board's geometry — same layout (`treeNodeLayout` mirrors
 * `TreeBoard.tsx`), same path graph from `data/paths` — but no
 * interactivity, no player tokens, no path numbers, no per-node
 * label text. Decorative.
 *
 * Each Sefirah node has two paint layers:
 *
 * 1. An SVG halo disc in the Sefirah's canonical colour (translucent),
 *    so the colour reads at SVG viewBox scale even before any CSS
 *    shadow lands.
 * 2. An HTML overlay disc in the same colour with a per-Sefirah
 *    `shadow-glow-{key}` token, breathing under
 *    `motion-safe:animate-breath`. The breath cycle is staggered —
 *    odd-indexed halos delay 3s (half the 6s cycle) — so the ten
 *    halos don't pulse in unison.
 *
 * Tiferet at the geometric centre carries a slightly larger halo and a
 * faint gold ring — the warm focal point of the composition.
 *
 * The hero relies on the layout-level substrate's ambient bloom; it
 * doesn't paint its own background. Per the brief in the foundation
 * ticket #311 ("don't add another layout-level atmosphere component").
 *
 * Aria-hidden because the home page already names the game in copy
 * ("Sparks of Kether — A cooperative ascent up the Kabbalistic Tree
 * of Life."). This Tree is a visual; AT users get nothing from a
 * labels-only enumeration of ten dots that aren't interactive.
 *
 * Reduced-motion: the halos render at the keyframe's 100% opacity
 * state without animation thanks to the `motion-safe:` variant — a
 * static lit Tree, never a flickering one.
 *
 * Sized to ~70vh on desktop, ~58vh on tablet, ~42vh on mobile so the
 * hero remains the focal point at every viewport without crowding
 * neighbouring layout.
 */

interface HeroProps {
  readonly className?: string;
}

// Geometry now lives in `data/tree-layout` so TreeBoard / Hero /
// LobbyBackdrop all read from one source. Drift between hero and
// gameplay used to require manual three-way synchronization.

// Tailwind class for each Sefirah's glow shadow. Pre-mapped so the
// JIT picks them up — Tailwind's content scanner needs the literal
// classnames in the source, not built dynamically by string concat.
const GLOW_CLASS_BY_KEY: Readonly<Record<SefirahKey, string>> = {
  kether: 'shadow-glow-kether',
  chokmah: 'shadow-glow-chokmah',
  binah: 'shadow-glow-binah',
  chesed: 'shadow-glow-chesed',
  gevurah: 'shadow-glow-gevurah',
  tiferet: 'shadow-glow-tiferet',
  netzach: 'shadow-glow-netzach',
  hod: 'shadow-glow-hod',
  yesod: 'shadow-glow-yesod',
  malkuth: 'shadow-glow-malkuth',
};

// Node disc radius (viewBox units). Slightly larger than TreeBoard's
// 28 for the hero, where there's no inscribed text fighting for the
// surface.
const NODE_RADIUS = 22;
// Halo radius — the soft glow disc behind each node.
const HALO_RADIUS = 30;
// HTML-overlay halo size in CSS pixels at 1× — the actual rendered
// size scales with the parent container's responsive height. Keep
// these small so the box-shadow is the dominant visual; the disc
// itself is just an anchor for the shadow stack.
const OVERLAY_NODE_PX = 18;
const OVERLAY_TIFERET_PX = 28;

/**
 * Tree-of-Life hero band for the home page. See file header for the
 * design rationale; the brief lives in #313.
 */
export function Hero({ className }: HeroProps): JSX.Element {
  return (
    <div
      data-home-hero
      aria-hidden="true"
      className={`pointer-events-none relative w-full${className ? ` ${className}` : ''}`}
    >
      <svg
        viewBox={`0 0 ${TREE_VIEW_W} ${TREE_VIEW_H}`}
        // Sized as a fraction of the viewport so the Tree dominates
        // first impression at every breakpoint:
        //   mobile  ~42vh — primary visual without crowding the title.
        //   tablet  ~58vh — taller because the device is taller.
        //   desktop ~70vh — the brief's headline number.
        // `mx-auto` centres horizontally; `preserveAspectRatio` keeps
        // the geometry honest at any aspect ratio.
        className="mx-auto block h-[42vh] w-auto sm:h-[58vh] md:h-[70vh]"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        {/* 22 paths — faint, behind the nodes. Same graph as the play
            board (`data/paths`), but rendered as decorative lines
            with no labels, no numbers, no hit areas. */}
        <g data-layer="paths">
          {paths.map((path) => {
            const a = treeNodeLayout[path.from];
            const b = treeNodeLayout[path.to];
            return (
              <line
                key={path.number}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={VEIL}
                strokeOpacity={0.22}
                strokeWidth={1.5}
              />
            );
          })}
        </g>

        {/* Outer Tiferet halo ring — gold suggestion behind the
            centre. Faint enough to read as a glow, not as a literal
            ring. */}
        <circle
          cx={treeNodeLayout.tiferet.x}
          cy={treeNodeLayout.tiferet.y}
          r={NODE_RADIUS + 14}
          fill="none"
          stroke={TIFERET_GOLD}
          strokeOpacity={0.22}
          strokeWidth={1.25}
        />

        {/* Halo discs — translucent Sefirah colour at viewBox scale,
            so each node reads as warmth even on viewports too small
            for the CSS box-shadow overlay to have visible reach. */}
        <g data-layer="halos">
          {sefirot.map((sefirah) => {
            const pos = treeNodeLayout[sefirah.key];
            const isCentre = sefirah.key === 'tiferet';
            return (
              <circle
                key={`halo-${sefirah.key}`}
                data-halo={sefirah.key}
                cx={pos.x}
                cy={pos.y}
                r={isCentre ? HALO_RADIUS + 6 : HALO_RADIUS}
                fill={sefirah.color}
                fillOpacity={isCentre ? 0.2 : 0.12}
              />
            );
          })}
        </g>

        {/* Sefirah discs — canonical colour, sat over the halo. */}
        <g data-layer="nodes">
          {sefirot.map((sefirah) => {
            const pos = treeNodeLayout[sefirah.key];
            const isCentre = sefirah.key === 'tiferet';
            return (
              <circle
                key={`node-${sefirah.key}`}
                data-node={sefirah.key}
                cx={pos.x}
                cy={pos.y}
                r={isCentre ? NODE_RADIUS + 2 : NODE_RADIUS}
                fill={sefirah.color}
                fillOpacity={isCentre ? 1 : 0.94}
                stroke={VEIL}
                strokeOpacity={0.45}
                strokeWidth={1.25}
              />
            );
          })}
        </g>
      </svg>

      {/* HTML overlay layer carrying the breathing CSS `box-shadow`
          glows. The SVG layer above provides the geometry and the
          colour discs; this layer adds the warm halo bloom that the
          per-Sefirah `shadow-glow-{key}` tokens paint cheaply on the
          GPU.

          Each halo runs `motion-safe:animate-breath` (6s symmetric
          opacity loop). The breath cycle is staggered — odd indices
          delay 3s (half-cycle) — so the ten halos don't pulse in
          unison. Reduced-motion users get the static halo (the
          keyframe's 100% state).

          Sized to mirror the SVG's responsive height exactly (same
          `h-[Nvh]` classes); `aspect-ratio` set inline so the
          overlay's box matches the SVG's intrinsic 400/620 ratio at
          every viewport. Without that match, the percentage-based
          halo positions below would resolve against a parent that's
          a different shape than the SVG, and halos would drift off
          their nodes. */}
      <div
        data-layer="halo-overlay"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42vh] -translate-x-1/2 -translate-y-1/2 sm:h-[58vh] md:h-[70vh]"
        style={{ aspectRatio: `${TREE_VIEW_W} / ${TREE_VIEW_H}` }}
      >
        {sefirot.map((sefirah, index) => {
          const pos = treeNodeLayout[sefirah.key];
          const leftPct = (pos.x / TREE_VIEW_W) * 100;
          const topPct = (pos.y / TREE_VIEW_H) * 100;
          const isCentre = sefirah.key === 'tiferet';
          // Offset cycle by half a breath on alternating indices so
          // halos don't pulse synchronously. The breath animation
          // is 6s, so 3s = half-cycle — maximally desynced.
          const delay = index % 2 === 0 ? '0s' : '3s';
          const sizePx = isCentre ? OVERLAY_TIFERET_PX : OVERLAY_NODE_PX;
          return (
            <span
              key={sefirah.key}
              data-halo-overlay={sefirah.key}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${GLOW_CLASS_BY_KEY[sefirah.key]} motion-safe:animate-breath`}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                animationDelay: delay,
                // Background colour anchors the box-shadow stack so
                // the halo has a coloured core. For Binah (near-
                // black) and Malkuth (low-chroma brown) the canonical
                // colour disappears on the void — but the box-shadow
                // (which substitutes indigo / amber per
                // `tailwind.config.ts`) carries the perceptual halo
                // regardless. The disc itself stays small and behind
                // the SVG node above.
                backgroundColor: sefirah.color,
                opacity: 0.88,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
