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
 * Picker for the player's astrological-sign class — refreshed in #314
 * from a 4×3 spreadsheet grid into a **carousel** of stages, where the
 * focused sign occupies a center stage with constellation art, breath
 * halo, ruler orbit, element/modality chips, stat tilts as visual
 * weights, and Soul Doors as Major Arcana mini-card previews. The
 * non-focused signs render as dimmer wings (prev / next) on desktop;
 * mobile is one-stage-at-a-time with swipe.
 *
 * Behavioural contract:
 *   - 12 `[data-sign]` cards exist in DOM (preserved from #212/#236
 *     so the e2e specs and integration tests still find them by key).
 *   - The `[role="radiogroup"]` carousel exposes the picker as a
 *     radio group. The currently-focused stage is `[role="radio"]`
 *     with `aria-checked="true"`.
 *   - Arrow keys (← / →) cycle the focused sign; Home / End jump.
 *   - Confirm CTA fires `onPick(signKey)`.
 *   - Taken signs render disabled (`aria-disabled="true"`); cycling
 *     skips over them so a player can never confirm a taken sign.
 *
 * The visual surface (constellation, ruler orbit, weighted stat
 * tilts, mini-card previews) is asserted at the structural level —
 * the SVG / class hooks each piece needs to be inspectable, NOT the
 * pixel-exact rendering. Visual regression covers pixels via the
 * `pnpm screenshots` capture and Playwright's per-viewport snapshots.
 */

describe('ZodiacSignPicker — content (preserved from #212/#236)', () => {
  it('renders all 12 sign cards as DOM nodes', () => {
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
});

describe('ZodiacSignPicker — carousel structure (#314)', () => {
  it('exposes a radiogroup with each sign as a radio option', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const group = container.querySelector('[role="radiogroup"]');
    expect(group, 'radiogroup wrapper').not.toBeNull();
    for (const sign of zodiacSigns) {
      const card = container.querySelector(`[data-sign="${sign.key}"]`);
      expect(card?.getAttribute('role'), `${sign.key} role`).toBe('radio');
    }
  });

  it('aries is the default focused stage on first mount', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const aries = container.querySelector('[data-sign="aries"]');
    expect(aries?.getAttribute('aria-checked')).toBe('true');
    expect(aries?.getAttribute('data-stage')).toBe('current');
    // Other signs are NOT current.
    expect(
      container.querySelector('[data-sign="leo"]')?.getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('renders the prev / current / next stages with correct data-stage labels', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // With aries default, prev wraps to pisces and next is taurus.
    expect(
      container.querySelector('[data-sign="pisces"]')?.getAttribute('data-stage'),
    ).toBe('prev');
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
    ).toBe('current');
    expect(
      container.querySelector('[data-sign="taurus"]')?.getAttribute('data-stage'),
    ).toBe('next');
  });

  it('ArrowRight cycles the focused stage forward', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement;
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
    ).toBe('prev');
    expect(
      container.querySelector('[data-sign="taurus"]')?.getAttribute('data-stage'),
    ).toBe('current');
    expect(
      container.querySelector('[data-sign="taurus"]')?.getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('ArrowLeft cycles the focused stage backward (wraps to pisces from aries)', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement;
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(
      container.querySelector('[data-sign="pisces"]')?.getAttribute('data-stage'),
    ).toBe('current');
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
    ).toBe('next');
  });

  it('Home / End jump to first / last sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement;
    fireEvent.keyDown(group, { key: 'End' });
    expect(
      container.querySelector('[data-sign="pisces"]')?.getAttribute('data-stage'),
    ).toBe('current');
    fireEvent.keyDown(group, { key: 'Home' });
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
    ).toBe('current');
  });

  it('clicking a wing (prev / next) cards moves the carousel to that sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    fireEvent.click(
      container.querySelector('[data-sign="taurus"]') as HTMLElement,
    );
    // Re-query: the keyed remount swaps DOM nodes between renders, so
    // the original element reference no longer carries the live
    // attributes. Query the live tree.
    const taurus = container.querySelector('[data-sign="taurus"]');
    expect(taurus?.getAttribute('data-stage')).toBe('current');
    expect(taurus?.getAttribute('aria-checked')).toBe('true');
  });

  it('on-screen prev / next buttons cycle the carousel', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // The picker renders two pairs of arrow buttons — one desktop,
    // one mobile — for layout-only reasons. Both call into the same
    // cycle handler. Click any "next" arrow and assert the focus
    // moves; the test is layout-agnostic.
    const nextButtons = screen.getAllByRole('button', { name: /next sign/i });
    expect(nextButtons.length).toBeGreaterThanOrEqual(1);
    const firstNext = nextButtons[0];
    if (firstNext === undefined) throw new Error('no next-sign button');
    fireEvent.click(firstNext);
    expect(
      container.querySelector('[data-sign="taurus"]')?.getAttribute('data-stage'),
    ).toBe('current');
    const prevButtons = screen.getAllByRole('button', {
      name: /previous sign/i,
    });
    const firstPrev = prevButtons[0];
    if (firstPrev === undefined) throw new Error('no previous-sign button');
    fireEvent.click(firstPrev);
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
    ).toBe('current');
  });
});

