import type { SefirahKey } from '@/data';
import type { GameState } from '@/engine/types';

/**
 * Sefirot considered "upper Tree" for hand-visibility purposes — the
 * supernal triad above the Veil of the Abyss. Per `design/mechanics.md`,
 * a player's hand becomes public to the team once that player has
 * crossed into the upper Tree.
 *
 * Tiferet is intentionally NOT in the set: it sits below the Abyss
 * and the heart-mediator role wants the hand to stay private until
 * the supernal threshold is crossed.
 */
const UPPER_TREE: ReadonlySet<SefirahKey> = new Set<SefirahKey>([
  'kether',
  'chokmah',
  'binah',
]);

/**
 * Whether `viewerId` may see `ownerId`'s hand. Always true when the
 * viewer is the owner. Otherwise true only when the owner has ascended
 * into the upper Tree.
 *
 * Returning false on unknown ids errs on the side of privacy.
 */
export function isHandVisible(
  state: GameState,
  viewerId: string,
  ownerId: string,
): boolean {
  if (viewerId === ownerId) return true;
  const owner = state.players.find((p) => p.id === ownerId);
  if (owner === undefined) return false;
  return UPPER_TREE.has(owner.position);
}
