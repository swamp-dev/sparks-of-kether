<!-- code-ref: data/sefirot.ts:sefirot -->
<!-- code-ref: data/types.ts:SefirahKey -->

# Astrological Classes — Design (Epic #212)

Replaces the six **Soul Aspects** (`data/soul-aspects.ts`) with **12 zodiac-sign classes**. Each class confers stat bonuses derived from **planetary dignities** — the same astrological logic the rest of the project's symbolic frame already uses (see `reference/correspondences.md` § 2 for the existing zodiac↔letter↔path mapping).

This system uses the **classical Ptolemaic dignities** (rulership, exaltation, detriment, fall) for the 7 traditional planets, plus **modern co-rulerships** for Pluto (Scorpio) and Neptune (Pisces). Modern exaltations are intentionally not used — they have no canonical agreement.

This document is the keystone for Epic #212. Sub-tickets 2-9 read from this file. The decisions in § 6 are locked.

---

## 1. Stack

```
Zodiac sign  →  has 4 dignity slots  →  each slot names a planet
Planet       →  one-to-one Sefirah   →  one-to-one stat
Dignity      →  signed magnitude     →  stat bonus / penalty
```

The planet ↔ Sefirah ↔ stat chain is already wired in `data/sefirot.ts`:

| Planet  | Sefirah  | Stat            | Used in dignities? |
|---------|----------|-----------------|--------------------|
| Pluto   | Kether   | unity           | Yes — modern co-ruler of Scorpio |
| Neptune | Chokmah  | insight         | Yes — modern co-ruler of Pisces |
| Saturn  | Binah    | understanding   | Yes — classical |
| Jupiter | Chesed   | lovingkindness  | Yes — classical |
| Mars    | Gevurah  | strength        | Yes — classical |
| Sun     | Tiferet  | harmony         | Yes — classical |
| Venus   | Netzach  | passion         | Yes — classical |
| Mercury | Hod      | intellect       | Yes — classical |
| Moon    | Yesod    | intuition       | Yes — classical |
| Earth   | Malkuth  | body            | **No — never dignified** |

Pluto (Kether) and Neptune (Chokmah) — already attributed in `data/sefirot.ts` (`sefirot[0]` and `sefirot[1]` respectively) — are activated as modern co-rulers of Scorpio and Pisces. Earth (Malkuth) has no classical or modern zodiacal dignities, so the **body** stat is permanently class-neutral; players roll it via 3d6 during the Blessing Ritual without modification.

Uranus is not modelled. The traditional Hermetic-Qabalah home for Uranus is **Daath**, the "hidden" non-Sefirah, which the game doesn't represent. Adding Uranus would require either reshuffling Pluto/Neptune off Kether/Chokmah or modelling Daath — both costlier than the +1 to one extra sign would justify.

---

## 2. Dignity → bonus formula

| Dignity     | Bonus to the dignified planet's stat |
|-------------|--------------------------------------|
| Rulership   | **+1**                               |
| Exaltation  | **+2**                               |
| Detriment   | **−1**                               |
| Fall        | **−2**                               |

The bonus is applied **after the 3d6 Blessing Ritual roll**, capped to 1–18 (floor / ceiling per D5).

A sign's per-stat bonuses are summed across its dignity slots. Most signs touch four planets (one per dignity) producing four stat changes. Some classical signs have empty exaltation or fall slots (see § 4); those are simply +0.

---

## 3. Dignity table

Rulerships, exaltations, detriments, and falls per Ptolemy and the broader classical Western tradition, plus modern Pluto/Neptune co-rulerships. Modern exaltations are not used.

When a sign has both a classical ruler and a modern co-ruler, **both grant +1** to their respective stats — the sign is doubly-ruled in the modern reading and the bonus reflects that.

