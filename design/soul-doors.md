<!-- code-ref: data/sefirot.ts:sefirot -->
<!-- code-ref: data/types.ts:SefirahKey -->
<!-- code-ref: engine/checks.ts:rollCheck -->

# Soul Doors — Design (Epic #240)

Adds a per-challenge **advantage layer** on top of the dignity-bonus stat tilt locked in [`design/astrological-classes.md`](astrological-classes.md) (Epic #212). Each class has one or two **Soul Doors** — the Sefirot at the endpoints of its soul card's path. When a player attempts the Challenge at one of their Doors, the effective DC is reduced by **2**.

This system reads from existing data: the zodiac → Hebrew letter → path mapping (`reference/correspondences.md` § 2 and § 3) already names which Major Arcanum is each sign's "soul card" via the **12 Simples** (Tarot trumps that bear a zodiacal attribution). The Door Sefirot are simply that path's endpoints in `reference/paths.md`.

This document is the keystone for Epic #240. Sub-tickets T2–T5 read from this file. The decisions in § 7 are locked.

---

## 1. Stack

```
Class           →  one zodiac sign
  Sign          →  one "Simples" Major Arcanum (the soul card)
    Soul card   →  one path on the Tree (path number 15–29 from the 12 Simples)
      Path      →  two endpoint Sefirot
        Door(s) →  the Sefirah(s) that grant DC −2 to this class's Challenge
```

The class ↔ sign chain is locked in #212. The sign ↔ soul card chain is the **12 Simples** of the Hebrew alphabet — the 12 zodiacal letters that carry one Major Arcanum each (see `reference/correspondences.md` § 2 — *Mothers, Doubles, Simples*; and § 3 for the Tarot column). The soul card ↔ path chain is one-to-one by definition (each Major *is* one path; cf. `reference/arcana.md`). The path ↔ endpoints chain is the path network (`reference/paths.md`).

Every step is already in `reference/`. Soul Doors invents no new symbology — it picks two existing keys (the player's class and a Sefirah) and asks one question: *does this Sefirah lie on the path of this class's soul card?* If yes, the Door is open.

Eleven of the twelve classes have a soul card whose path connects two challenge-bearing Sefirot — so they get **two** Doors. The twelfth, **Pisces**, takes path 29 (Netzach ↔ Malkuth); Malkuth has no challenge, so Pisces has only **one** Door (Netzach). See § 4.

---

## 2. The DC delta and how it composes

A class has a fixed, lifelong set of Soul Doors. When that class attempts the Challenge at one of those Sefirot:

```
effectiveDC := baseDC + SOUL_DOOR_DC_DELTA   (when the Sefirah is one of the player's Doors)
            := baseDC                         (otherwise)

SOUL_DOOR_DC_DELTA = -2
```

This delta is **independent** of every other modifier in `engine/checks.ts:rollCheck` and **stacks with all of them** without exception (D2):

| Modifier | Magnitude | Side of the equation |
|---|---|---|
| Card burn | **+3** to the total | Per-attempt resource spend |
| Spark spend | **+5** to the total | Per-attempt resource spend |
| Ally assist | **+½ ally stat** (floored) to the total | Per-attempt social spend |
| Shortcut DC penalty | **+3** to the DC | Geographic (central pillar) |
| **Soul Door** | **−2** to the DC | Class-passive |

Why DC-side rather than total-side: the Door is a *passive* — it lowers the bar the player must clear, regardless of which numerical levers (card, Spark, assist) they choose to pull. Putting the delta on the DC keeps the breakdown in `CheckOutcome.modifierBreakdown` clean (it stays a roll-side ledger) and makes the central-pillar shortcut and Soul-Door mechanics symmetric: both shift `effectiveDC`, in opposite directions.

**Edge case: shortcut + Door overlap.** Tiferet sits on the central pillar (shortcut +3 DC) and is also a Door for seven of the twelve classes. If both apply they compose additively: a Sagittarius arriving at Tiferet via the central pillar shortcut faces `baseDC + 3 − 2 = baseDC + 1`. The Door softens the shortcut tax but does not erase it — intentional; the shortcut is supposed to bite.

**Magnitude rationale (D1).** −2 matches the +2 magnitude of an exaltation in #212's dignity table, keeping the two layers commensurate. A class's *signature* contribution to a Sefirah is "+2 to the relevant stat" (exaltation) or "DC −2 here" (Door); both move the success probability of the d20+stat check by roughly the same amount, so neither layer dominates the other.

---

## 3. Per-class Door table

The 12 classes, the soul card each one bears, the path that card *is*, and the Door Sefirah(s) at that path's endpoints. Sourced from the Simples rows of `reference/correspondences.md` § 3 cross-checked against the path endpoints in `reference/paths.md`.

| Class       | Soul Card     | Path                         | Door Sefirah(s)                    |
|-------------|---------------|------------------------------|------------------------------------|
| Aries       | The Emperor   | 15: Chokmah ↔ Tiferet        | Chokmah, Tiferet                   |
| Taurus      | The Hierophant| 16: Chokmah ↔ Chesed         | Chokmah, Chesed                    |
| Gemini      | The Lovers    | 17: Binah ↔ Tiferet          | Binah, Tiferet                     |
| Cancer      | The Chariot   | 18: Binah ↔ Gevurah          | Binah, Gevurah                     |
| Leo         | Strength      | 19: Chesed ↔ Gevurah         | Chesed, Gevurah                    |
| Virgo       | The Hermit    | 20: Chesed ↔ Tiferet         | Chesed, Tiferet                    |
| Libra       | Justice       | 22: Gevurah ↔ Tiferet        | Gevurah, Tiferet                   |
| Scorpio     | Death         | 24: Tiferet ↔ Netzach        | Tiferet, Netzach                   |
| Sagittarius | Temperance    | 25: Tiferet ↔ Yesod          | Tiferet, Yesod                     |
| Capricorn   | The Devil     | 26: Tiferet ↔ Hod            | Tiferet, Hod                       |
| Aquarius    | The Star      | 28: Netzach ↔ Yesod          | Netzach, Yesod                     |
| Pisces      | The Moon      | 29: Netzach ↔ Malkuth        | Netzach *(Malkuth has no challenge)* |

**Door distribution across the Tree (challenge-bearing Sefirot only):**

| Sefirah  | Classes with this Door                                                                  | Count |
|----------|------------------------------------------------------------------------------------------|------:|
| Chokmah  | Aries, Taurus                                                                            | 2     |
| Binah    | Gemini, Cancer                                                                           | 2     |
| Chesed   | Taurus, Leo, Virgo                                                                       | 3     |
| Gevurah  | Cancer, Leo, Libra                                                                       | 3     |
| Tiferet  | Aries, Gemini, Virgo, Libra, Scorpio, Sagittarius, Capricorn                             | **7** |
| Netzach  | Scorpio, Aquarius, Pisces                                                                | 3     |
| Hod      | Capricorn                                                                                | 1     |
| Yesod    | Sagittarius, Aquarius                                                                    | 2     |

Tiferet is the heart of the Tree and the endpoint of more paths than any other Sefirah (eight paths land at Tiferet: 13, 15, 17, 20, 22, 24, 25, 26 — see `reference/paths.md`). Seven of those eight paths have a *zodiacal* partner endpoint — only path 13 (the central-pillar Tiferet ↔ Kether, attributed to the Moon, a Double) doesn't — so Tiferet is open to seven classes. Hod is the loneliest Door — only Capricorn (via The Devil, path 26) gets it. **Total open Doors across all classes: 23** (11 classes × 2 + 1 class × 1).

---

## 4. Per-class implications

### The eleven two-Door classes

Eleven of the twelve classes have a soul card on a path whose *both* endpoints are challenge-bearing Sefirot. Those classes get a **pair** of Doors. The pair is structurally meaningful — it names two Sefirot the class can pass through with reduced friction, and the path between them is the cardthat literally bears the class's name.

A two-Door class is most-eased on a route that passes through both of its Doors using its own soul card to travel between them. Example: a Virgo (Doors at Chesed and Tiferet, soul card The Hermit) who routes Chesed → Tiferet plays The Hermit, gets DC −2 at both endpoints, and uses the card that *is* the Virgo path. The mechanical and symbolic threads align.

### The Pisces single-Door case

Pisces is the only class whose soul card path (29: Netzach ↔ Malkuth, The Moon) has Malkuth as one endpoint. Malkuth has **no challenge** (`design/mechanics.md` § Stat checks — *Malkuth has no challenge*). So Pisces gets only **one** Door: Netzach.

This asymmetry is **accepted as the class's signature** (D4). Two reinforcements:

1. **It rhymes with #212's dignity table.** In `design/astrological-classes.md` § 3, Pisces is the sign where **Venus** is exalted — and Venus is the planet of **Netzach** (`reference/correspondences.md` § 1). So Pisces's one Door is at the same Sefirah where its dignity layer puts a +2 exaltation on `passion`. The two layers point at the same place; the Pisces signature is **deeply Netzach-aligned**, not weakened by the missing second Door.

2. **It matches the symbolism.** The Moon (Pisces's soul card) is the ascent's first step — path 29 out of Malkuth. Pisces players carry the card of the boundary between the manifest and the dreaming; their "discount" naturally lives at Netzach (the gate of desire and creative passion), not at Malkuth (which has no gate to discount).

A T2 implementation note: the data layer will model Pisces's Door as `['netzach']` (a one-element array) — not as `['netzach', 'malkuth']` with a runtime "Malkuth never triggers" filter. The shape of the data should match the shape of the truth.

### Asymmetry and balance posture

11 classes get two Doors; one gets one. The variance in *count* (one vs. two) is one Door. The variance in *placement* (Hod-1 vs. Tiferet-7) is much larger — but placement variance is a feature: it creates per-class strategic territory on the board, mirroring how each sign's dignity table creates per-class statistical territory. Players pick a class as much for **where** they want their Doors as for **what** stats they want bonused.

No class can self-route to clear every Sefirah at DC −2; the Doors only cover at most two of the eight per-player d20-checked Sefirot (Chokmah, Binah, Chesed, Gevurah, Tiferet, Netzach, Hod, Yesod — Kether's Final Threshold is collective and Malkuth has no Challenge; cf. `design/mechanics.md` § Stat checks). The mechanic therefore tilts a class toward favored *territory* without ever soloing the game.

---

## 5. Engine integration shape

A pure function. No state. The data layer (T2) builds a frozen lookup; the engine helper (T3) wraps it with the `−2 | 0` answer; the integration site (T4) folds the result into the existing `effectiveDC` calculation alongside `SHORTCUT_DC_PENALTY`.

```ts
// engine/soul-doors.ts (T3 — to be created; not anchored from this doc)

import type { SefirahKey, ZodiacSignKey } from '@/data';

/** DC delta granted at a Soul Door. See design/soul-doors.md § 2 (D1). */
export const SOUL_DOOR_DC_DELTA = -2;

/**
 * Returns the DC delta a player of `sign` faces at `sefirah`.
 *   −2 if `sefirah` is one of the class's Doors (per the Door table
 *       in design/soul-doors.md § 3).
 *    0 otherwise.
 *
 * Pure. No state. No randomness. The data lookup itself lives in the
 * data layer (T2) so the engine helper stays trivial.
 */
export function soulDoorDcDelta(
  sign: ZodiacSignKey,
  sefirah: SefirahKey,
): typeof SOUL_DOOR_DC_DELTA | 0 { /* … */ }
```

**Names** (locked here; T2/T3/T4 must use these verbatim so call sites and tests stay grep-able):

- Constant: `SOUL_DOOR_DC_DELTA` (value `-2`)
- Function: `soulDoorDcDelta(sign, sefirah)`. *Note: the parent ticket #241's spec sketches the parameter as `class`; this doc renames it to `sign` to avoid colliding with the TypeScript reserved word and to match the established `sign: ZodiacSignKey` parameter name in the sibling helper `engine/zodiac-bonus.ts:zodiacBonus`. Behavioural contract is unchanged.*
- Module: `engine/soul-doors.ts`
- Data table (T2): `data/soul-doors.ts` — exports a `Readonly<Record<ZodiacSignKey, readonly SefirahKey[]>>` named `soulDoorsBySign`. Pisces: `['netzach']`. All others: a 2-element tuple.

**Composition site** (T4). In `engine/checks.ts:rollCheck`, the existing line

```
const effectiveDC = modifiers.shortcutPenalty ? dc + SHORTCUT_DC_PENALTY : dc;
```

becomes

```
const effectiveDC =
    dc
  + (modifiers.shortcutPenalty ? SHORTCUT_DC_PENALTY : 0)
  + (modifiers.soulDoorDelta ?? 0);
```

with `soulDoorDelta?: number` added to `CheckModifiers`. Defaulting to `0` on absence keeps existing engine-only callers (tests, future bots) compatible with no source changes; the call site in `lib/turn-machine.ts` (or wherever `resolveChallenge` is dispatched) computes `soulDoorDcDelta(player.sign, sefirah)` and passes it through.

**Dependency.** T4 reads `player.sign: ZodiacSignKey` off `PlayerState` (`engine/types.ts`). That field is added by Epic #212 sub-ticket 5 (`engine/setup.ts:initializeGame` integration) and sub-ticket 7 (the `sign` setup phase replacing the `aspect` phase). T4 of this epic is therefore sequenced **after** #212-T5/T7 has shipped. T2/T3 of this epic are independent of that ordering and can land first.

**No mutation.** The Door table is frozen at module load (`Object.freeze` or `as const`). A class never gains or loses a Door during play (D3 — class-passive, not card-bound).

**Test plan (T3).**

- `soulDoorDcDelta('aries', 'chokmah') === -2`, `… 'tiferet') === -2`, all other Sefirot `=== 0`.
- One assertion per (class, Sefirah) cell across **all 10 Sefirot** — 12 × 10 = 120 cases. Cheap. Including Kether and Malkuth in the matrix is intentional: the helper is pure and structural (it answers "is this Sefirah on this class's soul-card path?"), so its return value at Kether/Malkuth is well-defined and worth pinning even though those Sefirot don't run per-player d20 checks at runtime.
- `soulDoorDcDelta('pisces', 'netzach') === -2`; `… 'malkuth') === 0` even though path 29 has Malkuth as one endpoint — the data layer (T2) models Pisces's Doors as `['netzach']` only, since Malkuth has no Challenge.
- Population invariant: across the 12 × 10 = 120 cell matrix, exactly **23** cells return `-2` and the remaining **97** return `0`. (Pins § 3's distribution table.)

---

## 6. UI surfacing requirements (D5)

When a player arrives at one of their Doors, the Challenge UI **must call out the Door explicitly** — both because the discount is otherwise invisible (the player would just see a smaller DC and not know why) and because the class signature is one of the most flavorful per-character moments in the game.

**Required copy** (verbatim — locked by Epic #240 acceptance criteria):

> Soul Door open here: DC `X` → `X−2`

T5 may render the Sefirah-name and the literal numeric DC values inline (so the player sees e.g. `"Soul Door open here: DC 14 → 12"`), but the *form* of the callout — the phrase "Soul Door open here", the colon separator, the `→` arrow, and the `DC X → X−2` template — is the contract. When a central-pillar shortcut also applies at Tiferet, surface both deltas in the readout (e.g. `"Soul Door open here: DC 14 → 15 (shortcut +3, Door −2)"`); the headline phrase is unchanged.

The callout appears in the challenge-modal header (or equivalent prep-phase surface), distinct from the modifier ledger that already shows card-burn / Spark / assist contributions. The Door is **not** an action the player takes — it is a passive that's simply *true* about this challenge — so it must not appear in the modifier-spend toolbar; only in the *what's the DC* readout.

The picker UI (T2/T6 — the `ZodiacSignPicker` component built in #212 sub-ticket 6) should also surface each class's Doors at pick time, so players choose their class with the full picture. Suggested format under the dignity table:

> **Soul Doors:** *Tiferet, Yesod* (via Temperance / Path 25)

For Pisces, render the singular form and footnote the asymmetry:

> **Soul Door:** *Netzach* (via The Moon / Path 29 — Malkuth has no Challenge, so Pisces has one Door instead of two)

T6 owns the final picker copy; this is the contract.

---

## 7. Design decisions (locked)

Resolved by user. Sub-tickets T2–T5 build against these answers; reopen this section only if a downstream ticket surfaces a real conflict.

### D1. DC delta magnitude — **−2**

Match the +2 magnitude of an exaltation in #212's dignity table (`design/astrological-classes.md` § 2). The two layers are then commensurate: a class's "headline" effect on a favored Sefirah moves outcomes by the same order of magnitude whether expressed on the stat side (exaltation) or the DC side (Door). A larger Door (−3) would dominate both layers; a smaller one (−1) would feel ignorable next to card-burn (+3) and Spark (+5).

### D2. Stacking with burn / Spark / assist — **STACKS, independent mechanisms**

The Door delta applies to `effectiveDC`. Card burn, Spark, and assist all add to the player's *total*. They are mathematically and semantically independent — the Door is a passive; the others are spends. Composition is straight addition; no cap, no mutual exclusion. Players can (and will) burn cards in a Door challenge to push past a hard DC; the Door simply makes that push less expensive.

### D3. Class-passive vs. holding the soul card — **CLASS-PASSIVE**

The Door applies whenever a player of class C attempts a challenge at one of C's Door Sefirot, **regardless of whether that player currently holds their soul card**. Three reasons:

1. **Always-on character signature.** The class is the player; the Door is part of *who they are*, not a per-turn loadout decision. A Pisces is always Pisces-at-Netzach.
2. **Soul cards are scarce and rotate.** A given Major Arcanum sits in *one* player's hand (or in the discard, or in the draw pile) at a time. Tying the Door to card possession would make most players' Doors closed most of the time, which trivialises the mechanic.
3. **No bookkeeping.** A class-passive needs only `(class, sefirah)` to evaluate; a card-bound version needs hand-state. The simpler shape is the right shape.

### D4. Pisces single-Door asymmetry — **ACCEPT, flavor signature**

Pisces is the one class whose soul-card path terminates at Malkuth (which has no challenge). The asymmetry is the class's signature, not a bug:

- **It aligns with #212.** Pisces's only Door is Netzach; Pisces's only positive dignity is Venus (Netzach) exalted. Both layers concentrate Pisces's strength at Netzach. The class is **deeply** Netzach-aligned, not undercounted.
- **It matches the symbolism.** The Moon is the path *out of* Malkuth — first ascent, threshold of the dreaming. A "discount on Malkuth's challenge" would be a discount on nothing; the absence is structural.
- **It tilts the table.** Total open Doors = 23 (rather than 24). This is a one-cell variance against a 120-cell field (12 classes × 10 Sefirot — matching the test plan in § 5) — well below noise and well below #212's stat asymmetries (e.g. Virgo's +3 intellect vs. Pisces's −3 intellect; cf. § 4 of `design/astrological-classes.md`). Acceptable.

### D5. UI callout — **YES, "Soul Door open here" with delta math**

The callout is required in the challenge modal whenever the active Sefirah is a Door for the active player. See § 6 for the contract. Without the callout the discount would feel like the DC table changing under the player; with it, the class signature surfaces at the most important moment in a turn.

### D6. Final Threshold interaction — **NONE**

The Final Threshold at Kether is **collective**, not per-Sefirah-per-player (`design/mechanics.md` § Stat checks — *Kether has the **Final Threshold** (collective, endgame only)*). It is not a stat check at a single Sefirah for a single player; the Soul Door mechanic, which is keyed on `(playerClass, sefirah)` and applies to a single player's d20+stat resolution, has **no surface to apply to** at the Final Threshold.

This isn't a balance call — it's a structural absence. No class has Kether listed in its Door pair: every Simples-attributed path lands between Chokmah/Binah/Chesed/Gevurah/Tiferet/Netzach/Hod/Yesod/Malkuth, and Kether is touched only by paths 11/12/13 — none of which are Simples (path 11 is the Mother *Aleph*, paths 12 and 13 are the Doubles *Beth* and *Gimel*; cf. `reference/correspondences.md` § 2). So even if the Final Threshold were per-player, no class would have a Kether Door. Both axes agree: Soul Doors and the Final Threshold do not interact.

---

## 8. Sub-tickets fanned out from this doc

For Epic #240. Listed here so reviewers can sanity-check that this doc covers what each downstream ticket needs.

1. **docs (T1)** ← *this doc*. Locks the formula, the Door table, the constant + function names, the UI contract.
2. **chore (T2 — data)** — `data/soul-doors.ts`. Exports `soulDoorsBySign: Readonly<Record<ZodiacSignKey, readonly SefirahKey[]>>` per § 3. Pisces is one element; everyone else is two. Frozen.
3. **feature (T3 — engine)** — `engine/soul-doors.ts`. Exports `SOUL_DOOR_DC_DELTA = -2` and `soulDoorDcDelta(sign, sefirah): -2 | 0` per § 5. Pure. No state.
4. **feature (T4 — engine integration)** — extend `CheckModifiers` in `engine/checks.ts` with `soulDoorDelta?: number` (default 0 on absence). Compose into `effectiveDC` alongside `SHORTCUT_DC_PENALTY`. Update the call site that builds `CheckModifiers` (in the turn-machine / room-actions layer) to compute and pass the delta from `(player.signKey, sefirah)`.
5. **feature (T5 — UI)** — challenge-modal header callout per § 6. Picker-component augmentation per § 6.

Out of T1's scope: any code in `data/`, `engine/`, or `components/`; any change to `design/astrological-classes.md`; any change to `reference/`.

---

## 9. References

- [`design/astrological-classes.md`](astrological-classes.md) — #212 keystone; the dignity-bonus layer this design composes with. Soul Doors and dignities are independent additive layers on the same `(class, sefirah)` key.
- [`design/mechanics.md`](mechanics.md) § Stat checks — the resolver this design modifies. `effectiveDC`, `CheckModifiers`, `SHORTCUT_DC_PENALTY`.
- [`reference/correspondences.md`](../reference/correspondences.md) § 2 (Mothers / Doubles / Simples) and § 3 (Tarot → letter → path → astrology) — sources the class → soul card chain.
- [`reference/paths.md`](../reference/paths.md) — sources the soul card → path → endpoint Sefirot chain. Door table in § 3 is mechanically derivable from these two reference files.
- [`reference/arcana.md`](../reference/arcana.md) — per-card detail for the 12 soul cards.
- `engine/checks.ts:rollCheck` — the integration site (T4).
- Epic #240 — Soul Doors. Parent of T1–T5.
- Epic #212 — Astrological classes. Parent of the dignity-bonus layer this composes with.

---

## 10. Status

**LOCKED.** All six design decisions resolved. T2 (data layer) unblocked.
