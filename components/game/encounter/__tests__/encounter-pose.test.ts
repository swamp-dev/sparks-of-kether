import { describe, expect, it } from 'vitest';
import { derivePose } from '../encounter-pose';
import type { CheckOutcome } from '@/engine/checks';

const pass: CheckOutcome = {
  rolled: 15,
  total: 18,
  effectiveDC: 12,
  pass: true,
  statContribution: 3,
  modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
};
const fail: CheckOutcome = {
  rolled: 5,
  total: 8,
  effectiveDC: 12,
  pass: false,
  statContribution: 3,
  modifierBreakdown: { assist: 0, cardBurn: 0, sparkBurn: 0 },
};

describe('derivePose', () => {
  it('returns speaking when prep and framing is still revealing', () => {
    expect(derivePose('prep', false, null)).toBe('speaking');
  });

  it('returns idle when prep and framing reveal is complete', () => {
    expect(derivePose('prep', true, null)).toBe('idle');
  });

  it('returns watching during resolve (d20 animation)', () => {
    expect(derivePose('resolve', false, null)).toBe('watching');
    expect(derivePose('resolve', true, null)).toBe('watching');
  });

  it('returns pass when react and outcome is a pass', () => {
    expect(derivePose('react', true, pass)).toBe('pass');
  });

  it('returns fail when react and outcome is a fail', () => {
    expect(derivePose('react', true, fail)).toBe('fail');
  });

  it('returns fail when react and outcome is null (defensive)', () => {
    // Should not happen in practice but the function must not throw.
    expect(derivePose('react', true, null)).toBe('fail');
  });
});