| Sign         | Ruler   | Co-Ruler (modern) | Exaltation | Detriment | Fall    |
|--------------|---------|-------------------|------------|-----------|---------|
| Aries        | Mars    |                   | Sun        | Venus     | Saturn  |
| Taurus       | Venus   |                   | Moon       | Mars      | —       |
| Gemini       | Mercury |                   | —          | Jupiter   | —       |
| Cancer       | Moon    |                   | Jupiter    | Saturn    | Mars    |
| Leo          | Sun     |                   | —          | Saturn    | —       |
| Virgo        | Mercury |                   | Mercury    | Jupiter   | Venus   |
| Libra        | Venus   |                   | Saturn     | Mars      | Sun     |
| Scorpio      | Mars    | **Pluto**         | —          | Venus     | Moon    |
| Sagittarius  | Jupiter |                   | —          | Mercury   | —       |
| Capricorn    | Saturn  |                   | Mars       | Moon      | Jupiter |
| Aquarius     | Saturn  |                   | —          | Sun       | —       |
| Pisces       | Jupiter | **Neptune**       | Venus      | Mercury   | Mercury |

**Notes on the table:**

- **Detriment** is always the planet that rules the *opposite* sign (Mars rules Aries; Venus rules Libra opposite Aries → Venus is in detriment in Aries).
- **Fall** is always the planet exalted in the opposite sign (Sun exalted in Aries; Saturn exalted in Libra → Saturn falls in Aries).
- **Virgo's Mercury** is the classical anomaly: Mercury both rules and is exalted in Virgo. Cumulative bonus +3 to `intellect` for a Virgo class.
- **Pisces' Mercury** is the matching "double affliction": Mercury is both detriment and fall in Pisces. Cumulative −3 to `intellect` for a Pisces class.
- Four signs have empty exaltation+fall slots in the classical tradition (Gemini, Leo, Sagittarius, Aquarius). These are the "thin" classes — only ruler+detriment, **two** total stat changes per sign.
- **Pluto and Neptune appear only as co-rulers** — no detriments or falls — so they are individually unbalanced (each grants exactly +1 to one sign and is unaffected elsewhere). The population-level bias on `unity` and `insight` is +1/12 ≈ +0.08 across random class picks; small enough to read as flavor rather than imbalance.

---

## 4. Per-sign stat deltas (full breakdown)

Each row computes the sign's net effect on every game stat. Stats with no entry default to **+0** (the engine helper in sub-ticket 4 must not throw on a missing key — return `0` for absent stats).

| Class       | unity (Pluto) | insight (Neptune) | understanding (Saturn) | lovingkindness (Jupiter) | strength (Mars) | harmony (Sun) | passion (Venus) | intellect (Mercury) | intuition (Moon) | body (Earth) | Net |
|-------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Aries       |     |     | −2  |     | +1  | +2  | −1  |     |     |     |  0  |
| Taurus      |     |     |     |     | −1  |     | +1  |     | +2  |     | +2  |
| Gemini      |     |     |     | −1  |     |     |     | +1  |     |     |  0  |
| Cancer      |     |     | −1  | +2  | −2  |     |     |     | +1  |     |  0  |
| Leo         |     |     | −1  |     |     | +1  |     |     |     |     |  0  |
| Virgo       |     |     |     | −1  |     |     | −2  | +3  |     |     |  0  |
| Libra       |     |     | +2  |     | −1  | −2  | +1  |     |     |     |  0  |
| Scorpio     | +1  |     |     |     | +1  |     | −1  |     | −2  |     | −1  |
| Sagittarius |     |     |     | +1  |     |     |     | −1  |     |     |  0  |
| Capricorn   |     |     | +1  | −2  | +2  |     |     |     | −1  |     |  0  |
| Aquarius    |     |     | +1  |     |     | −1  |     |     |     |     |  0  |
| Pisces      |     | +1  |     | +1  |     |     | +2  | −3  |     |     | +1  |

**Sum of bonuses across all 12 signs (per planet/stat):**

- Pluto / unity: **+1** (Scorpio only; modern co-rulership has no detriment/fall pair)
- Neptune / insight: **+1** (Pisces only; same)
- Saturn / understanding: 0 — balanced
- Jupiter / lovingkindness: 0 — balanced
- Mars / strength: 0 — balanced
- Sun / harmony: 0 — balanced
- Venus / passion: 0 — balanced
- Mercury / intellect: 0 — balanced
- Moon / intuition: 0 — balanced
- Earth / body: 0 — never touched (Earth has no zodiacal dignities)

