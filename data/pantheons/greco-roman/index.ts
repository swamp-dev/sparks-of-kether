import { sefirahBlessings } from '../../sefirah-blessings';
import { sefirahFraming } from '../../sefirah-framing';
import { sefirahVerdicts } from '../../sefirah-verdicts';
import type { Pantheon } from '../types';
import { avatarNames } from './avatar-names';
import { sefirahCodexAvatar } from './codex-avatar';

/**
 * Greco-Roman pantheon — the MVP avatar set (Hermes, Athena, …).
 * Phase A1 of Epic #293 (#547). The `sefirahFraming`, `sefirahVerdicts`,
 * and `sefirahBlessings` slots reference the existing top-level
 * matrix exports; A4 (#550) moves that content into this directory.
 */
export const grecoRoman: Pantheon = {
  id: 'greco-roman',
  displayName: 'Greco-Roman',
  avatarNames,
  sefirahCodexAvatar,
  sefirahFraming,
  sefirahVerdicts,
  sefirahBlessings,
};
