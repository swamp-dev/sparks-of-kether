import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import type { ChatMessage } from '@/lib/use-chat';

/**
 * Component tests for ChatPanel. Mocks useChat entirely so tests
 * are decoupled from Supabase. The hook contract is covered by
 * lib/__tests__/use-chat.test.ts.
 */

const mockSendMessage = vi.fn();
let mockMessages: ChatMessage[] = [];
let mockError: string | null = null;

vi.mock('@/lib/use-chat', () => ({
  useChat: () => ({
    messages: mockMessages,
    sendMessage: mockSendMessage,
    error: mockError,
    loading: false,
  }),
}));

const DEFAULT_PROPS = {
  roomId: 'room-uuid',
  currentPlayerId: 'player-uuid',
  nickname: 'Alex',
} as const;

function makeMessage(id: number, nickname: string, body: string): ChatMessage {
  return {
    id,
    room_id: 'room-uuid',
    player_id: 'player-uuid',
    nickname,
    body,
    created_at: new Date().toISOString(),
  };
}

describe('<ChatPanel>', () => {
  beforeEach(() => {
    mockMessages = [];
    mockError = null;
    mockSendMessage.mockReset();
  });

  it('renders collapsed toggle button by default — no panel in DOM', () => {
    render(<ChatPanel {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('chat-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-panel')).toBeNull();
  });

  it('clicking toggle expands the panel', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('clicking toggle again collapses the panel', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.queryByTestId('chat-panel')).toBeNull();
  });

  it('displays messages in the list when expanded', async () => {
    mockMessages = [
      makeMessage(1, 'Alex', 'hello'),
      makeMessage(2, 'Bea', 'world'),
    ];
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.getByTestId('chat-message-list').textContent).toContain('Alex');
    expect(screen.getByTestId('chat-message-list').textContent).toContain('hello');
    expect(screen.getByTestId('chat-message-list').textContent).toContain('Bea');
    expect(screen.getByTestId('chat-message-list').textContent).toContain('world');
  });

  it('unread badge increments when collapsed and new messages arrive', () => {
    const { rerender } = render(<ChatPanel {...DEFAULT_PROPS} />);
    // Collapsed initially — badge not present yet
    expect(screen.queryByTestId('unread-badge')).toBeNull();

    // A new message arrives while collapsed
    mockMessages = [makeMessage(1, 'Bea', 'hey!')];
    rerender(<ChatPanel {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('unread-badge')).toBeInTheDocument();
    expect(screen.getByTestId('unread-badge').textContent).toBe('1');
  });

  it('unread count resets to 0 on expand', async () => {
    // Start with no messages so prevCount begins at 0.
    mockMessages = [];
    const user = userEvent.setup();
    const { rerender } = render(<ChatPanel {...DEFAULT_PROPS} />);
    // A new message arrives while the panel is still collapsed.
    mockMessages = [makeMessage(1, 'Bea', 'hey!')];
    rerender(<ChatPanel {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('unread-badge')).toBeInTheDocument();

    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.queryByTestId('unread-badge')).toBeNull();
  });

  it('typing in the input updates the value', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    const input = screen.getByTestId('chat-input');
    await user.type(input, 'Hello!');
    expect(input).toHaveValue('Hello!');
  });

  it('pressing Enter calls sendMessage with the trimmed input', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    const input = screen.getByTestId('chat-input');
    await user.type(input, '  hello  {Enter}');
    expect(mockSendMessage).toHaveBeenCalledWith('  hello  ');
  });

  it('clicking Send button calls sendMessage', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    await user.type(screen.getByTestId('chat-input'), 'hi');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(mockSendMessage).toHaveBeenCalledWith('hi');
  });

  it('Send button is disabled when input is empty', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('input has maxLength={280}', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.getByTestId('chat-input')).toHaveAttribute('maxLength', '280');
  });

  it('message list has role="log" and aria-live="polite"', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    const list = screen.getByTestId('chat-message-list');
    expect(list).toHaveAttribute('role', 'log');
    expect(list).toHaveAttribute('aria-live', 'polite');
  });

  it('toggle has aria-expanded reflecting collapsed/expanded state', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('chat-toggle')).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.getByTestId('chat-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('error from useChat renders in a role="alert" region', async () => {
    mockError = 'Chat sync error. Refresh to retry.';
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    expect(screen.getByRole('alert').textContent).toContain('Chat sync error');
  });

  it('input clears after Send is clicked', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...DEFAULT_PROPS} />);
    await user.click(screen.getByTestId('chat-toggle'));
    await user.type(screen.getByTestId('chat-input'), 'test message');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(screen.getByTestId('chat-input')).toHaveValue('');
  });
});