**Per-sign net imbalance:**

- 9 signs are net-zero across stats they touch.
- **Taurus +2**, **Scorpio −1**, **Pisces +1**.
- Pre-modern, Scorpio was −2 and Pisces was 0 (with Mercury at −3); the Pluto and Neptune co-rulerships soften both. Taurus's +2 has no counterweight in the classical or modern tables.

---

## 5. Per-sign sketches (for the picker UI)

Sub-ticket 6 (the picker UI) renders each sign with a glyph, name, ruler, and a one-line flavor. These flavor lines are illustrative; sub-ticket 6 owns the final copy. Listed here so the design doc and the picker share one source of truth on which planet leads each class. "Lead bonus" highlights only the positive bonuses; the picker UI surfaces the full table from § 4.

| Sign        | Glyph | Element | Modality   | Ruler   | Co-ruler | Lead bonus            |
|-------------|:-----:|---------|------------|---------|----------|-----------------------|
| Aries       | ♈     | Fire    | Cardinal   | Mars    |          | +1 strength, +2 harmony |
| Taurus      | ♉     | Earth   | Fixed      | Venus   |          | +1 passion, +2 intuition |
| Gemini      | ♊     | Air     | Mutable    | Mercury |          | +1 intellect          |
| Cancer      | ♋     | Water   | Cardinal   | Moon    |          | +1 intuition, +2 lovingkindness |
| Leo         | ♌     | Fire    | Fixed      | Sun     |          | +1 harmony            |
| Virgo       | ♍     | Earth   | Mutable    | Mercury |          | +3 intellect          |
| Libra       | ♎     | Air     | Cardinal   | Venus   |          | +1 passion, +2 understanding |
| Scorpio     | ♏     | Water   | Fixed      | Mars    | Pluto    | +1 strength, +1 unity |
| Sagittarius | ♐     | Fire    | Mutable    | Jupiter |          | +1 lovingkindness     |
| Capricorn   | ♑     | Earth   | Cardinal   | Saturn  |          | +1 understanding, +2 strength |
| Aquarius    | ♒     | Air     | Fixed      | Saturn  |          | +1 understanding      |
| Pisces      | ♓     | Water   | Mutable    | Jupiter | Neptune  | +1 lovingkindness, +1 insight, +2 passion |

---

## 6. Design decisions (locked)

Resolved by user. Sub-tickets 2-9 build against these answers; reopen this section only if a downstream ticket surfaces a real conflict.

### D1. The four "thin" classes — **ACCEPT asymmetry**

Gemini, Leo, Sagittarius, and Aquarius have only +1 ruler and −1 detriment — two stat changes vs. four for richer signs.

