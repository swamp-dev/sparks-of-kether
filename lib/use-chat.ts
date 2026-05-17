'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase';
import type { ChatMessageRow } from './supabase';
import { query } from './supabase-query';

export type { ChatMessageRow as ChatMessage };

export interface UseChatReturn {
  readonly messages: readonly ChatMessageRow[];
  /**
   * Insert a chat message. Returns `true` on success, `false` when
   * the input is invalid (blank, >280 chars, missing ids) or when the
   * insert fails (RLS, network). On failure `error` is also set.
   */
  readonly sendMessage: (body: string) => Promise<boolean>;
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
    if (roomId === null) {
      // No room yet (page still loading). Nothing to subscribe to; don't
      // leave consumers stuck on loading=true while they wait for the room.
      setLoading(false);
      return;
    }
    let cancelled = false;
    const client = getSupabaseBrowserClient();

    // Open the subscription BEFORE fetching history. This eliminates the
    // TOCTOU window where a message inserted between the history query
    // finishing and the channel reaching SUBSCRIBED would be silently lost.
    const channel = client
      .channel(`chat:${roomId}`)
      // The 'postgres_changes' as 'system' cast is required because the
      // Supabase JS narrow type only accepts 'system' for the generic
      // .on() overload. Same pattern as use-lobby.ts.
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
          setMessages((prev) => {
            // Dedup: if the history fetch already loaded this message, the
            // Realtime echo would otherwise produce a duplicate. This can
            // happen on reconnect or if the history fetch races the INSERT.
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
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

    // History fetch: newest 50 messages, returned in chronological order
    // for display. ORDER DESC + LIMIT gives the right 50; we reverse
    // client-side to restore chronological order. This matches the index
    // (room_id, id DESC) on the table.
    void (async () => {
      try {
        const result = await client
          .from('chat_messages')
          .select()
          .eq('room_id', roomId)
          .order('id', { ascending: false })
          .limit(50);
        if (cancelled) return;
        if (result.error !== null) {
          setError(`Chat history unavailable: ${result.error.message}`);
          return;
        }
        setMessages([...(result.data ?? [])].reverse() as ChatMessageRow[]);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (body: string): Promise<boolean> => {
      if (roomId === null || currentPlayerId === null || nickname === null) return false;
      const trimmed = body.trim();
      if (trimmed === '' || trimmed.length > 280) return false;
      const client = getSupabaseBrowserClient();
      const result = await query(client, 'chat_messages').insert({
        room_id: roomId,
        player_id: currentPlayerId,
        nickname,
        body: trimmed,
      });
      if (result.error !== null) {
        setError(`Could not send message: ${result.error.message}`);
        return false;
      }
      // No optimistic local append — the Realtime INSERT echo delivers
      // the message to setMessages sub-second, avoiding duplicate render.
      return true;
    },
    [roomId, currentPlayerId, nickname],
  );

  return { messages, sendMessage, error, loading };
}
