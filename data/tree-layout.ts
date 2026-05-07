import type { SefirahKey } from './types';

/**
 * Canonical Tree-of-Life node geometry — viewBox `0 0 400 620`,
 * three-pillar layout. Single source of truth; importers must not
 * redefine these positions locally.
 *
 * Pillar anchors: Severity at x=80 (viewer's left), Balance at x=200
 * (centre), Mercy at x=320 (viewer's right). Vertical positions are
 * tuned for readability; project convention places Mercy on the
 * viewer's right (matches the reference materials' "(R)" / "(L)"
 * labels).
 *
 * Consumers: `components/tree/TreeBoard.tsx` (interactive play
 * surface), `components/home/Hero.tsx` (home-page hero), and
 * `components/atmosphere/LobbyBackdrop.tsx` (faint silhouette behind
 * the lobby). Drift between these used to require manual
 * three-way synchronization; pulling the table into `data/` kills
 * that risk.
 */

export interface NodeLayout {
  readonly x: number;
  readonly y: number;
}

export const TREE_VIEW_W = 400;
export const TREE_VIEW_H = 620;

export const treeNodeLayout: Readonly<Record<SefirahKey, NodeLayout>> = {
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
