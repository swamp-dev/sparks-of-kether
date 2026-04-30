import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Lobby, type LobbyPlayer } from '../Lobby';

const player = (id: string, overrides: Partial<LobbyPlayer> = {}): LobbyPlayer => ({
  id,
  name: id.toUpperCase(),
  zodiacSign: 'aries',
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
    expect(
      container.querySelector('[data-lobby-row="p2"]')?.textContent,
    ).toMatch(/\(you\)/i);
    expect(
      container.querySelector('[data-lobby-row="p1"]')?.textContent,
    ).not.toMatch(/\(you\)/i);
  });

  it('shows "Choosing sign…" when zodiacSign is null', () => {
    const { container } = render(
      <Lobby players={[player('p1', { zodiacSign: null })]} />,
    );
    expect(container.textContent).toMatch(/Choosing sign/);
  });
});

describe('Lobby — Begin button', () => {
  it('Begin not rendered for non-host', () => {
    render(
      <Lobby
        players={[
          player('p1', { ready: true }),
          player('p2', { ready: true }),
        ]}
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
        players={[
          player('p1', { ready: true }),
          player('p2', { ready: false }),
        ]}
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
        players={[
          player('p1', { ready: true }),
          player('p2', { ready: true }),
        ]}
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
      <Lobby
        isHost
        onBegin={onBegin}
        players={[player('p1', { ready: true })]}
      />,
    );
    expect(
      (screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled,
    ).toBe(true);

    rerender(
      <Lobby
        isHost
        onBegin={onBegin}
        players={Array.from({ length: 5 }, (_, i) =>
          player(`p${i}`, { ready: true }),
        )}
      />,
    );
    expect(
      (screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('Begin disabled if any player has not chosen a sign', () => {
    render(
      <Lobby
        isHost
        onBegin={vi.fn()}
        players={[
          player('p1', { ready: true, zodiacSign: null }),
          player('p2', { ready: true }),
        ]}
      />,
    );
    expect(
      (screen.getByRole('button', { name: /^Begin$/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
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