describe('ZodiacSignPicker — center stage visuals (#314)', () => {
  it('current stage shows constellation SVG marked aria-hidden', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // Cycle to taurus to confirm the constellation is per-sign.
    fireEvent.click(
      container.querySelector('[data-sign="taurus"]') as HTMLElement,
    );
    const stage = container.querySelector('[data-sign="taurus"]');
    const constellation = stage?.querySelector('[data-constellation]');
    expect(constellation, 'constellation SVG on the current stage').not.toBeNull();
    expect(constellation?.getAttribute('aria-hidden')).toBe('true');
    expect(constellation?.tagName.toLowerCase()).toBe('svg');
  });

  it('current stage exposes the ruler glyph as a visual orbit element', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // Aries → ruler is mars; the orbit element carries data-ruler.
    const aries = container.querySelector('[data-sign="aries"]');
    const ruler = aries?.querySelector('[data-ruler-orbit]');
    expect(ruler, 'ruler orbit on aries stage').not.toBeNull();
    expect(ruler?.getAttribute('data-ruler-orbit')).toBe('mars');
  });

  it('Scorpio shows BOTH classical (mars) and modern co-ruler (pluto) orbit elements', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    fireEvent.click(
      container.querySelector('[data-sign="scorpio"]') as HTMLElement,
    );
    const scorpio = container.querySelector('[data-sign="scorpio"]');
    expect(
      scorpio?.querySelector('[data-ruler-orbit="mars"]'),
      'classical ruler',
    ).not.toBeNull();
    expect(
      scorpio?.querySelector('[data-ruler-orbit="pluto"]'),
      'co-ruler',
    ).not.toBeNull();
  });

  it('current stage shows element + modality chips', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const aries = container.querySelector('[data-sign="aries"]');
    expect(
      aries?.querySelector('[data-chip="element"]'),
      'element chip',
    ).not.toBeNull();
    expect(
      aries?.querySelector('[data-chip="modality"]'),
      'modality chip',
    ).not.toBeNull();
    expect(
      aries?.querySelector('[data-chip="element"]')?.textContent?.toLowerCase(),
    ).toContain('fire');
    expect(
      aries?.querySelector('[data-chip="modality"]')?.textContent?.toLowerCase(),
    ).toContain('cardinal');
  });

  it('Hebrew letter glyph renders in the current stage with lang=he', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const aries = container.querySelector('[data-sign="aries"]');
    // Aries → He (path 15 / The Emperor) per `reference/correspondences.md`.
    const letter = aries?.querySelector('[data-hebrew-letter]');
    expect(letter?.textContent).toContain('ה'); // He glyph
    expect(letter?.getAttribute('lang')).toBe('he');
  });
});

