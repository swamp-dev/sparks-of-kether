import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { HintDefinition } from '@/data/hints';

vi.mock('@/lib/hooks/useHints', () => ({
  markDismissed: vi.fn(),
}));

const { markDismissed } = await import('@/lib/hooks/useHints');
const { TutorialOverlay } = await import('../TutorialOverlay');

function makeHint(overrides: Partial<HintDefinition> = {}): HintDefinition {
  return {
    id: 'tutorial-welcome',
    priority: 0,
    when: { kind: 'game-start' },
    where: { kind: 'overlay' },
    copy: 'Welcome to Sparks of Kether.',
    severity: 'info',
    dismissibleVia: ['explicit-button'],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(markDismissed).mockClear();
});

afterEach(() => {
  vi.clearAllTimers();
});

describe('TutorialOverlay', () => {
  describe('does not render when no active hint', () => {
    it('returns null when hint is null', () => {
      const { container } = render(<TutorialOverlay hint={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when hint.where.kind is not overlay', () => {
      const hint = makeHint({ where: { kind: 'region', name: 'hand' } });
      const { container } = render(<TutorialOverlay hint={hint} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('renders hint copy and Got it button', () => {
    it('shows hint copy text', () => {
      const hint = makeHint({ copy: 'The Kabbalistic Tree of Life awaits.' });
      render(<TutorialOverlay hint={hint} />);
      expect(screen.getByText('The Kabbalistic Tree of Life awaits.')).toBeTruthy();
    });

    it('renders a "Got it" button when dismissibleVia includes explicit-button', () => {
      const hint = makeHint({ dismissibleVia: ['explicit-button'] });
      render(<TutorialOverlay hint={hint} />);
      expect(screen.getByRole('button', { name: /got it/i })).toBeTruthy();
    });
  });

  describe('calls markDismissed on Got it click', () => {
    it('calls markDismissed with the hint id when Got it is clicked', async () => {
      const user = userEvent.setup();
      const hint = makeHint({ id: 'tutorial-welcome', dismissibleVia: ['explicit-button'] });
      render(<TutorialOverlay hint={hint} />);
      await user.click(screen.getByRole('button', { name: /got it/i }));
      expect(vi.mocked(markDismissed)).toHaveBeenCalledWith('tutorial-welcome');
    });
  });

  describe('does not dismiss on backdrop click', () => {
    it('clicking the backdrop does not call markDismissed', async () => {
      const user = userEvent.setup();
      const hint = makeHint({ id: 'tutorial-welcome' });
      render(<TutorialOverlay hint={hint} />);
      const backdrop = document.querySelector('[data-tutorial-backdrop]') as HTMLElement;
      expect(backdrop).toBeTruthy();
      await user.click(backdrop);
      expect(vi.mocked(markDismissed)).not.toHaveBeenCalled();
    });
  });

  describe('Escape key dismissal', () => {
    it('calls markDismissed on Escape when dismissibleVia includes explicit-button', () => {
      const hint = makeHint({ id: 'tutorial-welcome', dismissibleVia: ['explicit-button'] });
      render(<TutorialOverlay hint={hint} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(vi.mocked(markDismissed)).toHaveBeenCalledWith('tutorial-welcome');
    });

    it('does not call markDismissed on Escape when explicit-button is not in dismissibleVia', () => {
      const hint = makeHint({ id: 'tutorial-welcome', dismissibleVia: ['hinted-action'] });
      render(<TutorialOverlay hint={hint} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(vi.mocked(markDismissed)).not.toHaveBeenCalled();
    });
  });
});
