import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ZodiacSignPicker } from '../ZodiacSignPicker';
import {
  zodiacSigns,
  arcana,
  pathByArcanum,
  type ZodiacSignKey,
} from '@/data';
import { zodiacBonus } from '@/engine/zodiac-bonus';

/**
 * Picker for the player's astrological-sign class (Epic #212 T6).
 * Replaces the six-card SoulAspectPicker with a 12-card grid; each
 * card surfaces:
 *   - sign name + Hebrew/Latin glyph (♈–♓)
 *   - element + modality
 *   - ruler (and the modern co-ruler for Scorpio/Pisces)
 *   - dignity-derived stat bonuses (from `engine/zodiac-bonus.ts`)
 *   - Soul Doors line per `design/soul-doors.md` § 6 (singular form
 *     for Pisces; plural for the other 11)
 */

describe('ZodiacSignPicker — content', () => {
  it('renders all 12 sign cards', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    expect(container.querySelectorAll('[data-sign]').length).toBe(12);
    for (const sign of zodiacSigns) {
      expect(
        container.querySelector(`[data-sign="${sign.key}"]`),
        `card for ${sign.key}`,
      ).not.toBeNull();
    }
  });

  it('shows the glyph and English name for each sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    for (const sign of zodiacSigns) {
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      expect(card?.textContent, `${sign.key} content`).toContain(sign.glyph);
      expect(card?.textContent, `${sign.key} content`).toContain(sign.name);
    }
  });

  it('shows the element and modality for each sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    for (const sign of zodiacSigns) {
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      const text = card?.textContent ?? '';
      // Case-insensitive — picker may title-case for display.
      expect(text.toLowerCase(), `${sign.key} element`).toContain(sign.element);
      expect(text.toLowerCase(), `${sign.key} modality`).toContain(sign.modality);
    }
  });

  it('shows the classical ruler for each sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    for (const sign of zodiacSigns) {
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      // Ruler appears as a planet name (case-insensitive).
      expect(card?.textContent?.toLowerCase(), `${sign.key} ruler`).toContain(
        sign.ruler,
      );
    }
  });

  it('shows the modern co-ruler for Scorpio (Pluto) and Pisces (Neptune)', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const scorpio = container.querySelector('[data-sign="scorpio"]');
    expect(scorpio?.textContent?.toLowerCase()).toContain('pluto');
    const pisces = container.querySelector('[data-sign="pisces"]');
    expect(pisces?.textContent?.toLowerCase()).toContain('neptune');
  });

  it('shows the full dignity-derived stat bonuses for each sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    for (const sign of zodiacSigns) {
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      const bonus = card?.querySelector(`[data-bonus-grid]`);
      expect(bonus, `bonus grid for ${sign.key}`).not.toBeNull();
      const bonuses = zodiacBonus(sign.key);
      // Every non-zero entry in zodiacBonus(sign) must appear in the
      // grid with the right sign and magnitude. Negatives use U+2212
      // (true minus sign) per design-doc typography, not ASCII -.
      for (const [stat, delta] of Object.entries(bonuses)) {
        if (delta === 0) continue;
        const d = delta as number;
        const expected = `${d > 0 ? '+' : '−'}${Math.abs(d)} ${stat}`;
        expect(
          bonus?.textContent,
          `${sign.key} expected to show "${expected}"`,
        ).toContain(expected);
      }
    }
  });

  it('shows the Soul Doors line for each non-Pisces sign in plural form', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // The plural-form contract per `design/soul-doors.md` § 6:
    //   "Soul Doors: <X>, <Y> (via <Card> / Path <N>)"
    for (const sign of zodiacSigns.filter((s) => s.key !== 'pisces')) {
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      const doorLine = card?.querySelector('[data-soul-doors]');
      expect(doorLine, `Soul Doors line for ${sign.key}`).not.toBeNull();
      const text = doorLine?.textContent ?? '';
      expect(text).toMatch(/^Soul Doors:/);
      expect(text).toMatch(/via .+ \/ Path \d+/);
    }
  });

  it('shows Pisces in singular Soul Door form with the Malkuth footnote', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const pisces = container.querySelector('[data-sign="pisces"]');
    const doorLine = pisces?.querySelector('[data-soul-doors]');
    expect(doorLine, 'Pisces Soul Door line').not.toBeNull();
    const text = doorLine?.textContent ?? '';
    // Singular header per § 6 of design/soul-doors.md.
    expect(text).toMatch(/^Soul Door:/);
    expect(text).toContain('Netzach');
    expect(text).toMatch(/via The Moon \/ Path 29/);
    // Footnote about Malkuth's missing Challenge.
    expect(text).toMatch(/Malkuth has no Challenge/i);
  });

  it('Soul Doors line names the soul card and path for each sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    for (const sign of zodiacSigns) {
      const arc = arcana.find(
        (a) => a.attribution.kind === 'sign' && a.attribution.value === sign.key,
      );
      if (arc === undefined) {
        throw new Error(`fixture invariant: no soul card for ${sign.key}`);
      }
      const path = pathByArcanum(arc.number);
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      const doorLine = card?.querySelector('[data-soul-doors]');
      const text = doorLine?.textContent ?? '';
      expect(text, `${sign.key} card name`).toContain(arc.name);
      expect(text, `${sign.key} path number`).toContain(`Path ${path.number}`);
    }
  });
});

