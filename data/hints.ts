import type { TurnPhase } from '@/engine/types';

export type FirstEvent = 'move-phase' | 'challenge' | 'spark-earned' | 'discard-prompt';

export type HintTrigger =
  | { kind: 'game-start' }
  | { kind: 'phase-enter'; phase: TurnPhase; minTurn?: number }
  | { kind: 'first-event'; event: FirstEvent }
  | { kind: 'turn-number'; n: number; phase: TurnPhase };

export type NamedRegion = 'hand' | 'action-bar' | 'board' | 'meters' | 'encounter-modal';

export type HintAnchor =
  | { kind: 'overlay' }
  | { kind: 'region'; name: NamedRegion }
  | { kind: 'element'; dataAttr: string };

export type DismissMethod =
  | 'tap-anywhere'
  | 'hinted-action'
  | { kind: 'timeout'; ms: number }
  | 'explicit-button';

export interface HintDefinition {
  id: string;
  priority: number;
  when: HintTrigger;
  where: HintAnchor;
  copy: string;
  severity: 'info' | 'warn';
  dismissibleVia: DismissMethod[];
  prerequisiteId?: string;
}

export const HINTS: readonly HintDefinition[] = Object.freeze([
  {
    id: 'tutorial-welcome',
    priority: 10,
    when: { kind: 'game-start' },
    where: { kind: 'overlay' },
    copy: 'Welcome to the Tree of Life. Ten Sefirot stand between Malkuth and the Crown. Play your cards to open paths — and ascend together.',
    severity: 'info',
    dismissibleVia: ['explicit-button'],
  },
  {
    id: 'tutorial-hand-intro',
    priority: 20,
    when: { kind: 'first-event', event: 'move-phase' },
    where: { kind: 'region', name: 'hand' },
    copy: 'Each card in your hand is an Arcanum — and a key to one or more paths on the Tree. Tap a card to see which paths it unlocks.',
    severity: 'info',
    dismissibleVia: ['tap-anywhere', 'hinted-action'],
    prerequisiteId: 'tutorial-welcome',
  },
  {
    id: 'tutorial-play-card',
    priority: 30,
    when: { kind: 'phase-enter', phase: 'move', minTurn: 1 },
    where: { kind: 'region', name: 'action-bar' },
    copy: 'Select a card, then tap a glowing path on the board to travel it. You must play a card to Move — or choose Meditate to draw 2 instead.',
    severity: 'warn',
    dismissibleVia: ['hinted-action'],
    prerequisiteId: 'tutorial-hand-intro',
  },
  {
    id: 'tutorial-draw-replenish',
    priority: 40,
    when: { kind: 'turn-number', n: 2, phase: 'move' },
    where: { kind: 'region', name: 'action-bar' },
    copy: 'Your hand refills toward 4 cards at the start of each turn. You can hold up to 6.',
    severity: 'info',
    dismissibleVia: ['tap-anywhere', { kind: 'timeout', ms: 6000 }],
    prerequisiteId: 'tutorial-play-card',
  },
  {
    id: 'tutorial-meditate',
    priority: 50,
    when: { kind: 'phase-enter', phase: 'move', minTurn: 2 },
    where: { kind: 'region', name: 'action-bar' },
    copy: 'No good path? Meditate — draw 2 extra cards once per turn. You can still Move after Meditating.',
    severity: 'info',
    dismissibleVia: ['tap-anywhere', 'hinted-action'],
    prerequisiteId: 'tutorial-draw-replenish',
  },
  {
    id: 'tutorial-challenge-intro',
    priority: 60,
    when: { kind: 'first-event', event: 'challenge' },
    where: { kind: 'region', name: 'encounter-modal' },
    copy: 'This Sefirah is uncleared. Roll d20 + your stat against its Difficulty Class. Succeed to earn its Spark — or accept Separation and try again next turn.',
    severity: 'warn',
    dismissibleVia: ['explicit-button'],
    prerequisiteId: 'tutorial-meditate',
  },
  {
    id: 'tutorial-spark-earned',
    priority: 70,
    when: { kind: 'first-event', event: 'spark-earned' },
    where: { kind: 'region', name: 'meters' },
    copy: "You've earned a Spark — a one-use ability from this Sefirah's gift. Clear all nine to face the Final Threshold at Kether together.",
    severity: 'info',
    dismissibleVia: ['tap-anywhere', { kind: 'timeout', ms: 8000 }],
    prerequisiteId: 'tutorial-challenge-intro',
  },
] as const);
