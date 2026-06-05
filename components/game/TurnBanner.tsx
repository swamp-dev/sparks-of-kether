'use client';

import { useEffect } from 'react';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';

/** Tiferet hex from data/sefirot.ts. */
const TIFERET_GOLD = '#ffd700';

const AUTO_DISMISS_MS = 2500;

interface TurnBannerProps {
  readonly playerName: string;
  readonly onDismiss: () => void;
}

/**
 * Full-screen atmospheric overlay that fires when the turn rotates to
 * the local player. Void background + Tiferet-gold radial bloom +
 * "YOUR TURN" in display type + player name.
 *
 * Auto-dismisses after 2.5s or on the first keydown / click / touch.
 * Visible only to the active player (the caller gates on `isMyTurn`).
 */
export function TurnBanner({ playerName, onDismiss }: TurnBannerProps): JSX.Element {
  useEffect(() => {
    const handle = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(handle);
  }, [onDismiss]);

  useEffect(() => {
    const handler = () => onDismiss();
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler, { passive: true });
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [onDismiss]);

  return (
    <div
      data-testid="turn-banner"
      aria-live="assertive"
      aria-atomic="true"
      className="z-60 fixed inset-0 flex cursor-pointer flex-col items-center justify-center bg-ground"
      onClick={onDismiss}
    >
      <ColorBloom color={TIFERET_GOLD} position="center" radius={65} intensity={0.28} />
      <p className="font-display text-base uppercase tracking-[0.3em] text-veil/60">{playerName}</p>
      <p className="font-display text-5xl tracking-[0.25em] text-illumination">YOUR TURN</p>
      <p className="mt-6 text-xs uppercase tracking-widest text-veil/30">tap to continue</p>
    </div>
  );
}
