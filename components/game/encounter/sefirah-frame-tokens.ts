import type { SefirahKey } from '@/data';

/**
 * Per-Sefirah Tailwind class tokens for the EncounterScreen dramatic
 * frame (#315). Pulled out into one file so:
 *   - the EncounterScreen body stays readable;
 *   - Tailwind's content-scanner can statically pick up every class
 *     (the recipes are full literals here, not dynamically constructed
 *     strings — Tailwind would otherwise tree-shake them out);
 *   - any future per-Sefirah accent (path link colour, button hover)
 *     lives next to its peers.
 *
 * The mapping is keyed on `SefirahKey` (10 entries) but only the 8
 * challenge Sefirot are reachable from the encounter (Malkuth has
 * `kind: 'no-check'`, Kether has `kind: 'collective'`; both throw at
 * `EncounterScreen` mount time). The full table is kept anyway so
 * future surfaces can reuse it without re-deriving.
 *
 * Tailwind contract: every class string here is a literal so the
 * `content` glob picks it up. Do NOT collapse into a template string —
 * that disables JIT extraction.
 */

interface SefirahFrameTokens {
  /** Glow ring around the modal frame. Three-stack box-shadow recipe per `docs/motion.md` § Glow scale. */
  readonly frameShadow: string;
  /** Border colour class for the frame (Tailwind utility). */
  readonly frameBorder: string;
  /** Avatar portrait ring background (a tinted plate at the Sefirah colour). */
  readonly avatarPlate: string;
  /** Avatar portrait ring colour (border). */
  readonly avatarRing: string;
  /** Header underline accent. */
  readonly headerAccent: string;
  /** D20 button glow ring (matches frameShadow but applied to the button). */
  readonly buttonGlow: string;
}

export const SEFIRAH_FRAME_TOKENS: Readonly<
  Record<SefirahKey, SefirahFrameTokens>
> = {
  kether: {
    frameShadow: 'shadow-glow-kether',
    frameBorder: 'border-kether/40',
    avatarPlate: 'bg-kether/20',
    avatarRing: 'border-kether',
    headerAccent: 'border-kether',
    buttonGlow: 'shadow-glow-kether',
  },
  chokmah: {
    frameShadow: 'shadow-glow-chokmah',
    frameBorder: 'border-chokmah/40',
    avatarPlate: 'bg-chokmah/20',
    avatarRing: 'border-chokmah',
    headerAccent: 'border-chokmah',
    buttonGlow: 'shadow-glow-chokmah',
  },
  binah: {
    frameShadow: 'shadow-glow-binah',
    frameBorder: 'border-binah/40',
    avatarPlate: 'bg-binah/20',
    avatarRing: 'border-binah',
    headerAccent: 'border-binah',
    buttonGlow: 'shadow-glow-binah',
  },
  chesed: {
    frameShadow: 'shadow-glow-chesed',
    frameBorder: 'border-chesed/40',
    avatarPlate: 'bg-chesed/20',
    avatarRing: 'border-chesed',
    headerAccent: 'border-chesed',
    buttonGlow: 'shadow-glow-chesed',
  },
  gevurah: {
    frameShadow: 'shadow-glow-gevurah',
    frameBorder: 'border-gevurah/40',
    avatarPlate: 'bg-gevurah/20',
    avatarRing: 'border-gevurah',
    headerAccent: 'border-gevurah',
    buttonGlow: 'shadow-glow-gevurah',
  },
  tiferet: {
    frameShadow: 'shadow-glow-tiferet',
    frameBorder: 'border-tiferet/40',
    avatarPlate: 'bg-tiferet/20',
    avatarRing: 'border-tiferet',
    headerAccent: 'border-tiferet',
    buttonGlow: 'shadow-glow-tiferet',
  },
  netzach: {
    frameShadow: 'shadow-glow-netzach',
    frameBorder: 'border-netzach/40',
    avatarPlate: 'bg-netzach/20',
    avatarRing: 'border-netzach',
    headerAccent: 'border-netzach',
    buttonGlow: 'shadow-glow-netzach',
  },
  hod: {
    frameShadow: 'shadow-glow-hod',
    frameBorder: 'border-hod/40',
    avatarPlate: 'bg-hod/20',
    avatarRing: 'border-hod',
    headerAccent: 'border-hod',
    buttonGlow: 'shadow-glow-hod',
  },
  yesod: {
    frameShadow: 'shadow-glow-yesod',
    frameBorder: 'border-yesod/40',
    avatarPlate: 'bg-yesod/20',
    avatarRing: 'border-yesod',
    headerAccent: 'border-yesod',
    buttonGlow: 'shadow-glow-yesod',
  },
  malkuth: {
    frameShadow: 'shadow-glow-malkuth',
    frameBorder: 'border-malkuth/40',
    avatarPlate: 'bg-malkuth/20',
    avatarRing: 'border-malkuth',
    headerAccent: 'border-malkuth',
    buttonGlow: 'shadow-glow-malkuth',
  },
};
