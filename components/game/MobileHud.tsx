'use client';
import { useRef } from 'react';
import { sefirot } from '@/data';
import type { ShellStateMap } from '@/engine/types';
import type { TurnPhase } from '@/lib/use-turn';

export interface MobileHudProps {
  readonly phase: TurnPhase;
  readonly activePlayerName: string;
  readonly illumination: number;
  readonly separation: number;
  readonly shells: ShellStateMap;
  readonly activeView: 'tree' | 'hand';
  readonly onSetView: (v: 'tree' | 'hand') => void;
  readonly treePanelId: string;
  readonly handPanelId: string;
}

function phaseHint(phase: TurnPhase): string {
  switch (phase) {
    case 'move':
      return 'Pick a card and a path, or meditate';
    case 'challenge':
      return 'Resolve the challenge';
    case 'end':
      return 'Move complete — end turn';
    case 'kether':
      return 'Final Threshold ritual';
  }
}

/**
 * Persistent HUD strip for mobile. Renders phase hint, player name, compact
 * Illumination / Separation values, and the Tree / Hand tab toggle. Always
 * visible regardless of which mobile view is active.
 */
export function MobileHud({
  phase,
  activePlayerName,
  illumination,
  separation,
  shells,
  activeView,
  onSetView,
  treePanelId,
  handPanelId,
}: MobileHudProps): JSX.Element {
  const treeTabRef = useRef<HTMLButtonElement>(null);
  const handTabRef = useRef<HTMLButtonElement>(null);
  const activeShells = sefirot.filter((s) => shells[s.key] === 'active');
  return (
    <div
      data-testid="mobile-hud"
      className="flex flex-col gap-1 border-t border-veil/20 bg-ground/60 px-4 py-2 backdrop-blur-sm"
    >
      {activeShells.length > 0 && (
        <div
          data-testid="mobile-shell-warnings"
          className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs"
        >
          {activeShells.map((s) => (
            <span
              key={s.key}
              className="rounded border border-amber-400/40 bg-amber-400/10 px-1 text-amber-300"
            >
              Shell of {s.transliteration}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span data-testid="mobile-phase-hint" className="truncate opacity-60">
          {phaseHint(phase)}
        </span>
        <span data-testid="mobile-player-name" className="shrink-0 font-display tracking-widest">
          {activePlayerName}&apos;s turn
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="opacity-60">☀</span>
            <span data-testid="mobile-illumination">{illumination}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="opacity-60">☽</span>
            <span data-testid="mobile-separation">{separation}</span>
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Play surface view"
          className="flex rounded border border-veil/20 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              onSetView('hand');
              handTabRef.current?.focus();
            } else if (e.key === 'ArrowLeft') {
              onSetView('tree');
              treeTabRef.current?.focus();
            }
          }}
        >
          <button
            ref={treeTabRef}
            role="tab"
            aria-selected={activeView === 'tree'}
            aria-controls={treePanelId}
            tabIndex={activeView === 'tree' ? 0 : -1}
            onClick={() => onSetView('tree')}
            className={`min-h-9 px-4 py-2 first:rounded-l last:rounded-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80 ${
              activeView === 'tree'
                ? 'bg-illumination/20 font-medium text-illumination'
                : 'text-veil/60 hover:text-veil'
            }`}
          >
            Tree
          </button>
          <button
            ref={handTabRef}
            role="tab"
            aria-selected={activeView === 'hand'}
            aria-controls={handPanelId}
            tabIndex={activeView === 'hand' ? 0 : -1}
            onClick={() => onSetView('hand')}
            className={`min-h-9 px-4 py-2 first:rounded-l last:rounded-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80 ${
              activeView === 'hand'
                ? 'bg-illumination/20 font-medium text-illumination'
                : 'text-veil/60 hover:text-veil'
            }`}
          >
            Hand
          </button>
        </div>
      </div>
    </div>
  );
}
