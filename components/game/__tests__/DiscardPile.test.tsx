import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DiscardPile } from '../DiscardPile';

/**
 * #507 — visible discard pile. Renders a small face-up top-of-pile
 * card with a count badge during gameplay; opens a browse overlay on
 * click. Empty state is muted and click-disabled.
 */

describe('DiscardPile', () => {
  it('renders the empty state when the pile is empty', () => {
    render(<DiscardPile discardPile={[]} />);
    const root = document.querySelector<HTMLElement>('[data-discard-pile]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('data-discard-empty')).toBe('true');
    const button = screen.getByRole('button', { name: /discard pile, empty/i });
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-discard-empty-placeholder]')?.textContent).toMatch(
      /no discards yet/i,
    );
    expect(document.querySelector('[data-discard-count]')?.textContent).toBe('0');
  });

  it('clicking the pile while empty is a no-op (no overlay opens)', () => {
    render(<DiscardPile discardPile={[]} />);
    const button = screen.getByRole('button', { name: /discard pile, empty/i });
    act(() => {
      fireEvent.click(button);
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
  });

  it('renders the most recently discarded card on top with a count badge', () => {
    render(<DiscardPile discardPile={[3, 7, 12]} />);
    const root = document.querySelector<HTMLElement>('[data-discard-pile]');
    expect(root?.getAttribute('data-discard-empty')).toBe('false');
    // Top card is the LAST element of discardPile (index count-1).
    const top = document.querySelector('[data-discard-top]');
    expect(top).not.toBeNull();
    const arcanumSvg = top?.querySelector('[data-arcanum]');
    expect(arcanumSvg?.getAttribute('data-arcanum')).toBe('12');
    expect(document.querySelector('[data-discard-count]')?.textContent).toBe('3');
  });

  it('shows the offset stack shadow only when more than one card is in the pile', () => {
    const { rerender } = render(<DiscardPile discardPile={[5]} />);
    expect(document.querySelector('[data-discard-stack-shadow]')).toBeNull();
    rerender(<DiscardPile discardPile={[5, 9]} />);
    expect(document.querySelector('[data-discard-stack-shadow]')).not.toBeNull();
  });

  it('clicking the pile opens the browse overlay; the overlay shows every card oldest-to-newest', () => {
    render(<DiscardPile discardPile={[2, 8, 14]} />);
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
    const button = screen.getByRole('button', {
      name: /discard pile, 3 cards/i,
    });
    act(() => {
      fireEvent.click(button);
    });
    const overlay = document.querySelector('[data-discard-browse-overlay]');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    const items = overlay?.querySelectorAll('[data-discard-browse-list] [data-arcanum]');
    expect(items?.length).toBe(3);
    // Order in the DOM should match the pile order (oldest-to-newest).
    expect(items?.[0]?.getAttribute('data-arcanum')).toBe('2');
    expect(items?.[1]?.getAttribute('data-arcanum')).toBe('8');
    expect(items?.[2]?.getAttribute('data-arcanum')).toBe('14');
  });

  it('overlay closes on the X button, on Escape, and on backdrop click', () => {
    function open(): void {
      const button = screen.getByRole('button', { name: /discard pile, 1 card/i });
      act(() => {
        fireEvent.click(button);
      });
      expect(document.querySelector('[data-discard-browse-overlay]')).not.toBeNull();
    }
    const { rerender } = render(<DiscardPile discardPile={[5]} />);
    open();
    // X button.
    const closeBtn = document.querySelector<HTMLButtonElement>('[data-discard-browse-close]');
    expect(closeBtn).not.toBeNull();
    if (closeBtn === null) return;
    act(() => {
      fireEvent.click(closeBtn);
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
    // Re-open and close via Escape.
    rerender(<DiscardPile discardPile={[5]} />);
    open();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
    // Re-open and close via backdrop.
    rerender(<DiscardPile discardPile={[5]} />);
    open();
    const backdrop = document.querySelector<HTMLDivElement>('[data-discard-browse-backdrop]');
    expect(backdrop).not.toBeNull();
    if (backdrop === null) return;
    act(() => {
      fireEvent.click(backdrop);
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
  });

  it('restores focus to the pile button when the overlay closes', () => {
    render(<DiscardPile discardPile={[5]} />);
    const button = document.querySelector<HTMLButtonElement>('[data-discard-pile-button]');
    expect(button).not.toBeNull();
    if (button === null) return;
    // Focus the pile button first (mirrors a keyboard user landing on
    // it via Tab) so the overlay has something to restore to.
    button.focus();
    expect(document.activeElement).toBe(button);
    act(() => {
      fireEvent.click(button);
    });
    // While the overlay is open, focus should be on the dialog (so
    // screen readers announce the dialog content rather than the
    // pre-open context).
    const overlay = document.querySelector<HTMLElement>('[data-discard-browse-overlay]');
    expect(overlay).not.toBeNull();
    expect(document.activeElement).toBe(overlay);
    // Close via Escape; focus must return to the pile button.
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(document.querySelector('[data-discard-browse-overlay]')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('singular vs plural labels: 1 card vs N cards', () => {
    const { rerender } = render(<DiscardPile discardPile={[3]} />);
    expect(screen.getByRole('button', { name: /discard pile, 1 card\b/i })).toBeInTheDocument();
    rerender(<DiscardPile discardPile={[3, 4]} />);
    expect(screen.getByRole('button', { name: /discard pile, 2 cards/i })).toBeInTheDocument();
  });
});
