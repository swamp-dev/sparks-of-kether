'use client';
import type { ReactNode } from 'react';
import type { ShellStateMap } from '@/engine/types';
import type { TurnPhase } from '@/lib/use-turn';
import { MobileHud } from './MobileHud';

export interface MobilePlaySurfaceProps {
  readonly activeView: 'tree' | 'hand';
  readonly onSetView: (v: 'tree' | 'hand') => void;
  readonly treeContent: ReactNode;
  readonly handContent: ReactNode;
  // HUD data
  readonly phase: TurnPhase;
  readonly activePlayerName: string;
  readonly illumination: number;
  readonly separation: number;
  readonly shells: ShellStateMap;
}

/**
 * Mobile-only play surface (#15). Alternates between Tree view and Hand view
 * via a persistent MobileHud tab strip at the bottom of the screen.
 *
 * The parent (PlayScreen) is responsible for:
 *   - Maintaining `activeView` state and passing `onSetView`.
 *   - Auto-switching to 'tree' when a card is selected so the player can
 *     immediately tap a destination path.
 *   - Supplying pre-composed `treeContent` / `handContent` slices that mirror
 *     the corresponding blocks from the desktop layout.
 *
 * This component itself stays stateless — it is purely view-state-driven.
 */
export function MobilePlaySurface({
  activeView,
  onSetView,
  treeContent,
  handContent,
  phase,
  activePlayerName,
  illumination,
  separation,
  shells,
}: MobilePlaySurfaceProps) {
  return (
    <div
      data-testid="mobile-play-surface"
      className="flex min-h-svh flex-col"
    >
      <div
        id="mobile-tree-panel"
        role="tabpanel"
        aria-label="Tree view"
        className={`flex-1 overflow-y-auto ${activeView === 'tree' ? 'block' : 'hidden'}`}
      >
        {activeView === 'tree' ? treeContent : null}
      </div>

      <div
        id="mobile-hand-panel"
        role="tabpanel"
        aria-label="Hand view"
        className={`flex-1 overflow-y-auto ${activeView === 'hand' ? 'block' : 'hidden'}`}
      >
        {activeView === 'hand' ? handContent : null}
      </div>

      <MobileHud
        phase={phase}
        activePlayerName={activePlayerName}
        illumination={illumination}
        separation={separation}
        shells={shells}
        activeView={activeView}
        onSetView={onSetView}
      />
    </div>
  );
}
