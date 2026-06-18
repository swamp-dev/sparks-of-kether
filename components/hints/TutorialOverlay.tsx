'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HintDefinition } from '@/data/hints';
import { markDismissed } from '@/lib/hooks/useHints';

interface TutorialOverlayProps {
  hint: HintDefinition | null;
}

export function TutorialOverlay({ hint }: TutorialOverlayProps): JSX.Element | null {
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isExplicitButton = hint?.dismissibleVia.includes('explicit-button') ?? false;

  // Entrance animation: defer one frame so CSS transition can play.
  useEffect(() => {
    if (!hint) {
      setShown(false);
      return;
    }
    setShown(false);
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [hint?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus panel on mount and handle Escape key (treat as confirmation).
  const hintIdRef = useRef(hint?.id);
  hintIdRef.current = hint?.id;
  useEffect(() => {
    if (!hint) return;
    panelRef.current?.focus();
    if (!isExplicitButton) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && hintIdRef.current !== undefined) {
        markDismissed(hintIdRef.current);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hint?.id, isExplicitButton]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback(() => {
    if (!hint) return;
    markDismissed(hint.id);
  }, [hint]);

  if (!hint || hint.where.kind !== 'overlay') return null;

  const titleId = `tutorial-overlay-${hint.id}`;

  return (
    <div data-tutorial-backdrop className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'relative mx-auto mt-[20vh] max-w-sm rounded-xl border border-veil/20 bg-ground/90 p-6 shadow-2xl outline-none',
          'transition-opacity duration-300 ease-emerge motion-safe:transition-[opacity,transform]',
          shown ? 'opacity-100' : 'opacity-0 motion-safe:translate-y-2',
        ].join(' ')}
      >
        <p id={titleId} className="font-display text-base text-veil">
          {hint.copy}
        </p>
        {isExplicitButton && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded bg-illumination px-6 py-2 text-sm font-semibold text-ground transition-shadow duration-300 ease-emerge hover:shadow-glow-tiferet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
