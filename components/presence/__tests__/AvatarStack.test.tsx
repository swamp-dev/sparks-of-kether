import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarStack, type PresencePeer } from '../AvatarStack';

/**
 * Avatar-stack contract (#322): one avatar per peer in the room, each
 * tinted with the player's chosen sign / Sefirah accent color. The
 * active player gets a Tiferet-gold ring + breath halo. Disconnected
 * peers are dimmed with a dashed reconnection indicator.
 */

function peer(overrides: Partial<PresencePeer> = {}): PresencePeer {
  return {
    playerId: 'p1',
    name: 'Player 1',
    color: '#4169e1',
    glyph: '♈',
    online: true,
    ...overrides,
  };
}

describe('<AvatarStack>', () => {
  it('renders one avatar per peer', () => {
    render(
      <AvatarStack
        peers={[
          peer({ playerId: 'p1', name: 'Andy' }),
          peer({ playerId: 'p2', name: 'Brae', glyph: '♋' }),
          peer({ playerId: 'p3', name: 'Cael', glyph: '♍' }),
        ]}
        viewerPlayerId="p1"
        activePlayerId="p1"
      />,
    );
    expect(screen.getAllByTestId(/avatar-token-/)).toHaveLength(3);
  });

  it('tints each avatar with the peer color via inline style', () => {
    render(
      <AvatarStack
        peers={[peer({ playerId: 'p2', color: '#dc143c' })]}
        viewerPlayerId="p1"
        activePlayerId="p2"
      />,
    );
    const token = screen.getByTestId('avatar-token-p2');
    // Ring color exposed as a CSS variable so callers / tests can pin
    // the value without parsing rgb() strings.
    expect(token.getAttribute('style') ?? '').toContain('#dc143c');
  });

  it('marks the active player with data-active="true" and a gold ring class', () => {
    render(
      <AvatarStack
        peers={[peer({ playerId: 'p1' }), peer({ playerId: 'p2', name: 'Brae' })]}
        viewerPlayerId="p1"
        activePlayerId="p2"
      />,
    );
    const active = screen.getByTestId('avatar-token-p2');
    expect(active.getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('avatar-token-p1').getAttribute('data-active')).toBe('false');
  });

  it('marks the disconnected peer with data-online="false" and a status label', () => {
    render(
      <AvatarStack
        peers={[peer({ playerId: 'p1' }), peer({ playerId: 'p2', online: false, name: 'Brae' })]}
        viewerPlayerId="p1"
        activePlayerId="p1"
      />,
    );
    const offline = screen.getByTestId('avatar-token-p2');
    expect(offline.getAttribute('data-online')).toBe('false');
    expect(offline.getAttribute('aria-label')).toMatch(/disconnected/i);
  });

  it('caps to four avatars and shows an overflow chip when more peers exist', () => {
    render(
      <AvatarStack
        peers={[
          peer({ playerId: 'p1' }),
          peer({ playerId: 'p2' }),
          peer({ playerId: 'p3' }),
          peer({ playerId: 'p4' }),
          peer({ playerId: 'p5' }),
        ]}
        viewerPlayerId="p1"
        activePlayerId="p1"
      />,
    );
    expect(screen.getAllByTestId(/avatar-token-/)).toHaveLength(4);
    expect(screen.getByTestId('avatar-overflow').textContent).toContain('+1');
  });

  it('clicking an avatar fires onAvatarClick with that peer id', async () => {
    const onAvatarClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AvatarStack
        peers={[peer({ playerId: 'p1' }), peer({ playerId: 'p2' })]}
        viewerPlayerId="p1"
        activePlayerId="p1"
        onAvatarClick={onAvatarClick}
      />,
    );
    await user.click(screen.getByTestId('avatar-token-p2'));
    expect(onAvatarClick).toHaveBeenCalledWith('p2');
  });

  it('exposes the viewer with a "(you)" affordance for screen readers', () => {
    render(
      <AvatarStack
        peers={[peer({ playerId: 'p1', name: 'Andy' }), peer({ playerId: 'p2', name: 'Brae' })]}
        viewerPlayerId="p1"
        activePlayerId="p2"
      />,
    );
    expect(screen.getByTestId('avatar-token-p1').getAttribute('aria-label')).toMatch(/you/i);
  });

  it('renders nothing when peers is empty (avoids a stray top-right chrome bar)', () => {
    const { container } = render(
      <AvatarStack peers={[]} viewerPlayerId="p1" activePlayerId="p1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('forwards className to the root element without double-spaces or leading/trailing spaces', () => {
    render(
      <AvatarStack
        peers={[peer({ playerId: 'p1' })]}
        viewerPlayerId="p1"
        activePlayerId="p1"
        className="my-test-class"
      />,
    );
    const cls = screen.getByTestId('avatar-stack').getAttribute('class') ?? '';
    expect(cls).not.toMatch(/\s{2}/);
    expect(cls).not.toMatch(/^\s|\s$/);
    expect(cls).toContain('my-test-class');
  });

  it('does not produce a trailing space when no className is provided', () => {
    render(
      <AvatarStack peers={[peer({ playerId: 'p1' })]} viewerPlayerId="p1" activePlayerId="p1" />,
    );
    const cls = screen.getByTestId('avatar-stack').getAttribute('class') ?? '';
    expect(cls).not.toMatch(/\s{2}/);
    expect(cls).not.toMatch(/^\s|\s$/);
  });
});
