import { sefirahBlessings } from './blessings';
import { sefirahFraming, sefirahFramingPlaceholder } from './framing';
import { sefirahPlayerResponses } from '../greco-roman/verdicts';
import type { Pantheon } from '../types';
import { avatarNames } from './avatar-names';
import { sefirahCodexAvatar } from './codex-avatar';
import { sefirahVerdicts } from './verdicts';

/**
 * Egyptian pantheon — Phase B2 (#552) shipped avatar names + codex
 * avatar; B3 (#553) shipped the verdict matrix (PR 1 — solar
 * quartet, #606; PR 2 — contemplative cluster, #613). B4 (#554)
 * shipped the Egyptian blessing matrix. B5 (#555) ships the
 * framing matrix below — `sefirahFraming` and
 * `sefirahFramingPlaceholder` are now Egyptian-authored.
 *
 * `sefirahPlayerResponses` continues to fall back to the
 * Greco-Roman content until its authoring ticket lands (#553
 * follow-up, tracked separately).
 *
 * Source: `reference/pantheons/egyptian.md` (#551).
 */
export const egyptian: Pantheon = {
  id: 'egyptian',
  displayName: 'Egyptian',
  avatarNames,
  sefirahCodexAvatar,
  sefirahFraming,
  sefirahFramingPlaceholder,
  sefirahVerdicts,
  // TODO(#553 follow-up) replace with Egyptian player responses.
  sefirahPlayerResponses,
  sefirahBlessings,
};
