import { sefirahBlessings } from './blessings';
import {
  sefirahFraming,
  sefirahFramingPlaceholder,
} from '../greco-roman/framing';
import { sefirahPlayerResponses } from '../greco-roman/verdicts';
import type { Pantheon } from '../types';
import { avatarNames } from './avatar-names';
import { sefirahCodexAvatar } from './codex-avatar';
import { sefirahVerdicts } from './verdicts';

/**
 * Egyptian pantheon — Phase B2 (#552) shipped avatar names + codex
 * avatar; B3 (#553) shipped the verdict matrix (PR 1 — solar quartet,
 * #606; PR 2 — contemplative cluster, #613). B4 (#554) ships the
 * blessing matrix below — `sefirahBlessings` is now Egyptian-authored
 * across all 10 sefirot.
 *
 * `sefirahPlayerResponses`, `sefirahFraming`, and
 * `sefirahFramingPlaceholder` continue to fall back to the
 * Greco-Roman content until their authoring tickets land:
 *
 *   - B3 follow-up — Egyptian player responses (out of scope for
 *     #553's verdict matrix; tracked separately).
 *   - B5 (#555) — Egyptian framing copy → replaces `sefirahFraming`
 *     and `sefirahFramingPlaceholder`.
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
  sefirahVerdicts,
  // TODO(#553 follow-up) replace with Egyptian player responses.
  sefirahPlayerResponses,
  sefirahBlessings,
};
