import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SoulAspectPicker } from '../SoulAspectPicker';
import { soulAspects } from '@/data';

describe('SoulAspectPicker — content', () => {
  it('renders all 6 Soul Aspect cards', () => {
    const { container } = render(<SoulAspectPicker onPick={vi.fn()} />);
    expect(container.querySelectorAll('[data-aspect]').length).toBe(6);
    for (const aspect of soulAspects) {
      expect(
        container.querySelector(`[data-aspect="${aspect.key}"]`),
        `card for ${aspect.key}`,
      ).not.toBeNull();
    }
  });

  it('shows the +2 stat callout for each aspect', () => {
    const { container } = render(<SoulAspectPicker onPick={vi.fn()} />);
    for (const aspect of soulAspects) {
      const card = container.querySelector(`[data-aspect="${aspect.key}"]`);
      const bonus = card?.querySelector('[data-bonus-stat]');
      expect(bonus?.textContent).toMatch(new RegExp(`\\+2 ${aspect.bonusStat}`));
    }
  });
});

describe('SoulAspectPicker — selection', () => {
  it('clicking a card selects it visibly', () => {
    const { container } = render(<SoulAspectPicker onPick={vi.fn()} />);
    const tiferet = container.querySelector('[data-aspect="tiferet"]') as HTMLButtonElement;
    fireEvent.click(tiferet);
    expect(tiferet.getAttribute('data-selected')).toBe('true');
    expect(tiferet.getAttribute('aria-pressed')).toBe('true');
    // Other cards stay unselected.
    expect(
      container.querySelector('[data-aspect="hod"]')?.getAttribute('data-selected'),
    ).toBe('false');
  });

  it('Confirm fires onPick with the selected aspect key', () => {
    const onPick = vi.fn();
    render(<SoulAspectPicker onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /The Heart/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('tiferet');
  });

  it('Confirm is disabled before any selection', () => {
    render(<SoulAspectPicker onPick={vi.fn()} />);
    const confirm = screen.getByRole('button', { name: /^Confirm$/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});

describe('SoulAspectPicker — taken aspects', () => {
  it('marks taken aspects aria-disabled and shows the taker name', () => {
    // aria-disabled (not the HTML `disabled` attr) keeps the card
    // focusable so AT users can hear who took it. Click handling is
    // guarded separately.
    const { container } = render(
      <SoulAspectPicker
        onPick={vi.fn()}
        taken={{ tiferet: 'Andy', gevurah: 'Bea' }}
      />,
    );
    const tiferet = container.querySelector('[data-aspect="tiferet"]');
    const gevurah = container.querySelector('[data-aspect="gevurah"]');
    expect(tiferet?.getAttribute('aria-disabled')).toBe('true');
    expect(gevurah?.getAttribute('aria-disabled')).toBe('true');
    expect(
      tiferet?.querySelector('[data-taken-by]')?.textContent,
    ).toMatch(/Taken by Andy/);
    expect(
      gevurah?.querySelector('[data-taken-by]')?.textContent,
    ).toMatch(/Taken by Bea/);
  });

  it('clicking a taken aspect does not select it', () => {
    const onPick = vi.fn();
    const { container } = render(
      <SoulAspectPicker onPick={onPick} taken={{ tiferet: 'Andy' }} />,
    );
    const tiferet = container.querySelector('[data-aspect="tiferet"]') as HTMLButtonElement;
    fireEvent.click(tiferet);
    expect(tiferet.getAttribute('data-selected')).toBe('false');
  });

  it('available aspects remain selectable when others are taken', () => {
    const onPick = vi.fn();
    const { container } = render(
      <SoulAspectPicker onPick={onPick} taken={{ tiferet: 'Andy' }} />,
    );
    const hod = container.querySelector('[data-aspect="hod"]') as HTMLButtonElement;
    fireEvent.click(hod);
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('hod');
  });
});
