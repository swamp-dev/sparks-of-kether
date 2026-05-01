<!-- code-ref: lib/turn-machine.ts:turnReducer -->
<!-- code-ref: engine/checks.ts:resolveChallenge -->
<!-- code-ref: lib/room-actions.ts:applyClientAction -->

# Per-Sefirah encounter mechanic differentiation

Status: **LOCKED — design.** Implementation tickets fan out from § 4.

Ticket: **#284**. Parent epic: **#117** (turn-based encounter system with
Sefirot avatars). Sibling docs:

- [`design/encounter-prep-phase.md`](encounter-prep-phase.md) — the
  prep → resolve → react chassis. Every mechanic in this doc composes
  with that chassis without modifying its phase shape.
- [`design/avatars.md`](avatars.md) — per-Sefirah avatar mapping and
  verdict-copy matrix (#276). The mechanics in this doc are the
  *gameplay* differentiation; avatars.md is the *voice* differentiation.
- [`reference/sefirot.md`](../reference/sefirot.md) — the symbolic
  ground for each Sefirah's energy. Each mechanic is anchored to its
  Sefirah's quality and challenge theme as recorded there.
- [`design/mechanics.md`](mechanics.md) — the rules of play. Mechanics
  in this doc are *modifications and additions* on top of the standard
  challenge resolution (§ "Stat checks" and § "Sparks"); they do not
  override DC tables, the d20 formula, or Spark grants.

---

## 1. Why differentiate

The prep → resolve → react chassis (`encounter-prep-phase.md` § 2)
gives every encounter the same three-act rhythm — stage modifiers,
roll the d20, react to outcome. That rhythm is locked. What's *not*
locked, and what § 9 of the chassis doc explicitly defers, is what
makes a Hermes encounter feel different from an Ares encounter inside
that frame.

This document fills that gap. For each of the 8 active Sefirot —
Gevurah, Chesed, Tiferet, Hod, Netzach, Yesod, Binah, Chokmah — it
locks a single mechanical "twist" that gives the encounter its
avatar-specific character. **Malkuth has no encounter** (starting
node, Hestia is companion not challenger); **Kether is the collective
Final Threshold**, owned by sibling ticket #285 and out of scope here.

Three constraints shape every twist:

1. **Compose, don't replace.** The prep → resolve → react phase
   transitions, the `PendingModifiers` shape, and the existing four
   `TurnEvent` cases (`prep-add-modifier`, `prep-remove-modifier`,
   `prep-confirm`, `react-retry`) are the chassis. Each twist either
   (a) introduces a new `PrepModifier` variant the chassis already
   supports the shape of, (b) adds a per-encounter validation rule at
   the `prep-confirm` boundary, or (c) modifies the DC computation
   inside `engine/checks.ts:resolveChallenge`. Nothing in this doc
   adds a fifth top-level phase or a parallel mini-game.
2. **Voice the energy.** The mechanic should *feel like* the Sefirah.
   Gevurah's "Sacred No" demands a real cost; Chesed's overflow can't
   actually fail; Hod's wordplay rewards memory; Yesod's dream-foundation
   asks the player to peek, not to know. The mechanical signature is
   the gameplay-layer expression of the avatar's voice.
3. **One twist per Sefirah.** Each section locks **one** mechanic.
   Implementers can polish (animations, copy, edge cases) but the
   shape is fixed. If a future ticket wants to add a second twist to
   the same Sefirah, that's a re-open of this doc, not a polish
   sub-ticket.

---

## 2. Cross-cutting conventions

These apply to every per-Sefirah twist below.

### 2.1 Sign-awareness — sparing, element-based when used

Each Sefirah maps to a planet (`reference/sefirot.md` master table),
and the player's zodiac class already lands a per-Sefirah lean via
two existing systems: **dignity stat-deltas**
(`design/astrological-classes.md` § 3 — rulership, exaltation,
detriment, fall translate to ±1 / ±2 on the Sefirah's stat) and
**Soul Doors** (`design/soul-doors.md` — DC −2 at the Sefirot at
the endpoints of the player's soul card). Both already differentiate
encounter difficulty per class.

This doc therefore uses sign-aware twists **sparingly** — only at two
of the eight Sefirot, and where used, the trigger is the player's
sign's **element** matching the Sefirah's gameplay gesture, not the
sign's planetary dignity. Stacking another dignity-keyed bonus on
top of dignity stat-deltas would over-tilt richly-dignified signs
(Virgo at Hod, Pisces at Netzach). Element-matching is a different
axis from dignity, so it composes additively without compounding.

The two sign-aware twists are Netzach (§ 3.5 — water-element +
Venus-ruled signs whose voice runs on want) and Chokmah (§ 3.8 —
fire-element signs whose voice runs on first-instinct strike). The
other six twists are sign-neutral.

### 2.2 Prep panel surfaces the twist

Every encounter-screen render (`EncounterScreen` per chassis § 8 / E3)
should render a "Twist" banner in prep that names the per-Sefirah
mechanic in plain language ("Hermes asks: name a card from the deck"
/ "Ares demands: burn your dearest"). Players see the twist *before*
staging modifiers so the modifier choice is informed. The banner is
deterministic from `encounter.sefirah`; no per-player variation.

### 2.3 React copy delegates to avatars.md

Every twist resolves into a normal pass / fail outcome at the chassis
layer. The verdict copy that surfaces in react comes from
`design/avatars.md` § 7, indexed by `[sefirah][sign][outcome]`. The
twist *is* what makes the avatar speak with their voice — but the
specific words are owned by avatars.md, not by this doc.

### 2.4 Multiplayer visibility

Every twist's prep-side state goes through `PendingModifiers` on
`GameState` so all players see it via Realtime, per chassis § 7.
Allies seeing "Andy declared: Sun" or "Andy guessed: Major" is part
of the multiplayer-coordination win. No twist below introduces a
side-channel that bypasses Realtime.

### 2.5 Hot-seat collapse

Per chassis § 6 + § 6.1, hot-seat play renders the same prep panel
as multiplayer; the "Roll" button confirms all staged twists in one
click. None of the twists below introduce a multi-step ceremony that
breaks the one-click hot-seat collapse.

**Hot-seat reveal visibility (M6).** Per-encounter information that
would normally be hidden from non-active players in multiplayer
(e.g. Hod's deck-top peek result, Yesod's dream pillar on miss) is
**still hidden in hot-seat play** — the "active player" rotation in
hot-seat assumes the device passes between humans, and a peek
result visible to the room would leak into the next player's turn.
Implementers should render peek / reveal copy in the same
"private to active player" UI panel that the chassis already uses
for hand visibility, gated on `activePlayerId === viewer`.

### 2.6 Engine surface extensions

The eight twists below need three new engine surfaces that the chassis
doesn't expose today. They are listed here once so the per-Sefirah
sections can use them by name without re-deriving the contract.

**(a) `CheckModifiers.flatBonus: number` (default 0).** A new
optional field on the existing `CheckModifiers` interface in
`engine/checks.ts`. The `rollCheck` math adds `flatBonus` to the
total alongside the existing assist / cardBurn / sparkBurn lines.
Five of the twists below land their bonus through this single field:

- Hod Word-Match match: `flatBonus += 5`.
- Yesod Dream-Peek match: `flatBonus += 5`.
- Gevurah Sacred Sacrifice dearest-card stack: `flatBonus += 2` per
  matching dearest burn (on top of the standard +3 already counted
  by `cardBurns`).
- Netzach Declared Desire sign-aware: `flatBonus += 2` for water +
  Venus-ruled signs on declaration.
- Chokmah fire-sign 0-modifier flash: `flatBonus += 2` for the
  three fire signs on a 0-modifier strike.

The `prep-confirm` reducer in `lib/turn-machine.ts` aggregates these
into `flatBonus` after pulling the per-Sefirah evidence from the
encounter envelope (see (b) below) and passes the resulting
`CheckModifiers` to `resolveChallenge`. The engine never re-derives;
each twist's contribution is computed once at confirm time.

**(b) `GameState.encounter: EncounterEnvelope | undefined`.** A new
optional field on `GameState` (`engine/types.ts`). Initialized at
phase entry into `'challenge'` (the start of prep), cleared at phase
exit (on `accept-setback` or post-`react-retry-on-pass` flow when
phase moves out of `'challenge'`). Lifecycle: one round-trip per
encounter — survives `react-retry` (the prep → resolve → react cycle
loops back without leaving phase `'challenge'`); does not survive
`accept-setback` or successful resolution (phase leaves `'challenge'`
either way).

```ts
export interface EncounterEnvelope {
  /** The Sefirah currently being challenged. Replaces the discussed
   *  but never-implemented `state.encounterSefirah` field. */
  readonly sefirah: SefirahKey;
  /** Per-encounter RNG seed for any deterministic per-encounter
   *  derivation (Yesod Dream-Peek pillar, Hod deception misreport).
   *  Set at envelope init from a hash of stable game-state fields;
   *  see § 3.6. */
  readonly seed: number;
  /** Yesod only: the dream pillar derived from `seed` plus the
   *  per-retry counter at envelope init / retry. */
  readonly dreamPillar?: Pillar;
  /** Counts react-retry cycles inside this encounter. Yesod uses it
   *  to re-seed `dreamPillar` on each retry so a miss-then-retry
   *  can't recover the leaked answer; Chokmah / Netzach also derive
   *  their per-retry tilts from it. Required-zero (#334) so consumers
   *  can read the field without a `?? 0` defaulting dance — the
   *  optional `?` was removed when the engine surface landed. */
  readonly retryCount: number;
  /** Chokmah only: prior modifier-count carryover for the count tilt.
   *  Increments on react-retry per § 3.8. */
  readonly chokmahPriorAttempts?: number;
  /** Netzach only: counts failed resolves within this Netzach
   *  encounter. Used by the retry-within-same-encounter DC +1 rule
   *  for undeclared players. See § 3.5 (C6 fix). */
  readonly netzachPriorFails?: number;
  /** Hod only: the misreported arcanum the engine compares the
   *  player's guess against when Shell of Hod is active. Sampled
   *  once at envelope init from `seed`; absent when Shell of Hod
   *  is not active. See § 3.1 (C5). */
  readonly deceptionMisreport?: number;
}
```

Mechanics that need per-encounter scratch state pin their fields here.
A second twist that wants per-encounter scratch state in the future
extends this envelope, not `PendingModifiers`.

**(c) `state.encounterSefirah` is removed.** Earlier drafts of this
doc referenced `state.encounterSefirah`; that field never existed on
`GameState` and the proposed extension is `state.encounter?.sefirah`
instead, accessed through the envelope. Every `prep-confirm` /
`prep-add-modifier` / `prep-remove-modifier` / `react-retry` reducer
case that needs to switch on the active Sefirah reads it from
`state.encounter?.sefirah` (with the `undefined`-when-not-in-challenge
case being a wrong-phase guard already covered by the existing
sub-phase checks).

The `declaredDesire` flag on `PlayerState` (§ 3.5) and the
`pendingStatBuff` field on `PlayerState` (§ 3.5) are the only
player-scoped extensions in this doc. `declaredDesire` outlives
encounters (it's a one-shot run-wide vow); `pendingStatBuff` outlives
the Netzach encounter it was earned in but is consumed by the *next*
stat-check this turn. Both live on `PlayerState`, not on the envelope.

The C6 retry-within-same-encounter trigger (Netzach DC +1 on retry
without declaration) lives on the envelope, not on the player —
it's per-encounter, cleared on phase exit. See § 3.5.

### 2.7 New `PrepModifier` variants

Four new variants extend the existing `PrepModifier` union in
`lib/turn-machine.ts`. Each lists shape, equality fields used by
`prep-remove-modifier`, and lifecycle.

| Kind | Section | Shape | Equality (for remove) | Lifecycle |
|---|---|---|---|---|
| `name-card` | § 3.1 | `{ kind: 'name-card'; arcanum: number }` | `arcanum` | Staged at `prep-add-modifier`; consumed at `prep-confirm` (whether match or miss); un-staged at `prep-remove-modifier`. Max one per encounter. |
| `gift-card` | § 3.3 | `{ kind: 'gift-card'; arcanum: number; recipientId: string }` | `arcanum` AND `recipientId` | Staged at `prep-add-modifier` (active player only); transferred to recipient at `prep-confirm`; un-staged at `prep-remove-modifier`. Multiple allowed per encounter (one per gift). |
| `declare-desire` | § 3.5 | `{ kind: 'declare-desire'; sefirah: SefirahKey }` | `sefirah` | Staged at `prep-add-modifier`; written to `activePlayer.declaredDesire` at `prep-confirm` (permanent, never cleared); un-staged at `prep-remove-modifier`. Max one per run, locks. |
| `dream-guess` | § 3.6 | `{ kind: 'dream-guess'; pillar: Pillar }` | `pillar` | Staged at `prep-add-modifier`; checked against `state.encounter.dreamPillar` at `prep-confirm`, then consumed (event emitted, modifier discarded); un-staged at `prep-remove-modifier`. Max one per encounter. |

Tiferet (§ 3.4), Gevurah (§ 3.2), Binah (§ 3.7), and Chokmah (§ 3.8)
reuse the existing `card-burn` / `spark-burn` / `assist-request`
variants — none of them introduces a new variant.

**Consumption note (Hod / Yesod, C4 fix).** The `name-card` and
`dream-guess` variants are **consumed at `prep-confirm` regardless of
match or miss**, identical to the way card-burns are consumed (#281).
A failed-roll `react-retry` re-staging the same kind requires a fresh
`prep-add-modifier` event; the previously-staged `name-card` /
`dream-guess` is gone from `pendingModifiers` because the `prep-confirm`
reducer cleared it. Card-burns and spark-burns persist on retry per
chassis § 5; the new variants do not.

---

## 3. The eight twists

Each subsection has a fixed shape:

- **Mechanic name** — one line, marketing-grade.
- **Rule** — plain-language description of what the player does and
  what happens.
- **Chassis composition** — exactly how it plugs into prep / resolve /
  react and which engine surfaces it touches.
- **Prep panel UX** — what the player sees that's different from a
  generic encounter.
- **Sign-aware adjustment** — present where § 2.1 calls it; "None"
  otherwise.
- **Edge cases** — the gotchas the implementer needs to pin in tests.

### 3.1 Hod (Hermes) — Word-Match

> *"Words are spells."* (`reference/sefirot.md` § Hod)

**Mechanic name.** Word-Match.

**Rule.** During prep, the player may stage a "name-a-card" modifier:
declare which Major Arcanum they believe is on top of the draw pile.
At `prep-confirm`, the engine peeks the top card. **Match → +5 to the
roll** (parity with a Spark-burn, on purpose: language well-aimed is
the Hermetic Spark). **Miss → no penalty**, but the player is told
their guess didn't match — *which* card is on top is **not** revealed
(see "Retry information-hiding" below). The top card stays on the
deck. The miss-event broadcast is "your guess didn't match," not the
identity of the deck-top.

**Chassis composition.**

- New `PrepModifier` variant: `{ kind: 'name-card'; arcanum: number }`.
  See § 2.7 for shape and lifecycle.
- Validation at `prep-confirm`: if the named arcanum equals the
  arcanum at the top of `state.deck` (the existing draw pile, top of
  deck = index 0 per `engine/types.ts`), the reducer aggregates +5
  into `CheckModifiers.flatBonus` (see § 2.6) for this resolve. Miss
  → emit `{ kind: 'card-named-miss' }` event (no `actual` field — the
  identity stays hidden). No DC or roll change on miss.
- Resolve and react phases unchanged.
- Only one `name-card` modifier may be staged per encounter (the
  reducer rejects a second add). Players can `prep-remove-modifier`
  and re-stage with a different guess **before** confirm. After
  confirm, the modifier is consumed (§ 2.7); a retry must re-stage
  fresh.

**Retry information-hiding (C4 fix).** The chassis preserves
`pendingModifiers` across `react-retry` for card-burns / spark-burns
(cumulative-on-retry, design § 6). For Word-Match this would be a
guaranteed +5 on retry — the miss reveal would tell the player the
correct answer, and the retry would re-stage with that known-correct
arcanum. Two specific rules close that exploit:

1. **The miss event omits the actual deck-top arcanum.** The player
   knows only "your guess didn't match." The deck-top stays opaque.
2. **The `name-card` modifier is consumed at `prep-confirm` regardless
   of pass / fail** (§ 2.7), so it is *not* in `pendingModifiers` at
   the start of the retry. The player must re-stage with a fresh
   `prep-add-modifier`. Combined with rule (1), the retry has no
   information advantage over the first attempt.

**Shell of Hod — Deception (C5).** Per `design/shells.md` § Shell of
Hod, while this Shell is active, "the top card of the draw pile is
announced as something else each turn... a player who peeks receives
misinformation." Word-Match is a peek — so when Shell of Hod is
active, the engine compares the player's guess against the
**misreported** card, not the true top. Concretely: the reducer
samples the misreport once per encounter (deterministic from
`state.encounter.seed`), stores it on `state.encounter.deceptionMisreport`,
and the match check is `guess === deceptionMisreport`. UI shows the
misreported value to the player on a successful match ("you peeked:
The Empress" — engine sees Empress; player guessed Empress → match
→ +5; true top was The Tower). The Shell turns Hod from a precision
check into a noise check; the mechanic respects the Shell rather
than skipping it. (When Shell of Hod is not active,
`deceptionMisreport` is unset and the comparison runs against the
true top.)

**Prep panel UX.** Above the standard modifier list, a "Name a card"
input — a 22-option dropdown of Major Arcana names. Selecting an
option adds the modifier; deselecting removes it. No live feedback
("hot/cold") — the match-or-miss feedback is at confirm time only,
and per the C4 information-hiding rule the miss does NOT reveal the
deck-top. The input is optional: a player who doesn't want to risk a
miss can just stack standard burns / assists.

**Sign-aware adjustment.** None. Mercury's dignity table already gives
Virgo (Mercury exalted, +3 to intellect) a strong baseline at Hod via
the stat-delta. Adding a sign-aware bonus on top would compound.

**Hit-rate disparity vs Yesod (M3).** Word-Match has a baseline
~1/22 hit rate (random arcanum match against a 22-card draw pile);
Dream-Peek (§ 3.6) has a baseline 1/3 hit rate (one of three
pillars). Both award +5 on hit. The asymmetry is **intentional**:
Hod is the precision-rewarding encounter — a player using Hod's
*Clarity* Spark (`mechanics.md` § Sparks: "Name a card; if any
player holds it, they reveal it") can convert that hand-knowledge
into Word-Match's +5, and a player who has been tracking discards
can sometimes guess the deck-top from elimination. The mechanic
reads 22-card precision as a fluent-Hermetic gesture; raw
guesswork is the unfluent fallback. Yesod's 3-pillar guess, by
contrast, is appropriately *intuition-graded* — a coin-flip-like
reach that rewards trusting the dream rather than calculating.
Both mechanics fit their Sefirah's energy; the math should not be
homogenized.

**Edge cases.**

- Empty draw pile at `prep-confirm`: reshuffle discard per
  `mechanics.md` "Discard recycle" *before* the peek. If both piles
  are empty (game-end state), the modifier is dropped per the
  chassis-doc § 5 drop-on-validation pattern with a meta entry.
- Hod Spark *Clarity* (`mechanics.md` § Sparks: "Name a card; if any
  player holds it, they reveal it") shares the same
  player-names-an-arcanum gesture but targets *hands*, not deck. The
  two are independent — a player may use the Spark *and* Word-Match in
  the same turn, but the Spark fires from the Spark side-bar, not
  through `PendingModifiers`.
- Multi-deck (3–4 player) games: there are two copies of every
  arcanum. The peek tests `arcanum` equality, so a guess matches if
  *either* copy is on top — the deck identity is opaque to the player.

### 3.2 Gevurah (Ares) — Sacred Sacrifice

> *"I say no so that yes means something."* (`reference/sefirot.md` § Gevurah)

**Mechanic name.** Sacred Sacrifice.

**Rule.** At Gevurah, **the player must stage at least one card-burn
to confirm prep.** If their hand is empty, the rule waives — the
sacrifice is the staging itself, not an absolute requirement. If they
stage a card-burn, **the burned card's pip-rank tilts the roll**:

- Burn a card whose arcanum number is the **highest** in their hand
  (the dearest card by raw rank): +5 to the roll (parity with a
  Spark-burn — the highest-cost sacrifice gets the highest-cost
  reward).
- Burn any other card: standard +3 (per `mechanics.md` § Stat checks).

**Chassis composition.**

- No new `PrepModifier` variant. Standard `card-burn` modifier is
  reused.
- Validation at `prep-confirm`: if `state.encounter?.sefirah ===
  'gevurah'` (per § 2.6) and the active player's hand is non-empty and
  `pendingModifiers.cardBurns.length === 0`, **block the confirm**
  (return a `Result` error: `'gevurah-requires-burn'`). UI surfaces
  the error inline; the player must stage a burn or `react-retry` is
  unreachable because they haven't even resolved yet — this is purely
  a prep gate.
- At `prep-confirm` (when validation passes), determine if any staged
  burn matches `Math.max(...activePlayer.hand.map(c => c.arcanum))`
  *as computed before any burn-card removal*. Yes → `flatBonus += 2`
  per matching dearest-card burn (see § 2.6 — this stacks on top of
  the standard +3 already counted by `cardBurns`, so total is +5). No
  matching → no extra bonus.
- Resolve and react phases unchanged. React-retry loops back to prep
  but the dearest-card check re-evaluates against the new hand state
  (the previously-burned card is gone), so the *new* highest-rank
  card becomes the new dearest. The boundary is each prep, not the
  encounter as a whole.

**Tuning intent (S8).** Strength stat ~10 + dearest-tilt +5 + d20
on a base DC 15 means a dearest-burn passes on roll 0+ (auto-pass).
This is **intentional**: Gevurah's encounter tension is in the
*choice* to sacrifice the rank-highest card, not in the dice. The
mechanic frames Gevurah as "passable when sacrifice is real, hard
when it isn't." Players willing to burn their best card on the fly
should clear it; players who burn cheaply should rely on the
non-dearest +3 (DC 15 with strength 10 + +3 = pass on 2+, still
favourable but not auto). The dearest-tilt is a deliberate
"reward decisiveness" lever, not a balance bug.

**Prep panel UX.** Banner copy: *"Gevurah demands a sacrifice. Burn
a card to confirm."* The "Roll" button is greyed with tooltip
*"Stage at least one burn to continue"* until the gate passes.
Cards in hand have a small subscript marker on the rank-highest
card (or cards, in case of ties): a red bar. Mousing over the bar
shows *"Dearest — burn this for +5 instead of +3."*

**Sign-aware adjustment.** None. Mars's dignity table gives Aries and
Scorpio (Mars rulership / co-rulership) baseline tilt to strength via
the stat-delta. Compounding would be excessive.

**Edge cases.**

- Empty hand: gate waives. The player can still confirm with no burn;
  they take whatever roll they get. (This corner is mostly a no-op —
  Gevurah's DC 15 plus an empty hand usually means accepting setback.)
- Tie for highest rank: any of the tied cards qualifies as dearest.
  Burning any one of them triggers the +2 dearest-tilt.
- Spark-burn substitution: a Spark-burn alone does *not* satisfy the
  gate. The gate is specifically a card sacrifice — Sparks are
  earned, not held the way a hand is held.
- Ally assist: assists are still allowed. They stack normally. The
  gate is about the active player's own act of saying no, not about
  refusing help.
- Shell of Gevurah — Cruelty active (per `design/shells.md` §
  Shell of Gevurah, "every player's Strength stat drops by 1
  permanently until banished" AND "all Gevurah challenges are DC
  +2 while this is active"): the gate logic is unchanged. Both
  effects compose with the mechanic: Strength −1 lowers the
  effective stat going into resolve, AND the +2 DC raises the bar
  to DC 17. The dearest-tilt +2 still applies when the dearest
  card is burned (mechanic-level tilt — Shell raises DC, mechanic
  rewards decisiveness; both fire together). Banishing the Shell
  by clearing this very Gevurah encounter restores Strength and
  drops the DC back to 15.

### 3.3 Chesed (Zeus) — Overflow

> *"What you pour out returns sevenfold."* (`reference/sefirot.md` § Chesed)
> *"Its challenge can never fail — only unfold."* (sefirot.md game block)

**Mechanic name.** Overflow.

**Rule.** Per `sefirot.md`, Chesed "can never fail — only unfold."
The encounter is not pass / fail in the usual axis; it's
**generosity-graded**. The standard d20 roll still happens, but
the gift gesture re-shapes the outcome:

- **Unfolding (gift staged)**: the player gifts at least one card
  from their hand to a chosen ally *as a prep modifier*. This
  reduces the effective DC by 2; every additional gift past the
  first reduces DC by another 1, capped at −4. The gift transfers
  at `prep-confirm`. On any roll outcome, the encounter passes —
  the Spark is granted, Illumination +1. **If the roll also met
  the (un-modified) DC**, the player earns an additional +1
  Illumination on top (so +2 total) — abundance beyond ask.
  Failing the roll under unfolding is not a setback; it's a
  pour-out that didn't fully return, but the Spark still lights
  because the gesture was given.
- **Hoarding (no gift staged with non-empty hand)**: the d20 still
  rolls. **Pass**: standard pass — Spark earned, Illumination +1.
  Zeus is generous even when not given to. **Fail**: the react
  sub-state branch is **"Hoarding"**, not the standard
  retry / setback. Hoarding fail = no Spark, +2 Separation (not
  +1 — the encounter calls it out as a refusal of the gesture),
  and `react-retry` is disabled (Zeus does not offer twice in the
  same encounter). The only choice is `accept-setback`.
- **Empty hand**: hoarding doesn't apply (you can't refuse to give
  what you don't have). Standard chassis applies; failing the roll
  is a normal +1 Separation setback.

**Chassis composition.**

- New `PrepModifier` variant: `{ kind: 'gift-card'; arcanum: number;
  recipientId: string }`. See § 2.7 for shape and lifecycle. The
  recipient must be a player at any position on the Tree (gifts
  already cross distance per `mechanics.md` § "Gifts during your own
  turn"). Active player only dispatches the modifier per chassis § 7 —
  the active player declares the gift after gathering consent
  out-of-band. The recipient sees the staged modifier appear in real
  time via the `PendingModifiers` Realtime broadcast and can ask the
  active player to remove it (chassis-level ally-veto pattern, same
  as for `assist-request`).
- Validation at `prep-confirm`: each `gift-card` modifier transfers
  the named card from active player's hand to recipient's hand. If
  recipient is at hand cap (6), see edge case below — there is no
  on-wire confirm-time refuse path in v1; this is an explicit
  out-of-scope corner.
- DC modification: `effectiveDC = baseDC - min(gifts.length + 1, 4)`
  if `gifts.length > 0`, else baseDC. Computed inside
  `resolveChallenge`.
- Resolve phase unchanged. React phase has a new `'hoarding'`
  sub-state branch when gifts.length === 0 AND outcome.passed === false.

**New events (S2 + S3).** Two new `TurnEvent` outputs (or kernel
events flowing into the existing event log):

- `{ kind: 'chesed-overflow-bonus'; playerId: string; amount: 1 }` —
  emitted at `prep-confirm` when gifts.length ≥ 1 AND the d20
  outcome.pass is true on the *unmodified* DC (i.e. the player would
  have passed without the gift's DC reduction; the gift was abundance
  beyond ask). Increments Illumination by `amount` on top of the
  standard `spark-earned` Illumination grant. Distinct event so the
  UX can flash a separate "Abundance" tick without conflating it with
  Spark grant copy. The pre-existing `spark-earned` event is **not**
  modified — `chesed-overflow-bonus` is additive.
- `{ kind: 'chesed-hoarding-fail'; playerId: string; separation: 2 }`
  — emitted at `accept-setback` when the encounter exited the
  `'hoarding'` react sub-branch (gifts.length === 0 AND prior
  outcome.pass === false). Bypasses the standard
  `check-failed-accepted` event because the Separation magnitude is
  +2, not the +1 / +2-on-shortcut ladder that `acceptSetback`
  encodes. The reducer's `accept-setback` case branches on
  `state.encounter?.sefirah === 'chesed' && gifts.length === 0 &&
  state.lastOutcome?.pass === false` and emits the new event in
  place of `check-failed-accepted`. Position rollback is unchanged
  (player rolls back per chassis); only the Separation tick differs.

**Prep panel UX.** Banner copy: *"Chesed unfolds. Give to lower the
threshold."* Below the standard modifier list, a "Gift" affordance:
pick a card from hand, pick an ally. Stacking is allowed (gift two
different cards to two different allies = DC −3). Live DC preview
updates: *"DC 13 → 11 (1 gift)"*. If hand is empty and no gifts can
be staged, the banner shifts to *"Chesed asks nothing. Pass freely."*
and the standard chassis applies.

**Sign-aware adjustment.** None. Jupiter dignities (Sagittarius,
Pisces rulers; Cancer exaltation) already tilt the
Lovingkindness stat.

**Edge cases.**

- Hand empty: the "refuse to give" hoarding branch is unreachable
  (you can't refuse to give what you don't have). Standard chassis
  applies; failing the roll is a normal +1 Separation setback.
- Recipient at hand cap (S4 — explicit out-of-scope for v1): the
  recipient has no on-wire affordance to refuse at confirm time.
  Per `mechanics.md` § "Receiving a gift while at the hand-size
  cap," the recipient's options are *refuse* (+1 Separation) or
  *discard one to accept*. The chassis as it stands has no
  `gift-recipient-confirm` action and the Realtime broadcast shows
  only the staged gift. **For v1, the encounter is consent-driven
  up front: the active player and recipient coordinate verbally
  before the gift hits `PendingModifiers`, and at `prep-confirm`
  the gift transfers and the recipient auto-discards the
  oldest-by-arcanum-number card to make room.** This is a known
  griefing surface (an active player can stage a gift to a
  hand-capped ally without out-of-band consent and force a
  discard); the K-implementer of this ticket should file a
  follow-up tracking issue for a proper recipient-confirm wire
  action and tag it with the Epic. Documented out-of-scope for v1
  to avoid blocking the Chesed slice on a multiplayer-protocol
  extension.
- Shell of Chesed — Hoarding (per `design/shells.md` § Shell of
  Chesed, "no card gifts, in any direction, for the next full
  round; Soul Aspect abilities that gift are also disabled for the
  round"): when active, `gift-card` modifiers are blocked at
  `prep-add-modifier` for the duration of the Shell's one-round
  window. The encounter falls back to standard chassis (no DC
  reduction available, no overflow Spark bonus, no `'hoarding'`
  react branch since it can only fire when gifts ≥ 0 was an
  *option* — when blocked entirely, hoarding-fail is unreachable;
  fail goes through standard +1 Separation setback). This is the
  Shell working as intended — its job is to deny the Chesed
  gesture.
- All non-active players are dead / disconnected: no valid recipients.
  Banner shows *"No allies to receive."* and gift staging is disabled.
  Standard chassis applies.

### 3.4 Tiferet (Apollo) — Two-Pillar Balance

> *"Know yourself, and you know the All."* (`reference/sefirot.md` § Tiferet)
> *"Every pillar crosses here."* (sefirot.md game block)

**Mechanic name.** Two-Pillar Balance.

**Rule.** At Tiferet, the encounter rewards burning **two or more**
cards whose paths together touch *both* the Mercy and Severity
pillars. Each Major Arcanum's pillar membership is already encoded
by its path's `pillarsCrossed` (per `reference/paths.md`, repeated in
`engine/checks.ts:rollbackPosition` — the existing data is reused).

The check, applied at `prep-confirm`, is on the **set union** of all
pillars touched across all staged card-burns:

- **At least 2 burns AND the union touches both Mercy and Severity**
  (e.g. burn The Hierophant + The Hanged Man — Mercy↔Mercy union
  Severity↔Severity = {Mercy, Severity}; or burn The Tower alone
  would NOT qualify because the rule requires ≥ 2 burns even when
  one card alone spans both pillars): effective DC **−2** (the
  heart integrates light and shadow).
- **At least 2 burns but the union covers only one of {Mercy,
  Severity}** (e.g. two Severity-only burns): effective DC **+2**
  (lopsided sacrifice). Cards whose path has `Balance` on either
  side count toward neither pole; if every burn has at least one
  Balance side AND no burn touches both Mercy and Severity, the
  result is *one-sided or no-sided* — DC +2.
- **0 or 1 burns**: standard DC. No tilt either way (the heart
  accepts silent stillness; one card is not yet a balance).

**Chassis composition.**

- No new `PrepModifier` variant. Reuses standard `card-burn`.
- DC modification at `resolveChallenge`: for each staged card-burn,
  resolve the card to its path and read `pillarsCrossed` (the
  existing array of two `Pillar` values per path). Compute the set
  union of all pillars touched. Apply the **Tiferet tilt** (`-2`,
  `0`, or `+2` per the Rule above) **on top of** the chassis's
  existing DC composition. Composition order (S6): the engine
  computes `effectiveDC = baseDC + shortcutPenalty + soulDoorDelta +
  tiferetTilt`. The tilt is additive with shortcut and Soul Door
  deltas — implementer must compose, not replace. Path data is in
  `reference/paths.md` and indexed by the existing engine data
  layer.
- Resolve and react phases unchanged.

**Prep panel UX.** Banner copy: *"Apollo asks for both sides."*
Below the modifier list, a small pillar-tally widget:

```
  Mercy: ✓     Severity: ✗     Balance: ✓
  Burns: 2     → DC 14 + 2 (lopsided)
```

Updates live as burns are added / removed. Each burned card shows
its pillar pair on hover so the player can plan composition. If
0 or 1 burns are staged, the widget shows *"Stage 2+ burns to
attempt balance"* and DC is untilted.

**Sign-aware adjustment.** None. Sun dignities (Leo ruler, Aries
exaltation) tilt Harmony already.

**Edge cases.**

- Single horizontal-rung burn (e.g. The Tower, Mercy↔Severity)
  alone: this card's pillarsCrossed touches both poles, but the
  rule still requires **≥ 2 burns** to engage. One-card sacrifice
  is "silent stillness," DC untilted. Rationale: the encounter is
  about *integration through pairing*, not about luck-of-the-hand
  with one well-spanned card.
- Hand contains only Severity-pillar cards: the −2 balance bonus
  is unreachable. The player can still pass via stat + Spark +
  assist routes. The banner clarifies *"Hand lacks Mercy-pillar
  cards"* so the player understands why the −2 tilt is unavailable
  — and warns about the +2 lopsided penalty if 2+ burns are staged
  anyway.
- Two burns where one is a horizontal rung (Mercy↔Severity) and
  the other is a same-pillar card (e.g. The Hanged Man,
  Severity↔Severity): union is {Mercy, Severity}. Qualifies for
  the −2 balance bonus.
- Shell of Tiferet — Vanity (per `design/shells.md` § Shell of
  Tiferet, "the Tiferet player's Soul Aspect ability is disabled.
  If no Tiferet player is at the table, all Harmony stat checks
  are DC +2"): the Tiferet *encounter check* is a Harmony stat
  check, so when the Shell is active **and** no Tiferet-class
  player is at the table, this encounter's DC bumps +2 (composed
  per S6: `baseDC + shortcutPenalty + soulDoorDelta + shellTilt +
  tiferetTilt`). The two-pillar tilt still applies on top. When a
  Tiferet-class player IS at the table, the Shell only disables
  their Soul Aspect (a separate surface) and the encounter DC is
  unchanged.

**Test matrix (M4).** Implementers should pin tests for at least
these compositions to avoid regressions:

| Burns | Pillars touched | DC outcome |
|---|---|---|
| 0 | — | base DC, no tilt |
| 1 (Tower) | {Mercy, Severity} | base DC, no tilt (rule requires ≥ 2) |
| 2 (Hierophant + Hanged Man) | {Mercy, Severity} | DC −2 |
| 2 (Tower + Hanged Man) | {Mercy, Severity} | DC −2 |
| 2 (two Severity-only) | {Severity} | DC +2 |
| 2 (two Balance-only, e.g. Fool + World) | {Balance} | DC +2 (no Mercy or Severity touched) |
| 3 (Severity + Balance + Mercy) | {Mercy, Severity, Balance} | DC −2 |
| 2 + shortcut + Soul-Door-active | {Mercy, Severity} | DC = base + 3 (shortcut) + (-2) (soul door) + (-2) (Tiferet tilt) |

### 3.5 Netzach (Aphrodite) — Declared Desire

> *"The heart knows the way."* (`reference/sefirot.md` § Netzach)

**Mechanic name.** Declared Desire.

**Rule.** During prep, the player **declares one Sefirah as their
"desire"** — the Sefirah whose Spark they most want to earn before
endgame. The declaration is public (broadcast via Realtime) and
permanent for the rest of the run (one declaration per game; once
declared, locked).

- **Pass at Netzach with a desire declared**: standard Spark + the
  active player's stat in their declared Sefirah is **temporarily +1**
  for the rest of this turn (passion fuels the next strike). If they
  declare *Netzach itself*, the bonus is +2 — congruence is rewarded.
- **Fail at Netzach with a desire declared**: standard +1 Separation
  setback. No additional penalty; the declaration stands and Aphrodite
  remembers.
- **Fail at Netzach without declaring**, then `react-retry` within the
  *same encounter*: the retry's effective DC is +1 (Aphrodite tightens
  on the second strike when nothing was named). C6 fix: the original
  doc said "DC +1 on next visit if you passed without declaring," but
  passed Sefirot are added to `clearedSefirot` and re-entry returns
  `{ kind: 'already-cleared' }`, so that trigger was structurally
  unreachable. Instead the trigger is the **react-retry within the
  current Netzach encounter**, which the chassis fully supports — the
  retry runs through the prep → resolve → react cycle again with the
  envelope's `sefirah === 'netzach'` still set. The DC +1 is added at
  `resolveChallenge` when `state.encounter?.sefirah === 'netzach'` AND
  the active player has `declaredDesire === undefined` AND the
  encounter has had at least one prior failed resolve (track via
  `state.encounter.netzachPriorFails: number`, incremented on each
  failed resolve, cleared on phase exit per envelope lifecycle § 2.6).
- **Pass at Netzach without declaring**: standard pass. Aphrodite
  notes the silence. No persistent future-DC modifier — the
  retry-within-same-encounter trigger is the only DC penalty.
- **Fail at Netzach without declaring** (no retry attempted): standard
  fail; envelope clears on `accept-setback` per § 2.6.

The desire-declaration field (`declaredDesire`) lives on the active
player and survives the encounter — future encounters at the declared
Sefirah read it.

**Chassis composition.**

- New `PrepModifier` variant: `{ kind: 'declare-desire'; sefirah:
  SefirahKey }`. See § 2.7 for shape and lifecycle. May only be staged
  at Netzach (reducer rejects elsewhere). Once `prep-confirm` fires
  with this modifier present, the engine writes
  `activePlayer.declaredDesire = sefirah` on the player record (a new
  optional `PlayerState` field). The flag is never cleared.
- The temporary +1 (or +2) stat bump is applied as a `pendingStatBuff`
  on the active player (a new optional `PlayerState` field), consumed
  by the next stat-check this turn. After consumption it expires. (If
  no further check this turn, it expires on `phase: 'end'`.)
- The retry-within-same-encounter DC +1 is computed at `resolveChallenge`
  from `state.encounter.netzachPriorFails > 0 && activePlayer
  .declaredDesire === undefined`. Composed per S6: `effectiveDC =
  baseDC + shortcutPenalty + soulDoorDelta + netzachRetryTilt`.
- Resolve and react phases unchanged; only the envelope's
  `netzachPriorFails` counter and the optional `pendingStatBuff` /
  `declaredDesire` player fields are added.
- The sign-aware +2 (water + Venus-ruled, see "Sign-aware adjustment"
  below) lands through `flatBonus` per § 2.6, NOT through DC.

**Prep panel UX.** Banner copy: *"Aphrodite asks: what do you want?"*
A 9-Sefirah picker (Malkuth excluded — desire is upward) with
descriptions on hover. Selecting a Sefirah stages the modifier.
Removing returns to undeclared. Below the picker, a flavor line
generated from the avatar voice (e.g. *"Aphrodite leans in:
'Speak it.'"*).

**Sign-aware adjustment.** **Yes — element fit.** The water signs
(Cancer, Scorpio, Pisces) and the Venus-ruled signs (Taurus, Libra)
get **+2 to the roll** when a desire is declared. Five of twelve
signs total — the ones whose archetypal voice already runs on want
and feeling per the sign capsules in `avatars.md` § 3. The other
seven signs declare and get the stat bump but no roll bonus.
Rationale: this is the one Sefirah where naming a want is the
gameplay gesture, and signs whose native voice *is* desire-fluent
should land it more cleanly than air / earth / fire signs that have
to translate first.

**Edge cases.**

- Player declares twice across the run: blocked. The first
  declaration locks. Subsequent `declare-desire` modifiers at later
  Netzach re-encounters are dropped at confirm with a meta event
  (*"Already declared: Tiferet"*).
- Player declares Malkuth: blocked at `prep-add-modifier` (Malkuth
  has no encounter, no Spark to want).
- Player declares Kether: allowed and thematic (the highest want).
  No special interaction with the Final Threshold beyond the +1
  stat bump being available for the Threshold's collective check.
- Shell of Netzach — Obsession (per `design/shells.md` § Shell of
  Netzach, "cards played on desire-themed paths (Netzach-adjacent:
  paths 21, 24, 28, 29) have no movement effect — they burn and
  the player stays put. They can still be used to assist or for
  card-burn bonuses"): does not block declaration itself
  (declaration is a vow, not a card-play, and the encounter check
  isn't movement). The Shell's effect on path-traversal is
  independent of the Netzach encounter check. Players may still
  burn arcana for the standard +3 / Tiferet-tilt while the Shell
  is active; the Shell is teaching that movement *toward* desire
  is blocked, not that the encounter at Netzach itself is.

### 3.6 Yesod (Selene) — Dream-Peek

> *"Nothing is solid here."* (`reference/sefirot.md` § Yesod)

**Mechanic name.** Dream-Peek.

**Rule.** During prep, the player may stage a **dream-guess** modifier:
guess whether the **top arcanum's pillar** (`Mercy` / `Severity` /
`Balance`) is the one Selene is dreaming of. The engine generates
the "dream pillar" deterministically from a per-encounter seed at
the moment Yesod is reached (so every player can verify after the
fact, but the active player can't game it from prior knowledge).

- **Match** (player's guess equals the dream pillar): +5 to the roll
  (the dream rang true).
- **Miss**: no penalty, but the dream pillar is revealed at confirm
  time so the player sees what they almost saw.
- **No guess staged**: standard chassis.

**Chassis composition.**

- New `PrepModifier` variant: `{ kind: 'dream-guess'; pillar:
  Pillar }`. See § 2.7 for shape and lifecycle.
- The "dream pillar" lives on `state.encounter.dreamPillar` (per
  § 2.6 — the envelope, not the discussed-but-never-implemented
  `state.encounterSefirah`). Set at envelope init when phase
  transitions into `'challenge'` at Yesod, by deriving deterministically
  from the envelope's `seed` field plus the per-encounter
  `retryCount`. Cleared when phase leaves `'challenge'`.
- **Seed source (S5 fix).** `state.seed` and `state.turnCount` do
  NOT exist on GameState today (RNG is held externally; turns are
  not counted on `GameState`). The envelope's `seed: number` field
  (per § 2.6) is set at encounter init from a hash of stable
  fields: `hash(state.players.length, state.players.map(p=>p.id).join('|'),
  state.activePlayerId, state.illumination, state.separation,
  'yesod-dream')`. The dream pillar is then
  `seedRng(state.encounter.seed + state.encounter.retryCount).pickOne(
  ['mercy', 'severity', 'balance'])`. Replay-determinism: the same
  game history hashes to the same seed, so saved-game replay
  reproduces the dream. The active player cannot precompute it
  because the inputs (Illumination / Separation tally at the
  moment of Yesod arrival) are not knowable at arbitrary distance
  from the encounter.
- Validation at `prep-confirm`: if guess pillar matches dream pillar,
  `flatBonus += 5` (per § 2.6). Either way, emit `{ kind:
  'dream-revealed'; pillar: Pillar }` event for the UI **only on
  match**. Miss event: `{ kind: 'dream-missed' }` with NO pillar
  field (the player sees their guess didn't match; the actual
  dream pillar is NOT revealed — see "Retry information-hiding" below).
- Only one dream-guess may be staged per encounter (reducer rejects
  the second add). Player may remove and re-stage with a different
  guess **before** confirm. After confirm, the modifier is consumed
  (§ 2.7); a retry must re-stage fresh.

**Retry information-hiding (C4 fix).** As with Hod's Word-Match,
naive retry semantics would let a missed guess inform the next:
on miss, the dream is revealed → retry stages with known answer →
guaranteed +5. Two rules close the exploit:

1. **The miss event omits the actual dream pillar** (per the
   Validation bullet above). The player knows their guess was
   wrong but not what the dream was.
2. **The dream pillar is re-seeded on react-retry.** When the
   reducer enters `react-retry` while `state.encounter.sefirah ===
   'yesod'`, it increments `state.encounter.retryCount` by 1 and
   re-derives `dreamPillar = seedRng(state.encounter.seed +
   state.encounter.retryCount).pickOne(['mercy', 'severity',
   'balance'])`. The retry's dream is generally different from the
   first attempt's. Combined with rule (1), the retry has no
   information advantage. The reseed is deterministic (replay
   reproduces) but unknowable to the player at retry-stage time.

**Composition (S6).** The +5 lands through `flatBonus`, so it is
additive with shortcut / Soul Door / pillar-streak deltas — implementer
must compose, not replace. DC composition order: `effectiveDC =
baseDC + shortcutPenalty + soulDoorDelta` (Yesod has no DC tilt of
its own); the +5 is on the modifier side, not the DC side.

**Prep panel UX.** Banner copy: *"Selene is dreaming of one pillar.
Name it."* Three buttons: Mercy / Severity / Balance, each with a
short flavor line. No live feedback. The reveal animates on resolve.

**Sign-aware adjustment.** None. Moon dignity (Cancer ruler, Taurus
exaltation) already tilts Intuition.

**Edge cases.**

- Yesod Spark *Intuition* (`mechanics.md` § Sparks: "Look at the top
  3 cards of the deck and reorder them"): does not interact with
  Dream-Peek. Dream-Peek is about pillar of an internally-rolled
  dream, not the deck. The Spark is about the deck. Independent.
- Replay-determinism: the dream-pillar seed is derived from the
  envelope's `seed` field (§ 2.6) which itself hashes from stable
  GameState fields at encounter init. The active player can't know
  the answer in advance of arrival, but a replay of a saved game
  produces the same dream — necessary for multiplayer state-sync.
- Shell of Yesod — Illusion (per `design/shells.md` § Shell of
  Yesod, "one path's description on the board becomes false.
  Players traveling it pay the card cost but arrive at the wrong
  Sefirah"): does not interact with Dream-Peek directly; the Shell
  affects path-traversal display and arrival, not the encounter
  internals once the player has actually arrived at Yesod. Note
  the irony: a player who *arrives* at Yesod via the illusory
  path (intending Yesod, getting Yesod by accident or vice versa)
  still gets the Dream-Peek mechanic in the encounter that fires
  at the actual arrival node. The Shell teaches mistrust of the
  board, not of Selene's dream.

### 3.7 Binah (Demeter) — Sit With Loss

> *"Form is limitation, and limitation is sorrow."* (`reference/sefirot.md` § Binah)

**Mechanic name.** Sit With Loss.

**Rule.** At Binah, **ally assists are blocked**. The Cosmic Mother's
sorrow is not someone else's burden to carry. The active player must
face Binah alone — modifier-wise.

To compensate, **card-burns at Binah scale with the burned card's
arcanum number**: a burned card grants `+ ceil(arcanum / 4)` to the
roll, on top of the standard +3. Higher-rank cards (XV The Devil, XX
Judgement, XXI The World) thus matter more — concrete losses count.

- Card with arcanum 0–3: standard +3.
- Card with arcanum 4–7: +3 + 1 = +4.
- Card with arcanum 8–11: +3 + 2 = +5.
- Card with arcanum 12–15: +3 + 3 = +6.
- Card with arcanum 16–19: +3 + 4 = +7.
- Card with arcanum 20–21: +3 + 5 = +8.

**Prior-burn-persistence is chassis default — narrative emphasis only
(S9).** Card-burns persist across `react-retry` everywhere — the
chassis preserves `pendingModifiers.cardBurns` after a failed
`prep-confirm` so the player can stack additional burns on top
(design § 6, implemented in `lib/turn-machine.ts` `react-retry`
case). Binah is **not** introducing bespoke engine code for retry
persistence; that machinery is the chassis default. What Binah does
add is **UX emphasis**: the prep panel after a failed first attempt
should acknowledge the prior loss explicitly (e.g. *"You burned The
Moon. Demeter remembers."*) rather than letting it disappear silently
from the affordance list. The mechanic differentiates by *foregrounding*
the loss, not by re-implementing a chassis behaviour.

**Chassis composition.**

- No new `PrepModifier` variant.
- At `prep-add-modifier` for an `assist-request` modifier when
  `state.encounter?.sefirah === 'binah'` (per § 2.6): reject with
  `Result` error `'binah-no-assists'`. UI surfaces this inline and
  disables the Assist affordance entirely on the prep panel.
- DC stays standard (16, per `mechanics.md`). Composition order
  per S6: `effectiveDC = baseDC + shortcutPenalty + soulDoorDelta`
  (Binah has no DC tilt of its own).
- The arcanum-scaled burn bonus replaces the flat +3 inside
  `resolveChallenge` *only when* `state.encounter?.sefirah ===
  'binah'`. At every other Sefirah, +3 stays flat.

**Prep panel UX.** Banner copy: *"Demeter sits alone. So do you."*
The Assist affordance is greyed with tooltip *"Binah is borne
alone."* Each card-in-hand shows its Binah-specific bonus subscript:
*"+5 at Binah"* on a card with arcanum 10. Players can quickly see
which loss counts most.

**Sign-aware adjustment.** None. Saturn dignity (Capricorn ruler,
Aquarius co-ruler, Libra exaltation) already tilts Understanding.

**Edge cases.**

- Spark-burns *are* allowed (the prohibition is on *ally* assists, not
  on the active player's own resources). Sparks remain +5 flat.
- Tiferet Spark *Harmony* (`mechanics.md` § Sparks: "Resolve a
  challenge as if two allies were present"): if used at Binah, this
  *bypasses* the assist-blocking rule because the Spark synthesises
  pseudo-allies at the engine level rather than invoking
  `assist-request`. Permitted but rare — using your one-shot Tiferet
  ability at Binah is a strong signal of the encounter's weight.
- Shell of Binah — Despair (per `design/shells.md` § Shell of
  Binah, "reflection-type actions (Spark ability triggers, Tiferet
  bridges, ally assists) produce no Illumination. The ascent still
  works; it just feels hollow"): assists at Binah are already
  blocked by the encounter mechanic, so the Shell's "ally assists
  produce no Illumination" leg is redundant here. Spark ability
  triggers (e.g. Yesod Intuition's deck-peek used as a hint going
  into Binah) still *function* mechanically but produce no
  Illumination tick on top of the standard Spark grant. The
  Tiferet Spark *Harmony* bypass mentioned in the prior bullet
  still synthesizes pseudo-allies but no longer credits any
  reflection-bonus Illumination while this Shell is active.
  Compounds the alone-with-the-loss feel intentionally — Demeter's
  Shell makes even the workarounds feel hollow.

### 3.8 Chokmah (Athena) — Act Before Thought

> *"The flash before thought."* (`reference/sefirot.md` § Chokmah)

**Mechanic name.** Act Before Thought.

**Rule.** Chokmah penalizes elaborate prep. The DC scales upward with
the count of staged modifiers at `prep-confirm`:

- 0 modifiers staged: DC 16 (standard) − 3 = **13** (the unhesitated
  flash; Athena rewards strike-without-deliberation).
- 1 modifier staged: DC 16 (standard).
- 2 modifiers staged: DC 16 + 5 = **21**.
- 3+ modifiers staged: DC 16 + 9 = **25** (you're not striking, you're
  scheming; Athena withdraws).

Modifier counted: any item across all three `PendingModifiers` arrays
(card-burns, spark-burns, assist-requests). Each card-burn counts as
one (so two card-burns = 2 modifiers, not 1).

**Tuning intent (S7).** With the standard +3 / burn and +5 / spark
modifiers, an earlier draft's tilt of `[-2, 0, +2, +4]` was
structurally broken — at 2 burns the player gained +6 to roll for
+2 DC (net +4 to the player); at 3 burns +9 for +4 (net +5). The
mechanic intended *"scheming = harder"*, but the bonuses dominated
the penalty. The retuned tilt above (`[-3, 0, +5, +9]`) restores
the intent:

- **2 modifiers** (e.g. 2 card-burns = +6 to roll, +5 DC = net +1
  to the player). Still positive, but only just — the second
  modifier is paying for itself, not stacking advantage. Decent if
  your stat is otherwise borderline; a marginal call.
- **3+ modifiers** (e.g. 3 card-burns = +9 to roll, +9 DC = net 0;
  4 card-burns = +12 to roll, +9 DC = net +3 — but the 4th burn
  costs an actual card from hand). The marginal value of stacking
  past 2 is approximately zero plus a real card-cost. Athena
  rejects the over-prepared strike.
- **0 modifiers**: −3 DC = +3 to the player without paying any
  card / spark. The cleanest line — *if* the stat is high enough
  to clear DC 13 without help.

The mechanic now implements the intended pressure: instinct beats
preparation at Chokmah, with a narrow profitable middle (1 burn at
standard DC) for players who can't quite make the bare-flash work.

**Chassis composition.**

- No new `PrepModifier` variant.
- Per-encounter counter on the envelope (§ 2.6):
  `state.encounter.chokmahPriorAttempts: number` (initialized 0 on
  envelope init at Chokmah, cleared on phase leaving `'challenge'`).
- DC modification at `resolveChallenge`: `effectiveDC =
  baseDC + shortcutPenalty + soulDoorDelta + chokmahTilt(
  modifierCountAtConfirm + state.encounter.chokmahPriorAttempts)`
  where `chokmahTilt(n)` is the array `[-3, 0, +5, +9]` for n in
  `[0, 1, 2, 3+]` and clamped at +9 for n ≥ 3. Composition order
  per S6: chassis deltas first, Chokmah tilt last.
- Resolve and react phases unchanged. PendingModifiers clear on
  `prep-confirm` per the chassis pattern. The counter survives the
  prep → resolve → react cycle because it lives on the encounter
  envelope, not on PendingModifiers.
- React-retry increments `chokmahPriorAttempts` by `max(1,
  modifierCountAtConfirm)` — at minimum the retry itself counts as
  one prior strike, and a player who stacked 3 modifiers and
  failed carries that 3-count forward into the next attempt's tilt.
  The escalation is intentional: Chokmah penalizes the second
  attempt more than the first because the strike is no longer
  instinctive, it's reactive.
- The active player can choose `accept-setback` from react instead
  of stacking further modifiers; setback ends the encounter and
  the counter is cleared on phase exit.

**Prep panel UX.** Banner copy: *"Athena strikes once. Don't
overthink."* A live tilt indicator: *"DC 16 → 13 (instinct)"* /
*"DC 16 (1 modifier)"* / *"DC 16 → 21 (overthinking)"* / *"DC 16 →
25 (scheming)"* updates as modifiers are added. The standard
"Roll" button is renamed *"Strike"* on this encounter.

**Sign-aware adjustment.** **Yes — element fit.** The three fire
signs (Aries, Leo, Sagittarius) get **+2 to the roll** on a
0-modifier strike. Their sign capsules in `avatars.md` § 3 all
land on first-instinct action — Aries "first-mover instinct,
ignites the moment," Leo "conviction, carries the room,"
Sagittarius "aims past the question, names the bigger truth
nobody asked for." Three of twelve signs total. The other nine
signs can still take the 0-modifier flash, they just don't get
the element-bonus on top.

Rationale: this is the one Sefirah where unhesitated action is the
gameplay gesture, and fire-element signs whose native voice *is*
strike-without-thought should land it more cleanly than earth /
water / air signs that have to translate or weigh first. Note the
deliberate asymmetry with § 3.5 — Netzach rewards desire-fluent
signs (water + Venus-ruled); Chokmah rewards instinct-fluent signs
(fire). The two Sefirot lean opposite element directions on
purpose — Aphrodite and Athena are the reflective pair in the
deviation table (`avatars.md` § 1).

**Edge cases.**

- 0-modifier flash with empty hand and no Spark in stock: this is the
  expected play for Chokmah. The encounter is built so that "I have
  nothing to give and I just struck" is a viable winning line if the
  stat is high enough.
- React-retry counter reset on `accept-setback`: yes.
  `chokmahPriorAttempts` is cleared when phase leaves `'challenge'`,
  which `accept-setback` triggers. Next time this player faces
  Chokmah (a re-encounter after being pushed back), the counter
  starts at 0 again — the strike is fresh.
- Shell of Chokmah — Paralysis (per `design/shells.md` § Shell of
  Chokmah, "no player may play a card on the turn they draw it.
  One round of patience required per card acquired"): the Shell
  affects card-play timing across the team, not the encounter
  mechanic directly. The 0-modifier flash bonus is unaffected by
  Paralysis — a player who arrives at Chokmah with a hand of cards
  drawn on prior turns can still stage 0 modifiers and take the
  −3 tilt. The Shell's pressure is on *how the player got to
  Chokmah* (cards just drawn can't be played for movement, slowing
  arrival), not on what happens once they're there. This is a
  rare case where the Shell's effect operates *outside* the
  encounter; the mechanic is still itself.
- Spark of Insight (`mechanics.md` § Sparks: "Play a second card
  this turn at no cost"): the Spark grants an extra card-play, not
  an encounter modifier. Independent. Does not count against the
  Chokmah modifier-count tilt.

---

## 4. Follow-up implementation tickets (fan-out)

This document is locked. Eight implementation tickets fan out from
it, one per Sefirah. Each follows the chassis-doc § 8 pattern of
small, scoped, TDD-driven slices. The acceptance-criteria sketch
below is the seed for each ticket body — sized to be a single-PR
slice with engine-level tests as the primary gate.

Suggested filing order: **Hod, Yesod, Tiferet, Netzach** first
(they're additive — new modifier variants or DC tilts that don't
gate prep-confirm). Then **Gevurah, Chesed, Binah** (gate logic +
react-state branching). Then **Chokmah** last (modifier-count tilt
interacts with all the others; pinning it after the others land
means the test fixtures already cover the interactions).

**Shared engine prerequisite (M9).** Every ticket below depends on
the § 2.6 surfaces (`CheckModifiers.flatBonus`, `GameState.encounter`
envelope) being in place. The first ticket landed should include
those surfaces as part of its diff (or a tiny precursor ticket lands
them first); subsequent tickets extend the envelope (Yesod adds
`dreamPillar` + `retryCount`, Chokmah adds `chokmahPriorAttempts`,
Hod adds `deceptionMisreport`, Netzach adds `netzachPriorFails`).

| # | Ticket | Sefirah | Mechanic | Engine touch | UX touch |
|---|---|---|---|---|---|
| 1 | per-Sefirah: Hod Word-Match | Hod | Word-Match | § 2.6 surfaces (envelope + `flatBonus`) IF not already landed; new `name-card` `PrepModifier` (§ 2.7); `prep-confirm` validator that peeks `state.deck[0]` and adds +5 to `flatBonus` on match; consume `name-card` regardless of pass/fail; emit `card-named-miss` event with NO actual; envelope `deceptionMisreport` field for Shell of Hod | name-a-card dropdown; banner; consumed-on-confirm UX |
| 2 | per-Sefirah: Yesod Dream-Peek | Yesod | Dream-Peek | new `dream-guess` `PrepModifier` (§ 2.7); envelope `seed` + `dreamPillar` + `retryCount` fields; deterministic seed-derivation at envelope init; reseed `dreamPillar` on `react-retry`; +5 via `flatBonus` on match; emit `dream-revealed` ON MATCH ONLY (omit pillar on miss) | three-button picker; banner; reveal animation gated to match |
| 3 | per-Sefirah: Tiferet Two-Pillar Balance | Tiferet | Two-Pillar Balance | DC tilt by `pillarsCrossed` set-union of staged card-burns (≥2 burns required); composes additively with shortcut + Soul Door deltas (S6); test matrix per § 3.4 | live pillar-tally widget; banner |
| 4 | per-Sefirah: Netzach Declared Desire | Netzach | Declared Desire | new `declare-desire` `PrepModifier` (§ 2.7); new `PlayerState.declaredDesire` field (never cleared); new `PlayerState.pendingStatBuff` field (consumed on next stat-check); envelope `netzachPriorFails` counter; retry-within-same-encounter DC +1 if undeclared (C6 fix); sign-aware +2 via `flatBonus` for water + Venus-ruled signs | 9-Sefirah picker; flavor line; banner |
| 5 | per-Sefirah: Gevurah Sacred Sacrifice | Gevurah | Sacred Sacrifice | confirm-time gate (`gevurah-requires-burn` `TurnReducerError` variant); dearest-card +2 `flatBonus` tilt; tuning intent locked per § 3.2 (auto-pass on dearest is intentional) | greyed Roll + dearest marker; banner |
| 6 | per-Sefirah: Chesed Overflow | Chesed | Overflow | new `gift-card` `PrepModifier` (§ 2.7); transfer-at-confirm with auto-discard for hand-capped recipient (S4 v1 corner); DC reduction `min(gifts.length+1, 4)` capped at −4; new `'hoarding'` react sub-branch; new `chesed-overflow-bonus` event for +1 extra Illumination on unmodified-DC pass (S2); new `chesed-hoarding-fail` event for +2 Separation on hoarding setback (S3) | gift affordance; live DC preview; banner; explicit "no allies to receive" empty-state |
| 7 | per-Sefirah: Binah Sit With Loss | Binah | Sit With Loss | reject `assist-request` at `prep-add-modifier` when envelope at Binah (`binah-no-assists` error); arcanum-scaled burn bonus replacing flat +3 inside `resolveChallenge` when envelope at Binah; NO bespoke retry-persistence (chassis default per S9) | greyed Assist; per-card subscript; banner; "Demeter remembers" UX line on retry |
| 8 | per-Sefirah: Chokmah Act Before Thought | Chokmah | Act Before Thought | DC tilt `[-3, 0, +5, +9]` by modifier count + envelope `chokmahPriorAttempts` (S7-retuned); composes additively per S6; sign-aware +2 `flatBonus` on 0-modifier flash for fire signs | live tilt indicator; "Strike" button; banner |

Each ticket should:

1. Land the engine change first, with a unit test that exercises the
   new behaviour at the `engine/checks.ts:resolveChallenge` /
   `lib/turn-machine.ts:turnReducer` layer.
2. Add a multiplayer-flow integration test (mirrors the chassis-doc
   E2 pattern) that drives a full prep → resolve → react cycle at
   the target Sefirah and asserts the per-Sefirah outcome.
3. Surface the prep-panel UX in `EncounterScreen` (or whichever
   component E3 produces). Per § 2.2, the twist banner is mandatory.
4. Cite this doc in the PR body as `Refs #284` and the parent epic
   as `Refs #117`. The ticket itself is its own `Closes #...`.

Out of scope for the eight implementation tickets:

- **Avatar-voice copy generation.** Owned by `avatars.md` (#276 +
  follow-ups). Implementation tickets render copy by reading
  avatars.md's matrix; they don't author new copy.
- **Animation polish.** A separate art-and-anim ticket batch can
  layer on top once the eight mechanics ship. Implementation tickets
  ship with workmanlike default animations (fade in / slide up / d20
  spin per existing chassis).
- **Tutorial copy** for the new mechanics. Owned by Epic #224
  (in-game tutorial + hint system).
- **Shell-of-X polish** for any twist-Shell interaction that turns
  out to need bespoke wording. The edge-case bullets above call out
  the intended behaviour; copy gets added under #224.

---

## 5. Status

**LOCKED.** Eight implementation sub-tickets unblocked.
