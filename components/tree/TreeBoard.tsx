import { useId, useMemo, type KeyboardEvent } from 'react';
import { letterByKey, paths, sefirahByKey, sefirot } from '@/data';
import { GROUND, TIFERET_GOLD, VEIL } from '@/data/colors';
import type { SefirahKey } from '@/data';
import type { GameState } from '@/engine/types';
import { contrastTextColour } from './contrast-text-colour';
import { validPathsForPlayer } from './valid-paths';
import { SefirahTooltip } from './SefirahTooltip';

/**
 * SVG of the Tree of Life — 10 Sefirot + 22 paths laid out in the
 * traditional three-pillar geometry. Optional interactive overlay:
 * pass `state` to render player tokens, pass `activePlayerId` to
 * highlight the paths that player can travel right now, and pass
 * `onPathClick` to receive a callback when a highlighted path is
 * clicked or activated by keyboard.
 *
 * Without those props the board stays purely static — that's the
 * dev-only `/demo/tree` rendering. The interactive props are additive,
 * so existing call sites are unaffected.
 *
 * Coordinate system: 400×620 viewBox. Pillars are anchored at x=80
 * (Severity, viewer's left), x=200 (Balance, center), x=320 (Mercy,
 * viewer's right). Vertical positions are tuned for readability
 * rather than reproducing any specific historical diagram exactly.
 *
 * Pillar orientation note: the project's reference materials label
 * Mercy as "(R)" and Severity as "(L)" — that convention is followed
 * here (Mercy on the viewer's right). Other Tree diagrams mirror this;
 * the choice is consistent within this codebase.
 *
 * #312 — Tree breathes. Three layered visual passes are added on top
 * of the static SVG geometry:
 *
 *   1. **Breath halos** — Kether and Malkuth (the Tree's endpoints)
 *      are always lit; any Sefirah cleared by a current player also
 *      lights up. Each lit node carries a `motion-safe:animate-breath`
 *      box-shadow halo using the per-Sefirah `shadow-glow-{key}`
 *      tokens from #311. Reduced-motion users see the static halo at
 *      keyframe 100% opacity.
 *
 *   2. **Hover tooltip** — hovering or focusing a Sefirah node
 *      surfaces an HTML overlay card with English name, Hebrew name,
 *      one-line meaning (from `reference/sefirot.md`), and the team's
 *      current Sparks count for that Sefirah. The whole node is
 *      wrapped in an `<a href="/sefirah/{key}">` so click navigates
 *      to the Codex page (which lands in #320; until then it 404s
 *      gracefully).
 *
 *   3. **Path-light-from-card** — when a card is highlighted in the
 *      hand (`highlightedCard` prop, an arcanum 0..21), every path
 *      whose `arcanumNumber` matches the card lights up with a
 *      gradient stroke between the two adjacent Sefirot's colours and
 *      a brighter path-number badge. Multiple eligible paths can
 *      light at once (when several cards in hand share a path-key).
 *
 *   4. **Pawn polish** — every player token carries a slow ~4 s breath
 *      at idle (under `motion-safe:`) and an `data-just-moved` flag
 *      on the active player (drives an afterglow class via the active
 *      ring's `path-travel-pulse` keyframe).
 *
 * Composition: SVG geometry stays canonical (snapshot-stable); breath
 * halos and tooltips ride on an HTML sibling overlay positioned at the
 * SVG's aspect ratio so node coordinates resolve identically.
 */

const VIEW_W = 400;
// 620 not 600: gives Malkuth's label below the bottom node room to render
// without clipping (label baseline sits at malkuth.y + radius + 14 = 602).
const VIEW_H = 620;
const NODE_RADIUS = 28;

interface NodeLayout {
  readonly x: number;
  readonly y: number;
}

const nodeLayout: Readonly<Record<SefirahKey, NodeLayout>> = {
  kether: { x: 200, y: 60 },
  chokmah: { x: 320, y: 150 },
  binah: { x: 80, y: 150 },
  chesed: { x: 320, y: 280 },
  gevurah: { x: 80, y: 280 },
  tiferet: { x: 200, y: 340 },
  netzach: { x: 320, y: 430 },
  hod: { x: 80, y: 430 },
  yesod: { x: 200, y: 490 },
  malkuth: { x: 200, y: 560 },
};

/**
 * Per-path label offset from the geometric midpoint, used by the
 * `path-labels` layer (#136). Three central-pillar paths cluster
 * inside a 75px vertical band between Tiferet and Malkuth; their
 * raw midpoints either collide with each other (paths 25 + 27) or
 * sit inside a Sefirah node / under a player token (path 32). The
 * offsets nudge those discs perpendicular to each path so every
 * label is legible regardless of game state.
 *
 * Defaults to `{ dx: 0, dy: 0 }` for paths not listed (the vast
 * majority — most paths run between distinct pillars and have
 * uncrowded midpoints).
 */
