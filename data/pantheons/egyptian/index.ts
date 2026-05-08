import { sefirahBlessings } from '../greco-roman/blessings';
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
 * avatar; B3 (#553) is shipping the verdict matrix in two PRs (this
 * branch is PR 1, the solar quartet — Ra, Horus, Osiris, Hathor; PR
 * 2 follows with Amun, Isis, Thoth, Khonsu). The hybrid matrix —
 * 4 Egyptian-authored cells, 4 still-Greco-Roman fallback cells —
 * lives inside `data/pantheons/egyptian/verdicts.ts`.
 *
 * `sefirahPlayerResponses`, `sefirahFraming`, `sefirahFramingPlaceholder`,
 * and `sefirahBlessings` continue to fall back to the Greco-Roman
 * content until their authoring tickets land:
 *
 *   - B3 (#553 PR 2) — Egyptian Amun/Isis/Thoth/Khonsu verdict cells.
 *   - B3 follow-up — Egyptian player responses (out of scope for
 *     #553's verdict matrix; tracked separately).
 *   - B4 (#554) — Egyptian blessing matrix → replaces `sefirahBlessings`.
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
  // PR 1 of #553 ships the solar quartet; PR 2 ships the rest. The
  // hybrid (4 Egyptian, 4 greco-roman fallback) is inside this matrix.
  sefirahVerdicts,
  // TODO(#553 follow-up) replace with Egyptian player responses.
  sefirahPlayerResponses,
  // TODO(#554) replace with Egyptian blessing matrix.
  sefirahBlessings,
};
