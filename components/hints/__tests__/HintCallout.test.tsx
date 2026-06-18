import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { act } from 'react';
import type { HintDefinition } from '@/data/hints';

vi.mock('@/lib/hooks/useHints', () => ({
  markDismissed: vi.fn(),
}));

// Import after mock registration so we get the spy instance.
const { markDismissed } = await import('@/lib/hooks/useHints');

// Lazy-import component after mocks are wired.
const { HintCallout } = await import('../HintCallout');

function makeHint(overrides: Partial<HintDefinition> = {}): HintDefinition {
  return {
    id: 'test-hint',
    priority: 10,
    when: { kind: 'game-start' },
    where: { kind: 'region', name: 'hand' },
    copy: 'Test hint copy text',
    severity: 'info',
    dismissibleVia: ['tap-anywhere'],
    ...overrides,
  };
}

let anchorEl: HTMLDivElement;

beforeEach(() => {
  // Provide an anchor element that the component's querySelector can find.
  anchorEl = document.createElement('div');
  anchorEl.setAttribute('data-hand', '');
  anchorEl.getBoundingClientRect = vi.fn().mockReturnValue({
    top: 500,
    bottom: 600,
    left: 100,
    right: 400,
    width: 300,
    height: 100,
    x: 100,
    y: 500,
    toJSON: () => ({}),
  });
  document.body.appendChild(anchorEl);
  vi.mocked(markDismissed).mockClear();
});

afterEach(() => {
  if (anchorEl.parentNode) anchorEl.parentNode.removeChild(anchorEl);
  vi.clearAllTimers();
});

describe('HintCallout', () => {
  describe('does not render when no active hint', () => {
    it('returns null when hint is null', () => {
      const { container } = render(<HintCallout hint={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when hint.where.kind is overlay', () => {
      const hint = makeHint({ where: { kind: 'overlay' } });
      const { container } = render(<HintCallout hint={hint} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('renders hint copy', () => {
    it('shows hint copy text for a region callout', () => {
      const hint = makeHint({ copy: 'Tap a card to see which paths it unlocks.' });
      render(<HintCallout hint={hint} />);
      expect(screen.getByText('Tap a card to see which paths it unlocks.')).toBeTruthy();
    });

    it('shows hint copy text for a toast variant', () => {
      const hint = makeHint({
        copy: 'Your hand refills toward 4 cards at the start of each turn.',
        dismissibleVia: ['tap-anywhere', { kind: 'timeout', ms: 6000 }],
      });
      render(<HintCallout hint={hint} />);
      expect(
        screen.getByText('Your hand refills toward 4 cards at the start of each turn.'),
      ).toBeTruthy();
    });
  });

  describe('calls markDismissed on tap-anywhere', () => {
    it('calls markDismissed when the tap-anywhere backdrop is clicked', async () => {
      const user = userEvent.setup();
      const hint = makeHint({ id: 'tutorial-hand-intro', dismissibleVia: ['tap-anywhere'] });
      render(<HintCallout hint={hint} />);
      const backdrop = document.querySelector('[data-hint-backdrop]') as HTMLElement;
      expect(backdrop).toBeTruthy();
      await user.click(backdrop);
      expect(vi.mocked(markDismissed)).toHaveBeenCalledWith('tutorial-hand-intro');
    });
  });

  describe('calls markDismissed after timeout', () => {
    it('calls markDismissed after the timeout ms elapses (fake timers)', async () => {
      vi.useFakeTimers();
      const hint = makeHint({
        id: 'tutorial-draw-replenish',
        dismissibleVia: ['tap-anywhere', { kind: 'timeout', ms: 6000 }],
      });
      render(<HintCallout hint={hint} />);
      expect(vi.mocked(markDismissed)).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(6000);
      });
      // markDismissed is called after the exit animation (200ms internal delay).
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      expect(vi.mocked(markDismissed)).toHaveBeenCalledWith('tutorial-draw-replenish');
      vi.useRealTimers();
    });
  });

  describe('explicit-button dismiss', () => {
    it('renders a "Got it" button when dismissibleVia includes explicit-button', () => {
      const hint = makeHint({ dismissibleVia: ['explicit-button'] });
      render(<HintCallout hint={hint} />);
      expect(screen.getByRole('button', { name: /got it/i })).toBeTruthy();
    });

    it('calls markDismissed when "Got it" is clicked', async () => {
      const user = userEvent.setup();
      const hint = makeHint({ id: 'tutorial-welcome', dismissibleVia: ['explicit-button'] });
      render(<HintCallout hint={hint} />);
      await user.click(screen.getByRole('button', { name: /got it/i }));
      expect(vi.mocked(markDismissed)).toHaveBeenCalledWith('tutorial-welcome');
    });
  });
});