const LABEL_OFFSETS: Readonly<Record<number, { dx: number; dy: number }>> = {
  25: { dx: 22, dy: 0 }, // Tiferet↔Yesod — slide right to clear path 27.
  32: { dx: 22, dy: 0 }, // Yesod↔Malkuth — slide right to clear Yesod node + tokens.
};

/**
 * Frozen empty valid-paths set, returned when `movesEnabled` is false
 * (#129). `Object.freeze` makes the immutability runtime-enforced —
 * `ReadonlySet` is a TS-only constraint and can be defeated by a cast.
 */
const EMPTY_VALID_PATHS: ReadonlySet<number> = Object.freeze(new Set<number>());

/**
 * Hit-area stroke width (#130). The visible path stroke is 1.5–3 px
 * which is too thin to tap reliably; this widens the invisible
 * click target to 28 viewBox-units. At a 400-wide viewBox rendered
 * 320 px wide on mobile, that maps to 22.4 px (passes WCAG 2.5.8
 * 24-px target spacing once the board renders ≥ 343 px wide; reaches
 * 44 px target dimension at ≥ 630 px wide). 28 is also the maximum
 * value that doesn't cause adjacent non-shared-endpoint paths to
 * overlap their hit areas.
 */
const PATH_HIT_WIDTH = 28;

/**
 * Per-Sefirah Tailwind glow class. Pre-mapped (not built by string
 * concat) so Tailwind's JIT picks them up — the content scanner
 * needs the literal classnames in source.
 */
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

/** Sefirot whose halo is on regardless of clearedSefirot — endpoints of the Tree. */
const ALWAYS_LIT: ReadonlySet<SefirahKey> = new Set<SefirahKey>([
  'kether',
  'malkuth',
]);

interface TreeBoardProps {
  readonly className?: string;
  /**
   * If provided, the board renders player tokens at each player's
   * current Sefirah. Without it, the board is purely decorative.
   */
  readonly state?: GameState;
  /**
   * Player whose move highlights to show. Must match an `id` in
   * `state.players`. If omitted (or unknown), no highlights render
   * even when `state` is provided.
   */
  readonly activePlayerId?: string;
  /**
   * Fires when a *highlighted* path is clicked or keyboard-activated.
   * Clicks on non-highlighted paths are no-ops by design — invalid
   * moves shouldn't cost a click.
   */
  readonly onPathClick?: (pathNumber: number) => void;
  /**
   * When false, no paths render as valid (no highlight, no click
   * handler) regardless of the player's hand. The orchestrator wires
   * this from its phase machine: paths should only invite a click
   * during `'move'` phase. Defaults to `true` for backward compat
   * (#129).
   */
  readonly movesEnabled?: boolean;
  /**
   * #312 — when set, the path whose `arcanumNumber === highlightedCard`
   * lights up on the Tree (gradient stroke between the two endpoints'
   * Sefirot colours, brighter path-number badge). Multiple eligible
   * paths can light at once if a future change lets two cards share
   * an arcanum. Independent of `validPaths` — a player may hover a
   * card whose path doesn't touch their current Sefirah; the path
   * still lights up so they can see "this card travels here" before
   * deciding whether to keep or play it.
   */
  readonly highlightedCard?: number;
  /**
   * #384 — mode-aware Sefirah click. When set, each node renders as
   * a `<button>` that calls this handler with the Sefirah key on
   * click; nothing navigates. When omitted, the default behaviour
   * stands: each node renders as an `<a href="/sefirah/{key}">`
   * that navigates to the Codex detail page.
   *
   * The /play mount provides a handler so a mid-game Sefirah click
   * opens an inline popover instead of stranding the player on a
   * Codex page that has no "return to game" affordance and no
   * persisted gameplay state to come back to.
   */
  readonly onSefirahClick?: (key: SefirahKey) => void;
}

