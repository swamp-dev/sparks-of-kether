# The Ten Sefirot

The ten nodes of the Tree of Life. Each is a mode of divine energy, a
waypoint on the ascent, and (in-game) a stat, a challenge, and a Shell.

<!-- code-ref: data/sefirot.ts -->
<!-- code-ref: data/types.ts:SefirahKey -->

## Master table

| # | Hebrew | English | Pillar | Planet | Color | Body | Quality |
|---|---|---|---|---|---|---|---|
| 1 | Kether (כתר) | Crown | Balance | Pluto / First Swirlings | White brilliance | Crown of head | Unity, source, pure being |
| 2 | Chokmah (חכמה) | Wisdom | Mercy (R) | Neptune / Zodiac | Gray / iridescent | Left side of face | Raw creative flash, first impulse |
| 3 | Binah (בינה) | Understanding | Severity (L) | Saturn | Black | Right side of face | Form, structure, sorrow, the cosmic mother |
| 4 | Chesed (חסד) | Mercy / Lovingkindness | Mercy (R) | Jupiter | Blue | Left arm | Love, abundance, overflow, generosity |
| 5 | Gevurah (גבורה) | Severity / Strength | Severity (L) | Mars | Red | Right arm | Discipline, judgment, boundaries, sacred No |
| 6 | Tiferet (תפארת) | Beauty | Balance | Sun | Gold / yellow | Heart | Harmony, balance, compassion, the self |
| 7 | Netzach (נצח) | Victory | Mercy (R) | Venus | Green | Left hip / leg | Passion, desire, art, nature, endurance |
| 8 | Hod (הוד) | Splendor | Severity (L) | Mercury | Orange | Right hip / leg | Intellect, language, logic, precision |
| 9 | Yesod (יסוד) | Foundation | Balance | Moon | Violet | Generative organs | Dreams, subconscious, intuition, cycles |
| 10 | Malkuth (מלכות) | Kingdom | Balance | Earth | Russet, olive, citrine, black | Feet | Manifestation, body, material world |

## Game blocks

### 1. Kether — The Crown
*"Before separation there is only this."*
- **Game role:** Final destination. The collective Final Threshold is here.
- **Stat generated:** Unity (factors into every cooperative assist).
- **Shell:** *Fragmentation* — team information splits; private hands again.

### 2. Chokmah — Wisdom
*"The flash before thought."*
- **Game role:** Upper-right gate. Challenges reward spontaneity.
- **Stat generated:** Insight (first-instinct checks).
- **Shell:** *Paralysis* — no instinctive actions allowed this round.

### 3. Binah — Understanding
*"Form is limitation, and limitation is sorrow."*
- **Game role:** Upper-left gate. Challenges reward accepted loss.
- **Stat generated:** Understanding (lore and reflection checks).
- **Shell:** *Despair* — reflection-based Sparks produce no effect.

### 4. Chesed — Mercy
*"What you pour out returns sevenfold."*
- **Game role:** Generosity sphere. Its challenge can never fail — only unfold.
- **Stat generated:** Lovingkindness (used when giving or assisting).
- **Shell:** *Hoarding* — no cards may be gifted for one full round.

### 5. Gevurah — Severity
*"I say no so that yes means something."*
- **Game role:** Sacrifice sphere. Discard to pass.
- **Stat generated:** Strength (boundary and willpower checks).
- **Shell:** *Cruelty* — every player loses 1 point of Strength until banished.

### 6. Tiferet — Beauty
*"Know yourself, and you know the All."*
- **Game role:** Center of the Tree; every pillar crosses here. Integration challenges.
- **Stat generated:** Harmony (coordination and assist bonuses).
- **Shell:** *Vanity* — the Tiferet Soul Aspect ability is disabled.

### 7. Netzach — Victory
*"The heart knows the way."*
- **Game role:** Lower-right gate. Emotion / desire challenges.
- **Stat generated:** Passion (instinctive and artistic checks).
- **Shell:** *Obsession* — cards played on desire-themed paths have no effect.

### 8. Hod — Splendor
*"Words are spells."*
- **Game role:** Lower-left gate. Logic / language challenges.
- **Stat generated:** Intellect (analysis, sequencing, word puzzles).
- **Shell:** *Deception* — the top card of the deck is misreported.

### 9. Yesod — Foundation
*"Nothing is solid here."*
- **Game role:** First gate above Malkuth. Intuition / illusion challenges.
- **Stat generated:** Intuition (perception and dream checks).
- **Shell:** *Illusion* — one path's description is a lie until banished.

### 10. Malkuth — Kingdom
*"Here the journey begins, or ends."*
- **Game role:** Starting point. No challenge; setting of intention only.
- **Stat generated:** Body (physical grounding; resists Separation effects).
- **Shell:** *Inertia* — movement costs an extra card this round.

## Three pillars

| Pillar | Side | Quality | Sefirot |
|---|---|---|---|
| **Mercy** | Right | Active, expansive, giving | Chokmah, Chesed, Netzach |
| **Severity** | Left | Receptive, form-giving, limiting | Binah, Gevurah, Hod |
| **Balance** | Center | Integrative, conscious | Kether, Tiferet, Yesod, Malkuth |

The ascent zigzags between pillars. Too long on one pillar creates
Imbalance (see `../design/mechanics.md`).
