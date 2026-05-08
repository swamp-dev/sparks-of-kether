import { sefirahBlessings } from './blessings';
import { sefirahFraming, sefirahFramingPlaceholder } from './framing';
import { sefirahPlayerResponses, sefirahVerdicts } from './verdicts';
import type { Pantheon } from '../types';
import { avatarNames } from './avatar-names';
import { sefirahCodexAvatar } from './codex-avatar';

/**
 * Greco-Roman pantheon — the MVP avatar set (Hermes, Athena, …).
 * All per-Sefirah content (avatar names, codex avatar, framing,
 * verdicts, blessings) lives in this directory; the registry entry
 * is fully self-contained. Phase A4 of Epic #293 (#550) completed
 * the data-layer move from top-level `data/sefirah-{verdicts,
 * blessings,framing}.ts` into here.
 */
export const grecoRoman: Pantheon = {
  id: 'greco-roman',
  displayName: 'Greco-Roman',
  avatarNames,
  sefirahCodexAvatar,
  sefirahFraming,
  sefirahFramingPlaceholder,
  sefirahVerdicts,
  sefirahPlayerResponses,
  sefirahBlessings,
};