export function TreeBoard({
  className,
  state,
  activePlayerId,
  onPathClick,
  movesEnabled = true,
  highlightedCard,
  onSefirahClick,
}: TreeBoardProps): JSX.Element {
  // Scope IDs per render so two TreeBoards in the same DOM don't fight
  // over global #treeBackground / gradient references.
  const reactId = useId();
  const gradientId = `tree-bg-${reactId}`;
  // #129: respect `movesEnabled`. When the orchestrator's phase has
  // advanced past `'move'`, no path should highlight or accept
  // clicks — even if the player still holds the right card.
  const validPaths = movesEnabled
    ? computeValidPaths(state, activePlayerId)
    : EMPTY_VALID_PATHS;
  const interactive = onPathClick !== undefined;
  // Path numbers lit by `highlightedCard`. A card's arcanum maps to
  // exactly one path today (`pathByArcanum`); we use the more
  // permissive set construction so future cards-share-an-arcanum
  // changes don't need this code edited.
  const cardLitPaths = useMemo<ReadonlySet<number>>(() => {
    if (highlightedCard === undefined) return new Set();
    const lit = new Set<number>();
    for (const path of paths) {
      if (path.arcanumNumber === highlightedCard) lit.add(path.number);
    }
    return lit;
  }, [highlightedCard]);
  // Sefirot to draw breath halos for. Endpoints (Kether + Malkuth)
  // are always on; cleared Sefirot light up too. Static / no-state
  // renders skip the layer entirely so the demo route stays flat.
  const litSefirot = useMemo<ReadonlySet<SefirahKey>>(() => {
    if (!state) return new Set();
    const lit = new Set<SefirahKey>(ALWAYS_LIT);
    for (const player of state.players) {
      for (const key of player.clearedSefirot) lit.add(key);
    }
    return lit;
  }, [state]);
  // Per-Sefirah team Sparks count, cached by state identity. The
  // tooltip panels read these counts on render; computing once per
  // state change is cheaper than rederiving on every hover.
  const teamSparksByKey = useMemo<Readonly<Record<SefirahKey, number>>>(() => {
    const counts: Record<SefirahKey, number> = {
      kether: 0,
      chokmah: 0,
      binah: 0,
      chesed: 0,
      gevurah: 0,
      tiferet: 0,
      netzach: 0,
      hod: 0,
      yesod: 0,
      malkuth: 0,
    };
    if (!state) return counts;
    for (const player of state.players) {
      for (const key of player.sparksHeld) counts[key] += 1;
    }
    return counts;
  }, [state]);
  // Map-style accessibility: the SVG carries `role="figure"` with a
  // `<title>` describing the whole. Each Sefirah and path then exposes
  // its own `aria-label` so screen-reader users can navigate the tree
  // node-by-node. (Phase 3 interactivity assumes per-node AT focus.)
  return (
    <div
      data-tree-root
      className={`relative inline-block ${className ?? ''}`}
      style={{ width: '100%' }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="figure"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full"
      >
        <title>Tree of Life — ten Sefirot connected by twenty-two paths</title>
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1a1542" />
            <stop offset="100%" stopColor={GROUND} />
          </radialGradient>
          {/*
            #312 — per-path "card-lit" gradient. A linear gradient
            from the `from` Sefirah's colour to the `to` Sefirah's
            colour; the path stroke references it via
            `stroke="url(#card-lit-{n}-{reactId})"` when card-lit.
            Built once per path (only 22) inside <defs> so the path
            element itself stays a plain `<line>` — no SVG-defs
            churn on hover.
          */}
          {paths.map((path) => {
            const fromColor = sefirahByKey(path.from).color;
            const toColor = sefirahByKey(path.to).color;
            const a = nodeLayout[path.from];
            const b = nodeLayout[path.to];
            return (
              <linearGradient
                key={`card-lit-${path.number}`}
                id={`card-lit-${path.number}-${reactId}`}
                gradientUnits="userSpaceOnUse"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              >
                <stop offset="0%" stopColor={fromColor} stopOpacity={0.95} />
                <stop offset="100%" stopColor={toColor} stopOpacity={0.95} />
              </linearGradient>
            );
          })}
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill={`url(#${gradientId})`} />

        <Starfield />

        <g data-layer="paths">
          {paths.map((path) => {
            const a = nodeLayout[path.from];
            const b = nodeLayout[path.to];
            // #213: trimmed coordinates for the invisible hit-line.
            // The visible line still runs a→b; only the click target
            // is shrunk to live in the gap between the node circles.
            //
            // #288: path 32 (Yesod ↔ Malkuth) is intrinsically short —
            // its endpoints are 70 viewBox units apart, so the standard
            // trim leaves only 14 units of clickable hit-line, well
            // below WCAG 2.5.5's tap-target floor at typical render
            // scales. Skip the trim for this one path's hit overlay so
            // the tap target spans the full distance. Safe because the
            // node circles paint *after* the path layer and intercept
            // clicks first — clicks inside the visible Yesod or Malkuth
            // circle still register on the node, not on path 32. The
            // visible <line> below remains a→b for every path; only the
            // invisible hit overlay differs here.
            const hit =
              path.number === 32
                ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
                : trimEndpoints(a, b, NODE_RADIUS);
            const letter = letterByKey(path.letterKey);
            const fromName = sefirahByKey(path.from).englishName;
            const toName = sefirahByKey(path.to).englishName;
            const isValid = validPaths.has(path.number);
            const isCardLit = cardLitPaths.has(path.number);
            // Prose, not "↔" — screen readers announce the arrow as
            // "left right arrow" which clutters every label.
            const baseLabel = `Path ${path.number} (${letter.name}) — Arcanum ${path.arcanumNumber}, between ${fromName} and ${toName}`;
            const label = isValid ? `${baseLabel} (available move)` : baseLabel;
            // `clickable` is true only when `onPathClick` is defined AND
            // the path is currently valid for the active player. Capture
            // the callback in a const so the closures below don't carry
            // a misleading optional-chain through the type system.
            const clickable = interactive && isValid;
            const onClickHandler = onPathClick;
            const handleClick =
              clickable && onClickHandler
                ? () => onClickHandler(path.number)
                : undefined;
            const handleKey =
              clickable && onClickHandler
                ? (e: KeyboardEvent<SVGGElement>): void => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClickHandler(path.number);
                    }
                  }
                : undefined;
            // #312: stroke / opacity / width depending on lit state.
            // Order of precedence: validPath (gold, brightest) >
            // cardLit (gradient between Sefirot colours) > default
            // (faint veil). The validPath highlight reads as "you
            // can travel here right now"; the card-lit highlight as
            // "this card travels here, even if you can't from where
            // you stand." Both signals matter; the gold takes
            // precedence because it's the actionable one.
            const stroke = isValid
              ? TIFERET_GOLD
              : isCardLit
                ? `url(#card-lit-${path.number}-${reactId})`
                : VEIL;
            const strokeOpacity = isValid ? 0.95 : isCardLit ? 0.85 : 0.35;
            const strokeWidth = isValid ? 3 : isCardLit ? 2.5 : 1.5;
            return (
              <g
                key={path.number}
                data-path={path.number}
                data-valid={isValid ? 'true' : 'false'}
                data-card-lit={isCardLit ? 'true' : 'false'}
                role={clickable ? 'button' : 'img'}
                aria-label={label}
                tabIndex={clickable ? 0 : undefined}
                style={clickable ? { cursor: 'pointer' } : undefined}
                onClick={handleClick}
                onKeyDown={handleKey}
              >
                <title>{label}</title>
                {/*
                  #130: invisible wide-stroke hit-line so the path is
                  tappable on a finger-sized target, not just the
                  visible 1.5–3px stroke. PATH_HIT_WIDTH widens the
                  invisible target toward the WCAG 2.5.5 mobile minimum.

                  #213: trim each endpoint inward by NODE_RADIUS so the
                  hit-zone lives strictly between the two Sefirah node
                  circles, not under them. The Sefirah nodes paint
                  later in the SVG render order and intercept clicks
                  first, so a hit-line that overlaps a node was
                  effectively "stolen" — short central-pillar paths
                  (Yesod ↔ Malkuth in particular) had almost no
                  clickable surface. `linecap="butt"` prevents the
                  rounded cap from extending half-stroke-width back
                  toward the node we just trimmed past.
                */}
                <line
                  data-path-hit={path.number}
                  x1={hit.x1}
                  y1={hit.y1}
                  x2={hit.x2}
                  y2={hit.y2}
                  stroke="transparent"
                  strokeWidth={PATH_HIT_WIDTH}
                  strokeLinecap="butt"
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={strokeWidth}
                  pointerEvents="none"
                  // #206: smooth the stroke / opacity / width transition
                  // when validity flips (e.g. after a card play changes
                  // which paths are reachable). 200 ms sits below the
                  // perceived-delay threshold but above "snap."
                  // #312: the same easing handles the card-lit ↔
                  // baseline crossfade — hovering a card makes the
                  // path bloom into colour rather than snapping.
                  style={{
                    transition:
                      'stroke 300ms ease-out, stroke-opacity 300ms ease-out, stroke-width 300ms ease-out',
                  }}
                />
              </g>
            );
          })}
        </g>

        <g data-layer="path-labels" aria-hidden="true" pointerEvents="none">
          {/*
            #136: playtest finding — path numbers were not visibly
            rendered, only available via aria-label/tooltip. Render
            each as a small disc at the line midpoint to maximise
            legibility against the dark background AND against any
            path line that crosses underneath. The disc-+-text combo
            is the same trick the Sefirah nodes use; here it's tuned
            smaller so the path identity is visible without crowding.

            aria-hidden because the path's own <line> element already
            carries the full label; duplicating it on the text would
            double-announce in screen readers.

            #312: the badge gets a slightly larger r=10 (was r=9) and
            a higher-opacity stroke (0.9, was 0.7) so the number
            reads on mobile across any path that crosses underneath.
            Card-lit paths get a brighter pill border via
            `data-card-lit` — picked up by the per-label fragment so
            the highlight "travels" from the path stroke to the
            badge.
          */}
          {paths.map((path) => {
            const a = nodeLayout[path.from];
            const b = nodeLayout[path.to];
            const offset = LABEL_OFFSETS[path.number] ?? { dx: 0, dy: 0 };
            const mx = (a.x + b.x) / 2 + offset.dx;
            const my = (a.y + b.y) / 2 + offset.dy;
            const isCardLit = cardLitPaths.has(path.number);
            return (
              <g
                key={path.number}
                data-path-label={path.number}
                data-card-lit={isCardLit ? 'true' : 'false'}
                transform={`translate(${mx}, ${my})`}
              >
                <circle
                  r={10}
                  fill={GROUND}
                  stroke={isCardLit ? TIFERET_GOLD : VEIL}
                  strokeOpacity={isCardLit ? 0.95 : 0.9}
                  strokeWidth={isCardLit ? 1.25 : 0.85}
                  style={{
                    transition:
                      'stroke 300ms ease-out, stroke-opacity 300ms ease-out, stroke-width 300ms ease-out',
                  }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontFamily="var(--font-display), serif"
                  fontWeight={600}
                  fill={isCardLit ? TIFERET_GOLD : VEIL}
                >
                  {path.number}
                </text>
              </g>
            );
          })}
        </g>

        <PlayerTokens state={state} activePlayerId={activePlayerId} />

        <g data-layer="nodes">
          {sefirot.map((sefirah) => {
            const pos = nodeLayout[sefirah.key];
            // #214: declutter — only the English transliteration is
            // rendered as visible text on the board. Hebrew script and
            // the 1-10 number are gone visually (still in `data/sefirot.ts`
            // and used by other surfaces like BlessingRitual's hero
            // badge). The `aria-label` keeps the position number so
            // screen-reader users still get spatial context (e.g.
            // "Malkuth (10)" → tenth in the descent), since visible-
            // text removal is a UX choice that shouldn't strip
            // orientation cues from the AT layer.
            const label = `${sefirah.englishName} (${sefirah.number})`;
            // #37: a Sefirah is "cleared" if any current player has it
            // in their `clearedSefirot` set. The wrapping `<g>` carries
            // `data-cleared` so the visible circle can run the
            // `sefirah-clear-pulse` keyframe (Tailwind config).
            const cleared = state
              ? state.players.some((p) => p.clearedSefirot.has(sefirah.key))
              : false;
            return (
              <g
                key={sefirah.key}
                data-sefirah={sefirah.key}
                data-cleared={cleared ? 'true' : 'false'}
                role="img"
                aria-label={label}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  fill={sefirah.color}
                  stroke={VEIL}
                  strokeOpacity={0.6}
                  strokeWidth={1.5}
                  className={cleared ? 'animate-sefirah-clear-pulse motion-reduce:animate-none' : ''}
                  // `transform-box: fill-box` + `transform-origin: center`
                  // anchors the scale at the circle's geometric centre
                  // cross-browser. CSS px transform-origins on raw SVG
                  // elements are interpreted differently by Chrome vs
                  // Firefox — fill-box normalizes to the element's own
                  // bounding box.
                  //
                  // #206: stroke / stroke-opacity transitions ease the
                  // visual change when a player crosses into a Sefirah
                  // (active-ring updates) so the highlight doesn't snap.
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transition:
                      'stroke 200ms ease-out, stroke-opacity 200ms ease-out, fill-opacity 200ms ease-out',
                  }}
                />
                {/*
                  #289: render the English name INSIDE the circle so the
                  Sefirah is identifiable at a single glance, instead of
                  forcing the eye from disc → label-below → disc again.
                  `dominantBaseline="middle"` centres the glyph box on
                  `pos.y` so the visible text sits at the geometric
                  centre of the disc, not below it.

                  Fill is picked per-Sefirah by `contrastTextColour` —
                  with ten different fills (white, gold, near-black,
                  crimson, royal blue, …), no single text colour clears
                  WCAG AA against all of them. The selector returns
                  whichever of `#0e1320` (dark) or `#f8f8ff` (VEIL)
                  yields the higher contrast ratio for the given fill.
                */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSizeForName(sefirah.englishName)}
                  fontFamily="var(--font-display), serif"
                  fontWeight={600}
                  fill={contrastTextColour(sefirah.color)}
                  letterSpacing={0.5}
                  style={{ textTransform: 'uppercase' }}
                >
                  {sefirah.englishName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/*
        #312 — HTML overlay layer. Carries:
        - Breath halos (per-Sefirah box-shadow glow + animate-breath).
          Only mounts when the Sefirah is "lit" (Kether/Malkuth always,
          plus any cleared Sefirah). The endpoints' presence on a
          fresh game gives the player two anchors of warmth even
          before any progress.
        - Hover surface (transparent <a> covering each node)
          carrying tooltip and click-through to /sefirah/[key].

        Skipped entirely on a no-state render — the demo route stays
        flat. The container fills the parent's box and matches the
        SVG's aspect ratio so percentage-positioned nodes resolve
        identically to the SVG geometry.
      */}
      {state ? (
        <div
          data-layer="tree-overlay"
          // Intentionally NOT aria-hidden: the overlay carries the
          // hover/focus links and tooltips that AT users depend on.
          className="pointer-events-none absolute inset-0"
          style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        >
          {sefirot.map((sefirah) => {
            const pos = nodeLayout[sefirah.key];
            const leftPct = (pos.x / VIEW_W) * 100;
            const topPct = (pos.y / VIEW_H) * 100;
            const lit = litSefirot.has(sefirah.key);
            const tooltipId = `sefirah-tip-${reactId}-${sefirah.key}`;
            // #312 — flip the tooltip ABOVE the node for the bottom
            // two Sefirot (Yesod, Malkuth) so it doesn't clip the SVG
            // edge or rely on an overflow:visible ancestor that we
            // can't guarantee. Top-tree nodes always render below.
            const tooltipFlip =
              sefirah.key === 'yesod' || sefirah.key === 'malkuth';
            return (
              <div
                key={sefirah.key}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                {/*
                  Breath halo — only mounted when this Sefirah is lit.
                  Sized small (12px) so the box-shadow stack carries
                  the perceptual halo; the disc itself just anchors
                  the shadow. Reduced-motion users get a static halo
                  via the motion-safe variant.
                */}
                {lit ? (
                  <span
                    data-breath-halo={sefirah.key}
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-breath ${GLOW_CLASS_BY_KEY[sefirah.key]}`}
                    style={{
                      backgroundColor: sefirah.color,
                      opacity: 0.85,
                      // Stagger by hash of key so halos don't pulse
                      // synchronously. A simple parity flip would
                      // group five-and-five; using the key length
                      // gives a four-way distribution across the ten
                      // Sefirot which reads as more organic.
                      animationDelay: `${(sefirah.key.length % 4) * 1500}ms`,
                    }}
                  />
                ) : null}
                {/*
                  Hover/focus surface. The transparent overlay sits
                  over the node so pointer events land on it (the
                  breath halo above is `pointer-events-none`). The
                  `peer` class enables a Tailwind sibling selector
                  for the tooltip below.

                  #384: mode-aware. Without `onSefirahClick`, the
                  surface is an `<a href="/sefirah/{key}">` so click
                  navigates to the Codex detail page. With
                  `onSefirahClick` (the /play mount), the surface is
                  a `<button>` that fires the handler — a mid-game
                  click opens an inline popover instead of stranding
                  the player on a Codex page.
                */}
                {onSefirahClick !== undefined ? (
                  <button
                    type="button"
                    data-sefirah-link={sefirah.key}
                    aria-label={`Open ${sefirah.englishName} info`}
                    aria-describedby={tooltipId}
                    onClick={() => onSefirahClick(sefirah.key)}
                    className="peer pointer-events-auto absolute left-1/2 top-1/2 block h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
                  />
                ) : (
                  <a
                    data-sefirah-link={sefirah.key}
                    href={`/sefirah/${sefirah.key}`}
                    aria-label={`Open ${sefirah.englishName} in the Codex`}
                    aria-describedby={tooltipId}
                    className="peer pointer-events-auto absolute left-1/2 top-1/2 block h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
                  />
                )}
                {/*
                  Tooltip surface. `peer-hover` / `peer-focus` reveals
                  it; otherwise it sits in the DOM (so AT users with
                  `aria-describedby` can read it) but visually hidden.
                  `pointer-events-none` so the tooltip itself never
                  intercepts pointer events that should land on the
                  node link below.

                  Default: parks just below the node disc
                  (`translate-y-6`). For Yesod / Malkuth the tooltip
                  flips ABOVE the node (`-translate-y-full -mt-6`) so
                  it doesn't clip the SVG edge or rely on an
                  overflow:visible ancestor that callers can't be
                  forced to provide. The flip is a layout decision
                  pinned by `data-tooltip-position` so tests can
                  assert it.
                */}
                <div
                  data-tooltip-position={tooltipFlip ? 'above' : 'below'}
                  className={`absolute left-1/2 top-1/2 z-10 -translate-x-1/2 opacity-0 transition-opacity duration-200 ease-emerge peer-hover:opacity-100 peer-focus-visible:opacity-100 ${
                    tooltipFlip
                      ? '-translate-y-full -mt-6'
                      : 'translate-y-6'
                  }`}
                >
                  <SefirahTooltip
                    sefirahKey={sefirah.key}
                    teamSparks={teamSparksByKey[sefirah.key]}
                    id={tooltipId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Pure: shrink the segment a→b inward by `inset` units along its own
 * direction, returning the new endpoints. Used by the path hit-line
 * (#213) so its interactive zone doesn't overlap the Sefirah node
 * circles that paint on top and intercept clicks first.
 *
 * If the segment is shorter than `2 × inset` (no real-world Tree path
 * is, but defensively), returns the midpoint for both endpoints — the
 * hit-line collapses to a degenerate point rather than inverting.
 *
 * Note: path 32 (Yesod↔Malkuth, length 70) trims down to only 14 units
 * of hit-line — geometrically valid but below any useful tap target.
 * The call site special-cases path 32 to skip this trim (see #288);
 * SVG paint order keeps node clicks landing on the nodes regardless.
 */
/**
 * Pick a font size for a Sefirah's English name based on character
 * count, so labels fit inside the 28-radius disc without horizontal
 * overflow. Tuned by visual review:
 *   - ≤ 7 chars (CROWN, MERCY, BEAUTY, VICTORY, KINGDOM, WISDOM): 9
 *   - 8-9 chars (SEVERITY, SPLENDOR, FOUNDATION): 8
 *   - 10+ chars (UNDERSTANDING, LOVINGKINDNESS): 7
 *
 * Some visual unevenness across Sefirot is the cost of keeping every
 * label inside its circle. The alternative — `textLength` + glyph
 * compression — produced smeared letterforms at small font sizes.
 */
function fontSizeForName(name: string): number {
  if (name.length <= 7) return 9;
  if (name.length <= 9) return 8;
  return 7;
}

function trimEndpoints(
  a: NodeLayout,
  b: NodeLayout,
  inset: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= 2 * inset) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return { x1: mx, y1: my, x2: mx, y2: my };
  }
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: a.x + ux * inset,
    y1: a.y + uy * inset,
    x2: b.x - ux * inset,
    y2: b.y - uy * inset,
  };
}

const STARS: readonly (readonly [number, number, number])[] = [
  [40, 80, 0.6],
  [340, 50, 0.4],
  [120, 30, 0.5],
  [260, 110, 0.3],
  [60, 220, 0.4],
  [355, 350, 0.5],
  [30, 380, 0.3],
  [380, 220, 0.4],
  [180, 600, 0.3],
  [10, 540, 0.4],
  [390, 510, 0.5],
  [140, 380, 0.3],
];

/**
 * Light scattering of background stars. Positions are a fixed list,
 * not seeded `Math.random()`, so snapshot tests stay stable.
 * Decorative; aria-hidden so AT skips it.
 */
function Starfield(): JSX.Element {
  return (
    <g aria-hidden="true">
      {STARS.map(([cx, cy, opacity], i) => (
        <circle key={i} cx={cx} cy={cy} r={0.8} fill={VEIL} fillOpacity={opacity} />
      ))}
    </g>
  );
}

const PLAYER_TOKEN_COLORS: readonly string[] = [
  '#d4af37', // gold
  '#3a8f4a', // green
  '#9b88c4', // violet
  '#e07b00', // orange
];
const TOKEN_RADIUS = 10;

/**
 * Pick a stable color for a player based on their id, not their array
 * index. If a player disconnects mid-session, the remaining players'
 * colors must not shuffle — observers track each other by color, and
 * a silent reassignment is a real UX trap.
 *
 * Hash is djb2-style and intentionally weak — we only need a uniform
 * mapping into 4 buckets. Colour collisions across 5+ players are
 * possible but tolerable; the active-ring + initial differentiate.
 */
function tokenColorForId(playerId: string): string {
  let hash = 5381;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 33) ^ playerId.charCodeAt(i);
  }
  const idx = Math.abs(hash) % PLAYER_TOKEN_COLORS.length;
  return PLAYER_TOKEN_COLORS[idx] ?? VEIL;
}

/**
 * Render player tokens on top of their current Sefirah. Multiple
 * players on one Sefirah stack horizontally below the node so they
 * don't overlap. The active player's token gets a brighter outer
 * ring so the orchestrator can read "whose turn is it" from the board
 * without consulting another panel.
 *
 * Pure presentational layer — no interaction, no token-drag. Phase 3
 * surfaces movement via the path click handler; the token is just an
 * indicator of who's where.
 *
 * #312 — pawn polish. Two layered animations:
 *   - Idle: every token's wrapping group runs a slow ~4 s breath via
 *     the `motion-safe:animate-breath` utility (the underlying
 *     keyframe is the project's 6 s breath; we slow it to 4 s with
 *     `[animation-duration:4000ms]` so the pawn's pulse is distinct
 *     from the Tree's slower atmospheric loop without competing with
 *     it visually).
 *   - Move: the active player's token carries `data-just-moved="true"`
 *     when their `lastArrivalPathNumber` is set (i.e. they're not on
 *     a fresh game). The active ring then runs the existing
 *     `animate-path-travel-pulse` keyframe for ~600 ms — a soft gold
 *     drop-shadow that fades back to baseline.
 */
function PlayerTokens({
  state,
  activePlayerId,
}: {
  state: GameState | undefined;
  activePlayerId: string | undefined;
}): JSX.Element | null {
  if (!state) return null;
  const groups = new Map<SefirahKey, typeof state.players>();
  for (const player of state.players) {
    const list = groups.get(player.position) ?? [];
    groups.set(player.position, [...list, player]);
  }
  const tokens: JSX.Element[] = [];
  for (const player of state.players) {
    const groupAtPos = groups.get(player.position) ?? [];
    const positionInGroup = groupAtPos.findIndex((p) => p.id === player.id);
    const groupSize = groupAtPos.length;
    const node = nodeLayout[player.position];
    // Center the row: each token sits at offset (i - (n-1)/2) * spacing
    // from the node's x. With one player the offset is 0; with two,
    // ±(spacing/2); etc.
    const spacing = TOKEN_RADIUS * 2 + 2;
    const groupWidth = (groupSize - 1) * spacing;
    const tokenX = node.x - groupWidth / 2 + positionInGroup * spacing;
    const tokenY = node.y + NODE_RADIUS + 4 + TOKEN_RADIUS;
    const color = tokenColorForId(player.id);
    const isActive = player.id === activePlayerId;
    const initial =
      (player.name.charAt(0) || player.id.charAt(0) || '?').toUpperCase();
    // #312: data-just-moved is true iff this player's last arrival
    // path is recorded (which means they moved at least once). The
    // active-ring picks up the `path-travel-pulse` keyframe in that
    // case, painting a brief gold afterglow.
    const justMoved =
      isActive && player.lastArrivalPathNumber !== undefined;
    tokens.push(
      <g
        key={player.id}
        data-player={player.id}
        data-active={isActive ? 'true' : 'false'}
        data-just-moved={justMoved ? 'true' : 'false'}
        role="img"
        aria-label={`${player.name} at ${sefirahByKey(player.position).englishName}${isActive ? ' (active turn)' : ''}`}
        // #312: idle breath. `[animation-duration:4000ms]` overrides
        // the 6 s default to give pawns a distinct cadence from the
        // Tree's atmospheric loop. Reduced-motion users see the
        // static token.
        className="motion-safe:animate-breath motion-safe:[animation-duration:4000ms]"
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center',
        }}
      >
        {isActive ? (
          <circle
            cx={tokenX}
            cy={tokenY}
            r={TOKEN_RADIUS + 3}
            fill="none"
            stroke={VEIL}
            strokeOpacity={0.9}
            strokeWidth={1.5}
            // #312: the active ring runs the path-travel-pulse
            // keyframe whenever data-just-moved is true. Until React
            // re-renders past the move (e.g. into the challenge
            // phase) the keyframe runs once via `forwards` — which
            // is fine: the orchestrator transitions out of `'move'`
            // phase shortly after, unmounting the just-moved flag.
            className={
              justMoved
                ? 'motion-safe:animate-path-travel-pulse motion-reduce:animate-none'
                : ''
            }
          />
        ) : null}
        <circle
          cx={tokenX}
          cy={tokenY}
          r={TOKEN_RADIUS}
          fill={color}
          stroke={GROUND}
          strokeWidth={1.5}
        />
        <text
          x={tokenX}
          y={tokenY + 4}
          textAnchor="middle"
          fontSize={11}
          fontFamily="var(--font-display), serif"
          fontWeight={600}
          fill={GROUND}
        >
          {initial}
        </text>
      </g>,
    );
  }
  return <g data-layer="players">{tokens}</g>;
}

/**
 * Build the set of valid path numbers for the active player, or an
 * empty set when interactivity isn't engaged. Returning a `Set` (not
 * an array) keeps the per-path lookup O(1) — there are 22 paths so
 * the difference is academic, but the intent is clearer.
 */
function computeValidPaths(
  state: GameState | undefined,
  activePlayerId: string | undefined,
): ReadonlySet<number> {
  if (!state || !activePlayerId) return new Set();
  return new Set(validPathsForPlayer(state, activePlayerId));
}
