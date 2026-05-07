import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ZodiacSignKey } from '@/data';
import { Lobby, type LobbyPlayer } from '../Lobby';

// Default-distinct signs per id-suffix so the duplicate-zodiac-signs
// gate (mirrors `validateAndBuildSetup`) doesn't silently disable
// Begin in tests that don't care about signs. Tests that DO care
// override `zodiacSign` explicitly.
const DEFAULT_SIGNS: readonly ZodiacSignKey[] = ['aries', 'leo', 'virgo', 'pisces', 'taurus'];

function defaultSignForId(id: string): ZodiacSignKey {
  const match = /(\d+)/.exec(id);
  const idx = match ? Number(match[1]) - 1 : 0;
  return DEFAULT_SIGNS[idx % DEFAULT_SIGNS.length] ?? 'aries';
}

const player = (id: string, overrides: Partial<LobbyPlayer> = {}): LobbyPlayer => ({
  id,
  name: id.toUpperCase(),
  zodiacSign: defaultSignForId(id),
  ready: false,
  ...overrides,
});

describe('Lobby — rendering', () => {
  it('renders one row per player with name and sign label', () => {
    const { container } = render(
      <Lobby
        players={[
          player('p1', { name: 'Andy', zodiacSign: 'aries' }),
          player('p2', { name: 'Bea', zodiacSign: 'leo' }),
        ]}
      />,
    );
    const rows = container.querySelectorAll('[data-lobby-row]');
    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toMatch(/Andy/);
    expect(rows[0]?.textContent).toMatch(/Aries/);
    expect(rows[1]?.textContent).toMatch(/Bea/);
    expect(rows[1]?.textContent).toMatch(/Leo/);
  });

  it('marks the (you) tag for the current player', () => {
    const { container } = render(
      <Lobby
        players={[player('p1', { name: 'Andy' }), player('p2', { name: 'Bea' })]}
        currentPlayerId="p2"
      />,
    );
    expect(container.querySelector('[data-lobby-row="p2"]')?.textContent).toMatch(/\(you\)/i);
    expect(container.querySelector('[data-lobby-row="p1"]')?.textContent).not.toMatch(/\(you\)/i);
  });

  it('shows "Choosing sign…" when zodiacSign is null', () => {
    const { container } = render(<Lobby players={[player('p1', { zodiacSign: null })]} />);
    expect(container.textContent).toMatch(/Choosing sign/);
  });
});

