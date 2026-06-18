'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HintDefinition, NamedRegion } from '@/data/hints';
import { markDismissed } from '@/lib/hooks/useHints';

// DOM selector for each named region. Must stay in sync with the data-* and
// aria attributes wired in PlayScreen (#328).
const REGION_SELECTOR: Record<NamedRegion, string> = {
  hand: '[data-hand]',
  'action-bar': '[data-action-bar]',
  board: '[aria-label="Tree of Life board"]',
  meters: '[aria-label="Game status"]',
  'encounter-modal': '[aria-labelledby^="encounter-"]',
};

interface RegionPosition {
  top: number;
  left: number;
  flipped: boolean;
}

interface HintCalloutProps {
  hint: HintDefinition | null;
}

export function HintCallout({ hint }: HintCalloutProps): JSX.Element | null {
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [position, setPosition] = useState<RegionPosition | null>(null);

  const timeoutDismiss =
    hint?.dismissibleVia.find(
      (m): m is { kind: 'timeout'; ms: number } =>
        typeof m === 'object' && m !== null && 'kind' in m && m.kind === 'timeout',
    ) ?? null;
  const isToast = timeoutDismiss !== null;
  const canTapAnywhere = hint?.dismissibleVia.includes('tap-anywhere') ?? false;
  const hasExplicitButton = hint?.dismissibleVia.includes('explicit-button') ?? false;

  // Entrance animation: defer one frame so CSS transition can play.
  useEffect(() => {
    if (!hint) {
      setShown(false);
      setLeaving(false);
      return;
    }
    setShown(false);
    setLeaving(false);
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [hint?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position the region callout against the anchor's bounding rect.
  useLayoutEffect(() => {
    if (!hint || hint.where.kind !== 'region' || isToast) {
      setPosition(null);
      return;
    }
    const selector = REGION_SELECTOR[hint.where.name];
    const el = document.querySelector(selector);
    if (!el) {
      setPosition(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const flipped = rect.top < 120;
    setPosition({
      top: flipped ? rect.bottom + 8 : rect.top - 8,
      left: rect.left + rect.width / 2,
      flipped,
    });
  }, [hint?.id, isToast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulse ring on the anchor region while callout is visible.
  useEffect(() => {
    if (!hint || hint.where.kind !== 'region') return;
    const selector = REGION_SELECTOR[hint.where.name];
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('ring-2', 'ring-kether/60', 'ring-offset-2', 'ring-offset-void');
    return () => {
      el.classList.remove('ring-2', 'ring-kether/60', 'ring-offset-2', 'ring-offset-void');
    };
  }, [hint?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback(() => {
    if (!hint) return;
    if (isToast) {
      // Animate out first, then fire the dismiss event so the parent
      // re-evaluates useHints after the exit animation completes.
      setLeaving(true);
      setTimeout(() => markDismissed(hint.id), 200);
    } else {
      markDismissed(hint.id);
    }
  }, [hint, isToast]);

  // Auto-dismiss timer for toast variant.
  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;
  useEffect(() => {
    if (!hint || !timeoutDismiss) return;
    const timer = setTimeout(() => handleDismissRef.current(), timeoutDismiss.ms);
    return () => clearTimeout(timer);
  }, [hint?.id, timeoutDismiss?.ms]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hint || hint.where.kind === 'overlay') return null;

  // ── Toast variant ────────────────────────────────────────────────────────
  if (isToast) {
    return (
      <div
        className={[
          'fixed bottom-28 left-1/2 z-[55] -translate-x-1/2',
          'transition-[opacity,transform] duration-200',
          leaving
            ? 'opacity-0 ease-flow'
            : shown
              ? 'opacity-100 ease-emerge'
              : 'opacity-0 ease-emerge motion-safe:translate-y-2',
        ].join(' ')}
        role="status"
        aria-live="polite"
        onClick={canTapAnywhere ? handleDismiss : undefined}
      >
        <div className="rounded-full border border-veil/10 bg-ground/70 px-5 py-2.5 shadow-lg backdrop-blur-sm">
          <p className="font-sans text-sm text-veil">{hint.copy}</p>
        </div>
      </div>
    );
  }

  // ── Region callout variant ───────────────────────────────────────────────
  if (hint.where.kind !== 'region') return null;

  const positionStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: position.flipped ? `${position.top}px` : `${position.top - 8}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

  return (
    <>
      {/* Click-outside backdrop */}
      {canTapAnywhere && (
        <div
          className="fixed inset-0 z-[54]"
          data-hint-backdrop
          onClick={handleDismiss}
          aria-hidden="true"
        />
      )}
      <div
        style={positionStyle}
        className={[
          'z-[55] max-w-xs',
          'transition-[opacity,transform] duration-200 ease-emerge',
          shown ? 'scale-100 opacity-100' : 'opacity-0 motion-safe:scale-95',
        ].join(' ')}
        role="tooltip"
      >
        <div className="relative rounded-lg border border-veil/20 bg-ground/80 px-4 py-3 shadow-xl backdrop-blur-sm">
          {/* CSS triangle pointer — points down toward anchor (normal), up when flipped */}
          {position && !position.flipped && (
            <span
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-[4px] border-transparent border-t-veil/20"
              aria-hidden="true"
            />
          )}
          {position && position.flipped && (
            <span
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full border-[4px] border-transparent border-b-veil/20"
              aria-hidden="true"
            />
          )}
          <p className="font-sans text-sm leading-relaxed text-veil">{hint.copy}</p>
          {hasExplicitButton && (
            <button
              onClick={() => markDismissed(hint.id)}
              className="mt-3 text-sm font-semibold text-kether transition-colors hover:text-kether/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kether/60"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </>
  );
}
