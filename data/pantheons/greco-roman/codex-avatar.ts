import type { SefirahKey } from '../../types';
import { sefirahCodex } from '../../codex-content';

/**
 * Per-Sefirah codex "Voice" row, derived from the existing
 * `sefirahCodex` content. Phase A1 of Epic #293 (#547): the codex
 * `avatar` field stays on `SefirahCodexContent` for now (A3 / #549
 * removes it once consumers read via the registry).
 *
 * `null` for Kether — the Final Threshold is collective and "the
 * team becomes the avatar"; no single deity. Hestia stays attached
 * to Malkuth even though she's a companion (codex still names her).
 */
export const sefirahCodexAvatar: Readonly<Record<SefirahKey, string | null>> = {
  kether: sefirahCodex.kether.avatar,
  chokmah: sefirahCodex.chokmah.avatar,
  binah: sefirahCodex.binah.avatar,
  chesed: sefirahCodex.chesed.avatar,
  gevurah: sefirahCodex.gevurah.avatar,
  tiferet: sefirahCodex.tiferet.avatar,
  netzach: sefirahCodex.netzach.avatar,
  hod: sefirahCodex.hod.avatar,
  yesod: sefirahCodex.yesod.avatar,
  malkuth: sefirahCodex.malkuth.avatar,
};
