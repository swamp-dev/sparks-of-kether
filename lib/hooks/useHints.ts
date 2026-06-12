import { useEffect, useRef, useState } from 'react';
import type { GameState, TurnPhase } from '@/engine/types';
import { HINTS, type HintDefinition } from '@/data/hints';
import {
  clearAllHints,
  hasFirstEventFired,
  HINT_CHANGE_EVENT,
  isDismissed,
  markDismissed,
  markFirstEventFired,
} from './hint-storage';

export { clearAllHints, isDismissed, markDismissed };

let _activeHint: HintDefinition | null = null;

export function getActiveHint(): HintDefinition | null {
  return _activeHint;
}

function isTriggerMatch(hint: HintDefinition, gameState: GameState, turnNumber: number): boolean {
  const { when } = hint;
  switch (when.kind) {
    case 'game-start':
      return true;
    case 'phase-enter':
      return (
        gameState.phase === when.phase && (when.minTurn === undefined || turnNumber >= when.minTurn)
      );
    case 'first-event':
      return hasFirstEventFired(when.event);
    case 'turn-number':
      return gameState.phase === when.phase && turnNumber === when.n;
  }
}

function isEligible(hint: HintDefinition, gameState: GameState, turnNumber: number): boolean {
  if (isDismissed(hint.id)) return false;
  if (hint.prerequisiteId !== undefined && !isDismissed(hint.prerequisiteId)) return false;
  return isTriggerMatch(hint, gameState, turnNumber);
}

function computeActiveHint(gameState: GameState, turnNumber: number): HintDefinition | null {
  let best: HintDefinition | null = null;
  for (const hint of HINTS) {
    if (isEligible(hint, gameState, turnNumber)) {
      if (best === null || hint.priority < best.priority) {
        best = hint;
      }
    }
  }
  return best;
}

export function useHints(gameState: GameState): HintDefinition | null {
  const prevPhaseRef = useRef<TurnPhase | undefined>(undefined);
  const prevClearedSizeRef = useRef(0);
  const prevHasPendingDiscardRef = useRef(false);
  const turnNumberRef = useRef(1);
  const [, setVersion] = useState(0);

  // Listen for hint dismissals from anywhere in the app.
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener(HINT_CHANGE_EVENT, handler);
    return () => window.removeEventListener(HINT_CHANGE_EVENT, handler);
  }, []);

  // Reset tracking state on unmount so StrictMode's remount starts clean
  // and does not misread a stale prevPhase as a new transition.
  useEffect(() => {
    return () => {
      prevPhaseRef.current = undefined;
      prevClearedSizeRef.current = 0;
      prevHasPendingDiscardRef.current = false;
    };
  }, []);

  // Run after every render to detect game-state transitions and mark first-events.
  // No dep array = runs after every render; prevPhaseRef holds the previous render's phase.
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const currentPhase = gameState.phase;

    if (prevPhase !== currentPhase) {
      if (currentPhase === 'move') {
        // A transition from 'end' to 'move' means the next player's turn has started.
        if (prevPhase === 'end') {
          turnNumberRef.current += 1;
          setVersion((v) => v + 1);
        }
        if (!hasFirstEventFired('move-phase')) {
          markFirstEventFired('move-phase');
          setVersion((v) => v + 1);
        }
      }
      if (currentPhase === 'challenge' && !hasFirstEventFired('challenge')) {
        markFirstEventFired('challenge');
        setVersion((v) => v + 1);
      }
    }

    // Detect spark-earned: total cleared sefirot across all players grew.
    let totalCleared = 0;
    for (const p of gameState.players) totalCleared += p.clearedSefirot.size;
    if (totalCleared > prevClearedSizeRef.current && !hasFirstEventFired('spark-earned')) {
      markFirstEventFired('spark-earned');
      setVersion((v) => v + 1);
    }
    prevClearedSizeRef.current = totalCleared;

    // Detect discard-prompt: pendingDiscard transitions from undefined to defined.
    const hasPendingDiscard = gameState.pendingDiscard !== undefined;
    if (
      hasPendingDiscard &&
      !prevHasPendingDiscardRef.current &&
      !hasFirstEventFired('discard-prompt')
    ) {
      markFirstEventFired('discard-prompt');
      setVersion((v) => v + 1);
    }
    prevHasPendingDiscardRef.current = hasPendingDiscard;

    prevPhaseRef.current = currentPhase;
  });

  const activeHint = computeActiveHint(gameState, turnNumberRef.current);

  // Sync the module-level imperative accessor after commit so it is never
  // written during an abandoned Concurrent Mode render.
  useEffect(() => {
    _activeHint = activeHint;
  });

  return activeHint;
}
