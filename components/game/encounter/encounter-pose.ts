import type { CheckOutcome } from '@/engine/checks';

export type AvatarPose = 'idle' | 'speaking' | 'watching' | 'pass' | 'fail';

type UiSubPhase = 'prep' | 'resolve' | 'react';

/**
 * Derive the avatar's pose from the current UI sub-phase and encounter
 * state. Pure — no side effects, safe to call in render.
 *
 *   prep + framing still revealing → speaking
 *   prep + framing complete        → idle
 *   resolve (d20 animation)        → watching
 *   react + pass                   → pass
 *   react + fail (or no outcome)   → fail
 */
export function derivePose(
  uiSubPhase: UiSubPhase,
  framingComplete: boolean,
  resolvedOutcome: CheckOutcome | null,
): AvatarPose {
  if (uiSubPhase === 'prep') return framingComplete ? 'idle' : 'speaking';
  if (uiSubPhase === 'resolve') return 'watching';
  return resolvedOutcome?.pass === true ? 'pass' : 'fail';
}