describe('ZodiacSignPicker — stat tilts as visual weights (#314)', () => {
  it('renders a weighted token per stat-tilt magnitude (NOT a text row)', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // Aries dignity bonuses: mars rulership (+1 strength), sun exalt
    // (+2 harmony), venus detriment (-1 passion), saturn fall (-2
    // understanding). The "visual weight" surface emits one
    // [data-stat-weight] element per non-zero stat with a magnitude
    // attribute so a screen-reader-or-test can introspect them.
    const aries = container.querySelector('[data-sign="aries"]');
    const weights = aries?.querySelectorAll('[data-stat-weight]');
    const aryBonuses = zodiacBonus('aries');
    const expectedNonZero = Object.entries(aryBonuses).filter(
      ([, d]) => d !== 0 && d !== undefined,
    );
    expect(weights?.length, 'one weight token per non-zero stat').toBe(
      expectedNonZero.length,
    );
    for (const [stat, delta] of expectedNonZero) {
      const tok = aries?.querySelector(`[data-stat-weight="${stat}"]`);
      expect(tok, `weight token for ${stat}`).not.toBeNull();
      expect(tok?.getAttribute('data-magnitude')).toBe(String(delta));
    }
  });

  it('weight tokens render filled tokens equal to their magnitude (per side)', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const aries = container.querySelector('[data-sign="aries"]');
    const harmony = aries?.querySelector('[data-stat-weight="harmony"]');
    // +2 harmony → 2 filled tokens on the positive side.
    const filled = harmony?.querySelectorAll('[data-token="filled"]');
    expect(filled?.length).toBe(2);
    expect(harmony?.getAttribute('data-direction')).toBe('positive');

    const understanding = aries?.querySelector('[data-stat-weight="understanding"]');
    // -2 understanding → 2 filled tokens on the negative side.
    const negFilled = understanding?.querySelectorAll('[data-token="filled"]');
    expect(negFilled?.length).toBe(2);
    expect(understanding?.getAttribute('data-direction')).toBe('negative');
  });

  it('default classical pantheon: every sign renders at least one weight token', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // Sanity invariant — every classical sign has at least one
    // non-zero dignity entry, so every stage shows visible weights.
    for (const sign of zodiacSigns) {
      fireEvent.click(
        container.querySelector(`[data-sign="${sign.key}"]`) as HTMLElement,
      );
      const stage = container.querySelector(`[data-sign="${sign.key}"]`);
      expect(
        stage?.querySelectorAll('[data-stat-weight]').length,
        `${sign.key} weight count`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('ZodiacSignPicker — Soul Doors render shape (#314, #382)', () => {
  it('current stage renders the soul card once with each Soul Door as a chip', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    // Aries → Soul Doors: Chokmah, Tiferet (via The Emperor / Path 15).
    // The soul card is sign-level (one Major Arcana per sign), so it
    // renders ONCE; each door renders as its own Sefirah-tinted chip.
    // Earlier shape (per #314 v1) duplicated the soul card once per
    // door — that read as "the same card twice" on 2-door signs and
    // was fixed in #382.
    const aries = container.querySelector('[data-sign="aries"]');
    const doors = aries?.querySelectorAll('[data-soul-door]');
    expect(doors?.length, 'aries has 2 Soul Doors').toBe(2);
    expect(aries?.querySelector('[data-soul-door="chokmah"]')).not.toBeNull();
    expect(aries?.querySelector('[data-soul-door="tiferet"]')).not.toBeNull();

    // The soul card renders exactly once on the stage, not per door.
    const soulCards = aries?.querySelectorAll('[data-soul-card]');
    expect(soulCards?.length, 'aries renders one soul card').toBe(1);
  });

  it('Pisces shows the singular Soul Door (Netzach) plus the Malkuth footnote', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    fireEvent.click(
      container.querySelector('[data-sign="pisces"]') as HTMLElement,
    );
    const pisces = container.querySelector('[data-sign="pisces"]');
    const doors = pisces?.querySelectorAll('[data-soul-door]');
    expect(doors?.length).toBe(1);
    expect(pisces?.querySelector('[data-soul-door="netzach"]')).not.toBeNull();
    // The Malkuth footnote is preserved from the v1 picker — Pisces is
    // the only sign whose path runs into Malkuth, which has no Challenge.
    expect(pisces?.textContent).toMatch(/Malkuth has no Challenge/i);
  });

  it('every Soul Door arcana mapping uses the canonical soul-card path', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    for (const sign of zodiacSigns) {
      // Cycle to each sign so its Soul Doors render as the focused stage.
      fireEvent.click(
        container.querySelector(`[data-sign="${sign.key}"]`) as HTMLElement,
      );
      const arc = arcana.find(
        (a) => a.attribution.kind === 'sign' && a.attribution.value === sign.key,
      );
      if (arc === undefined) {
        throw new Error(`fixture invariant: no soul card for ${sign.key}`);
      }
      const path = pathByArcanum(arc.number);
      const stage = container.querySelector(`[data-sign="${sign.key}"]`);
      // The arcanum surfaced as the soul-card preview is the Major
      // Arcanum at this sign's path.
      const card = stage?.querySelector(`[data-soul-card][data-arcanum="${arc.number}"]`);
      expect(card, `soul card for ${sign.key} (path ${path.number})`).not.toBeNull();
    }
  });
});

