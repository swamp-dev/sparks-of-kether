'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@/lib/use-chat';

interface ChatPanelProps {
  readonly roomId: string | null;
  readonly currentPlayerId: string | null;
  readonly nickname: string | null;
}

export function ChatPanel({ roomId, currentPlayerId, nickname }: ChatPanelProps): JSX.Element {
  const { messages, sendMessage, error } = useChat(roomId, currentPlayerId, nickname);
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Track unread count and auto-scroll when messages change.
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const curr = messages.length;
    if (curr > prev) {
      if (expanded) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setUnreadCount((n) => n + (curr - prev));
      }
    }
    prevMessageCountRef.current = curr;
  }, [messages.length, expanded]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => {
      if (!prev) {
        // Opening — reset unread count and focus input after render.
        setUnreadCount(0);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return !prev;
    });
  }, []);

  const handleSend = useCallback(() => {
    if (inputValue.trim() === '') return;
    void (async () => {
      const ok = await sendMessage(inputValue);
      if (ok) setInputValue('');
    })();
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    // Fixed bottom-right, z-30: below PauseOverlay (z-50) and EncounterScreen (z-50).
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {expanded && (
        <div
          id="chat-panel"
          data-testid="chat-panel"
          className="flex w-[280px] flex-col rounded border border-veil/20 bg-ground/90 shadow-lg"
        >
          <div
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Room chat"
            data-testid="chat-message-list"
            className="flex max-h-[300px] min-h-[80px] flex-col gap-1 overflow-y-auto p-3 text-sm"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="leading-snug">
                <span className="font-semibold text-illumination">{msg.nickname}</span>
                <span className="text-veil/60">: </span>
                <span className="text-veil">{msg.body}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-1 border-t border-veil/10 p-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={280}
              placeholder="Message…"
              aria-label="Chat message"
              data-testid="chat-input"
              className="flex-1 rounded border border-veil/20 bg-ground px-2 py-1 text-sm text-veil placeholder:text-veil/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-illumination/60"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={inputValue.trim() === ''}
              aria-label="Send message"
              data-action="chat-send"
              className="rounded border border-veil/30 px-2 py-1 text-xs uppercase tracking-widest text-veil/70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>

          {error !== null && (
            <p role="alert" className="px-3 pb-2 text-xs text-pillar-severity">
              {error}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          expanded
            ? 'Close chat'
            : unreadCount > 0
              ? `Open chat, ${unreadCount} unread`
              : 'Open chat'
        }
        aria-expanded={expanded}
        aria-controls={expanded ? 'chat-panel' : undefined}
        data-action="chat-toggle"
        data-testid="chat-toggle"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-veil/20 bg-ground/90 text-base shadow-md"
      >
        💬
        {unreadCount > 0 && !expanded && (
          <span
            aria-hidden="true"
            data-testid="unread-badge"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-illumination text-[10px] font-bold text-ground"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
