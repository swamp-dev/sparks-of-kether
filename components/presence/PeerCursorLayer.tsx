'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PeerCursor, type PeerCursorState } from './PeerCursor';
import type { PeerCursorSnapshot } from '@/lib/realtime/use-peer-presence';

/**
 * PeerCursorLayer — wraps `<PeerCursor>` with the "where do I render
 * relative to the page" geometry for #322. The cursors arrive in
 * normalised [0..1] coords against the sender's viewport; this layer
 * is a fixed-positioned overlay sized to the viewport, so feeding the
 * normalised coords through directly puts each cursor at the
 * proportionally-correct screen position.
 *
 * Touch detection: prefer the wire-level `pointerType` field
 * (`'touch'` → ripple, `'mouse'` / `'pen'` → persistent cursor)
 * when the sender broadcasts it. Fall back to the legacy viewport-
 * width heuristic (`< 600px` → ripple) only for senders that
 * pre-date the field. The field-based path is the load-bearing
 * contract; the heuristic is a safety net that mis-classifies edge
 * cases (mouse on a narrow window; touch on a wide tablet) and
 * exists only for backwards compatibility.
 *
 * When a sample is fresh (< 400ms old) on a touch peer, we render a
 * transient "tap ripple" instead of a persistent arrow. The ripple
 * is a div that scales + fades over 600ms, then unmounts. This
 * gives touch peers visible-but-temporary presence without the
 * wrong-paradigm "phantom arrow" behaviour.
 *
 * Players who target peer cursors of *their own* viewer aren't
 * filtered here — that filtering happens upstream in
 * `peerPresenceSubscription` (cursor events authored by `selfPlayerId`
 * are dropped before they reach the React layer).
 */

const MOBILE_VIEWPORT_W_MAX = 600;
const TAP_RIPPLE_TTL_MS = 600;

/**
 * True when the peer is using a touch-class input device. Prefers
 * the wire-level `pointerType` field; falls back to the viewport-
 * width heuristic for senders that pre-date the field.
 */
function isTouchClass(cursor: PeerCursorSnapshot): boolean {
  if (cursor.pointerType !== undefined) {
    return cursor.pointerType === 'touch';
  }
  return cursor.viewport.w < MOBILE_VIEWPORT_W_MAX;
}

export interface PeerCursorLayerProps {
  readonly cursors: ReadonlyMap<string, PeerCursorSnapshot>;
  /** Lookup: playerId → display name. Falls back to the first 6 chars of the id. */
  readonly nameByPlayerId: ReadonlyMap<string, string>;
  /** Lookup: playerId → tinting hex color. Falls back to white. */
  readonly colorByPlayerId: ReadonlyMap<string, string>;
  readonly reduceMotion?: boolean;
  readonly className?: string;
}

interface TapRipple {
  readonly playerId: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly mountedAt: number;
}

export function PeerCursorLayer({
  cursors,
  nameByPlayerId,
  colorByPlayerId,
  reduceMotion = false,
  className,
}: PeerCursorLayerProps): JSX.Element {
  // Tap-ripple list — accumulates as new cursor samples come in for
  // mobile-class peers, then ages out via setTimeout. We rely on the
  // existing cursor-snapshot map for desktop peers; ripples are a
  // separate render path.
  const [ripples, setRipples] = useState<readonly TapRipple[]>([]);
  const lastSeenTsRef = useRef(new Map<string, number>());

  // Detect new ripple-class samples whenever the cursor map changes.
  // Classification rule: prefer the sender's `pointerType` when
  // present (W3C `PointerEvent.pointerType` — `'touch'` peers always
  // get ripples, `'mouse'` / `'pen'` peers always get persistent
  // cursors, regardless of their viewport width). Fall back to the
  // viewport-width heuristic for senders that pre-date the
  // pointerType wire field. The fallback is correct most of the
  // time but mis-classifies edge cases (narrow desktop window,
  // wide-tablet touch); the field-based path is the load-bearing
  // contract going forward.
  useEffect(() => {
    const next: TapRipple[] = [];
    for (const [playerId, cursor] of cursors) {
      const isMobile = isTouchClass(cursor);
      const lastTs = lastSeenTsRef.current.get(playerId);
      if (!isMobile) continue;
      if (lastTs === cursor.ts) continue;
      lastSeenTsRef.current.set(playerId, cursor.ts);
      next.push({
        playerId,
        x: cursor.x,
        y: cursor.y,
        color: colorByPlayerId.get(playerId) ?? '#ffffff',
        mountedAt: Date.now(),
      });
    }
    if (next.length === 0) return;
    setRipples((prev) => [...prev, ...next]);
  }, [cursors, colorByPlayerId]);

  // Age out ripples on a timer.
  useEffect(() => {
    if (ripples.length === 0) return;
    const handle = setInterval(() => {
      const now = Date.now();
      setRipples((prev) => prev.filter((r) => now - r.mountedAt < TAP_RIPPLE_TTL_MS));
    }, 200);
    return () => clearInterval(handle);
  }, [ripples.length]);

  const buildState = useCallback(
    (snapshot: PeerCursorSnapshot): PeerCursorState => ({
      playerId: snapshot.playerId,
      name: nameByPlayerId.get(snapshot.playerId) ?? snapshot.playerId.slice(0, 6),
      color: colorByPlayerId.get(snapshot.playerId) ?? '#ffffff',
      x: snapshot.x,
      y: snapshot.y,
      lastUpdateTs: snapshot.ts,
    }),
    [nameByPlayerId, colorByPlayerId],
  );

  return (
    <div
      data-testid="peer-cursor-layer"
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-30 ${className ?? ''}`}
    >
      {[...cursors.values()]
        .filter((c) => !isTouchClass(c))
        .map((cursor) => (
          <PeerCursor
            key={cursor.playerId}
            cursor={buildState(cursor)}
            reduceMotion={reduceMotion}
          />
        ))}
      {ripples.map((ripple) => (
        <span
          key={`${ripple.playerId}-${ripple.mountedAt}`}
          data-testid={`tap-ripple-${ripple.playerId}`}
          className="pointer-events-none absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 motion-safe:animate-[hand-fade-in_600ms_ease-out_forwards]"
          style={{
            left: `${ripple.x * 100}%`,
            top: `${ripple.y * 100}%`,
            borderColor: ripple.color,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}