describe('Lobby — Begin button', () => {
  it('Begin not rendered for non-host', () => {
    render(
      <Lobby
        players={[player('p1', { ready: true }), player('p2', { ready: true })]}
        isHost={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Begin$/ })).toBeNull();
  });

  it('host sees Begin disabled while not all players are ready', () => {
    render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[player('p1', { ready: true }), player('p2', { ready: false })]}
      />,
    );
    const begin = screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement;
    expect(begin.disabled).toBe(true);
  });

  it('host sees Begin enabled and clicking fires onBegin when all ready', () => {
    const onBegin = vi.fn();
    render(
      <Lobby
        isHost
        onBegin={onBegin}
        players={[player('p1', { ready: true }), player('p2', { ready: true })]}
      />,
    );
    const begin = screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement;
    expect(begin.disabled).toBe(false);
    fireEvent.click(begin);
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it('Begin disabled below 2 players or above 4 players', () => {
    const onBegin = vi.fn();
    const { rerender } = render(
      <Lobby isHost onBegin={onBegin} players={[player('p1', { ready: true })]} />,
    );
    expect((screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    rerender(
      <Lobby
        isHost
        onBegin={onBegin}
        players={Array.from({ length: 5 }, (_, i) => player(`p${i}`, { ready: true }))}
      />,
    );
    expect((screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('Begin disabled if any player has not chosen a sign', () => {
    render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[player('p1', { ready: true, zodiacSign: null }), player('p2', { ready: true })]}
      />,
    );
    expect((screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('Begin disabled if two players share the same zodiac sign', () => {
    // Mirrors `validateAndBuildSetup`'s `duplicate-zodiac-signs`
    // rejection — the server rejects this shape with a raw error
    // string, so the host needs the Begin gate (and the matching
    // hint) to surface the conflict before the click rather than
    // after.
    render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[
          player('p1', { ready: true, zodiacSign: 'aries' }),
          player('p2', { ready: true, zodiacSign: 'aries' }),
        ]}
      />,
    );
    expect((screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('Lobby — Begin hint (host only)', () => {
  it('shows missing-zodiac-sign hint naming the players who have not picked', () => {
    const { container } = render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[
          player('p1', { name: 'Andy', ready: true, zodiacSign: null }),
          player('p2', { name: 'Bea', ready: true }),
        ]}
      />,
    );
    const hint = container.querySelector('[data-begin-hint="missing-zodiac-sign"]');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toMatch(/Andy/);
    expect(hint?.textContent).not.toMatch(/Bea/);
  });

  it('shows duplicate-zodiac-signs hint when two players share a sign', () => {
    // Mirrors `validateAndBuildSetup`'s `duplicate-zodiac-signs`
    // rejection. The host needs to see why Begin is disabled
    // before clicking — without this hint they'd hit the raw
    // server error string only after attempting to start.
    const { container } = render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[
          player('p1', { name: 'Andy', ready: true, zodiacSign: 'aries' }),
          player('p2', { name: 'Bea', ready: true, zodiacSign: 'aries' }),
        ]}
      />,
    );
    const hint = container.querySelector('[data-begin-hint="duplicate-zodiac-signs"]');
    expect(hint).not.toBeNull();
  });

  it('shows not-ready hint when all signs are picked but readiness is incomplete', () => {
    const { container } = render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[
          player('p1', { name: 'Andy', ready: false }),
          player('p2', { name: 'Bea', ready: true }),
        ]}
      />,
    );
    const hint = container.querySelector('[data-begin-hint="not-ready"]');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toMatch(/Andy/);
  });

  it('shows too-few-players hint with a single player', () => {
    const { container } = render(
      <Lobby isHost onBegin={vi.fn()} players={[player('p1', { ready: true })]} />,
    );
    expect(container.querySelector('[data-begin-hint="too-few-players"]')).not.toBeNull();
  });

  it('renders no hint when everyone is ready and signed', () => {
    const { container } = render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[player('p1', { ready: true }), player('p2', { ready: true })]}
      />,
    );
    expect(container.querySelector('[data-begin-hint]')).toBeNull();
  });

  it('non-host sees no hint (begin button is hidden)', () => {
    const { container } = render(
      <Lobby
        isHost={false}
        players={[player('p1', { ready: true, zodiacSign: null }), player('p2', { ready: true })]}
      />,
    );
    expect(container.querySelector('[data-begin-hint]')).toBeNull();
  });
});

describe('Lobby — atmosphere (#403)', () => {
  it('renders the LobbyBackdrop Tree silhouette behind content', () => {
    const { container } = render(<Lobby players={[player('p1'), player('p2')]} />);
    const backdrop = container.querySelector('[data-atmosphere="lobby-backdrop"]');
    expect(backdrop).not.toBeNull();
    // 22 paths + 10 nodes — the canonical Tree-of-Life graph.
    expect(backdrop?.querySelectorAll('line').length).toBe(22);
    expect(backdrop?.querySelectorAll('[data-node]').length).toBe(10);
    // Decorative — must not advertise itself to AT.
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a ceremonial subtitle quote in display face italic', () => {
    const { container } = render(<Lobby players={[player('p1'), player('p2')]} />);
    const quote = container.querySelector('[data-lobby-quote]');
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toMatch(/Two seekers/);
    // Italic + display face — the ticket's "restrained" register.
    expect(quote?.className).toMatch(/italic/);
    expect(quote?.className).toMatch(/font-display/);
  });

  it('a ready+signed player row carries an inline glow tinted by their sign', () => {
    const { container } = render(
      <Lobby
        players={[
          player('p1', { ready: true, zodiacSign: 'aries' }),
          player('p2', { ready: false, zodiacSign: 'leo' }),
        ]}
      />,
    );
    const row1 = container.querySelector('[data-lobby-row="p1"]') as HTMLElement;
    expect(row1.getAttribute('data-glow-on')).toBe('true');
    // Aries is fire/red — the inline shadow should reference the
    // sign's RGB triplet stack from `attribution-colors.ts`.
    expect(row1.style.boxShadow).toMatch(/rgba\(192, 57, 43,/);

    const row2 = container.querySelector('[data-lobby-row="p2"]') as HTMLElement;
    expect(row2.getAttribute('data-glow-on')).toBe('false');
    expect(row2.style.boxShadow).toBe('');
  });

  it('Scorpio ready row uses the brightened glow tint, not the dark card hex (#445)', () => {
    // Card surface for Scorpio is `#5e2a4a` (dark maroon) — too low
    // luminance to read on the indigo bg-void substrate. #445 routes
    // the glow through `signGlowColor` which substitutes the
    // brighter `#a04374` (160, 67, 116) only at glow-emit time.
    const { container } = render(
      <Lobby players={[player('p1', { ready: true, zodiacSign: 'scorpio' })]} />,
    );
    const row = container.querySelector('[data-lobby-row="p1"]') as HTMLElement;
    expect(row.getAttribute('data-glow-on')).toBe('true');
    expect(row.style.boxShadow).toMatch(/rgba\(160, 67, 116,/);
    // Negative assertion: must NOT contain the raw card-surface hex
    // RGB (94, 42, 74) — would mean the substitution didn't fire.
    expect(row.style.boxShadow).not.toMatch(/rgba\(94, 42, 74,/);
  });

  it('Capricorn ready row uses the brightened glow tint, not the dark card hex (#445)', () => {
    // Card surface for Capricorn is `#2a3a4a` (dark slate). #445
    // brightens the glow channel to `#5a7a9c` (90, 122, 156).
    const { container } = render(
      <Lobby players={[player('p1', { ready: true, zodiacSign: 'capricorn' })]} />,
    );
    const row = container.querySelector('[data-lobby-row="p1"]') as HTMLElement;
    expect(row.getAttribute('data-glow-on')).toBe('true');
    expect(row.style.boxShadow).toMatch(/rgba\(90, 122, 156,/);
    expect(row.style.boxShadow).not.toMatch(/rgba\(42, 58, 74,/);
  });

  it('a ready player without a sign does not glow (sign-required)', () => {
    const { container } = render(
      <Lobby
        players={[player('p1', { ready: true, zodiacSign: null }), player('p2', { ready: true })]}
      />,
    );
    const row = container.querySelector('[data-lobby-row="p1"]') as HTMLElement;
    expect(row.getAttribute('data-glow-on')).toBe('false');
  });

  it('Begin gathers a Tiferet-gold aura sibling when every seat is ready', () => {
    const { container, rerender } = render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[player('p1', { ready: true }), player('p2', { ready: false })]}
      />,
    );
    expect(container.querySelector('[data-begin-aura]')).toBeNull();

    rerender(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[player('p1', { ready: true }), player('p2', { ready: true })]}
      />,
    );
    const aura = container.querySelector('[data-begin-aura]');
    expect(aura).not.toBeNull();
    // Static glow class — visible to reduced-motion users; the
    // breath cycle adds the "gathering" feel under motion-safe.
    expect(aura?.className).toMatch(/shadow-glow-tiferet/);
    expect(aura?.className).toMatch(/motion-safe:animate-breath/);
    expect(aura?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Lobby — readiness toggle', () => {
  it('current player can toggle their own readiness', () => {
    const onToggleReady = vi.fn();
    const { container } = render(
      <Lobby
        players={[player('p1'), player('p2')]}
        currentPlayerId="p1"
        onToggleReady={onToggleReady}
      />,
    );
    const row1 = container.querySelector('[data-lobby-row="p1"]');
    const button = row1?.querySelector('[data-action="toggle-ready"]');
    expect(button).not.toBeNull();
    if (button) fireEvent.click(button);
    expect(onToggleReady).toHaveBeenCalledExactlyOnceWith('p1');
  });

  it('other players show static readiness without a toggle', () => {
    const { container } = render(
      <Lobby
        players={[player('p1'), player('p2', { ready: true })]}
        currentPlayerId="p1"
        onToggleReady={vi.fn()}
      />,
    );
    const row2 = container.querySelector('[data-lobby-row="p2"]');
    expect(row2?.querySelector('[data-action="toggle-ready"]')).toBeNull();
    expect(row2?.querySelector('[data-readiness]')?.textContent).toMatch(/Ready/);
  });
});
