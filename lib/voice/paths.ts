import type { EncounterAvatarKey, ZodiacSignKey } from '@/data/types';
import type { ChallengeOutcome } from '@/data/pantheons/types';

export function verdictVoicePath(
  avatar: EncounterAvatarKey,
  sign: ZodiacSignKey,
  outcome: ChallengeOutcome,
  variant: 0 | 1 | 2,
): string {
  return `/audio/voice/verdict-${avatar}-${sign}-${outcome}-${variant}.mp3`;
}

export function playerResponseVoicePath(
  avatar: EncounterAvatarKey,
  sign: ZodiacSignKey,
  variant: 0 | 1 | 2,
): string {
  return `/audio/voice/response-${avatar}-${sign}-${variant}.mp3`;
}

export function greetingVoicePath(avatarName: string): string {
  return `/audio/voice/greeting-${avatarName}.mp3`;
}

export function narratorVoicePath(context: 'threshold-open' | 'threshold-close'): string {
  return `/audio/voice/narrator-kether-${context}.mp3`;
}

export function burnDiscardNarratorPath(): string {
  return '/audio/voice/narrator-burn-discard.mp3';
}
