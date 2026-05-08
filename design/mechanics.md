# Sparks of Kether — Mechanics

A cooperative RPG-flavored ascent for 2–4 players. This document describes
**the rules of play**, medium-agnostic. It could be realized as a board game,
a card game, a web app, or a computer game — none of those are assumed here.

---

## The game in one minute

Players start at Malkuth and climb the Tree of Life toward Kether.
- **Move** by playing Major Arcana cards from your hand — each card unlocks
  the specific path it belongs to.
- **Challenge** at every new Sefirah: a stat check. Pass, and you earn that
  Sefirah's **Spark** (a lesson + a one-use ability). Fail, and you choose:
  burn a card to retry, or take Separation and a setback.
- **Two team counters** track the journey's moral weight: **Illumination**
  (rises with Sparks and generosity) and **Separation** (rises with
  failures, shortcuts, and selfishness).
- **Shells** awaken when Separation climbs — thematic pressure that inverts
  a Sefirah's gift (hoarding, deception, inertia…). Clearing that Sefirah
  banishes its Shell.
- **Win** by reaching Kether together with Illumination clearly ahead of
  Separation, and passing the collective **Final Threshold**.
- **Lose** by letting Separation overrun the Tree before you can unify.

Evil here is separation and ignorance. Good is illumination and unity. The
mechanics teach that directly.

---

## Components (abstract)

Whatever the medium, the game needs these elements. How they're represented
is an implementation choice.

| Element | Count | Purpose |
|---|---|---|
| Tree board | 1 | 10 Sefirot as nodes, 22 paths as edges |
| Major Arcana decks | **1 deck (2 players) or 2 decks (3–4 players)** | One card per path. Each is also a path-key. With two decks, two players can hold the same Arcanum. |
| Player tokens | 1 per player | Current position on the Tree |
| Stat sheet | 1 per player | 10 stats (one per Sefirah) + zodiac-sign class |
| Spark tokens | 10 types | One per Sefirah; earned and spent |
| Illumination tracker | 1 shared | Counter, 0–∞ |
| Separation tracker | 1 shared | Counter, 0–∞ |
| Shell markers | 10 | One per Sefirah, dormant/active |
| d20 | 1 | Stat-check rolls |

**Deck scaling rule.** A 2-player game uses one Major Arcana deck (22
cards). A 3- or 4-player game uses two shuffled Major Arcana decks
together (44 cards). Two decks lets multiple players potentially hold
the same path-key — coordination still matters, but the team isn't
choked by a single rare card.

