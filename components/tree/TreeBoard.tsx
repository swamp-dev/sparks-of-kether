import { useId, type KeyboardEvent } from 'react';
import { letterByKey, paths, sefirahByKey, sefirot } from '@/data';
import { GROUND, TIFERET_GOLD, VEIL } from '@/data/colors';
import type { SefirahKey } from '@/data';
import type { GameState } from '@/engine/types';
import { validPathsForPlayer } from './valid-paths';

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
}

export function TreeBoard({
  className,
  state,
  activePlayerId,
  onPathClick,
  movesEnabled = true,
}: TreeBoardProps): JSX.Element {
  // Scope the gradient ID per render so two TreeBoards in the same DOM
  // don't fight over a global #treeBackground reference.
  const gradientId = `tree-bg-${useId()}`;
  // #129: respect `movesEnabled`. When the orchestrator's phase has
  // advanced past `'move'`, no path should highlight or accept
  // clicks — even if the player still holds the right card.
  const validPaths = movesEnabled
    ? computeValidPaths(state, activePlayerId)
    : EMPTY_VALID_PATHS;
  const interactive = onPathClick !== undefined;
  // Map-style accessibility: the SVG carries `role="figure"` with a
  // `<title>` describing the whole. Each Sefirah and path then exposes
  // its own `aria-label` so screen-reader users can navigate the tree
  // node-by-node. (Phase 3 interactivity assumes per-node AT focus.)
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="figure"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Tree of Life — ten Sefirot connected by twenty-two paths</title>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1a1542" />
          <stop offset="100%" stopColor={GROUND} />
        </radialGradient>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill={`url(#${gradientId})`} />

      <Starfield />

      <g data-layer="paths">
        {paths.map((path) => {
          const a = nodeLayout[path.from];
          const b = nodeLayout[path.to];
          const letter = letterByKey(path.letterKey);
          const fromName = sefirahByKey(path.from).englishName;
          const toName = sefirahByKey(path.to).englishName;
          const isValid = validPaths.has(path.number);
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
          return (
            <g
              key={path.number}
              data-path={path.number}
              data-valid={isValid ? 'true' : 'false'}
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
                invisible target toward the WCAG 2.5.5 mobile minimum
                (44px on a 320px viewport renders this 28px viewBox-
                unit stroke at ~22.4px — close enough; the visible
                board scales up beyond that on desktop). The visible
                line and label disc paint over the top.
              */}
              <line
                data-path-hit={path.number}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={PATH_HIT_WIDTH}
                strokeLinecap="round"
              />
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isValid ? TIFERET_GOLD : VEIL}
                strokeOpacity={isValid ? 0.95 : 0.35}
                strokeWidth={isValid ? 3 : 1.5}
                pointerEvents="none"
                // #206: smooth the stroke / opacity / width transition
                // when validity flips (e.g. after a card play changes
                // which paths are reachable). 200 ms sits below the
                // perceived-delay threshold but above "snap."
                style={{
                  transition:
                    'stroke 200ms ease-out, stroke-opacity 200ms ease-out, stroke-width 200ms ease-out',
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
        */}
        {paths.map((path) => {
          const a = nodeLayout[path.from];
          const b = nodeLayout[path.to];
          const offset = LABEL_OFFSETS[path.number] ?? { dx: 0, dy: 0 };
          const mx = (a.x + b.x) / 2 + offset.dx;
          const my = (a.y + b.y) / 2 + offset.dy;
          return (
            <g
              key={path.number}
              data-path-label={path.number}
              transform={`translate(${mx}, ${my})`}
            >
              <circle
                r={9}
                fill={GROUND}
                stroke={VEIL}
                strokeOpacity={0.7}
                strokeWidth={0.75}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontFamily="var(--font-display), serif"
                fontWeight={600}
                fill={VEIL}
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
              <text
                x={pos.x}
                y={pos.y + NODE_RADIUS + 14}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-display), serif"
                fill={VEIL}
                letterSpacing={1.5}
                style={{ textTransform: 'uppercase' }}
              >
                {sefirah.englishName}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
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
    tokens.push(
      <g
        key={player.id}
        data-player={player.id}
        data-active={isActive ? 'true' : 'false'}
        role="img"
        aria-label={`${player.name} at ${sefirahByKey(player.position).englishName}${isActive ? ' (active turn)' : ''}`}
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
