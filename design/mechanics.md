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
| Major Arcana deck | 22 cards | One card per path; each is also a path-key |
| Player tokens | 1 per player | Current position on the Tree |
| Stat sheet | 1 per player | 10 stats (one per Sefirah) + Soul Aspect |
| Spark tokens | 10 types | One per Sefirah; earned and spent |
| Illumination tracker | 1 shared | Counter, 0–∞ |
| Separation tracker | 1 shared | Counter, 0–∞ |
| Shell markers | 10 | One per Sefirah, dormant/active |
| d20 | 1 | Stat-check rolls |

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

### 2. Soul Aspect (class)

Each player then chooses (or is dealt) one of six **Soul Aspects**, their
"class." This grants:
- A **+2 stat bonus** to that Sefirah's stat
- A **signature ability** (see *Soul Aspects* below)

Soul Aspects may not duplicate across players.

### 3. Starting hand

Shuffle the 22 Major Arcana. Deal:
- **2 players:** 7 cards each (8 in draw pile)
- **3 players:** 5 cards each (7 in draw pile)
- **4 players:** 4 cards each (6 in draw pile)

### 4. Starting state

- All player tokens at **Malkuth**.
- **Illumination = 0, Separation = 0.**
- All **Shell markers dormant**.
- First player is whoever rolled highest on their Malkuth (Body) stat.

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

1. **Move or Meditate.** Either play an Arcanum to travel its path to an
   adjacent Sefirah, OR skip movement to draw 2 cards (*Meditate*).
2. **Challenge** (if you arrived at an uncleared Sefirah). See below.
3. **Assist** (optional). Use Soul Aspect gifting abilities or spend Sparks.
4. **Draw** (if below starting hand size).

Malkuth has no challenge. Kether has the **Final Threshold** (collective,
endgame only).

---

## Stat checks (challenge resolution)

When you arrive at an uncleared Sefirah, you face its **Challenge**. Each
challenge names one stat and a Difficulty Class (DC).

| Sefirah | Stat | DC | Theme |
|---|---|---|---|
| Yesod | Intuition | 10 | See through illusion |
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
- Certain Soul Aspect abilities (see below)

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

## Soul Aspects (classes)

Six classes, each tied to one Sefirah. Drawn from the six "personality
Sefirot" — not Kether/Chokmah/Binah (too elevated) or Malkuth (the starting
ground).

### Chesed — The Giver
- **+2 Lovingkindness.**
- *Overflow:* Once per round, gift any card to any player for free.
- *Weakness:* You cannot refuse gifts.

### Gevurah — The Boundary-Keeper
- **+2 Strength.**
- *Discipline:* Once per game, pass one challenge without rolling. Describe
  what you're sacrificing internally.
- *Weakness:* You cannot initiate gifts — only accept requests.

### Tiferet — The Heart
- **+2 Harmony.**
- *Bridge:* Once per round, let two other players combine their cards as if
  one hand for a single action (assist, gift-chain, challenge).
- *Weakness:* You cannot advance while any player is trapped below.

### Hod — The Mind
- **+2 Intellect.**
- *Insight:* Before any challenge at your Sefirah, read the next round's
  challenge DC aloud.
- *Weakness:* You must announce your strategy before acting.

### Netzach — The Feeler
- **+2 Passion.**
- *Persistence:* Once per game, retry a failed check without burning a card.
- *Weakness:* You may not Meditate; you must always Move.

### Yesod — The Dreamer
- **+2 Intuition.**
- *Recycle:* Once per round, retrieve one card from the discard pile.
- *Weakness:* You start one Sefirah *below* Malkuth (narrative: still in the
  dream of Malkuth). First turn must be to ascend into Malkuth proper.

---

## Winning and losing

### Win condition

**All players at Kether** *and* **Illumination ≥ Separation + 5** *and*
**the Final Threshold passes.**

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
- **Physical vs digital enforcement.** Rules like "you cannot refuse gifts"
  (Chesed weakness) are easy for software to enforce, harder for tabletop.
  A tabletop version should either trust players or introduce a simple
  token to mark enforcement. Flagged:
  - [DIGITAL-EASY] Card visibility tiers (hands public at upper Tree)
  - [DIGITAL-EASY] Automatic Shell activation at Separation thresholds
  - [TABLETOP-HANDLED] Gift refusal/acceptance (use a token)
  - [TABLETOP-HANDLED] Perfect alternation tracking (use a pillar chip)
- **Player count scaling.** Balanced at 3–4. 2-player is harder (fewer
  allies); 5+ risks cluttered turn order — consider splitting into teams.

The rest is fair game for playtesting.
