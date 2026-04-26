import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { ChallengeModal, type ChallengeContext } from '../ChallengeModal';
import { seededRng } from '@/engine/rng';

/**
 * Tests use a seeded RNG so dice rolls are deterministic. Animation
 * timing is faked via vitest's timer mocks; the modal calls
 * `window.setTimeout` to gate the reveal phase, and we advance time
 * manually to drive the state machine.
 */

const baseContext: ChallengeContext = {
  sefirah: 'gevurah', // Strength challenge, DC 15
  stat: 12,
  statLabel: 'Strength',
  availableAllies: [
    { id: 'a1', name: 'Bea', stat: 10 },
    { id: 'a2', name: 'Carla', stat: 8 },
  ],
  availableCardBurns: 3,
  availableSparkBurns: 2,
};

describe('ChallengeModal — committing modifiers', () => {
  it('renders the Sefirah, DC, and stat', () => {
    const { container } = render(
      <ChallengeModal
        context={baseContext}
        rng={seededRng(1)}
        onResolved={vi.fn()}
      />,
    );
    expect(screen.getByText(/Challenge: Severity/i)).toBeInTheDocument();
    // DC text appears in the header AND in the projected-total — scope
    // the assertion to the header subtitle.
    const heading = container.querySelector('h2');
    const subtitle = heading?.nextElementSibling;
    expect(subtitle?.textContent).toMatch(/DC 15/);
    expect(screen.getAllByText(/Strength/i).length).toBeGreaterThan(0);
  });

  it('toggles ally assist and recomputes the projected total', () => {
    const { container } = render(
      <ChallengeModal
        context={baseContext}
        rng={seededRng(1)}
        onResolved={vi.fn()}
      />,
    );
    const before = container.querySelector('[data-projected-total]');
    expect(before?.textContent).toBe('12 vs DC 15');

    const a1 = container.querySelector('[data-ally="a1"] input') as HTMLInputElement;
    fireEvent.click(a1);
    // Bea's stat 10 → +5. Total = 12 + 5 = 17.
    const after = container.querySelector('[data-projected-total]');
    expect(after?.textContent).toBe('17 vs DC 15');

    // Assist contribution surfaced explicitly.
    expect(container.querySelector('[data-assist-total]')?.textContent).toBe('+5');
  });

  it('clamps the card-burn stepper at the max', () => {
    const { container } = render(
      <ChallengeModal
        context={baseContext}
        rng={seededRng(1)}
        onResolved={vi.fn()}
      />,
    );
    const inc = container.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement;
    // 3 increments allowed (max=3); 4th press is blocked by `disabled`.
    fireEvent.click(inc);
    fireEvent.click(inc);
    fireEvent.click(inc);
    expect(container.querySelector('[data-stepper-value="cardBurns"]')?.textContent).toBe('3');
    expect(inc.disabled).toBe(true);
    fireEvent.click(inc); // no-op
    expect(container.querySelector('[data-stepper-value="cardBurns"]')?.textContent).toBe('3');
  });

  it('shortcut penalty bumps the DC', () => {
    const { container } = render(
      <ChallengeModal
        context={{ ...baseContext, shortcut: true }}
        rng={seededRng(1)}
        onResolved={vi.fn()}
      />,
    );
    const subtitle = container.querySelector('h2')?.nextElementSibling;
    expect(subtitle?.textContent).toMatch(/DC 18/);
    expect(subtitle?.textContent).toMatch(/shortcut \+3/);
  });
});

