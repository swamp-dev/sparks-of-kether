import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresenceIndicator } from '../PresenceIndicator';
import { GRACE_PERIOD_MS } from '@/lib/grace';

const players = [
  { id: 'p1', name: 'Andy' },
  { id: 'p2', name: 'Bea' },
];

describe('PresenceIndicator', () => {
  it('renders a green dot for online players and a grey dot for offline', () => {
    render(
      <PresenceIndicator
        players={players}
        onlinePlayerIds={new Set(['p1'])}
        activePlayerId="p1"
        grace={{ phase: 'connected', remainingMs: 0 }}
        viewerIsHost
        viewerPlayerId="p1"
      />,
    );
    const p1Dot = screen
      .getByTestId('presence-row-p1')
      .querySelector('[aria-label="online"]');
    const p2Dot = screen
      .getByTestId('presence-row-p2')
      .querySelector('[aria-label="offline"]');
    expect(p1Dot).not.toBeNull();
    expect(p2Dot).not.toBeNull();
  });

  it('shows the grace countdown for the active player while in grace', () => {
    render(
      <PresenceIndicator
        players={players}
        onlinePlayerIds={new Set(['p2'])}
        activePlayerId="p1"
        grace={{ phase: 'grace', remainingMs: GRACE_PERIOD_MS - 5_000 }}
        viewerIsHost
        viewerPlayerId="p2"
      />,
    );
    const countdown = screen.getByTestId('grace-countdown-p1');
    expect(countdown.textContent).toMatch(/55s left/);
    // No Kick button while grace is still running.
    expect(screen.queryByTestId('kick-button-p1')).toBeNull();
  });

  it('shows the Kick button only after grace expires AND only to the host', () => {
    const onKick = vi.fn();
    const { rerender } = render(
      <PresenceIndicator
        players={players}
        onlinePlayerIds={new Set(['p2'])}
        activePlayerId="p1"
        grace={{ phase: 'expired', remainingMs: 0 }}
        viewerIsHost={false}
        viewerPlayerId="p2"
        onKick={onKick}
      />,
    );
    // Non-host viewer: no kick button.
    expect(screen.queryByTestId('kick-button-p1')).toBeNull();
    // ...but they DO see "(disconnected)" so they understand why
    // the game has stalled. Reviewer flagged: without this label
    // a non-host viewer sees only a grey dot with no explanation.
    expect(screen.getByTestId('presence-row-p1').textContent).toMatch(
      /disconnected/,
    );

    // Same situation, viewer is host: button appears.
    rerender(
      <PresenceIndicator
        players={players}
        onlinePlayerIds={new Set(['p2'])}
        activePlayerId="p1"
        grace={{ phase: 'expired', remainingMs: 0 }}
        viewerIsHost
        viewerPlayerId="p2"
        onKick={onKick}
      />,
    );
    expect(screen.getByTestId('kick-button-p1')).toBeInTheDocument();
  });

  it('fires onKick with the target playerId when host clicks Kick', async () => {
    const onKick = vi.fn();
    render(
      <PresenceIndicator
        players={players}
        onlinePlayerIds={new Set(['p2'])}
        activePlayerId="p1"
        grace={{ phase: 'expired', remainingMs: 0 }}
        viewerIsHost
        viewerPlayerId="p2"
        onKick={onKick}
      />,
    );
    await userEvent.click(screen.getByTestId('kick-button-p1'));
    expect(onKick).toHaveBeenCalledWith('p1');
  });

  it('never shows the Kick button against the host themselves', () => {
    // If somehow the host IS the active disconnected player (presence
    // glitch), the button must not render — the RLS would deny
    // self-kick anyway, but we shouldn't even surface the option.
    render(
      <PresenceIndicator
        players={players}
        onlinePlayerIds={new Set(['p2'])}
        activePlayerId="p1"
        grace={{ phase: 'expired', remainingMs: 0 }}
        viewerIsHost
        viewerPlayerId="p1" // viewer IS the active disconnected player
      />,
    );
    expect(screen.queryByTestId('kick-button-p1')).toBeNull();
  });
});