**Hand-size cap.** Each player's hand is capped at **6 cards**. See
[Drawing & Gift handling](#drawing--gift-handling) below for what
happens when a draw or gift would exceed it.

<!-- code-ref: engine/setup.ts:HAND_CAP -->
<!-- code-ref: engine/setup.ts:STARTING_HAND_SIZE -->

**Discard recycle.** When the draw pile empties, shuffle the discard
pile face-down to form a new draw pile. The game runs as long as
there are cards anywhere in the system.

---

## Setup

### 1. The Sefirot-blessing ritual (stat generation)

Each player's soul "descends" through the Tree to be born into the game.
For each of the 10 Sefirot, in order from Kether to Malkuth, the player
rolls **3d6**. The result is that player's stat in that Sefirah's quality.

Stat range: **3 (minimum) to 18 (maximum)** per stat.

The ritual names each stat aloud as it is rolled:
1. *Kether* → Unity
2. *Chokmah* → Insight
3. *Binah* → Understanding
4. *Chesed* → Lovingkindness
5. *Gevurah* → Strength
6. *Tiferet* → Harmony
7. *Netzach* → Passion
8. *Hod* → Intellect
9. *Yesod* → Intuition
10. *Malkuth* → Body

Unlucky rolls are thematic, not a do-over — your soul is particular, and
the team will cover for what you lack.

### 2. Class (zodiac sign)

Each player then chooses (or is dealt) one of twelve **zodiac signs**,
their "class." Each sign tilts the player's freshly-rolled stat sheet
through **planetary dignities** (rulership, exaltation, detriment, fall)
and opens one or two **Soul Doors** on the Tree.

- **Dignity bonuses** apply additively to the rolled stats, then clamp
  each stat to [1, 18]. See [`design/astrological-classes.md`](astrological-classes.md)
  for the full per-sign delta table.
- **Soul Doors** — the Sefirot at the endpoints of the sign's "soul card"
  (the zodiacal Major Arcanum mapped to that sign) — reduce the
  Challenge DC by 2 when the player faces them. See
  [`design/soul-doors.md`](soul-doors.md) for the full per-class
  Door table.

Signs may not duplicate across players.

### 3. Starting hand

Pick the right deck count and shuffle, then deal **4 cards** to each
player. The remaining cards form the face-down draw pile.

| Players | Decks | Total cards | In hands | In draw pile |
|---|---|---|---|---|
| 2 | 1 | 22 | 8 | 14 |
| 3 | 2 | 44 | 12 | 32 |
| 4 | 2 | 44 | 16 | 28 |

Hand-size cap is **6**; starting at 4 leaves a 2-card buffer for early
gifts and draws before the cap starts to bite.

### 4. Starting state

- All player tokens at **Malkuth**.
- **Illumination = 0, Separation = 0.**
- All **Shell markers dormant**.
- First player is whoever rolled highest on their Malkuth (Body) stat.

---

## Drawing & gift handling

The hand-size cap is **6**.

### Drawing
- **Start-of-turn draw** replenishes hand toward the starting size of 4
  — but never above the cap of 6 (a player who has been gifted up to 6
  skips the draw entirely). The draw fires automatically at the
  beginning of every turn *except turn 1*: the initial deal of 4 cards
  during setup serves as turn 1's draw, so no extra cards are added on
  top. Drawing at the *start* of the turn (rather than the end) means
  each player evaluates their freshly-drawn cards in the same moment
  they decide what to play — the new card's evaluation moment and the
  player's decision moment are no longer split across a seat rotation.
- **Meditate** is an *additional* draw of 2 cards, available **at most
  once per turn**. Meditate draws even from a hand already at the cap.
  After Meditate, the player **may still Move** the same turn — the
  newly drawn cards are usable immediately. If, **at the moment the
  player tries to End the turn**, the hand is over the 6-card cap, the
  player must **discard down to 6** before the turn actually ends: the
  player picks which cards to shed (no forced random pick), and the
  discarded cards go face-up to the discard pile (eligible for Yesod-
  Spark recovery and the ordinary recycle). The cap check fires on
  end-turn (not on Meditate), so a player who Meditates over cap and
  then plays a Move card to drop back under the cap is **not prompted
  to discard** — they only see the prompt if they try to end while
  still over. Rationale: meditation must always succeed — without it
  a player with no usable paths and a full hand softlocks. The once-
  per-turn cap stops Meditate from strictly dominating Move.
- If the draw pile is empty when a card is needed, the discard pile is
  reshuffled face-down to become the new draw pile. The game runs as
  long as cards exist anywhere in the system.

### Gifts
- Gifts during your own turn are free in card cost — circulation is
  the point.
- Sparks extend *when* you can gift, not the cost itself.
- **Refusing a gift** raises **Separation +1**. Refusing kindness is
  the cardinal anti-cooperative act.
- **Receiving a gift while at the hand-size cap** forces a choice: the
  receiver may *refuse* (+1 Separation) or *immediately discard one
  card* from their hand to make room and accept the gift (no
  Separation cost; the discarded card goes face-up to the discard
  pile and is eligible for future Yesod Spark recovery / discard
  recycle).

---

## The Tree (board)

Ten nodes arranged in three vertical pillars. See `../reference/sefirot.md`
and `../reference/paths.md` for full detail. Key facts for play:

- From Malkuth, three paths lead up: to Yesod (The World), Hod (Judgement),
  Netzach (The Moon).
- From Tiferet (the heart), paths radiate in every direction.
- Only three paths reach Kether: from Chokmah (The Fool), Binah (The
  Magician), or Tiferet (The High Priestess). **At least one of these three
  cards must be in play at endgame** or the team cannot win.

---

## Turn structure

On your turn, in order:

1. **Draw.** Your hand refills toward the starting size of 4 (capped at
   6). This happens automatically at the start of every turn *except
   turn 1*, where the initial deal of 4 serves as your first draw. If
   the draw pile is empty when you'd draw, the discard pile is
   reshuffled face-down to form a new draw pile first.
2. **Move or Meditate.** Play an Arcanum to travel its path to an
   adjacent Sefirah, OR draw 2 extra cards (*Meditate*). Meditate may
   be taken **at most once per turn**, and after Meditate you may
   still play a card to Move that turn — the freshly drawn cards are
   usable immediately. Drawing stops at the hand-size cap of 6 unless
   Meditate pushes you over (in which case you trim down to 6 before
   end-of-turn).
3. **Challenge** (if you arrived at an uncleared Sefirah). See below.
4. **Assist** (optional). Spend Sparks to help allies.
5. **End turn.**

Malkuth has no challenge. Kether has the **Final Threshold** (collective,
endgame only).

---

## Stat checks (challenge resolution)

When you arrive at an uncleared Sefirah, you face its **Challenge**. Each
challenge names one stat and a Difficulty Class (DC).

| Sefirah | Stat | DC | Theme |
|---|---|---|---|
| Yesod | Intuition | 12 | See through illusion |
| Hod | Intellect | 12 | Solve / articulate |
| Netzach | Passion | 12 | Name what you desire |
| Tiferet | Harmony | 14 | Integrate shadow and light |
| Gevurah | Strength | 15 | Discard something precious |
| Chesed | Lovingkindness | 13 | Give without reserve |
| Binah | Understanding | 16 | Sit with loss |
| Chokmah | Insight | 16 | Act without thinking |
| Kether | (collective) | — | Narrate the journey home |

**Rolling:** `d20 + your relevant stat ≥ DC → pass.`

**Help is allowed.**
- **Ally assist:** Any other player standing at the same Sefirah may
  *assist*. Add ½ their same stat (round down) to your total.
- **Card burn:** Spend a Major Arcanum from your hand for a **+3 bonus**.
  (The card goes to discard; you cannot use it to travel.)
- **Spark spend:** Burn a previously-earned Spark for **+5** (Sparks are
  more potent than cards; use them sparingly).

**On success:** Mark the Sefirah cleared. You gain its **Spark**.
Illumination **+1**.

**On failure:** Choose one:
- *Burn a card for +3 and re-roll* (you can do this more than once; each
  card burn is cumulative).
- *Accept the setback.* Separation **+1**. You are pushed back one Sefirah
  along the path you just took. You may retry next turn.

---

## Sparks (earned lessons + one-use abilities)

Each cleared Sefirah grants its Spark to the player who cleared it. A Spark
is both a lore keepsake and a **one-use ability** tied to its Sefirah's gift.

| Spark | Ability (one use, any player's turn) |
|---|---|
| **Yesod** — Intuition | Look at the top 3 cards of the deck and reorder them. |
| **Hod** — Clarity | Name a card; if any player holds it, they reveal it. |
| **Netzach** — Courage | Re-roll any failed check, once. |
| **Tiferet** — Harmony | Resolve a challenge as if two allies were present. |
| **Gevurah** — Severance | Cancel one Shell effect or Separation trigger. |
| **Chesed** — Grace | Give any card to any player outside their normal turn. |
| **Binah** — Acceptance | Take +1 Illumination when another player fails a check. |
| **Chokmah** — Flash | Play a second card this turn at no cost. |
| **Kether** — Unity | All players immediately draw one card. |
| **Malkuth** — Grounding | Ignore one Separation increase this round. |

Sparks stay with the player who earned them until spent. They **do not
refresh** — once spent, gone for the game. Used sparks still count toward
Illumination permanently.

---

## Illumination vs. Separation

Two shared counters that track the team's moral weight. Both start at zero.

**Illumination rises** (+1 each):
- Clearing a Sefirah (earning a Spark)
- Gifting a card to another player
- Assisting a successful check (the assistant gets the +1, not the challenger)
- Perfect pillar alternation (see below)
- Spending a Spark to help the team

**Separation rises** (+1 each, unless noted):
- Accepted failed check
- Using a shortcut path (see below)
- Three consecutive moves on the same pillar
- Refusing a gift when offered
- **+2** each time a Shell activates

Separation does not decrease naturally. It can only be reduced by:
- Spending a **Gevurah Spark** (removes 1 Separation)

Illumination never decreases.

---

## Movement and the path network

To travel a path, play the Major Arcanum that *is* that path. The card goes
to the discard pile. You move to the adjacent Sefirah.

Paths are bidirectional — you may travel up or back down. Moving *downward*
voluntarily grants **+1 Illumination** (an act of humility) but costs the
same card.

See `../reference/paths.md` for the full network.

### Shortcuts — the Path of the Arrow

The central pillar offers a direct ascent:
`Malkuth → Yesod → Tiferet → Kether`
(three paths: **The World, Temperance, The High Priestess**.)

**Shortcut rules:**
- Only **3 cards** needed total.
- Challenges on these Sefirot are at **+3 DC** (they demand more).
- **Skipped Sefirot grant no Sparks.** A pure shortcut run collects only
  3 Sparks — often not enough to pass the Final Threshold.
- Failing a shortcut challenge: **+2 Separation** (not +1), and you drop
  back to the previous Sefirah.

The shortcut is a real option — sometimes the right one. But it bites.

### Pillar balance

Each move crosses (or stays within) one of the three pillars (Mercy,
Severity, Balance). See `../reference/paths.md` for each path's pillars.

- **3 consecutive moves on the same pillar** (any player, team-wide): +1
  Separation *(imbalance)*.
- **Perfect alternation across 3 moves** (Mercy → Severity → Mercy or vice
  versa, team-wide): +1 Illumination *(equilibrium)*.

The Balance pillar is neutral; it neither breaks nor builds the streak.

---

## Classes (astrological signs)

Twelve classes, one per zodiac sign. Each sign tilts the player's stat
sheet through planetary dignities and opens one or two Soul Doors on
the Tree. The full per-sign tables are kept out of this doc:

- **Dignity bonuses** — `design/astrological-classes.md` § 4 (per-sign
  stat-delta breakdown).
- **Soul Doors** — `design/soul-doors.md` § 3 (per-class Door table).

This section gives the player-facing summary; the design docs above
are authoritative for any tuning question.

### Dignity bonuses (stat-sheet tilt)

For each sign, four planetary dignities (rulership, exaltation,
detriment, fall) translate to per-stat deltas applied to the rolled
3d6 stats:

| Dignity     | Delta to the dignified planet's stat |
|-------------|--------------------------------------|
| Rulership   | **+1**                               |
| Exaltation  | **+2**                               |
| Detriment   | **−1**                               |
| Fall        | **−2**                               |

Modern co-rulerships (Pluto for Scorpio, Neptune for Pisces) count as
additional rulerships at **+1**. Earth (Malkuth) has no zodiacal
dignities, so the **body** stat is class-neutral.

Multiple dignities for the same planet stack additively. Two anomalies
preserved from the classical tradition: **Virgo** has Mercury both as
ruler AND exaltation → cumulative **+3** to intellect. **Pisces** has
Mercury as both detriment AND fall → cumulative **−3** to intellect.

The clamp is applied to the *combined* result, not each bonus
individually: a 17 rolled stat gaining +3 ends at **18**, not 20.

### Soul Doors (challenge-side advantage)

Each class has a **soul card** — the zodiacal Major Arcanum mapped to
its sign (the 12 "Simples" of the Hebrew alphabet). The Sefirot at the
endpoints of that card's path are the class's **Soul Doors** — one or
two, see below. When a player faces the Challenge at one of their
Doors, the effective DC is reduced by **2**.

11 of the 12 classes have two Doors. **Pisces is structurally unique**:
its soul card (The Moon, path 29) connects Netzach ↔ Malkuth, and
Malkuth has no Challenge — so Pisces has only one Door (Netzach).

The Door reduction stacks additively with the central-pillar **shortcut
penalty** (+3 DC). A Sagittarius arriving at Yesod via the shortcut
faces `12 + 3 − 2 = 13`. The Door softens the shortcut tax but does
not erase it.

Door reduction also stacks with card-burn (+3 to roll), Spark spend
(+5 to roll), and ally assist (+½ ally stat to roll) — those operate
on the roll side; the Door operates on the DC side.

The challenge UI surfaces the Door explicitly:

> Soul Door open here: DC `X` → `X−2`

When a shortcut also applies, the breakdown is appended:

> Soul Door open here: DC 12 → 13 (shortcut +3, Door −2)

### Sign uniqueness

Signs may not duplicate across players. The picker shows already-taken
signs as disabled. The lobby's Begin button is gated until every
player has a distinct sign.

---

## Winning and losing

### Win condition

**All players at Kether** *and* **Illumination ≥ Separation + 5** *and*
**the Final Threshold passes.**

<!-- code-ref: engine/endgame.ts:REQUIRED_ILLUMINATION_MARGIN -->

### Final Threshold (at Kether)

The collective challenge.

- All players must be at Kether.
- Each player plays their remaining cards one at a time, in any order.
- As each card is played, the player speaks one sentence about how that
  card describes their journey or what they've learned.
- The team **wins** when all cards are played AND Illumination exceeds
  Separation by the required margin.
- If Illumination doesn't exceed Separation by the margin when cards run
  out, the team must spend Sparks (1 Spark = +1 Illumination) to close the
  gap. No Sparks left? The Tree dims — see loss below.

This is intentionally narrative, not mechanical. The mechanical check is
the Illumination threshold; the storytelling is the game's heart.

### Loss conditions

- **Separation reaches 15.** The Tree destabilizes. All players descend to
  Malkuth and the game ends.

  <!-- code-ref: engine/endgame.ts:SEPARATION_LOSS_THRESHOLD -->
- **Deck and hands exhausted with no path to Kether.** The team is stranded.
- **Final Threshold fails** (Illumination gap can't be closed).

Losses are not elimination — they are invitations to restart with what was
learned. (The narrative frame of Kabbalistic return: *gilgul*, another
turn on the wheel.)

---

## Game length and pacing

- **Standard game:** ~45–60 minutes. ~8–12 turns per player.
- **Quick variant:** Start at Tiferet (skip lower Tree), 20–30 minutes.
- **Campaign:** Play 10 sessions, one per Sefirah, carrying stats and
  Sparks forward. Not required.

---

## Variants

- **Descent Timer.** Add a shared count-down starting at 12. Each full
  round decrements by 1. If it reaches 0, the Tree dims. Adds urgency.
- **Veil of the Two.** Deal 2 fewer cards; keep them face-down as "the
  Veil." Hod's Spark and certain abilities can peek. Makes card scarcity
  bite.
- **Competitive.** First player to Kether alone wins, but total Separation
  determines whether the ascent "counts." A lone arrival with high
  Separation loses the cosmic tally.

---

## Design notes (for implementers / playtesters)

Things this doc intentionally leaves open:

- **Exact challenge content** (narrative text, reflection prompts) lives in
  separate content files once written. The *mechanics* above are fixed;
  the *flavor* can evolve.
- **Physical vs digital enforcement.** Rules like the +1 Separation cost
  for refusing a gift are easy for software to enforce, harder for
  tabletop. A tabletop version should either trust players or introduce
  a simple token to mark enforcement. Flagged:
  - [DIGITAL-EASY] Card visibility tiers (hands public at upper Tree)
  - [DIGITAL-EASY] Automatic Shell activation at Separation thresholds
  - [TABLETOP-HANDLED] Gift refusal/acceptance (use a token)
  - [TABLETOP-HANDLED] Perfect alternation tracking (use a pillar chip)
- **Player count scaling.** Balanced at 3–4. 2-player is harder (fewer
  allies); 5+ risks cluttered turn order — consider splitting into teams.

The rest is fair game for playtesting.