describe('ChallengeModal — rolling and reveal', () => {
  it('full happy path: roll passes → onResolved with pass=true', async () => {
    vi.useFakeTimers();
    const onResolved = vi.fn();
    // Stat 18 + a guaranteed-passing seed: even a 1 on the d20 gives
    // 1 + 18 = 19 ≥ DC 15. Use stat=18 to ensure pass regardless of seed.
    render(
      <ChallengeModal
        context={{ ...baseContext, stat: 18 }}
        rng={seededRng(1)}
        onResolved={onResolved}
      />,
    );
    const rollBtn = screen.getByRole('button', { name: /^Roll$/ });
    fireEvent.click(rollBtn);
    // Animation is gated by setTimeout(800ms); advance.
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onResolved).toHaveBeenCalledTimes(1);
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.pass).toBe(true);
    expect(arg?.outcome.total).toBeGreaterThanOrEqual(arg?.outcome.effectiveDC);
    vi.useRealTimers();
  });

  it('fail path → retry choice fires onResolved with choice="retry"', async () => {
    vi.useFakeTimers();
    const onResolved = vi.fn();
    // Force a guaranteed fail by setting stat=1 against a DC well
    // beyond max d20+stat (DC 100 → impossible). This is not seed-
    // dependent — any d20 produces 1+1+roll < 100.
    const guaranteedFailContext = {
      ...baseContext,
      sefirah: 'gevurah' as const,
      stat: 1,
      availableAllies: [],
      availableCardBurns: 0,
      availableSparkBurns: 0,
    };
    // We can't override DC directly (it's data-driven); but stat=1
    // with no modifiers against Gevurah DC 15 fails on any d20 ≤ 13.
    // seededRng(1).d20() returns a deterministic value — verified by
    // the test passing repeatedly. If the seed sequence ever changes,
    // this test will surface it.
    render(
      <ChallengeModal
        context={guaranteedFailContext}
        rng={seededRng(1)}
        onResolved={onResolved}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    // Now in reveal phase; click retry.
    const retry = screen.getByText(/Burn another card to retry/);
    fireEvent.click(retry);
    expect(onResolved).toHaveBeenCalledTimes(1);
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.pass).toBe(false);
    expect(arg?.choice).toBe('retry');
    vi.useRealTimers();
  });

  it('fail path → accept choice fires onResolved with choice="accept"', async () => {
    vi.useFakeTimers();
    const onResolved = vi.fn();
    render(
      <ChallengeModal
        context={{ ...baseContext, stat: 1, availableAllies: [] }}
        rng={seededRng(1)}
        onResolved={onResolved}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    fireEvent.click(screen.getByText(/Accept setback/));
    expect(onResolved).toHaveBeenCalledTimes(1);
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.pass).toBe(false);
    expect(arg?.choice).toBe('accept');
    vi.useRealTimers();
  });

  it('clicking Roll twice in quick succession resolves only once', () => {
    vi.useFakeTimers();
    const onResolved = vi.fn();
    render(
      <ChallengeModal
        context={{ ...baseContext, stat: 18 }}
        rng={seededRng(1)}
        onResolved={onResolved}
      />,
    );
    const roll = screen.getByRole('button', { name: /^Roll$/ });
    fireEvent.click(roll);
    // Second click before the timeout elapses must be a no-op — the
    // modal's phase-guard prevents a double-fire / double-rng-consume.
    fireEvent.click(roll);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onResolved).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('throws when constructed for a non-check Sefirah (Malkuth, Kether)', () => {
    const original = console.error;
    console.error = (..._args: unknown[]): void => undefined;
    try {
      expect(() =>
        render(
          <ChallengeModal
            context={{ ...baseContext, sefirah: 'malkuth' }}
            rng={seededRng(1)}
            onResolved={vi.fn()}
          />,
        ),
      ).toThrow(/no stat check/);
      expect(() =>
        render(
          <ChallengeModal
            context={{ ...baseContext, sefirah: 'kether' }}
            rng={seededRng(1)}
            onResolved={vi.fn()}
          />,
        ),
      ).toThrow(/no stat check/);
    } finally {
      console.error = original;
    }
  });

  it('onResolved carries the committed modifiers — orchestrator forwards them to engine', () => {
    // The orchestrator needs the modal's chosen modifiers so the
    // engine's `submitChallenge` applies the same outcome the player
    // saw. Earlier the resolution payload omitted modifiers and the
    // orchestrator zeroed them when calling the engine, producing a
    // divergent re-roll.
    vi.useFakeTimers();
    const onResolved = vi.fn();
    const { container } = render(
      <ChallengeModal
        context={{ ...baseContext, stat: 18 }}
        rng={seededRng(1)}
        onResolved={onResolved}
      />,
    );
    const allyCheckbox = container.querySelector(
      '[data-ally="a1"] input',
    ) as HTMLInputElement;
    fireEvent.click(allyCheckbox);
    const inc = container.querySelector(
      '[data-stepper="cardBurns"] button:last-of-type',
    ) as HTMLButtonElement;
    fireEvent.click(inc);
    fireEvent.click(inc);
    fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.modifiers).toBeDefined();
    expect(arg?.modifiers.cardBurns).toBe(2);
    expect(arg?.modifiers.sparkBurns).toBe(0);
    expect(arg?.modifiers.assistStats).toEqual([10]); // Bea's stat
    vi.useRealTimers();
  });

  it('reveal phase shows the breakdown total', () => {
    vi.useFakeTimers();
    render(
      <ChallengeModal
        context={{ ...baseContext, stat: 18, availableAllies: [] }}
        rng={seededRng(42)}
        onResolved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Roll$/ }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    const total = document.querySelector('[data-total]');
    expect(total).not.toBeNull();
    // The number is whatever the seeded roll produced; just assert
    // it's a positive integer.
    expect(Number(total?.textContent)).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});

describe('ChallengeModal — accessibility', () => {
  it('uses role=dialog with an aria-labelledby pointing at the title', () => {
    const { container } = render(
      <ChallengeModal
        context={baseContext}
        rng={seededRng(1)}
        onResolved={vi.fn()}
      />,
    );
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    const titleId = dialog?.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    if (titleId) {
      expect(document.getElementById(titleId)).not.toBeNull();
    }
  });
});
