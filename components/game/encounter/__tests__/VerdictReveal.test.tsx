import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { CheckOutcome } from '@/engine/checks';
import { VerdictReveal } from '../VerdictReveal';

/**
 * Pins the reduced-motion prop pass-through from VerdictReveal to
 * RevealLine (#27 / #504 deferred). RevealLine's `reducedMotionOverride`
 * prop takes precedence over the live `useReduceMotion()` hook — which
 * matters for mid-encounter OS-pref-toggle correctness (the parent
 * snapshots the preference at mount and must freeze it for the lifetime
 * of the encounter, not re-read it live on each render).
 */

const PASS_OUTCOME: CheckOutcome = {
  rolled: 15,
  statContribution: 5,
  modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
  total: 20,
  effectiveDC: 12,
  pass: true,
};

describe('VerdictReveal', () => {
  it('wires reducedMotion into RevealLine via reducedMotionOverride', () => {
    // jsdom does not implement matchMedia, so useReduceMotion() returns
    // false. If VerdictReveal passes reducedMotionOverride={reducedMotion}
    // correctly, RevealLine will use the prop (true) instead of the hook
    // (false) and render data-reveal-state="reduced". Removing the prop
    // pass-through from VerdictReveal.tsx causes "animating" here.
    render(
      <VerdictReveal
        outcome={PASS_OUTCOME}
        reducedMotion={true}
        avatarName="Hermes"
        verdictLine="You crossed first; you crossed alone."
      />,
    );
    const verdictReveal = document.querySelector('[data-verdict-reveal]');
    expect(verdictReveal).not.toBeNull();
    expect(verdictReveal?.getAttribute('data-reduced-motion')).toBe('true');
    const revealLine = verdictReveal?.querySelector('[data-reveal-line]');
    expect(revealLine).not.toBeNull();
    expect(revealLine?.getAttribute('data-reveal-state')).toBe('reduced');
  });
});
