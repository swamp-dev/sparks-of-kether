import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { arcanumByNumber } from '@/data';
import { Hand } from '../Hand';

/**
 * Tests for Hand discard mode (#90) — when `discardMode={true}`,
 * each visible card shows a translucent icon overlay button. Clicking the
 * icon fires `onDiscard(arcanum)`. Hovering the card still fires
 * `onCardHover` so Tree paths light up before the player commits.
 */
describe('Hand — discard mode', () => {
  it('renders no discard icons when discardMode is false', () => {
    const { container } = render(
      <Hand hand={[0, 1, 2]} visible={true} discardMode={false} />,
    );
    expect(container.querySelectorAll('[data-discard-icon]').length).toBe(0);
  });

  it('renders no discard icons when discardMode is not provided', () => {
    const { container } = render(<Hand hand={[0, 1, 2]} visible={true} />);
    expect(container.querySelectorAll('[data-discard-icon]').length).toBe(0);
  });

  it('renders a discard icon for each visible card when discardMode=true', () => {
    const { container } = render(
      <Hand hand={[0, 5, 14]} visible={true} discardMode={true} onDiscard={vi.fn()} />,
    );
    const icons = container.querySelectorAll('[data-discard-icon]');
    expect(icons.length).toBe(3);
  });

  it('does not render discard icons for face-down cards', () => {
    const { container } = render(
      <Hand hand={[0, 5]} visible={false} discardMode={true} onDiscard={vi.fn()} />,
    );
    expect(container.querySelectorAll('[data-discard-icon]').length).toBe(0);
  });

  it('each discard icon carries the correct arcanum in data-discard-icon', () => {
    const { container } = render(
      <Hand hand={[3, 7]} visible={true} discardMode={true} onDiscard={vi.fn()} />,
    );
    const icons = container.querySelectorAll('[data-discard-icon]');
    expect(icons[0]?.getAttribute('data-discard-icon')).toBe('3');
    expect(icons[1]?.getAttribute('data-discard-icon')).toBe('7');
  });

  it('each discard icon has a correct aria-label with the card name', () => {
    render(
      <Hand hand={[0]} visible={true} discardMode={true} onDiscard={vi.fn()} />,
    );
    const cardName = arcanumByNumber(0).name;
    expect(
      screen.getByRole('button', { name: `Discard ${cardName}` }),
    ).toBeDefined();
  });

  it('clicking a discard icon fires onDiscard with the arcanum', () => {
    const onDiscard = vi.fn();
    const { container } = render(
      <Hand hand={[4, 9]} visible={true} discardMode={true} onDiscard={onDiscard} />,
    );
    const icon = container.querySelector('[data-discard-icon="4"]') as Element;
    expect(icon).not.toBeNull();
    fireEvent.click(icon);
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledWith(4);
  });

  it('clicking a discard icon does NOT fire onCardSelect', () => {
    const onCardSelect = vi.fn();
    const onDiscard = vi.fn();
    const { container } = render(
      <Hand
        hand={[4]}
        visible={true}
        discardMode={true}
        onCardSelect={onCardSelect}
        onDiscard={onDiscard}
      />,
    );
    const icon = container.querySelector('[data-discard-icon="4"]') as Element;
    fireEvent.click(icon);
    expect(onCardSelect).not.toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalledWith(4);
  });

  it('hovering a card in discard mode still fires onCardHover', () => {
    const onCardHover = vi.fn();
    const { container } = render(
      <Hand
        hand={[7]}
        visible={true}
        discardMode={true}
        onCardHover={onCardHover}
        onDiscard={vi.fn()}
      />,
    );
    // Hover the card slot wrapper
    const slot = container.querySelector('[data-card-slot]') as Element;
    expect(slot).not.toBeNull();
    fireEvent.mouseEnter(slot.parentElement ?? slot);
    expect(onCardHover).toHaveBeenCalledWith(7);
  });

  it('mouse leave in discard mode fires onCardHover with undefined', () => {
    const onCardHover = vi.fn();
    const { container } = render(
      <Hand
        hand={[7]}
        visible={true}
        discardMode={true}
        onCardHover={onCardHover}
        onDiscard={vi.fn()}
      />,
    );
    const slot = container.querySelector('[data-card-slot]') as Element;
    const wrapper = slot.parentElement ?? slot;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(onCardHover).toHaveBeenCalledWith(undefined);
  });

  it('discard icons are accessible buttons with tabIndex=0', () => {
    const { container } = render(
      <Hand hand={[1]} visible={true} discardMode={true} onDiscard={vi.fn()} />,
    );
    const icon = container.querySelector('[data-discard-icon]');
    expect(icon?.tagName).toBe('BUTTON');
    expect(icon?.getAttribute('tabindex')).toBe('0');
  });
});
