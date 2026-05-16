import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayScreen } from '../PlayScreen';
import { makeFullGame } from '@/test/fixtures';
import { seededRng } from '@/engine/rng';

/**
 * #384 — Clicking a Sefirah on the in-game Tree opens an inline
 * popover and does NOT navigate. The full Codex page is reachable
 * via the popover's "Read more" link, which opens in a new tab so
 * game state is never lost.
 *
 * Pre-#384, `TreeBoard` rendered each Sefirah as `<a href="/sefirah/
 * {key}">`. On `/play` that anchor would navigate the player away
 * from the game (which uses local React state — no URL persistence)
 * and the Codex page had no return-to-game affordance.
 */

describe('PlayScreen — #384 in-game Sefirah click opens popover', () => {
  function renderPlay(): void {
    const state = makeFullGame({ playerCount: 2, seed: 1 });
    const rng = seededRng(2);
    render(<PlayScreen initialState={state} rng={rng} />);
  }

  it('renders Tree Sefirah surfaces as buttons (no anchor href to /sefirah/)', () => {
    renderPlay();
    // The Tree's overlay layer carries the click surface.
    const buttons = document.querySelectorAll('button[data-sefirah-link]');
    expect(buttons.length).toBe(10);
    const anchors = document.querySelectorAll('a[data-sefirah-link]');
    expect(anchors.length).toBe(0);
  });

  it('clicking a Sefirah opens the popover; close button dismisses it', () => {
    renderPlay();
    expect(document.querySelector('[data-sefirah-popover]')).toBeNull();

    const tiferet = document.querySelector<HTMLButtonElement>(
      'button[data-sefirah-link="tiferet"]',
    );
    expect(tiferet).not.toBeNull();
    if (tiferet === null) return;
    act(() => {
      fireEvent.click(tiferet);
    });

    const popover = document.querySelector('[data-sefirah-popover="tiferet"]');
    expect(popover).not.toBeNull();
    expect(popover?.getAttribute('role')).toBe('dialog');
    expect(popover?.getAttribute('aria-modal')).toBe('true');

    // The "Read more in Codex" link is the only escape hatch to the
    // full Codex page; it opens in a new tab so game state survives.
    const codexLink = popover?.querySelector<HTMLAnchorElement>('[data-popover-codex-link]');
    expect(codexLink?.getAttribute('href')).toBe('/sefirah/tiferet');
    expect(codexLink?.getAttribute('target')).toBe('_blank');
    expect(codexLink?.getAttribute('rel')).toBe('noopener noreferrer');

    // Close.
    const closeBtn = screen.getByRole('button', { name: /close/i });
    act(() => {
      fireEvent.click(closeBtn);
    });
    expect(document.querySelector('[data-sefirah-popover]')).toBeNull();
  });

  it('Escape key closes the popover', () => {
    renderPlay();
    const tiferet = document.querySelector<HTMLButtonElement>(
      'button[data-sefirah-link="tiferet"]',
    );
    expect(tiferet).not.toBeNull();
    if (tiferet === null) return;
    act(() => {
      fireEvent.click(tiferet);
    });
    expect(document.querySelector('[data-sefirah-popover]')).not.toBeNull();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(document.querySelector('[data-sefirah-popover]')).toBeNull();
  });

  it('clicking the backdrop closes the popover', () => {
    renderPlay();
    const tiferet = document.querySelector<HTMLButtonElement>(
      'button[data-sefirah-link="tiferet"]',
    );
    expect(tiferet).not.toBeNull();
    if (tiferet === null) return;
    act(() => {
      fireEvent.click(tiferet);
    });
    const backdrop = document.querySelector<HTMLDivElement>('[data-sefirah-popover-backdrop]');
    expect(backdrop).not.toBeNull();
    if (backdrop === null) return;
    act(() => {
      fireEvent.click(backdrop);
    });
    expect(document.querySelector('[data-sefirah-popover]')).toBeNull();
  });

  it('clicking a different Sefirah while the popover is open swaps to the new key', () => {
    renderPlay();
    const tiferet = document.querySelector<HTMLButtonElement>(
      'button[data-sefirah-link="tiferet"]',
    );
    expect(tiferet).not.toBeNull();
    if (tiferet === null) return;
    act(() => {
      fireEvent.click(tiferet);
    });
    expect(document.querySelector('[data-sefirah-popover="tiferet"]')).not.toBeNull();
    const yesod = document.querySelector<HTMLButtonElement>('button[data-sefirah-link="yesod"]');
    expect(yesod).not.toBeNull();
    if (yesod === null) return;
    act(() => {
      fireEvent.click(yesod);
    });
    expect(document.querySelector('[data-sefirah-popover="tiferet"]')).toBeNull();
    expect(document.querySelector('[data-sefirah-popover="yesod"]')).not.toBeNull();
  });

  it('popover surfaces basic Sefirah info (English name, Hebrew, stat, sparks count)', () => {
    renderPlay();
    const yesod = document.querySelector<HTMLButtonElement>('button[data-sefirah-link="yesod"]');
    expect(yesod).not.toBeNull();
    if (yesod === null) return;
    act(() => {
      fireEvent.click(yesod);
    });
    const popover = document.querySelector('[data-sefirah-popover="yesod"]');
    expect(popover).not.toBeNull();
    expect(popover?.querySelector('[data-popover-name]')?.textContent).toContain('Foundation');
    expect(popover?.querySelector('[data-popover-hebrew]')?.getAttribute('lang')).toBe('he');
    expect(popover?.querySelector('[data-popover-stat]')?.textContent).toMatch(/Stat: intuition/i);
    expect(popover?.querySelector('[data-popover-sparks]')?.textContent).toMatch(/spark/i);
  });
});
