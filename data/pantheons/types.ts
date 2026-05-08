/**
 * Pantheon registry types — shared shape for any avatar pantheon.
 *
 * Phase A1 of Epic #293 (#547). The avatar layer is pluggable by
 * pantheon: each pantheon supplies a full set of per-Sefirah
 * content (avatar names, codex avatar, framing, verdicts, blessings).
 * The MVP ships only `'greco-roman'`; subsequent pantheons (e.g.
 * Egyptian, Phase B) plug into the same shape.
 *
 * Source-of-truth contract: `design/avatars.md` § 6
 * ("pantheon-rotation architecture").
 */

import type {
  EncounterAvatarKey,
  SefirahKey,
  ZodiacSignKey,
} from '../types';

/**
 * Identifier for a single pantheon in the registry. Extensible union —
 * adding a pantheon means widening this type AND adding a matching
 * entry to the `pantheons` registry in `./index.ts` (TypeScript will
 * complain at compile time if the two drift, since the registry is
 * typed `Readonly<Record<PantheonId, Pantheon>>`). `'greco-roman'`
 * is the MVP entry.
 */
export type PantheonId = 'greco-roman' | 'egyptian';

// Re-export `EncounterAvatarKey` from its canonical home in `data/types.ts`
// so callers reading "pantheon types" still find it here.
export type { EncounterAvatarKey };

/**
 * The avatar's name(s). `primary` is the rendered name (verdict
 * line, codex page, asset path); `secondary` is an optional alternate
 * cultural / linguistic form preserved for future surfaces (e.g. the
 * Roman gloss for Greco-Roman, the Egyptian-language form for
 * Egyptian).
 *
 * Phase B2 (#552) renamed these from `greek/roman` to
 * `primary/secondary` so the type stays pantheon-neutral. For
 * Greco-Roman: `primary` = greek (Hermes, Apollo, …), `secondary`
 * = roman (Mercury, Sol, …). For Egyptian: `primary` = the canonical
 * English / Greek-form name (Thoth, Osiris, …), `secondary` = the
 * older Egyptian-language form where one is meaningful (Djehuti,
 * Wesir, …) and is otherwise omitted.
 */
export interface AvatarName {
  readonly primary: string;
  readonly secondary?: string;
}

// ──────────────── Matrix types ────────────────
//
// Shape contracts every pantheon's data files must conform to.
// Owned here, in the registry's types module — NOT inside any
// pantheon-specific data file — so the `Pantheon` interface stays
// independent of any individual pantheon's implementation. Phase A4
// (#550) extracted these from `pantheons/greco-roman/{verdicts,
// framing,blessings}.ts` after code-review (#591) flagged the prior
// inversion: shared interface types should not depend on a specific
// pantheon's data files.

/** Outcome dimension of the verdict matrix — pre-roll vs post-roll lines split on this. */
export type ChallengeOutcome = 'pass' | 'fail';

/**
 * Avatar verdict per (sefirah, sign, outcome). Each `pass` and
 * `fail` array holds 3 variants. See `design/avatars.md` § 7.
 */
export type VerdictMatrix = Readonly<
  Record<
    EncounterAvatarKey,
    Readonly<Record<ZodiacSignKey, Readonly<Record<ChallengeOutcome, readonly string[]>>>>
  >
>;

/**
 * Pre-roll player-response per (sefirah, sign). 3 variants per cell.
 * Surfaces in the EncounterScreen prep sub-state above the Roll
 * button — pure literary couplet with the avatar's verdict.
 */
export type PlayerResponseMatrix = Readonly<
  Record<EncounterAvatarKey, Readonly<Record<ZodiacSignKey, readonly string[]>>>
>;

/** Per-Sefirah avatar trial-framing matrix (sefirah, sign, 3 variants). */
export type FramingMatrix = Readonly<
  Record<EncounterAvatarKey, Readonly<Record<ZodiacSignKey, readonly string[]>>>
>;

/**
 * Sign-less framing fallback: one line per avatar, used when the
 * encounter context has no `playerSign` (demo / tests). Mirrors the
 * `pickPlayerResponse` no-sign fallback pattern from #277.
 */
export type FramingPlaceholderMap = Readonly<Record<EncounterAvatarKey, string>>;

/** Per-Sefirah blessing matrix (sefirah, sign, 3 variants). */
export type SefirahBlessingMatrix = Readonly<
  Record<SefirahKey, Readonly<Record<ZodiacSignKey, readonly string[]>>>
>;

// ──────────────── Pantheon ────────────────

/**
 * A single pantheon. All matrix slots live under
 * `data/pantheons/<id>/{framing,verdicts,blessings}.ts`. Phase A4
 * (#550) completed the data-layer move: the registry is fully
 * self-contained per-pantheon, and the matrix-type contracts above
 * are the structural shape every pantheon must satisfy.
 */
export interface Pantheon {
  readonly id: PantheonId;
  readonly displayName: string;
  readonly avatarNames: Readonly<Record<EncounterAvatarKey, AvatarName>>;
  /**
   * Codex "Voice" row per Sefirah. `null` for Kether (collective —
   * "the team becomes the avatar"). Includes Malkuth (Hestia,
   * companion-only — surfaces in the codex even though she's not an
   * encounter avatar).
   */
  readonly sefirahCodexAvatar: Readonly<Record<SefirahKey, string | null>>;
  readonly sefirahFraming: FramingMatrix;
  readonly sefirahFramingPlaceholder: FramingPlaceholderMap;
  readonly sefirahVerdicts: VerdictMatrix;
  readonly sefirahPlayerResponses: PlayerResponseMatrix;
  readonly sefirahBlessings: SefirahBlessingMatrix;
}
