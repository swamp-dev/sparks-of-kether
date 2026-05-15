'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * PeerCursor — single peer's smoothed mouse cursor for #322.
 *
 * Behaviour:
 *   - Renders a tinted SVG arrow at the cursor's normalised {x, y}
 *     position (caller multiplies by viewport on the way out).
 *   - Smooths between samples on `requestAnimationFrame` so a 30Hz
 *     network stream renders as a fluid trail rather than 30
 *     teleports / second.
 *   - Trailing nickname label fades after 1s of stillness; reactivates
 *     on the next sample arrival.
 *   - Reduce-motion: no rAF interpolation; the cursor snaps to each
 *     sample. Honors the acceptance criterion "cursor smoothing snaps
 *     to 4Hz" from the receiver side — the parent already throttles
 *     send-side; here we just disable the smoothing.
 *
 * The component takes the *latest sample* as its input; the parent
 * holds whichever channel-driven state matters and feeds in the head
 * of the queue. Smoothing is local to this component (no global
 * coordination needed).
 *
 * `data-x` / `data-y` mirror the rendered position and are the
 * test-time pin for the smoothing behaviour.
 */

const STALE_LABEL_MS = 1000;
const LERP_RATE = 0.18;
const SNAP_THRESHOLD = 0.001;

export interface PeerCursorState {
  readonly playerId: string;
  readonly name: string;
  readonly color: string;
  /** Normalised x in [0, 1] — multiplied by viewport for screen px. */
  readonly x: number;
  /** Normalised y in [0, 1]. */
  readonly y: number;
  /** Sender's `Date.now()` at sample emit. Drives label-fade timer. */
  readonly lastUpdateTs: number;
}

export interface PeerCursorProps {
  readonly cursor: PeerCursorState;
  readonly reduceMotion?: boolean;
  /** Optional className override; defaults to fixed-positioned overlay. */
  readonly className?: string;
}

export function PeerCursor({
  cursor,
  reduceMotion = false,
  className,
}: PeerCursorProps): JSX.Element {
  // Rendered position. In motion-safe mode, this lerps toward the
  // latest sample; in reduce-motion, it snaps.
  const [position, setPosition] = useState(() => ({
    x: cursor.x,
    y: cursor.y,
  }));
  const targetRef = useRef({ x: cursor.x, y: cursor.y });
  const positionRef = useRef({ x: cursor.x, y: cursor.y });
  const rafRef = useRef<number | null>(null);

  // Stale-label state — flips true 1s after the last sample with no
  // refresh. Reset on every new sample.
  const [labelStale, setLabelStale] = useState(false);

  // Update target on every prop change.
  useEffect(() => {
    targetRef.current = { x: cursor.x, y: cursor.y };
    setLabelStale(false);

    if (reduceMotion) {
      // Snap immediately, no rAF.
      positionRef.current = { x: cursor.x, y: cursor.y };
      setPosition({ x: cursor.x, y: cursor.y });
      return;
    }

    // Schedule the rAF tick if not already running. Each effect run
    // reschedules on a fresh frame — the cleanup nulls `rafRef.current`
    // so the next run starts cleanly.
    const tick = (): void => {
      const target = targetRef.current;
      const pos = positionRef.current;
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      if (Math.abs(dx) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
        // Settle — no further work until a new sample arrives.
        positionRef.current = { x: target.x, y: target.y };
        setPosition({ x: target.x, y: target.y });
        rafRef.current = null;
        return;
      }
      const next = {
        x: pos.x + dx * LERP_RATE,
        y: pos.y + dy * LERP_RATE,
      };
      positionRef.current = next;
      setPosition(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cursor.x, cursor.y, reduceMotion]);

  // Stale-label timer.
  useEffect(() => {
    setLabelStale(false);
    const handle = setTimeout(() => setLabelStale(true), STALE_LABEL_MS);
    return () => clearTimeout(handle);
  }, [cursor.lastUpdateTs]);

  // Compose inline style — `--peer-color` carries the tint and the
  // top/left position is normalised → percent so the same coords
  // resolve correctly across viewport sizes.
  const style = {
    '--peer-color': cursor.color,
    left: `${position.x * 100}%`,
    top: `${position.y * 100}%`,
  } as React.CSSProperties;

  return (
    <div
      data-testid={`peer-cursor-${cursor.playerId}`}
      data-player-id={cursor.playerId}
      data-x={String(position.x)}
      data-y={String(position.y)}
      aria-hidden="true"
      style={style}
      className={`pointer-events-none absolute z-30 -translate-x-1 -translate-y-1 ${className ?? ''} `}
    >
      {/* SVG arrow tinted via inline fill so per-peer color works
          without Tailwind class generation. */}
      <svg
        width="20"
        height="22"
        viewBox="0 0 20 22"
        fill="none"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}
      >
        <path
          d="M2 2 L18 12 L11 13 L8 20 Z"
          fill={cursor.color}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />
      </svg>
      <span
        data-testid={`peer-cursor-label-${cursor.playerId}`}
        data-stale={labelStale ? 'true' : 'false'}
        className="absolute left-5 top-3 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs font-semibold text-white transition-opacity duration-300 ease-flow data-[stale=true]:opacity-0"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.name}
      </span>
    </div>
  );
}
