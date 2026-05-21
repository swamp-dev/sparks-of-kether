import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeState } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #68 — Hestia companion line at Malkuth.
 *
 * When the active player is at Malkuth in 'end' phase, a companion
 * line from Hestia should be visible. Malkuth has no challenge (no
 * pass/fail axis) so the line always appears at end-phase regardless
 * of lastOutcome.
 *
 * Tests are phase- and position-gated: the line must NOT appear when
 * the player is at a different Sefirah or in the wrong phase.
 *
 * All states include a card in the deck so `checkEndgame` doesn't
 * return 'stranded' (no cards anywhere → immediate loss screen).
 */

const withCard = { deck: [1] } as const;

describe('PlayScreen — Hestia companion line at Malkuth (#68)', () => {
  it('renders companion line when active player is at malkuth in end phase', () => {
    const state = makeState({ position: 'malkuth' }, { phase: 'end', ...withCard });
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(1)} />);

    const line = container.querySelector('[data-hestia-companion-line]');
    expect(line, 'Hestia companion line should be present at malkuth end phase').not.toBeNull();
  });

  it('does not render companion line when active player is at a different sefirah', () => {
    const state = makeState({ position: 'yesod' }, { phase: 'end', ...withCard });
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(1)} />);

    const line = container.querySelector('[data-hestia-companion-line]');
    expect(line, 'Hestia companion line should not appear at yesod').toBeNull();
  });

  it('does not render companion line in move phase even at malkuth', () => {
    const state = makeState({ position: 'malkuth' }, { phase: 'move', ...withCard });
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(1)} />);

    const line = container.querySelector('[data-hestia-companion-line]');
    expect(line, 'Hestia companion line should not appear during move phase').toBeNull();
  });

  it('companion line text is non-empty', () => {
    const state = makeState({ position: 'malkuth' }, { phase: 'end', ...withCard });
    const { container } = render(<PlayScreen initialState={state} rng={seededRng(1)} />);

    const line = container.querySelector('[data-hestia-companion-line]');
    expect((line?.textContent ?? '').trim().length).toBeGreaterThan(0);
  });
});
