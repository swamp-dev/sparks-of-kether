import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ContinueGame } from '../ContinueGame';
import { LAST_GAME_KEY, type LastGame } from '@/lib/last-game';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeLocalStorage(initial: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

describe('ContinueGame', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.stubGlobal('localStorage', makeLocalStorage());
  });

  it('renders nothing when no saved game exists', async () => {
    const { container } = render(<ContinueGame />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the saved entry is stale (> 30 days)', async () => {
    const stale: LastGame = {
      code: 'STALE1',
      nickname: 'Ada',
      roomState: 'playing',
      writtenAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    };
    vi.stubGlobal('localStorage', makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(stale) }));

    const { container } = render(<ContinueGame />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner with nickname and code when a valid entry exists', async () => {
    const entry: LastGame = {
      code: 'KETHER',
      nickname: 'Miriam',
      roomState: 'playing',
      writtenAt: Date.now(),
    };
    vi.stubGlobal('localStorage', makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(entry) }));

    render(<ContinueGame />);
    await act(async () => {});

    expect(screen.getByText(/Miriam/)).toBeInTheDocument();
    expect(screen.getByText(/KETHER/)).toBeInTheDocument();
  });

  it('shows a Resume button when entry exists', async () => {
    const entry: LastGame = {
      code: 'ABCDEF',
      nickname: 'Reuben',
      roomState: 'lobby',
      writtenAt: Date.now(),
    };
    vi.stubGlobal('localStorage', makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(entry) }));

    render(<ContinueGame />);
    await act(async () => {});

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('clicking Resume navigates to /lobby for a lobby-state room', async () => {
    const entry: LastGame = {
      code: 'LOBBY1',
      nickname: 'Sara',
      roomState: 'lobby',
      writtenAt: Date.now(),
    };
    vi.stubGlobal('localStorage', makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(entry) }));

    render(<ContinueGame />);
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(mockPush).toHaveBeenCalledWith('/rooms/LOBBY1/lobby');
  });

  it('clicking Resume navigates to /play for a playing-state room', async () => {
    const entry: LastGame = {
      code: 'PLAY12',
      nickname: 'Tamar',
      roomState: 'playing',
      writtenAt: Date.now(),
    };
    vi.stubGlobal('localStorage', makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(entry) }));

    render(<ContinueGame />);
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(mockPush).toHaveBeenCalledWith('/rooms/PLAY12/play');
  });

  it('clicking Resume navigates to /play for a paused-state room', async () => {
    const entry: LastGame = {
      code: 'PAUSE1',
      nickname: 'Dinah',
      roomState: 'paused',
      writtenAt: Date.now(),
    };
    vi.stubGlobal('localStorage', makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(entry) }));

    render(<ContinueGame />);
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(mockPush).toHaveBeenCalledWith('/rooms/PAUSE1/play');
  });

  it('clicking Leave clears localStorage and hides the banner', async () => {
    const entry: LastGame = {
      code: 'LEAVE1',
      nickname: 'Dan',
      roomState: 'playing',
      writtenAt: Date.now(),
    };
    const storage = makeLocalStorage({ [LAST_GAME_KEY]: JSON.stringify(entry) });
    vi.stubGlobal('localStorage', storage);

    render(<ContinueGame />);
    await act(async () => {});

    expect(screen.getByText(/Dan/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /leave/i }));

    expect(screen.queryByText(/Dan/)).not.toBeInTheDocument();
    expect(storage.getItem(LAST_GAME_KEY)).toBeNull();
  });
});
