# The Shells — Qliphothic Pressure

Evil in this game is **separation and ignorance**. The Shells are how that
shows up mechanically: ten thematic pressures, each the inversion of a
Sefirah's gift. They are not enemies to defeat — they are what happens when
the team fails to circulate light.

## Naming rule

We refer to these descriptively only: **"Shell of Chesed," "Shell of
Gevurah," "Shadow of Yesod," "Husk of Tiferet."** We do **not** use the
traditional proper names from Kabbalistic demonology. The Shells are
impersonal pressures — the accumulated weight of separation, not named
intelligences.

(Kabbalistic purists will recognize what we're pointing at; that's fine.
We're just not giving those forces a seat at the table by naming them.)

## Core loop

Shells are not active from the start. They **awaken** as team Separation
climbs. Awakened Shells apply ongoing pressure until banished.

### Awakening

Each time **Separation crosses a +3 threshold** (3, 6, 9, 12, 15…), the
**Shell of the Sefirah with the fewest Sparks collected** awakens. Ties
break toward the lower Sefirah on the Tree (Malkuth before Yesod before
Hod, etc.).

At Separation 15 the Tree destabilizes and the game ends — see the loss
condition in `mechanics.md`. So the Shell awakenings happen at **3, 6, 9,
and 12**. Four awakenings maximum in a losing trajectory.

<!-- code-ref: engine/shells.ts:SHELL_THRESHOLD_STEP -->
<!-- code-ref: engine/shells.ts:MAX_ACTIVATIONS -->
<!-- code-ref: engine/endgame.ts:SEPARATION_LOSS_THRESHOLD -->

### Pressure

An awakened Shell applies a thematic, ongoing effect — the inversion of
its Sefirah's gift — until banished.

### Banishment

Clearing that Sefirah's Challenge (earning its Spark) immediately banishes
its Shell. If the Sefirah was already cleared before the Shell awakened,
the Shell is stillborn — it never activates.

This is the game's built-in hope: **every Shell is a Sefirah you haven't
met yet**. Evil here is just un-illuminated ground. Walk the path, earn the
Spark, the Shell is gone.

## The ten Shells

Each inverts its Sefirah's gift. Effects are ongoing until banished.

### Shell of Kether — Fragmentation
*Unity becomes shattering.*
**Effect:** All public information becomes private. Hands that were shared
become hidden. Any card-visibility perks (Hod's Insight, etc.) stop
working. Revealed when the team is close to unity and must now work blind.

### Shell of Chokmah — Paralysis
*The flash cannot strike.*
**Effect:** No player may play a card on the turn they draw it. One round
of patience required per card acquired.

### Shell of Binah — Despair
*Understanding turns in on itself.*
**Effect:** Reflection-type actions (Spark ability triggers, Tiferet
bridges, ally assists) produce no Illumination. The ascent still works; it
just feels hollow.

### Shell of Chesed — Hoarding
*Overflow becomes stasis.*
**Effect:** No card gifts, in any direction, for the next **full round**.
(Soul Aspect abilities that gift are also disabled for the round.)

### Shell of Gevurah — Cruelty
*Strength turns to abuse.*
**Effect:** Every player's **Strength stat drops by 1 permanently** until
banished. (It returns when banished, not when refilled.) All Gevurah
challenges are DC +2 while this is active.

### Shell of Tiferet — Vanity
*Harmony becomes self-regard.*
**Effect:** The Tiferet player's Soul Aspect ability is disabled. If no
Tiferet player is at the table, all *Harmony* stat checks are DC +2.

### Shell of Netzach — Obsession
*Passion becomes fixation.*
**Effect:** Cards played on desire-themed paths (Netzach-adjacent: paths
21, 24, 28, 29) have no movement effect — they burn and the player stays
put. They can still be used to assist or for card-burn bonuses.

### Shell of Hod — Deception
*Splendor becomes lies.*
**Effect:** The top card of the draw pile is announced as something else
each turn. A player who draws blind receives the true card; a player who
peeks receives misinformation. (Digital: implementer decides how to render
this; at the table: shuffle in a "Lie" token.)

### Shell of Yesod — Illusion
*Foundation becomes fog.*
**Effect:** One path's description on the board becomes false. Players
traveling it pay the card cost but arrive at the *wrong* Sefirah (the one
adjacent on the Tree, not the one listed). Which path is illusory is
determined at awakening and revealed only through play. (See note below.)

### Shell of Malkuth — Inertia
*The body resists motion.*
**Effect:** Every movement costs **two cards** instead of one — you play
the path-card, and discard any other card from your hand. If you have only
one card, you cannot move; you must Meditate.

## Strategic implications

- **Shell awakenings are about which Sefirot are least-visited.** If the
  team has spread across the Tree and collected many Sparks, Shell
  awakenings hit well-mapped places that are easy to banish. If the team
  has rushed a single route, awakenings target far-away unknown ground.
- **Path of the Arrow + Separation is the danger spiral.** The shortcut
  raises Separation faster and skips most Sparks, so Shell awakenings hit
  *exactly* the Sefirot you skipped. Speed-runners often lose here.
- **Gevurah Sparks are precious.** They're the only one-shot tool that
  lowers Separation. Worth hoarding *one* in the later game.
- **Saving the Chesed challenge for when Chesed's Shell wakes** is a
  classic move — visit Chesed late, banish Hoarding right when it bites.

## Illusion Shell — a note on reveal

The Shell of Yesod requires that some path-descriptor be secretly false. In
physical play, this can be handled by:
- The first player to step onto an illusory path receives a special
  "Illusion" card silently from the deck; they must play along but may not
  warn others.
- Alternatively, a neutral "Oracle" player (not in the main rotation)
  manages the secret.

In digital play, the system handles it trivially.

If this Shell feels awkward for your group, substitute: *"All divination
effects (Hod Spark, etc.) return false results until banished."*

## What the Shells are teaching

Each Shell is a lived lesson in what the Sefirah's gift actually *is*, by
removing it. The game withholds Unity so that you feel Fragmentation and
understand Unity-as-relief. The structure is not punitive; it's pedagogical.

The final revelation — when the Sparks overflow the Separation and the
Tree illumines — lands because the pressure made it real.
