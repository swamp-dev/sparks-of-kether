/**
 * Re-export shim. The data and types moved to
 * `data/pantheons/greco-roman/avatar-names.ts` and
 * `data/pantheons/types.ts` in Phase A1 of Epic #293 (#547). This shim
 * keeps existing consumer imports compiling unchanged; A3 (#549)
 * migrates consumers to read via the pantheon registry.
 */

export type { EncounterAvatarKey } from './types';
export type { AvatarName } from './pantheons/types';
export { avatarNames } from './pantheons/greco-roman/avatar-names';
