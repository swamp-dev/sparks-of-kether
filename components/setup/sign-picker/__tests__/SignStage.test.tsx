import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SignStage } from '../SignStage';
import { zodiacSigns } from '@/data';

/**
 * SignStage — the "one sign as a stage" component used at the centre
 * of the carousel and rendered once per stage slot (prev / current /
 * next) on desktop. The same component is reused for the wing
 * positions; `stage` controls whether it reads as theatre (current)
 * or as a dimmer wing (prev / next). The container ZodiacSignPicker
 * sets `aria-checked` and `aria-disabled` and supplies the click
 * handler — SignStage is a pure visual presenter.
 */

describe('SignStage', () => {
  it('renders one stage per zodiac sign with a data-sign hook', () => {
    for (const sign of zodiacSigns) {
      const { container } = render(
        <SignStage
          sign={sign}
          stage="current"
          ariaChecked={true}
          tabIndex={0}
          disabled={false}
          takenBy={undefined}
          onSelect={vi.fn()}
        />,
      );
      expect(
        container.querySelector(`[data-sign="${sign.key}"]`),
        `data-sign hook for ${sign.key}`,
      ).not.toBeNull();
    }
  });

  it('current stage exposes constellation, ruler orbit, chips, weights, doors', () => {
    const aries = zodiacSigns[0];
    if (aries === undefined) throw new Error('zodiacSigns is empty');
    const { container } = render(
      <SignStage
        sign={aries}
        stage="current"
        ariaChecked={true}
        tabIndex={0}
        disabled={false}
        takenBy={undefined}
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-constellation]')).not.toBeNull();
    expect(container.querySelector('[data-ruler-orbit]')).not.toBeNull();
    expect(container.querySelector('[data-chip="element"]')).not.toBeNull();
    expect(container.querySelector('[data-chip="modality"]')).not.toBeNull();
    expect(container.querySelector('[data-stat-weight]')).not.toBeNull();
    expect(container.querySelector('[data-soul-door]')).not.toBeNull();
    expect(container.querySelector('[data-hebrew-letter]')).not.toBeNull();
  });

  it('wing stages (prev / next) suppress decorative orbit + constellation for perf', () => {
    const aries = zodiacSigns[0];
    if (aries === undefined) throw new Error('zodiacSigns is empty');
    const { container } = render(
      <SignStage
        sign={aries}
        stage="next"
        ariaChecked={false}
        tabIndex={-1}
        disabled={false}
        takenBy={undefined}
        onSelect={vi.fn()}
      />,
    );
    // Wing stages don't render heavy decorative SVG — the data-sign
    // hook is still there (so the e2e click selector still works) and
    // the glyph + name surface, but the constellation art and ruler
    // orbit are suppressed so the wings stay dim and quiet.
    expect(container.querySelector('[data-sign="aries"]')).not.toBeNull();
    expect(container.textContent).toContain('Aries');
    expect(container.querySelector('[data-constellation]')).toBeNull();
    expect(container.querySelector('[data-ruler-orbit]')).toBeNull();
  });

  it('Space on the stage button fires onSelect (radiogroup APG)', () => {
    // WAI-ARIA radiogroup pattern: Space selects the focused radio
    // option (= "set this as the focused stage"); commit happens on
    // the explicit Confirm CTA in the picker chrome. SignStage NEVER
    // auto-confirms via keyboard — that would surprise a keyboard
    // user who tabbed to the option only to discover Enter committed
    // their pick before they could review it.
    const onSelect = vi.fn();
    const aries = zodiacSigns[0];
    if (aries === undefined) throw new Error('zodiacSigns is empty');
    const { container } = render(
      <SignStage
        sign={aries}
        stage="current"
        ariaChecked={true}
        tabIndex={0}
        disabled={false}
        takenBy={undefined}
        onSelect={onSelect}
      />,
    );
    const button = container.querySelector('[data-sign="aries"]') as HTMLElement;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    // Space fires onSelect (the WAI-ARIA radiogroup contract); the
    // explicit Confirm CTA in the picker chrome is the only commit
    // path. SignStage does not carry a separate activation handler.
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('Enter on the stage button does NOT trigger any handler', () => {
    // Pinned: Enter is reserved for the visible Confirm CTA. If a
    // future commit binds Enter on the stage to onSelect, this test
    // stays loud about it — keyboard users would lose the "tab to
    // Confirm" ergonomic without explicit consideration.
    const onSelect = vi.fn();
    const aries = zodiacSigns[0];
    if (aries === undefined) throw new Error('zodiacSigns is empty');
    const { container } = render(
      <SignStage
        sign={aries}
        stage="current"
        ariaChecked={true}
        tabIndex={0}
        disabled={false}
        takenBy={undefined}
        onSelect={onSelect}
      />,
    );
    const button = container.querySelector('[data-sign="aries"]') as HTMLElement;
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  describe('Soul Doors render shape (#382)', () => {
    // The bug: SignStage looped over the 1–2 doors and rendered an
    // ArcanumCard per door, so 2-door signs displayed the same Tarot
    // card twice. The soul card is sign-level (one Major Arcana per
    // sign); the doors are Sefirah-level. The fix renders the soul
    // card ONCE and the doors as separate Sefirah chips below it.
    it('renders the soul card exactly once for a 2-door sign (Aries)', () => {
      const aries = zodiacSigns.find((s) => s.key === 'aries');
      if (aries === undefined) throw new Error('aries missing from zodiacSigns');
      const { container } = render(
        <SignStage
          sign={aries}
          stage="current"
          ariaChecked={true}
          tabIndex={0}
          disabled={false}
          takenBy={undefined}
          onSelect={vi.fn()}
        />,
      );
      // Aries has two doors (Chokmah, Tiferet), but the soul card
      // (The Emperor) is one card per sign. Exactly one rendering.
      expect(
        container.querySelectorAll('[data-soul-card]'),
        'soul card must render exactly once per sign',
      ).toHaveLength(1);
    });

    it('renders both Aries door names as separate Sefirah chips', () => {
      const aries = zodiacSigns.find((s) => s.key === 'aries');
      if (aries === undefined) throw new Error('aries missing from zodiacSigns');
      const { container, getByText } = render(
        <SignStage
          sign={aries}
          stage="current"
          ariaChecked={true}
          tabIndex={0}
          disabled={false}
          takenBy={undefined}
          onSelect={vi.fn()}
        />,
      );
      // The data-soul-door hooks survive the rewrite — one per door,
      // each carrying the SefirahKey. Two doors for Aries.
      const doors = container.querySelectorAll('[data-soul-door]');
      expect(doors).toHaveLength(2);
      // Both transliterated door names are visible. The chip carries
      // the door label so the player can see *which* Sefirah is the
      // door, distinct from the soul card identity.
      expect(getByText('Chokmah')).toBeDefined();
      expect(getByText('Tiferet')).toBeDefined();
    });

    it('renders the soul card exactly once for the 1-door sign (Pisces)', () => {
      const pisces = zodiacSigns.find((s) => s.key === 'pisces');
      if (pisces === undefined) throw new Error('pisces missing from zodiacSigns');
      const { container, getByText } = render(
        <SignStage
          sign={pisces}
          stage="current"
          ariaChecked={true}
          tabIndex={0}
          disabled={false}
          takenBy={undefined}
          onSelect={vi.fn()}
        />,
      );
      // Pisces is the single-door class (path 29 ends at Malkuth,
      // which has no Challenge). One card, one chip.
      expect(container.querySelectorAll('[data-soul-card]')).toHaveLength(1);
      const doors = container.querySelectorAll('[data-soul-door]');
      expect(doors).toHaveLength(1);
      expect(getByText('Netzach')).toBeDefined();
    });
  });

  it('disabled (taken) stage shows the takenBy banner and does not fire onSelect', () => {
    const onSelect = vi.fn();
    const aries = zodiacSigns[0];
    if (aries === undefined) throw new Error('zodiacSigns is empty');
    const { container } = render(
      <SignStage
        sign={aries}
        stage="current"
        ariaChecked={false}
        tabIndex={0}
        disabled={true}
        takenBy="Andy"
        onSelect={onSelect}
      />,
    );
    expect(container.querySelector('[data-taken-by]')?.textContent).toMatch(/Taken by Andy/);
    const button = container.querySelector('[data-sign="aries"]') as HTMLElement;
    button.click();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
