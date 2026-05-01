'use client';

import { useEffect, useState } from 'react';
import type { PeerActionKind } from '@/lib/realtime/presence';

/**
 * ActionToast — top-center toast surfacing peer pre-action state for
 * #322. "Brae is choosing a card…", "Cael is rolling…", etc.
 *
 * Auto-dismisses 6s after the toast's `ts` if the parent doesn't push
 * a fresh action. Renders inside a `role="status" aria-live="polite"`
 * region so SR users hear the announcement without it stealing focus.
 *
 * Reduce-motion: drops the slide-in animation; the toast still fades
 * in via opacity. Acceptance: "toasts skip slide-in" — content remains
 * visible.
 *
 * Copy is mapped from the wire-level `kind` to a human-readable
 * fragment here — the wire layer only carries the discriminant so a
 * future copy revision lives in one place.
 */

const AUTO_DISMISS_MS = 6000;

const COPY_BY_KIND: Readonly<Record<PeerActionKind, string>> = {
  'choosing-card': 'is choosing a card…',
  rolling: 'is rolling…',
  targeting: 'is targeting a Sefirah…',
};

export interface PeerAction {
  readonly playerId: string;
  readonly name: string;
  readonly kind: PeerActionKind | null;
  /** Sender's `Date.now()` when the action started; drives auto-dismiss. */
  readonly ts: number;
}

export interface ActionToastProps {
  readonly actions: readonly PeerAction[];
  readonly reduceMotion?: boolean;
  readonly className?: string;
}

export function ActionToast({
  actions,
  reduceMotion = false,
  className,
}: ActionToastProps): JSX.Element {
  // Tick every 250ms so the auto-dismiss filter recomputes; cheaper
  // than per-action timers, and 4Hz resolution is plenty against the
  // 6s budget.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(handle);
  }, []);

  const live = actions.filter(
    (a): a is PeerAction & { kind: PeerActionKind } =>
      a.kind !== null && now - a.ts < AUTO_DISMISS_MS,
  );

  return (
    <div
      data-testid="action-toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className={`
        pointer-events-none flex flex-col items-center gap-2
        ${className ?? ''}
      `}
    >
      {live.map((action) => (
        <div
          key={action.playerId}
          data-testid={`action-toast-${action.playerId}`}
          data-action-kind={action.kind}
          data-slide-in={reduceMotion ? 'false' : 'true'}
          className={`
            rounded-full border border-veil/30 bg-ground/85
            px-4 py-1.5 text-sm text-veil shadow-lg
            transition-opacity duration-300 ease-emerge
            data-[slide-in=true]:motion-safe:animate-[hand-fade-in_180ms_ease-out]
          `}
        >
          <span className="font-semibold">{action.name}</span>{' '}
          <span className="opacity-80">{COPY_BY_KIND[action.kind]}</span>
        </div>
      ))}
    </div>
  );
}