describe('ZodiacSignPicker — confirm + selection (preserved + #314)', () => {
  it('Confirm fires onPick with the currently focused sign key', () => {
    const onPick = vi.fn();
    const { container } = render(<ZodiacSignPicker onPick={onPick} />);
    // Cycle to leo, then confirm.
    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement;
    // 4 right-arrows from aries → taurus → gemini → cancer → leo.
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(group, { key: 'ArrowRight' });
    }
    fireEvent.click(screen.getByRole('button', { name: /^Confirm Leo$/i }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('leo' satisfies ZodiacSignKey);
  });

  it('Confirm CTA names the focused sign so the player sees what they are committing to', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /^Confirm Aries$/ }),
    ).toBeInTheDocument();
    // Cycle to taurus.
    fireEvent.click(
      container.querySelector('[data-sign="taurus"]') as HTMLElement,
    );
    expect(
      screen.getByRole('button', { name: /^Confirm Taurus$/ }),
    ).toBeInTheDocument();
  });

  it('Confirm is disabled in the pathological all-signs-taken case (#370 fallback)', () => {
    // Pre-#370 this test exercised the much more common case of
    // "default focus is aries, aries is taken → Confirm disabled."
    // After #370 the picker skips taken signs at mount, so reaching
    // a taken-focused state requires every sign to be taken — the
    // pathological 12-player case the fallback in
    // ZodiacSignPicker's `initialFocusedIndex` covers. Pin that the
    // fallback (index 0) lands on a disabled Confirm rather than
    // blowing up or somehow enabling pick.
    const allTaken = Object.fromEntries(
      zodiacSigns.map((s) => [s.key, 'someone']),
    );
    render(<ZodiacSignPicker onPick={vi.fn()} taken={allTaken} />);
    const confirm = screen.getByRole('button', { name: /^Confirm/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});

describe('ZodiacSignPicker — taken signs (preserved from #212/#236)', () => {
  it('marks taken signs aria-disabled and shows the taker name', () => {
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

  it('clicking a taken wing card does NOT focus it as the current stage', () => {
    const { container } = render(
      <ZodiacSignPicker onPick={vi.fn()} taken={{ taurus: 'Andy' }} />,
    );
    const taurus = container.querySelector(
      '[data-sign="taurus"]',
    ) as HTMLElement;
    fireEvent.click(taurus);
    // Taurus stays disabled and aries remains the current stage.
    expect(taurus.getAttribute('aria-checked')).toBe('false');
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
    ).toBe('current');
  });

  it('initial focus skips taken signs — opens on the first available (#370)', () => {
    // Per #370 option (a): when the picker mounts with `taken`
    // already including the default-focus sign (aries), the carousel
    // should anchor on the first AVAILABLE sign instead of dropping
    // the player on a sign they cannot pick. This eliminates the
    // ambiguous "Confirm Aries" CTA P2 saw when aries was taken by
    // P1 — the cycle-skip helper already handled navigation but the
    // initial state was unconditionally aries.
    const { container } = render(
      <ZodiacSignPicker onPick={vi.fn()} taken={{ aries: 'Andy' }} />,
    );
    expect(
      container.querySelector('[data-sign="aries"]')?.getAttribute('data-stage'),
      'aries should not be the current stage when taken',
    ).not.toBe('current');
    expect(
      container.querySelector('[data-sign="taurus"]')?.getAttribute('data-stage'),
      'taurus is the next available sign in zodiacal order',
    ).toBe('current');
    // The Confirm CTA should reflect the new initial focus, not aries.
    expect(screen.queryByRole('button', { name: /^Confirm Aries$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^Confirm Taurus$/ })).toBeInTheDocument();
  });

  it('initial focus walks past consecutive taken signs to the first available', () => {
    // If aries AND taurus are both taken, the initial focus lands on
    // gemini. The walk uses the same skip-table the cycle helper does.
    const { container } = render(
      <ZodiacSignPicker
        onPick={vi.fn()}
        taken={{ aries: 'Andy', taurus: 'Bea' }}
      />,
    );
    expect(
      container.querySelector('[data-sign="gemini"]')?.getAttribute('data-stage'),
    ).toBe('current');
  });

  it('cycling skips taken signs', () => {
    const { container } = render(
      <ZodiacSignPicker
        onPick={vi.fn()}
        // Taurus is taken; ArrowRight from aries should land on gemini.
        taken={{ taurus: 'Andy' }}
      />,
    );
    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement;
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(
      container.querySelector('[data-sign="gemini"]')?.getAttribute('data-stage'),
    ).toBe('current');
  });

  it('available signs remain selectable via Confirm', () => {
    const onPick = vi.fn();
    const { container } = render(
      <ZodiacSignPicker onPick={onPick} taken={{ aries: 'Andy' }} />,
    );
    const leo = container.querySelector('[data-sign="leo"]') as HTMLElement;
    fireEvent.click(leo);
    fireEvent.click(screen.getByRole('button', { name: /^Confirm Leo$/ }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('leo' satisfies ZodiacSignKey);
  });
});

describe('ZodiacSignPicker — pantheon seam (#293 future-proof)', () => {
  it('accepts a `pantheon` prop without altering classical default', () => {
    // The seam is wide-open today; only `'classical'` is supported. A
    // future #293 PR adds pluggable variants without re-shaping the
    // ZodiacSignPicker API. We assert the prop is accepted (no
    // type / runtime crash) and the rendered default is unchanged.
    const { container } = render(
      <ZodiacSignPicker onPick={vi.fn()} pantheon="classical" />,
    );
    expect(container.querySelectorAll('[data-sign]').length).toBe(12);
    const aries = container.querySelector('[data-sign="aries"]');
    // Mars + sun exalt = strength + harmony tilts present.
    expect(aries?.querySelector('[data-stat-weight="strength"]')).not.toBeNull();
    expect(aries?.querySelector('[data-stat-weight="harmony"]')).not.toBeNull();
  });
});

describe('ZodiacSignPicker — screen-reader announcement (#314 a11y)', () => {
  it('renders an sr-only live region naming the focused sign', () => {
    // Native <input type="radio"> moves DOM focus on arrow-key, which
    // triggers re-announcement. Our carousel keeps focus fixed on a
    // tabIndex={0} wrapper while inner content swaps; without an
    // aria-live region, NVDA / JAWS users wouldn't hear the sign
    // change. Pin the contract here.
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const live = container.querySelector('[data-sign-picker-announce]');
    expect(live, 'sr-only announcement region present').not.toBeNull();
    expect(live?.getAttribute('role')).toBe('status');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.getAttribute('aria-atomic')).toBe('true');
    // Default focus is Aries (first available).
    expect(live?.textContent?.trim()).toBe('Aries');
  });

  it('updates the announcement region when arrow-keying to the next sign', () => {
    const { container } = render(<ZodiacSignPicker onPick={vi.fn()} />);
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
    if (group === null) return;

    fireEvent.keyDown(group, { key: 'ArrowRight' });

    const live = container.querySelector('[data-sign-picker-announce]');
    expect(live?.textContent?.trim()).toBe('Taurus');
  });
});
