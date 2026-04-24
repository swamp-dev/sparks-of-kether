import type { SoulAspect } from './types';

/**
 * The six playable Soul Aspects — one per "personality" Sefirah.
 * Source: `design/mechanics.md` § Soul Aspects (classes).
 *
 * Kether, Chokmah, and Binah are too elevated for class roles;
 * Malkuth is the starting waypoint. Those four are deliberately absent.
 */
export const soulAspects: readonly SoulAspect[] = [
  {
    key: 'chesed',
    sefirahKey: 'chesed',
    bonusStat: 'lovingkindness',
    title: 'The Giver',
    flavor: 'I pour forth without measure.',
    abilityName: 'Overflow',
    abilityDescription: 'Once per round, gift any card to any player for free.',
    weaknessDescription: 'You cannot refuse gifts.',
  },
  {
    key: 'gevurah',
    sefirahKey: 'gevurah',
    bonusStat: 'strength',
    title: 'The Boundary-Keeper',
    flavor: 'I say no so that yes means something.',
    abilityName: 'Discipline',
    abilityDescription:
      'Once per game, pass one challenge without rolling. Describe what you sacrifice internally.',
    weaknessDescription: 'You cannot initiate gifts — only accept requests.',
  },
  {
    key: 'tiferet',
    sefirahKey: 'tiferet',
    bonusStat: 'harmony',
    title: 'The Heart',
    flavor: 'I hold the center while all else moves.',
    abilityName: 'Bridge',
    abilityDescription:
      'Once per round, two other players may combine their cards as if one hand for a single action.',
    weaknessDescription: 'You cannot advance while any player is trapped below.',
  },
  {
    key: 'hod',
    sefirahKey: 'hod',
    bonusStat: 'intellect',
    title: 'The Mind',
    flavor: 'I see the pattern beneath the chaos.',
    abilityName: 'Insight',
    abilityDescription: 'Before any challenge at your Sefirah, read the next round challenge DC aloud.',
    weaknessDescription: 'You must announce your strategy before acting.',
  },
  {
    key: 'netzach',
    sefirahKey: 'netzach',
    bonusStat: 'passion',
    title: 'The Feeler',
    flavor: 'I feel what cannot be calculated.',
    abilityName: 'Persistence',
    abilityDescription: 'Once per game, retry a failed check without burning a card.',
    weaknessDescription: 'You may not Meditate; you must always Move.',
  },
  {
    key: 'yesod',
    sefirahKey: 'yesod',
    bonusStat: 'intuition',
    title: 'The Dreamer',
    flavor: 'I dream the world before it wakes.',
    abilityName: 'Recycle',
    abilityDescription: 'Once per round, retrieve one card from the discard pile.',
    // TODO(engine): the "one Sefirah below Malkuth" starting state is flavor
    // until the engine models a sub-Malkuth waypoint. Currently dead text;
    // revisit when the setup ticket (#29 Lobby & deal) implements starting
    // positions — either model a `dream-of-malkuth` node or rephrase to
    // mean "spends the first turn in Malkuth without acting."
    weaknessDescription:
      'You start one Sefirah below Malkuth; first turn must be to ascend into Malkuth proper.',
  },
];
