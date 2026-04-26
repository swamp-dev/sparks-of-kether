import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinalThreshold } from '../FinalThreshold';
import { REQUIRED_ILLUMINATION_MARGIN } from '@/engine/endgame';
import { makePlayer, makeState } from '@/test/fixtures';

function ketherState(overrides: {
  illumination?: number;
  separation?: number;
  hand?: number[];
  sparksHeld?: ReadonlySet<'kether' | 'tiferet' | 'malkuth' | 'yesod' | 'hod' | 'netzach' | 'gevurah' | 'chesed' | 'binah' | 'chokmah'>;
} = {}) {
  return makeState(
    {
      position: 'kether',
      hand: overrides.hand ?? [],
      ...(overrides.sparksHeld !== undefined ? { sparksHeld: overrides.sparksHeld } : {}),
    },
    {
      illumination: overrides.illumination ?? 0,
      separation: overrides.separation ?? 0,
    },
  );
}

describe('FinalThreshold — happy path', () => {
  it('renders without crashing for an all-at-Kether state', () => {
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN,
      separation: 0,
    });
    const { container } = render(
      <FinalThreshold state={state} onResolved={vi.fn()} />,
    );
    expect(container.querySelector('[data-final-threshold]')).not.toBeNull();
    expect(container.textContent).toMatch(/Final Threshold/);
  });

  it('shows projected illumination and target', () => {
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN,
      separation: 0,
    });
    const { container } = render(
      <FinalThreshold state={state} onResolved={vi.fn()} />,
    );
    expect(container.querySelector('[data-projected]')?.textContent).toBe(
      String(REQUIRED_ILLUMINATION_MARGIN),
    );
    expect(container.querySelector('[data-target]')?.textContent).toBe(
      String(REQUIRED_ILLUMINATION_MARGIN),
    );
    expect(
      container.querySelector('[data-gap-status]')?.getAttribute('data-gap-status'),
    ).toBe('closed');
  });

  it('Resolve fires onResolved with a winning result when illumination is sufficient', () => {
    const onResolved = vi.fn();
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN + 2,
      separation: 0,
    });
    render(<FinalThreshold state={state} onResolved={onResolved} />);
    fireEvent.click(screen.getByRole('button', { name: /Resolve the Threshold/i }));
    expect(onResolved).toHaveBeenCalledTimes(1);
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.ok).toBe(true);
    expect(arg?.value?.status).toBe('won');
  });
});

describe('FinalThreshold — spark-burn path', () => {
  it('burning a spark bumps the projected illumination by 1', () => {
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN - 2,
      separation: 0,
      sparksHeld: new Set(['yesod']),
    });
    const { container } = render(
      <FinalThreshold state={state} onResolved={vi.fn()} />,
    );
    const beforeProjected = container.querySelector('[data-projected]')?.textContent;
    expect(beforeProjected).toBe(String(REQUIRED_ILLUMINATION_MARGIN - 2));
    fireEvent.click(screen.getByText(/Burn Foundation Spark/i));
    const afterProjected = container.querySelector('[data-projected]')?.textContent;
    expect(afterProjected).toBe(String(REQUIRED_ILLUMINATION_MARGIN - 1));
  });

  it('two sparks close a 2-gap and resolve as won', () => {
    const onResolved = vi.fn();
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN - 2,
      separation: 0,
      sparksHeld: new Set(['yesod', 'hod']),
    });
    render(<FinalThreshold state={state} onResolved={onResolved} />);
    fireEvent.click(screen.getByText(/Burn Foundation Spark/i));
    fireEvent.click(screen.getByText(/Burn Splendor Spark/i));
    fireEvent.click(screen.getByRole('button', { name: /Resolve the Threshold/i }));
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.ok).toBe(true);
    expect(arg?.value?.status).toBe('won');
  });
});

describe('FinalThreshold — loss path', () => {
  it('insufficient sparks → loss with reason illumination-gap', () => {
    const onResolved = vi.fn();
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN - 3,
      separation: 0,
      sparksHeld: new Set(['yesod']),
    });
    render(<FinalThreshold state={state} onResolved={onResolved} />);
    fireEvent.click(screen.getByText(/Burn Foundation Spark/i));
    fireEvent.click(screen.getByRole('button', { name: /Resolve the Threshold/i }));
    const arg = onResolved.mock.calls[0]?.[0];
    expect(arg?.ok).toBe(true);
    expect(arg?.value?.status).toBe('lost');
    expect(arg?.value?.reason).toBe('illumination-gap');
  });
});

describe('FinalThreshold — gating', () => {
  it('Resolve disabled when not all players are at Kether', () => {
    const ketherP = makePlayer({ id: 'p1', position: 'kether' });
    const tiferetP = makePlayer({ id: 'p2', position: 'tiferet' });
    const state = makeState({}, { players: [ketherP, tiferetP] });
    render(<FinalThreshold state={state} onResolved={vi.fn()} />);
    const resolve = screen.getByRole('button', {
      name: /Resolve the Threshold/i,
    }) as HTMLButtonElement;
    expect(resolve.disabled).toBe(true);
  });

  it('reflection field accepts free text and is included in the journey summary', () => {
    const onResolved = vi.fn();
    const state = ketherState({
      illumination: REQUIRED_ILLUMINATION_MARGIN,
      separation: 0,
    });
    const { container } = render(
      <FinalThreshold state={state} onResolved={onResolved} />,
    );
    const textarea = container.querySelector('[data-reflection]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Whatever this was, I bring it.' } });
    fireEvent.click(screen.getByRole('button', { name: /Resolve the Threshold/i }));
    // Resolution screen should now include the reflection text.
    expect(container.textContent).toMatch(/Whatever this was, I bring it/);
  });
});
