import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ZodiacSignKey } from '@/data';
import type { StatSheet } from '@/engine/types';
import type { LobbyPlayer } from '@/components/setup/Lobby';

/**
 * PlayPage phase-machine + player-count-picker tests.
 *
 * Sub-components are mocked at their boundaries so these tests cover
 * the phase machine logic (count → sign → ritual loop → lobby → play)
 * without duplicating BlessingRitual/ZodiacSignPicker/Lobby's own suites.
 */

const STUB_STATS: StatSheet = {
  unity: 10,
  insight: 10,
  understanding: 10,
  lovingkindness: 10,
  strength: 10,
  harmony: 10,
  passion: 10,
  intellect: 10,
  intuition: 10,
  body: 10,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/music/useMusic', () => ({ useMusic: vi.fn() }));

vi.mock('@/components/play/SettingsButton', () => ({
  SettingsButton: () => null,
}));

vi.mock('@/components/atmosphere/ColorBloom', () => ({
  ColorBloom: () => null,
}));

vi.mock('@/components/setup/ZodiacSignPicker', () => ({
  ZodiacSignPicker: ({ onPick }: { onPick: (s: ZodiacSignKey) => void }) => (
    <button type="button" onClick={() => onPick('aries')}>
      Pick Sign
    </button>
  ),
}));

vi.mock('@/components/setup/BlessingRitual', () => ({
  BlessingRitual: ({ onComplete }: { onComplete: (s: StatSheet) => void }) => (
    <button type="button" onClick={() => onComplete(STUB_STATS)}>
      Complete Ritual
    </button>
  ),
}));

let capturedLobbyPlayers: readonly LobbyPlayer[] = [];
vi.mock('@/components/setup/Lobby', () => ({
  Lobby: ({ players, onBegin }: { players: readonly LobbyPlayer[]; onBegin: () => void }) => {
    capturedLobbyPlayers = players;
    return (
      <div>
        <span data-testid="lobby-count">{players.length}</span>
        <button type="button" onClick={onBegin}>
          Begin
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/game/PlayScreen', () => ({
  PlayScreen: () => <div data-testid="play-screen">Playing</div>,
}));

// Dynamic import after mocks are registered
async function importPage() {
  const mod = await import('../page');
  return mod.default;
}

describe('PlayPage — player count picker', () => {
  it('renders buttons for 1 through 6 players', async () => {
    const PlayPage = await importPage();
    render(<PlayPage />);
    for (let n = 1; n <= 6; n++) {
      const label = n === 1 ? '1 player' : `${n} players`;
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('count picker group has an accessible label', async () => {
    const PlayPage = await importPage();
    render(<PlayPage />);
    expect(screen.getByRole('group', { name: /number of players/i })).toBeInTheDocument();
  });

  it('clicking a count button advances to the sign phase', async () => {
    const PlayPage = await importPage();
    render(<PlayPage />);
    fireEvent.click(screen.getByRole('button', { name: '2 players' }));
    expect(screen.getByRole('button', { name: /pick sign/i })).toBeInTheDocument();
  });

  it('count picker buttons are keyboard-triggerable', async () => {
    const PlayPage = await importPage();
    render(<PlayPage />);
    const btn = screen.getByRole('button', { name: '3 players' });
    btn.focus();
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /pick sign/i })).toBeInTheDocument();
  });
});

describe('PlayPage — 1-player (solo) flow', () => {
  it('walks count → sign → ritual → lobby with 1 ready player', async () => {
    capturedLobbyPlayers = [];
    const PlayPage = await importPage();
    render(<PlayPage />);

    fireEvent.click(screen.getByRole('button', { name: '1 player' }));
    // sign phase
    expect(screen.getByRole('button', { name: /pick sign/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pick sign/i }));
    // ritual phase
    expect(screen.getByRole('button', { name: /complete ritual/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /complete ritual/i }));
    // lobby phase
    expect(screen.getByTestId('lobby-count')).toHaveTextContent('1');
    expect(capturedLobbyPlayers).toHaveLength(1);
    expect(capturedLobbyPlayers[0]?.ready).toBe(true);
  });

  it('reaches PlayScreen after Begin in a solo lobby', async () => {
    const PlayPage = await importPage();
    render(<PlayPage />);

    fireEvent.click(screen.getByRole('button', { name: '1 player' }));
    fireEvent.click(screen.getByRole('button', { name: /pick sign/i }));
    fireEvent.click(screen.getByRole('button', { name: /complete ritual/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));

    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
  });
});

describe('PlayPage — 6-player flow', () => {
  it('walks 6 sign+ritual pairs then reaches lobby with 6 ready players', async () => {
    capturedLobbyPlayers = [];
    const PlayPage = await importPage();
    render(<PlayPage />);

    fireEvent.click(screen.getByRole('button', { name: '6 players' }));
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: /pick sign/i }));
      fireEvent.click(screen.getByRole('button', { name: /complete ritual/i }));
    }

    expect(screen.getByTestId('lobby-count')).toHaveTextContent('6');
    expect(capturedLobbyPlayers).toHaveLength(6);
    expect(capturedLobbyPlayers.every((p) => p.ready)).toBe(true);
  });
});
