'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase';
import type { ChatMessageRow } from './supabase';
import { query } from './supabase-query';

export type { ChatMessageRow as ChatMessage };

export interface UseChatReturn {
  readonly messages: readonly ChatMessageRow[];
  readonly sendMessage: (body: string) => Promise<void>;
  readonly error: string | null;
  readonly loading: boolean;
}

export function useChat(
  roomId: string | null,
  currentPlayerId: string | null,
  nickname: string | null,
): UseChatReturn {
  const [messages, setMessages] = useState<readonly ChatMessageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId === null) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();

    void (async () => {
      try {
        const result = await client
          .from('chat_messages')
          .select()
          .eq('room_id', roomId)
          .order('id', { ascending: true })
          .limit(50);
        if (cancelled) return;
        if (result.error !== null) {
          setError(`Chat history unavailable: ${result.error.message}`);
          return;
        }
        setMessages((result.data ?? []) as ChatMessageRow[]);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Channel name `chat:{roomId}` matches the `lobby_players:{roomId}`
    // naming convention used throughout the codebase.
    const channel = client
      .channel(`chat:${roomId}`)
      // The 'postgres_changes' as 'system' cast is required because the
      // Supabase JS narrow type only accepts 'system' for the generic
      // .on() overload. Same pattern as use-lobby.ts line 156.
      .on(
        'postgres_changes' as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: ChatMessageRow }) => {
          if (cancelled) return;
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'CHANNEL_ERROR') {
          // eslint-disable-next-line no-console
          console.error(`[useChat] Realtime channel error on chat:${roomId}`);
          setError('Chat sync error. Refresh to retry.');
        }
      });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (body: string): Promise<void> => {
      if (roomId === null || currentPlayerId === null || nickname === null) return;
      const trimmed = body.trim();
      if (trimmed === '' || trimmed.length > 280) return;
      const client = getSupabaseBrowserClient();
      const result = await query(client, 'chat_messages').insert({
        room_id: roomId,
        player_id: currentPlayerId,
        nickname,
        body: trimmed,
      });
      if (result.error !== null) {
        setError(`Could not send message: ${result.error.message}`);
      }
      // No optimistic local append — the Realtime INSERT echo delivers
      // the message to setMessages sub-second, avoiding duplicate render.
    },
    [roomId, currentPlayerId, nickname],
  );

  return { messages, sendMessage, error, loading };
}
