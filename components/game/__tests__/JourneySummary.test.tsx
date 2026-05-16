import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JourneySummary } from '../JourneySummary';
import { makePlayer, makeState, statSheet } from '@/test/fixtures';
import type { FinalThresholdResult } from '@/engine/endgame';

/**
 * Pinning the decorative additions for Issue E (#74):
 *
 *   - Each player's zodiac glyph (♈ … ♓) appears near their name.
 *   - A 10-glyph Sefirot strip (Hebrew letters with aria-hidden) is
 *     rendered in the success branch.
 *   - Each player's stat values appear in a breakdown section.
 *   - The rejected branch (outcome.ok = false) renders without errors.
 */

function makeWonOutcome(illumination = 20, separation = 5): FinalThresholdResult {
  const wonState = makeState(
    {},
    { illumination, separation },
  );
  return {
    ok: true,
    value: {
      state: wonState,
      status: 'won',
    },
  };
}

function makeLostOutcome(illumination = 5, separation = 10): FinalThresholdResult {
  const lostState = makeState(
    {},
    { illumination, separation },
  );
  return {
    ok: true,
    value: {
      state: lostState,
      status: 'lost',
      reason: 'illumination-gap',
    },
  };
}

const TWO_PLAYERS = [
  makePlayer({ id: 'p1', name: 'Alex', zodiacSign: 'aries', stats: statSheet({ harmony: 14 }) }),
  makePlayer({ id: 'p2', name: 'Bea', zodiacSign: 'scorpio', stats: statSheet({ strength: 16 }) }),
];

describe('JourneySummary — won branch', () => {
  it('shows the win headline', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeWonOutcome()} reflections={{}} />);
    expect(screen.getByText(/The Tree is illuminated/i)).toBeTruthy();
  });

  it('renders the zodiac glyph for each player', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeWonOutcome()} reflections={{}} />);
    // Aries = ♈, Scorpio = ♏
    expect(screen.getAllByText('♈').length).toBeGreaterThan(0);
    expect(screen.getAllByText('♏').length).toBeGreaterThan(0);
  });

  it('renders the Sefirot decoration strip (10 Hebrew glyphs)', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeWonOutcome()} reflections={{}} />);
    const strip = document.querySelector('[data-sefirot-strip]');
    expect(strip).not.toBeNull();
    if (!strip) throw new Error('sefirot strip not found');
    const glyphs = strip.querySelectorAll('[data-sefirah-glyph]');
    expect(glyphs.length).toBe(10);
  });

  it('renders stat values for each player', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeWonOutcome()} reflections={{}} />);
    // harmony=14 for p1 (default stats have harmony=10, we override to 14)
    expect(screen.getAllByText('14').length).toBeGreaterThan(0);
    // strength=16 for p2
    expect(screen.getAllByText('16').length).toBeGreaterThan(0);
  });

  it('renders a colored dot for each Sefirah per player in the stat table', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeWonOutcome()} reflections={{}} />);
    const dots = document.querySelectorAll('[data-sefirah-dot]');
    // 10 sefirot × 2 players
    expect(dots.length).toBe(10 * state.players.length);
  });

  it('renders illumination and separation totals', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeWonOutcome(20, 5)} reflections={{}} />);
    expect(screen.getByTestId('final-illumination').textContent).toBe('20');
    expect(screen.getByTestId('final-separation').textContent).toBe('5');
  });
});

describe('JourneySummary — lost branch', () => {
  it('shows the loss headline', () => {
    const state = makeState({}, { players: TWO_PLAYERS });
    render(<JourneySummary state={state} outcome={makeLostOutcome()} reflections={{}} />);
    expect(screen.getByText(/the light fell short/i)).toBeTruthy();
  });
});

describe('JourneySummary — rejected branch', () => {
  it('renders the rejected headline without errors', () => {
    const state = makeState();
    const outcome: FinalThresholdResult = { ok: false, reason: 'not-all-at-kether' };
    render(<JourneySummary state={state} outcome={outcome} reflections={{}} />);
    expect(screen.getByText(/Not yet ready/i)).toBeTruthy();
  });
});
