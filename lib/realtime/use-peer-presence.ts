'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../supabase';
import {
  peerPresenceSubscription,
  shouldThrottleCursor,
  type PeerActionEvent,
  type PeerActionKind,
  type PeerCursorEvent,
  type PeerCursorSendInput,
  type PeerPresenceStatus,
  type PeerTargetEvent,
} from './presence';
import type { SefirahKey } from '@/data';

/**
 * React adapter over `peerPresenceSubscription` for #322. Owns:
 *
 *   - Channel lifecycle (subscribe / unsubscribe).
 *   - Per-peer state maps (`cursors`, `targets`, `actions`).
 *   - Send-side cursor throttling (30Hz default, 4Hz when reduce-motion
 *     is set). The pure throttle helper lives in `./presence.ts`; this
 *     hook just wires it to the throttle clock.
 *   - Stale cursor expiry — peers drop out of `cursors` after 4s of
 *     silence so a peer who closed their tab without untracking
 *     doesn't leave a phantom cursor on screen.
 *
 * The hook returns a `peers` snapshot keyed by player id alongside
 * three `send*` callbacks for the local viewer's broadcasts. Callers
 * are expected to attach mousemove / focus listeners that call those
 * callbacks; the hook does NOT own DOM listeners (the parent owns the
 * playing surface and knows the right element to listen on).
 */

const STALE_CURSOR_MS = 4000;
const SEND_HZ_NORMAL = 30;
const SEND_HZ_REDUCED = 4;

export interface PeerCursorSnapshot extends PeerCursorEvent {
  /** Receiver-side stamp of the latest sample; used for stale expiry. */
  readonly receivedAt: number;
}

export type PeerTargetSnapshot = PeerTargetEvent;

export type PeerActionSnapshot = PeerActionEvent;

export interface UsePeerPresenceReturn {
  readonly status: PeerPresenceStatus | 'idle';
  readonly cursors: ReadonlyMap<string, PeerCursorSnapshot>;
  readonly targets: ReadonlyMap<string, PeerTargetSnapshot>;
  readonly actions: ReadonlyMap<string, PeerActionSnapshot>;
  readonly sendCursor: (input: PeerCursorSendInput) => void;
  readonly sendTarget: (nodeId: SefirahKey | null) => void;
  readonly sendAction: (kind: PeerActionKind | null) => void;
}

export function usePeerPresence(
  roomId: string | null,
  selfPlayerId: string | null,
  options: { readonly reduceMotion?: boolean } = {},
): UsePeerPresenceReturn {
  const [status, setStatus] = useState<PeerPresenceStatus | 'idle'>('idle');
  const [cursors, setCursors] = useState<ReadonlyMap<string, PeerCursorSnapshot>>(
    () => new Map(),
  );
  const [targets, setTargets] = useState<ReadonlyMap<string, PeerTargetSnapshot>>(
    () => new Map(),
  );
  const [actions, setActions] = useState<ReadonlyMap<string, PeerActionSnapshot>>(
    () => new Map(),
  );

  // Keep an imperative handle on the live subscription so the send-*
  // callbacks fire directly (no stale closure on a stale subscription).
  type SubHandle = ReturnType<typeof peerPresenceSubscription>;
  const subRef = useRef<SubHandle | null>(null);
  const lastSentCursorTsRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(options.reduceMotion ?? false);
  reduceMotionRef.current = options.reduceMotion ?? false;

  useEffect(() => {
    if (roomId === null || selfPlayerId === null) return;
    const client = getSupabaseBrowserClient();
    const sub = peerPresenceSubscription(client, roomId, selfPlayerId);
    subRef.current = sub;

    const unsubscribe = sub.subscribe({
      onCursor: (event) => {
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(event.playerId, { ...event, receivedAt: Date.now() });
          return next;
        });
      },
      onTarget: (event) => {
        setTargets((prev) => {
          const next = new Map(prev);
          next.set(event.playerId, event);
          return next;
        });
      },
      onAction: (event) => {
        setActions((prev) => {
          const next = new Map(prev);
          next.set(event.playerId, event);
          return next;
        });
      },
      onStatus: (s) => setStatus(s),
    });

    // Stale-cursor sweeper. A peer who closes their tab in the middle
    // of a mousemove burst leaves their last cursor on screen unless
    // we age them out — they can't broadcast a "gone" signal because
    // their JS context is dead.
    const sweep = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let dirty = false;
        const next = new Map(prev);
        for (const [id, cursor] of prev) {
          if (now - cursor.receivedAt > STALE_CURSOR_MS) {
            next.delete(id);
            dirty = true;
          }
        }
        return dirty ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(sweep);
      unsubscribe();
      subRef.current = null;
      setStatus('idle');
    };
  }, [roomId, selfPlayerId]);

  const sendCursor = useCallback((input: PeerCursorSendInput): void => {
    const sub = subRef.current;
    if (sub === null) return;
    const now = Date.now();
    const hz = reduceMotionRef.current ? SEND_HZ_REDUCED : SEND_HZ_NORMAL;
    if (shouldThrottleCursor(now, lastSentCursorTsRef.current, hz)) return;
    lastSentCursorTsRef.current = now;
    void sub.sendCursor(input);
  }, []);

  const sendTarget = useCallback((nodeId: SefirahKey | null): void => {
    const sub = subRef.current;
    if (sub === null) return;
    void sub.sendTarget({ nodeId });
  }, []);

  const sendAction = useCallback((kind: PeerActionKind | null): void => {
    const sub = subRef.current;
    if (sub === null) return;
    void sub.sendAction({ kind });
  }, []);

  return {
    status,
    cursors,
    targets,
    actions,
    sendCursor,
    sendTarget,
    sendAction,
  };
}
