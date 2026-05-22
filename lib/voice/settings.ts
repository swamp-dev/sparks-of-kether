'use client';
export { VOICE_ENABLED_STORAGE_KEY } from '@/lib/sound/settings';
import { useSoundEnabled } from '@/lib/sound/settings';

export function useVoiceEnabled(): {
  voiceEnabled: boolean;
  setVoiceEnabled: (next: boolean) => void;
} {
  const { voiceEnabled, setVoiceEnabled } = useSoundEnabled();
  return { voiceEnabled, setVoiceEnabled };
}
