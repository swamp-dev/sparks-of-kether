import { sefirahBlessings } from '../greco-roman/blessings';
import {
  sefirahFraming,
  sefirahFramingPlaceholder,
} from '../greco-roman/framing';
import {
  sefirahPlayerResponses,
  sefirahVerdicts,
} from '../greco-roman/verdicts';
import type { Pantheon } from '../types';
import { avatarNames } from './avatar-names';
import { sefirahCodexAvatar } from './codex-avatar';

/**
 * Egyptian pantheon — Phase B2 of Epic #293 (#552). Ships avatar
 * names + codex avatar; verdict / blessing / framing matrices fall
 * back to the Greco-Roman content as a temporary stopgap until
 * Phase B's voice authoring tickets land Egyptian-voiced copy:
 *
 *   - B3 (#553) — Egyptian verdict matrix → replaces `sefirahVerdicts`
 *     and `sefirahPlayerResponses`.
 *   - B4 (#554) — Egyptian blessing matrix → replaces `sefirahBlessings`.
 *   - B5 (#555) — Egyptian framing copy → replaces `sefirahFraming`
 *     and `sefirahFramingPlaceholder`.
 *
 * The fallbacks are deliberate. Without them the registry shape would
 * fail to compile; with them, a developer who flips
 * `localStorage.sok.pantheonId = 'egyptian'` sees Egyptian names but
 * Greek-flavoured verdict / blessing / framing copy. This is visible
 * to devs but not user-facing — the toggle UI (#557) won't ship
 * until at least B3 lands real Egyptian verdicts.
 *
 * Source: `reference/pantheons/egyptian.md` (#551).
 */
export const egyptian: Pantheon = {
  id: 'egyptian',
  displayName: 'Egyptian',
  avatarNames,
  sefirahCodexAvatar,
  // TODO(#555) replace with Egyptian framing copy.
  sefirahFraming,
  // TODO(#555) replace with Egyptian framing placeholders.
  sefirahFramingPlaceholder,
  // TODO(#553) replace with Egyptian verdict matrix.
  sefirahVerdicts,
  // TODO(#553) replace with Egyptian player responses.
  sefirahPlayerResponses,
  // TODO(#554) replace with Egyptian blessing matrix.
  sefirahBlessings,
};