**Decision:** Keep the asymmetry. Thin classes are flavor-faithful (the classical tradition simply doesn't assign exaltations to those signs) and give players a "focused vs. versatile" choice. A first-time player can pick a thin sign and not feel overwhelmed by stat math.

### D2. Earth / Malkuth never gets a class bonus — **ACCEPT, body is baseline**

Earth has no zodiacal dignities in classical or modern systems.

**Decision:** Body is the universal-baseline stat, class-neutral. Conceptually consistent: Earth/Malkuth is the manifest plane every sign shares; class choice (sign-specific energy) doesn't tilt it. Players still roll 3d6 for body normally during the Blessing Ritual.

### D3. Pisces' double-Mercury and Virgo's double-Mercury — **KEEP**

Pisces takes a cumulative −3 to intellect (Mercury detriment + Mercury fall, both classical). Virgo gets a cumulative +3 to intellect (Mercury rulership + Mercury exaltation, both classical).

**Decision:** Keep both. The asymmetry is flavor-load-bearing — Pisces is the dreamer-not-thinker, Virgo is the analyst. Both are the largest single-stat extremes in the table, intentional spike points.

### D4. Net-non-zero signs — **ACCEPT, +1/−1/+2 are flavor**

After modern co-rulerships are folded in: Taurus +2, Scorpio −1, Pisces +1. Nine signs are net-zero.

**Decision:** Accept. Taurus is the "lush/easy" class, Scorpio is the "underworld/hard" class (fitting a Sefirot-banishment game's downtrack flavor), Pisces is "softly dreaming positive." The ranges fit well within the 3d6 rolling variance (σ ≈ 3.0 for a single roll), so they're tilts, not determinative.

### D5. Bonus application — **ADDITIVE, capped 1–18**

**Decision:** Sign bonus is applied additively to the rolled 3d6 stat at game start, capped to a floor of 1 and ceiling of 18 (matching 3d6's natural range). A Virgo player who rolls 16 for intellect ends at 18 (the cap absorbed +1 of the +3); a Pisces player who rolls 4 for intellect ends at 1 (floor absorbed −2 of the −3).

### D6. Modern co-rulerships — **USE Pluto and Neptune; do NOT add Uranus**

**Decision:** Activate Pluto (Kether) as Scorpio co-ruler, Neptune (Chokmah) as Pisces co-ruler. Both grant +1 alongside the classical ruler (so Scorpio has +1 strength AND +1 unity from rulership). Leave Uranus unmodelled — its traditional Hermetic home (Daath) isn't represented in `data/sefirot.ts` and adding it would require either reshuffling Pluto/Neptune or modelling Daath, neither worth the +1 to one extra sign.

Modern exaltations are intentionally not used — they have no canonical agreement and inventing them is house-rule territory.

---

## 7. Sub-tickets fanned out from this doc

For Epic #212. Listed here so reviewers can sanity-check that this doc covers what each downstream ticket needs.

1. **docs** ← *this doc*. Locks the formula, the dignity table, the open questions.
2. **chore (data)** — `data/zodiac-signs.ts` + `data/dignities.ts` + new types in `data/types.ts`. Reads from § 3 and § 5. **Required type changes:** extend the `Planet` union in `data/types.ts` to include `'pluto'` and `'neptune'` (currently it covers only the 7 classical planets and will reject Pluto/Neptune dignity entries until widened). Add new `ZodiacSign`, `ZodiacSignKey`, and `Dignity` types as needed.
3. **chore (reference)** — extend `reference/correspondences.md` with the dignity table from § 3.
4. **feature (engine)** — `engine/zodiac-bonus.ts` pure function. Reads from § 2 and § 6 D5 (additive, capped 1–18).
5. **feature (engine)** — integrate the bonus into `engine/setup.ts:initializeGame`. Folds into the existing StatSheet at game start.
6. **feature (UI)** — replace `components/setup/SoulAspectPicker.tsx` with `ZodiacSignPicker.tsx`. Uses § 5 for the per-sign metadata.
7. **feature (orchestration)** — wire the picker into `app/play/page.tsx`'s setup pipeline (replace the `aspect` phase with a `sign` phase).
8. **chore (cleanup)** — remove `data/soul-aspects.ts`, `SoulAspectPicker.tsx`, AND the `SoulAspect` interface + `SoulAspectKey` type in `data/types.ts`, AND all import sites referencing them.
9. **docs** — rewrite `design/mechanics.md` § "Soul Aspects (classes)" → § "Classes (astrological signs)".

---

## 8. References

- `data/sefirot.ts` — planet ↔ Sefirah ↔ stat (already wired)
- `reference/correspondences.md` § 1 — Sefirot → planet mapping (line ~6)
- `reference/correspondences.md` § 2 — zodiac → Hebrew letter → path (line ~24)
- `data/soul-aspects.ts` — the system being replaced
- `design/mechanics.md` § "Soul Aspects (classes)" — current copy that will be rewritten in sub-ticket 9

---

## 9. Status

**LOCKED.** All six design decisions (§ 6) resolved. Sub-ticket 2 (data layer) unblocked.