describe('ZodiacSignPicker — selection', () => {
  it('clicking a card selects it visibly', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const aries = container.querySelector('[data-sign="aries"]') as HTMLButtonElement;
    fireEvent.click(aries);
    expect(aries.getAttribute('data-selected')).toBe('true');
    expect(aries.getAttribute('aria-pressed')).toBe('true');
    // Other cards stay unselected.
    expect(
      container.querySelector('[data-sign="virgo"]')?.getAttribute('data-selected'),
    ).toBe('false');
  });

  it('Confirm fires onPick with the selected sign key', () => {
    const onPick = vi.fn();
    const { container } = render(<ZodiacSignPicker onPick={onPick} />);
    const aries = container.querySelector('[data-sign="aries"]') as HTMLButtonElement;
    fireEvent.click(aries);
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('aries' satisfies ZodiacSignKey);
  });

  it('Confirm is disabled before any selection', () => {
    render(<ZodiacSignPicker onPick={vi.fn()} />);
    const confirm = screen.getByRole('button', {
      name: /^Confirm$/,
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('Confirm becomes enabled once a sign is selected', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const confirm = screen.getByRole('button', {
      name: /^Confirm$/,
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(
      container.querySelector('[data-sign="leo"]') as HTMLButtonElement,
    );
    expect(confirm.disabled).toBe(false);
  });
});

describe('ZodiacSignPicker — taken signs', () => {
  it('marks taken signs aria-disabled and shows the taker name', () => {
    // Mirrors SoulAspectPicker's behaviour: aria-disabled (not the
    // HTML `disabled` attr) keeps the card focusable so AT users can
    // hear who took it.
    const { container } = render(
      <ZodiacSignPicker
        onPick={vi.fn()}
        taken={{ aries: 'Andy', virgo: 'Bea' }}
      />,
    );
    const aries = container.querySelector('[data-sign="aries"]');
    const virgo = container.querySelector('[data-sign="virgo"]');
    expect(aries?.getAttribute('aria-disabled')).toBe('true');
    expect(virgo?.getAttribute('aria-disabled')).toBe('true');
    expect(aries?.querySelector('[data-taken-by]')?.textContent).toMatch(
      /Taken by Andy/,
    );
    expect(virgo?.querySelector('[data-taken-by]')?.textContent).toMatch(
      /Taken by Bea/,
    );
  });

  it('clicking a taken sign does not select it', () => {
    const onPick = vi.fn();
    const { container } = render(
      <ZodiacSignPicker onPick={onPick} taken={{ aries: 'Andy' }} />,
    );
    const aries = container.querySelector('[data-sign="aries"]') as HTMLButtonElement;
    fireEvent.click(aries);
    expect(aries.getAttribute('data-selected')).toBe('false');
  });

  it('available signs remain selectable when others are taken', () => {
    const onPick = vi.fn();
    const { container } = render(
      <ZodiacSignPicker onPick={onPick} taken={{ aries: 'Andy' }} />,
    );
    const leo = container.querySelector('[data-sign="leo"]') as HTMLButtonElement;
    fireEvent.click(leo);
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('leo' satisfies ZodiacSignKey);
  });
});
