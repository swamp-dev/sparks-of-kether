'use client';
import { useId } from 'react';
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
 *
 * Inactive panels always render in the DOM (the HTML `hidden` attribute handles
 * visibility) so the ARIA tabpanel relationship is always intact for AT users.
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
}: MobilePlaySurfaceProps): JSX.Element {
  const id = useId();
  const treePanelId = `${id}-tree-panel`;
  const handPanelId = `${id}-hand-panel`;

  return (
    <div data-testid="mobile-play-surface" className="flex min-h-svh flex-col">
      <div
        id={treePanelId}
        role="tabpanel"
        aria-label="Tree view"
        hidden={activeView !== 'tree'}
        className="flex-1 overflow-y-auto"
      >
        {treeContent}
      </div>

      <div
        id={handPanelId}
        role="tabpanel"
        aria-label="Hand view"
        hidden={activeView !== 'hand'}
        className="flex-1 overflow-y-auto"
      >
        {handContent}
      </div>

      <MobileHud
        phase={phase}
        activePlayerName={activePlayerName}
        illumination={illumination}
        separation={separation}
        shells={shells}
        activeView={activeView}
        onSetView={onSetView}
        treePanelId={treePanelId}
        handPanelId={handPanelId}
      />
    </div>
  );
}
