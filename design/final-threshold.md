<!-- code-ref: engine/endgame.ts:resolveFinalThreshold -->
<!-- code-ref: engine/endgame.ts:REQUIRED_ILLUMINATION_MARGIN -->
<!-- code-ref: engine/endgame.ts:SEPARATION_LOSS_THRESHOLD -->
<!-- code-ref: engine/endgame.ts:FinalThresholdInput -->
<!-- code-ref: engine/endgame.ts:FinalThresholdSuccess -->

# The Final Threshold — Kether collective encounter

Ticket: **#285**. Parent epic: **#117** (turn-based encounter system with
Sefirot avatars). Sibling design: **`design/encounter-prep-phase.md`** (the
8-Sefirah individual-player chassis).

Kether is the apex of the Tree. Arrival there is the climax of the game.
Per the avatar mapping in `design/avatars.md` § 1, **Kether's avatar is
the team itself** — there is no single deity for the Crown's "unity,
source, pure being." The Final Threshold is on, and of, the team.

This document is the **contract** for the Final Threshold ritual and the
spawn-tickets that implement it.

---

## 1. Context

The 8 active Sefirot (Yesod, Hod, Netzach, Tiferet, Gevurah, Chesed,
Binah, Chokmah) use the prep → resolve → react chassis from
`design/encounter-prep-phase.md`. Each is an **individual** encounter:
one active player, one d20, one DC, one verdict (a deity voice from
`design/avatars.md` § 7) calibrated by the active player's zodiac sign.

Kether is structurally different on every axis:

| Axis | 8 Sefirot | Kether |
|---|---|---|
| Active scope | One player | All players |
| Resolution | d20 + stat ≥ DC | Cards-and-narration ritual + illumination ≥ separation + 5 |
| Avatar | Single deity (per `design/avatars.md`) | The team itself |
| Outcome verdict | Pass / fail per-encounter | Win / lose for the *game* |
| Trigger | Arriving at the Sefirah | All players already at Kether |

The Malkuth↔Kether asymmetry is also load-bearing and worth stating
once: **Malkuth has no encounter** (it is the start; Hestia's role per
`design/avatars.md` § 1 is companion, not challenger), and **Kether
has the Final Threshold** (the *only* collective encounter). Neither
fits the 8-Sefirah chassis. Both are intentional structural exceptions.

The mechanical skeleton of the Threshold already exists in
`engine/endgame.ts:resolveFinalThreshold`. This document **locks the
ritual semantics, the composition with the prep/resolve/react frame,
the win/loss branches, and the sign-awareness scope** so the spawn-
tickets in § 7 have an unambiguous contract.

---

## 2. The mechanic — locked

**Name: the Round-Robin Card-Witness Ritual.**

The mechanic is a single in-engine ritual that runs once when the team
arrives whole at Kether. It has three intrinsic acts (gather → witness
→ close) which echo prep/resolve/react thematically but are *not* the
chassis from `encounter-prep-phase.md` — see § 3.

### 2.1 Trigger and the pre-ritual hold

The ritual triggers when a single condition becomes true:

> **Every player's `position === 'kether'`** AND the game is not already
> in a lost end-state (`separation < 15` per `SEPARATION_LOSS_THRESHOLD`).

The phase machine transitions into a new top-level `phase === 'kether'`
state. The 8-Sefirah `phase === 'challenge'` does **not** fire at
Kether even though the player has "arrived at an uncleared Sefirah" —
the engine detects Kether-arrival and routes to the ritual instead.
The first player to arrive at Kether **waits** in a pre-ritual hold;
the ritual itself only begins once the last player arrives.

#### Pre-ritual hold semantics — locked

When a player arrives at Kether but the rest of the team has not, that
player's seat enters a **Kether-held** state. The semantics are:

- **Seat rotation skips them.** The `endTurn` reducer, when advancing
  to the next seat, looks past any player whose `position === 'kether'`
  while the game's overall `phase !== 'kether'` (i.e. the ritual hasn't
  started because not everyone has arrived). The pointer wraps to the
  next non-held player.
- **Held players cannot act.** They cannot Move, Meditate, draw, or
  take any turn-machine action. Their UI shows a "waiting for the
  rest of the team" view (per K3 in § 7.1).
- **Held players' stats and hand FREEZE.** No automatic draw at their
  (skipped) turn start, no Spark gain, no Spark loss, no card-play, no
  Shells personal effects (Shell awakenings continue to apply *team*
  pressure to other players' turns through illumination/separation,
  but the held player themselves does not tick).
- **Other players continue normally.** Their turns run as usual; if a
  Shell awakens during their turn, it applies to whoever is acting.
  The team-level counters (illumination, separation) continue to move
  on non-held players' turns until the last player arrives.

Engine implication: K1 must encode "held-at-Kether" either via a
derived predicate (`p.position === 'kether' && state.phase !== 'kether'`)
or via an explicit `KetherHeld: true` flag on `PlayerState`. The
derived predicate is preferred — no new field, the truth is the
`position`-`phase` pair. The `endTurn` reducer's seat-rotation gains a
"skip held seats" step. UI implication: K3 renders a held-player view
distinct from the active turn UI.

### 2.2 Gather

When the last player arrives:

- All remaining hands are revealed to the table (the ritual is
  collective; cards are no longer private).
- All previously-earned Sparks are pooled into a shared **Threshold
  Reserve** (visually; mechanically each Spark still belongs to its
  earner — § 5 covers spend semantics).
- The illumination / separation counters freeze for the duration of
  the ritual. No Shell awakening can fire during the ritual; no
  ordinary turn-machine action (move, draw, meditate) is legal.
  Likewise the engine's `checkEndgame` query is **not** consulted while
  `phase === 'kether'` — the ritual writes its own end-state when it
  closes (§ 4.1). `checkEndgame`'s `'won'` predicate only triggers via
  the ritual's confirm path; calling it mid-ritual would let a
  fortuitous illumination spike short-circuit the witness round-robin.
  This is a contract claim K1 must enforce.
- Each player's remaining cards form their personal **witness queue**.
  The order within a queue is the player's choice; the order across
  queues is round-robin starting from the player who arrived last
  (the player who completed the team's arrival speaks first — they
  closed the journey, they open the ritual).

#### Round-robin starting player — deterministic rule

"The player who arrived last" must be deterministic. Pinned rules:

- **Multiplayer** (Realtime): the player whose wire event flipped
  their `position` to `'kether'` carrying the latest server-side
  Realtime timestamp. The arrival timestamp is recorded on
  `KetherRitualState.arrivalTimestamps[playerId]` at the moment
  the engine sees the position change.
- **Hot-seat** (single-machine): the player whose seat-rotation index
  most recently advanced into Kether — i.e. the player who held the
  active seat at the moment their `position` flipped to `'kether'`.
- **Tie-break**: lexicographic on `playerId` if two arrival events
  resolve to the same recorded timestamp (nominal, but
  deterministic).

The full `witnessOrder` is derived once at gather time from these
timestamps (descending — last-arrived first; the rest of the team
follows in reverse-arrival order). It is then frozen for the ritual
(§ 5.3).

#### Player-count floor — hot-seat implications

The ritual presumes ≥ 2 players. Pinned rule:

- **Multiplayer**: minimum 2 players is already a room-creation
  invariant. No additional gate needed.
- **Hot-seat solo (1 player)**: the round-robin chorus is degenerate
  (a chorus of one is a soliloquy). For MVP, hot-seat solo runs an
  **abbreviated coda**: a single witness step where the lone player
  plays-or-passes each card from their final hand in arrival order
  (no round-robin pointer needed — it's a flat queue), then enters
  the closure window per § 2.4 normally. The end-state branches in
  § 4 are unchanged. K3's `FinalThresholdScreen` collapses the
  per-player chorus UI to the single-voice variant; K4's `useTurn`
  adapter exposes the same per-step methods (`ketherWitnessPlay`,
  `ketherWitnessPass`, etc.) — only the order layer is degenerate.

This **decision is locked**: hot-seat solo plays the abbreviated coda;
the ritual does not error or skip. It is a valid, documented variant.

### 2.3 Witness — round-robin contribution

This is the heart of the ritual.

- Players take turns, **one card per turn**, round-robin.
- On their turn, the active player:
  1. Plays one card from their witness queue (the card's path-meaning
     is the prompt).
  2. Speaks **one sentence** of in-character reflection — what that
     card describes about the journey, or what its arcanum taught
     them. This is narrative, not mechanical; the engine records the
     event but the sentence is free-form text (or, in tabletop
     parlance, spoken aloud).
  3. The card moves to the discard pile.
- A player whose witness queue is empty is **skipped** in subsequent
  rounds; the ritual continues until **every queue is empty**.
- **No d20 rolls.** No DCs. No card-burn / spark-burn assist
  modifiers within witness — those are 8-Sefirah constructs and
  belong to the chassis, not to the ritual.
- A player may **pass** their turn (declining to play a card they
  hold) at the cost of **+1 Separation** per pass. Passing is the
  refusal-of-circulation cost analogue from `mechanics.md`
  § Drawing & gift handling; it surfaces here too because the ritual
  is itself an act of circulation. Held cards block ritual closure
  until passed or played, so passing is the safety valve for "I
  cannot speak about this card." A player whose queue is empty does
  **not** pay the pass cost — empty is empty, not refusal.

#### Pass cap — anti-griefing rule

Without a cap, a single player passing every card in their queue can
unilaterally drive separation to 15 and force a `separation-overflow`
loss on the rest of the team — a griefing vector. Pinned rule:

> No player may **pass more than ⌈personalQueueLength / 2⌉ cards**
> within a single ritual. Pass attempts beyond the cap are rejected at
> the K1 reducer (`turn-reducer-error`, kind `kether-pass-cap-exceeded`)
> and at the K2 authorize gate (defense-in-depth).

`personalQueueLength` is the player's hand size *at gather time*
(frozen on entry to the ritual, stored on `KetherRitualState` as
`personalQueueLengths[playerId]`). A 4-card queue caps at 2 passes; a
6-card queue caps at 3; a 1-card queue caps at 1 (rounding up: even
one card may be passed). The cap leaves room for genuine
"I cannot speak about this card" but blocks deliberate sabotage.

The cap is **per-player, not team-aggregate** — three players each
hitting their 2-pass cap is still 6 ritual passes, +6 Separation. The
team must coordinate to avoid a Threshold-fail by collective passing;
this is by design. The cap blocks unilateral griefing only.

Why round-robin and not all-roll-simultaneously: the design candidates
in #285's body included three shapes. Round-robin won because:

1. It preserves the **per-player narrative beat** that the rest of
   the encounter system trains players to expect (every encounter
   has been "your moment, then their moment, then their moment").
   Simultaneous play loses the beat.
2. It scales cleanly across player counts (2/3/4) without the queue-
   contention coordination problems of "all roll at once."
3. It makes "the team became the avatar" mechanically visible — the
   team's voice is **the round-robin chorus**, each player a stanza,
   the cards their psalter. No single voice; many voices, one ritual.
4. It maps naturally onto the existing turn-machine's per-action
   dispatcher (`lib/room-actions.ts:applyClientAction`); each
   witness step is one wire-format action.

### 2.4 Close — the illumination gap

When every queue is empty (or has been passed to empty):

1. The engine reads `state.illumination` and `state.separation`.
2. If `illumination ≥ separation + REQUIRED_ILLUMINATION_MARGIN`
   (currently **5**) → **the team wins**. The ritual emits a
   `FinalThresholdSuccess` with `status: 'won'`, the phase exits the
   `'kether'` state to a terminal value, and the post-ritual
   `EndgameStatus.status` (read by `checkEndgame`) reads `'won'`.
   End of game. (Phase / endgame-status mapping is locked in § 3.4.)
3. Otherwise the team enters a **Spark closure window**: each
   remaining held Spark may be burned for **+1 Illumination**. Spark
   spend is per-player (the Spark belongs to its earner) but the
   table coordinates which to burn. Sparks burned here behave the
   same as the existing `spark-spent` event (per
   `engine/endgame.ts:resolveFinalThreshold`); they raise
   illumination by the standard +1.
4. After all desired Sparks are burned, the engine re-checks the
   margin.
   - Margin met → **the team wins** (same emit as step 2).
   - Margin still not met (or the team voluntarily declines further
     burns) → **the team loses by illumination-gap**
     (`FinalThresholdSuccess` with `status: 'lost'`,
     `reason: 'illumination-gap'`).

#### Closure-window confirm — split-vote race rule

`threshold-confirm` is authorized for any player (§ 3.3). The team
might race — Player A confirms while Player B is mid-keystroke staging
another Spark. Pinned rule:

> **First confirm wins.** The first `threshold-confirm` action received
> by the reducer is authoritative. Any in-flight Spark stage actions
> that arrive after it are **rejected** (the closure window is closed
> from the engine's perspective). Sparks staged *before* the confirm
> arrived are committed at confirm time (each contributing +1
> Illumination via `spark-spent`); sparks not yet staged are not.

This matches the design's lightweight-ritual tone — a quorum gate
would force the team to coordinate every confirm explicitly, which is
heavier than the rest of the ritual warrants. The UI's role (K3) is
to surface a "ready to confirm?" state across the table so split-vote
races are rare in practice; the engine's role is to be deterministic
when one happens.

Spark spend during the closure window is voluntary and revocable
**until** the first `threshold-confirm` action lands. Pre-confirm, a
player may un-stage a Spark burn the same way prep modifiers are
revocable in the chassis — the Spark hasn't actually been consumed
yet. Post-confirm, the staged set is locked.

---

## 3. Composition with prep → resolve → react

The 8-Sefirah chassis (`design/encounter-prep-phase.md`) is **replaced**
for the Final Threshold, not extended.

### 3.1 What the chassis assumes — and what breaks at Kether

The chassis is built on five assumptions:

1. There is one **active player** dispatching every action.
2. The encounter resolves with a **d20 against a DC**.
3. Pending modifiers (card-burn, spark-burn, ally-assist) **roll into
   one number** that adds to the d20.
4. The verdict is a **per-Sefirah avatar voice** calibrated by the
   active player's **zodiac sign**.
5. On fail, the player chooses **retry-with-burn** or **accept-setback
   (push back one Sefirah, +Separation)**.

Every one of these breaks at Kether:

1. There is no single active player. Every player witnesses.
2. There is no d20 and no DC. The pass condition is
   `illumination ≥ separation + 5`, computed against shared counters,
   not rolled.
3. There are no per-encounter modifiers. The "modifier" *is* the
   accumulated illumination/separation balance from the entire
   journey — every prior choice was the modifier.
4. There is no per-Sefirah deity voice — Kether's avatar is the team
   (`design/avatars.md` § 1, "the team becomes the avatar") — and
   the verdict is collective, not addressed-to-one-player.
5. On fail, no one is "pushed back one Sefirah" — there is no Sefirah
   below Kether to push to within the ritual frame, and the team
   has already arrived together. The Threshold-fail branch is
   game-end (see § 4), not encounter-retry.

### 3.2 The thematic echo — kept

The **rhythm** of prep / resolve / react is preserved as a thematic
parallel, but each act is reinterpreted:

| Chassis act | Kether parallel | Engine name |
|---|---|---|
| Prep (active player stages modifiers) | Gather (team converges, hands reveal, Sparks pool) | `kether-gather` |
| Resolve (d20 + modifiers fires) | Witness (round-robin card-and-sentence) | `kether-witness` |
| React (pass/fail outcome handling) | Close (illumination gap + Spark closure window) | `kether-close` |

The phase model uses a **new `KetherSubPhase`** type analogous to but
*disjoint from* `ChallengeSubPhase`:

```typescript
// engine/types.ts (proposed shape — owned by spawn-ticket K1)

export type TurnPhase =
  | 'move' | 'challenge' | 'draw' | 'end'
  | 'kether';   // NEW top-level phase (the in-ritual state)

export type ChallengeSubPhase = 'prep' | 'resolve' | 'react';   // unchanged

export type KetherSubPhase = 'gather' | 'witness' | 'close';   // NEW

export interface TurnSnapshot {
  readonly state: GameState;
  readonly phase: TurnPhase;
  readonly challengeSubPhase?: ChallengeSubPhase;   // only when phase === 'challenge'
  readonly ketherSubPhase?: KetherSubPhase;         // only when phase === 'kether'
}
```

Why a top-level `'kether'` phase rather than a `challengeSubPhase` of
`'kether-collective'`: because `'challenge'` carries the
"individual-active-player" semantics throughout the codebase — the
authorize gate, the EncounterScreen, the existing avatar-verdict
matrix all key on it. Reusing `'challenge'` for the collective ritual
would force every consumer to branch on "is this *really* a challenge,
or is it the Kether ritual?" and lose the diff-localization win that
`encounter-prep-phase.md` § 3 specifically chose. A new top-level
phase keeps the chassis untouched and gives the ritual a clean own
state machine.

This *does* differ from the chassis's recommendation to keep
`TurnPhase` stable. The chassis's tradeoff (option A vs option B in
§ 3 of `encounter-prep-phase.md`) considered only the 8-Sefirah case,
where adding a phase per sub-act would touch every consumer. Kether
is special-cased once — the diff is bounded, not multiplied.

### 3.3 Authorize gate

`lib/authorize.ts` currently restricts most actions to the active
player. The ritual-stage actions (§ 5) **broaden this gate** for the
Kether phase only:

- During `phase === 'kether'`, the authorize gate's "is dispatcher the
  active player?" check is bypassed in favor of a per-action check:
  - `kether-witness-play` is authorized only for the player whose
    turn in the round-robin it currently is (a different per-action
    rule, not "active player" in the turn-machine sense).
  - `kether-close-stage-spark` and `kether-close-unstage-spark` are
    authorized for the Spark's `playerId` only.
  - `threshold-confirm` is authorized for any player (any one player
    can close the closure window once the team has agreed).

The traditional `state.activePlayerId` field is **frozen** at the
moment of ritual entry and not advanced during the ritual. The
witness round-robin keeps its own pointer (`ketherWitnessTurnIndex`,
proposed) on `GameState`. After the ritual ends — win or lose — the
game is over; no advance-active-player handoff is needed.

This is a deliberate broadening, not a hole. The 8-Sefirah gate's
single-active-player rule is what enforces "no out-of-turn play"
during normal play; the Kether ritual's per-action rules enforce the
analogous discipline in the collective frame.

### 3.4 `TurnPhase` vs `EndgameStatus.status` — locked

A naive reading of the ritual's "phase transitions to `'won'`" claim
would type-error: `engine/types.ts:38` defines
`TurnPhase = 'move' | 'challenge' | 'draw' | 'end'`, and `'won'` /
`'lost'` are values of `EndgameStatus.status` (returned by
`engine/endgame.ts:checkEndgame`), **not** phases. This document
locks the relationship so K1 doesn't drift.

**Pinned model (path b in the review):**

- `TurnPhase` is extended to add only `'kether'` — the *in-ritual*
  phase. `TurnPhase` stays `'move' | 'challenge' | 'draw' | 'end' | 'kether'`.
  No `'won'` / `'lost'` phase values.
- `EndgameStatus` (returned by `checkEndgame`) remains the source of
  truth for game-end. Its `status` is `'ongoing' | 'won' | 'lost'`,
  with `reason` extended to include `'illumination-gap'` so all three
  end-states (separation-overflow, stranded, illumination-gap) plus
  the win can be read from a single shape.

  > **K1 implementation note:** the existing `EndgameStatus.reason`
  > union (`'separation-overflow' | 'stranded'`) is widened by K1 to
  > `'separation-overflow' | 'stranded' | 'illumination-gap'`. This
  > replaces the current split where `'illumination-gap'` lives in
  > `FinalThresholdSuccess.reason`; after K1, all loss reasons share
  > one union. `resolveFinalThreshold` becomes an internal helper of
  > the `threshold-confirm` reducer; its public-facing payload is
  > collapsed into the post-ritual `EndgameStatus`.
- The `phase === 'kether'` transition fires on ritual entry (last
  player arrives + § 2.1 trigger met). The phase **exits** `'kether'`
  exactly when `threshold-confirm` is applied. At that point the
  reducer:
  1. Computes the final illumination/separation balance after staged
     Spark burns.
  2. Sets `EndgameStatus` (read by `checkEndgame` against the new
     state) to `'won'` or `'lost'` per § 4.1.
  3. Transitions `phase` out of `'kether'` to **`phase: 'end'`** —
     the existing terminal phase value. The `EndgameStatus` returned
     by `checkEndgame` against the new state carries the actual
     win/lose signal. No new terminal phase value is added; `'end'`
     plus `EndgameStatus.status === 'won' | 'lost'` together signal
     "game over." Callers that today check `state.phase === 'end'`
     to detect end-of-turn must additionally consult `checkEndgame`
     to distinguish "end of an ordinary turn" from "end of run" —
     this is already the existing contract for the on-the-Tree loss
     branches (`separation-overflow`, `stranded`), so no new caller
     burden.
- **`checkEndgame` MUST NOT *write* end-state mid-ritual.** During
  `phase === 'kether'`, the engine layer (reducers) does not consult
  `checkEndgame` for the purpose of transitioning the ritual to a
  terminal state. Only the ritual's own state machine writes the
  end-state. This is a contract claim: K1 includes a property test
  that pins "for any state with `phase === 'kether'` and any sequence
  of witness actions, no engine reducer consults `checkEndgame`; the
  ritual's `threshold-confirm` reducer is the single writer of the
  final `'won'` / `'lost'`."
  - **K1 modifies `checkEndgame` to early-return `{ status: 'ongoing' }`
    while `phase === 'kether'`.** Without this guard, `checkEndgame`
    would already return `'won'` at gather time for any team that
    enters the ritual with illumination ≥ separation + margin (its
    existing logic checks `allAtKether AND margin met`). That would
    let UI callers like `PlayScreen.tsx`'s existing call at line ~121
    render "game won" while the witness round-robin is still in
    progress, short-circuiting the climactic narrative beat. The
    early-return is the simplest fix; it lives in one place; UI
    callers continue to call `checkEndgame` unconditionally with no
    new branching burden. The ritual's confirm reducer flips `phase`
    to `'end'` after writing the final state, at which point
    `checkEndgame` resumes returning the actual `'won'` / `'lost'`
    signal.
  - Exception: the **`separation-overflow`** branch (§ 4.1) may still
    fire mid-ritual via the pass-cost +1 Separation tick. K1
    implements this as an inline check at the end of each
    `kether-witness-pass` reducer step, not via a global
    `checkEndgame` call — same outcome, scoped invocation.

**Why path (b) and not path (a) (extending `TurnPhase` to include
`'won'` / `'lost'`):** path (a) preserves the chassis's "phase is the
single phase variable" model but breaks the existing `EndgameStatus`
contract — `checkEndgame` is the truth-on-state for game-end across
the codebase, and rebuilding it as a phase-setter touches every
consumer. Path (b) keeps the existing engine boundary intact:
`TurnPhase` carries the *flow-of-play* state machine,
`EndgameStatus.status` carries the *game-end* state machine, and the
two compose at the ritual's exit point. This matches how the chassis
already works (per `engine/types.ts:24-31`'s synthesised-vs-truth-on-
state notes).

---

## 4. Win / loss

This section is normative.

### 4.1 Game-end status — three branches at Kether

The Final Threshold has its own end-states distinct from the
on-the-Tree losses (`separation-overflow`, `stranded`). The existing
`engine/endgame.ts` already distinguishes them; this section locks
the meaning.

Per § 3.4, the engine signal is `EndgameStatus` (read by
`checkEndgame` against post-ritual state). K1 widens
`EndgameStatus.reason` to include `'illumination-gap'`.

| Branch | Trigger | Engine signal |
|---|---|---|
| **Win** | All queues empty AND illumination ≥ separation + 5 (with or without Spark closure burns). | Post-ritual `EndgameStatus.status === 'won'`. The `threshold-confirm` reducer path writes the new state and the phase exits `'kether'` to a terminal value (per § 3.4). |
| **Lose — illumination gap** | All queues empty, all desired Sparks burned, margin still not met. | Post-ritual `EndgameStatus.status === 'lost'`, `reason === 'illumination-gap'`. (K1 widens the `reason` union to add this case; pre-K1 it lived in `FinalThresholdSuccess.reason` only.) |
| **Lose — separation overflow during ritual** | Separation hits 15 mid-ritual (only possible via the +1-per-pass cost in § 2.3 if the team has passed many cards from a high-separation start; the per-player pass cap from § 2.3 caps unilateral pressure but a coordinated pile-on can still overflow). | `EndgameStatus.status === 'lost'`, `reason === 'separation-overflow'` (existing). Takes precedence over the gap branch. Fires via an inline check at the end of each `kether-witness-pass` reducer step (per § 3.4's contract that `checkEndgame` is not globally consulted mid-ritual). |

#### Player-count tuning of the +5 margin

The required-illumination margin (`REQUIRED_ILLUMINATION_MARGIN = 5`)
is currently a per-game constant, not scaled by player count.
`design/mechanics.md` § Game length and pacing says the game is
*"balanced at 3–4. 2-player is harder."* This document confirms the
margin behavior across player counts:

- **3–4 players**: balanced. The +5 margin assumes the team has
  generated enough illumination during the climb to meet it without
  exhausting Sparks at the closure window. K1's property tests pin
  "a 4-player run that clears at least 5 Sefirot with no
  Shell-cascade losses generates ≥ separation + 5 illumination at
  Kether ≥ 80% of the time" as a regression target.
- **2 players**: harder, **as designed**. The smaller team has fewer
  cooperative-roll opportunities and so less illumination headroom;
  the closure window's Spark burns are correspondingly more
  decisive. The +5 margin is unchanged; the difficulty-up is the
  intended pedagogy ("two voices have to align, not three").
- **Hot-seat solo (1 player, abbreviated coda per § 2.2)**: hardest.
  The +5 margin is unchanged; the lone player must have generated it
  on their own. K1's tests pin a separate solo-coda balance
  expectation: ≥ 50% win rate for a "skilled" simulated solo run.

K1 must NOT silently scale the margin by player count — the constant
is locked at 5. If post-MVP playtesting shows 2-player or solo too
punishing, a future ticket may revisit; until then the difficulty
asymmetry is the intended design statement.

### 4.2 Loss is end-of-run, not retry

A failed Final Threshold ends the run. The team does **not**:

- Get pushed back to Tiferet or any prior Sefirah for retry.
- Trigger a Shells cascade (the Shells of `design/shells.md` operate
  during ascent; at Kether the ascent is complete and Shells no
  longer fire).
- Get a "spend Sparks then re-roll" loop beyond the single closure
  window in § 2.4.

The narrative frame is intentional. From `mechanics.md`
§ Loss conditions: *"Losses are not elimination — they are
invitations to restart with what was learned. (The narrative frame
of Kabbalistic return: gilgul, another turn on the wheel.)"* A
Threshold loss is the gilgul moment — the team arrived at the Crown
but couldn't unify enough to pass. The lesson lands in the next
playthrough.

This **decision is locked**: no in-run retry of the Threshold. A
future variant might add one (e.g. "a single team Meditation at
Kether resets queues and refunds one Spark"); not in MVP.

### 4.3 Why no Shells cascade on Threshold-fail

Shells are pressures that arise during the climb (`design/shells.md`
§ Core loop: "Shells are not active from the start. They awaken as
team Separation climbs"). Their pedagogical role is to teach the
Sefirah's gift by inverting it — visit, clear, banish. At Kether
that pedagogy is complete; the team has already met (or skipped)
every Sefirah. A Threshold-fail Shell-cascade would either repeat
the lesson (already learned or already failed) or punish a team for
running out of cards — neither carries the Threshold's narrative
weight. The Threshold's own loss-state IS the cascade equivalent:
the Tree dims, the run ends.

### 4.4 Defensive ordering of end-state checks

The engine's `checkEndgame` already evaluates losses before wins and
separation-overflow before stranding. The ritual extends this:

1. `separation-overflow` (always wins precedence — even mid-ritual,
   via the per-`kether-witness-pass` inline check from § 3.4).
2. `illumination-gap` (only after queues empty + closure window
   confirmed).
3. `won`.

`stranded` cannot fire during the ritual — by definition the team has
cards (or had them; the ritual only completes when queues are
empty, at which point the gap check decides). `stranded` is a
pre-Kether loss only.

> **Pre-Kether dependency note (`canReachKether`):** the existing
> `engine/endgame.ts:canReachKether` predicate is used by the UI to
> show ascent hints during normal play, and a future ticket may
> consult it for AI / nudge logic. It is **not** consulted by the
> Final Threshold ritual itself — once `phase === 'kether'`, the team
> *is* at Kether and the predicate is trivially true for every
> player. Callers branching on the ritual phase should skip
> `canReachKether` outright. K1's tests pin this: no
> `canReachKether` invocation appears in any code path while
> `phase === 'kether'`.

---

## 5. Action shape changes

New `ClientAction` kinds, owned by spawn-ticket K2.

```typescript
// lib/room-actions.ts (proposed shape — owned by K2)

ClientAction =
  | ... // existing kinds unchanged
  | { kind: 'kether-witness-play';     playerId: string; arcanum: number }
  | { kind: 'kether-witness-pass';     playerId: string }
  | { kind: 'kether-close-stage-spark';   playerId: string; sefirah: SefirahKey }
  | { kind: 'kether-close-unstage-spark'; playerId: string; sefirah: SefirahKey }
  | { kind: 'threshold-confirm';       playerId: string }
```

Five new action kinds. Note the asymmetry vs. the 8-Sefirah chassis:
the Kether actions carry `playerId` and the engine cross-checks it
against the round-robin pointer or the Spark's owner — they do **not**
require dispatcher-is-active-player (see § 3.3).

### 5.1 Pending state on `GameState`

Mirroring `PendingModifiers` in the chassis:

```typescript
// engine/types.ts (proposed shape — owned by K1)

/** One step in the witness round-robin. Discriminated by `kind`. */
export type KetherWitnessLogEntry =
  | { readonly kind: 'played'; readonly playerId: string; readonly arcanum: number }
  | { readonly kind: 'passed'; readonly playerId: string };

export interface KetherRitualState {
  /** Whose turn it is in the round-robin. Index into witnessOrder. */
  readonly witnessTurnIndex: number;
  /** Player IDs in original round-robin order (last-arrived first;
   * see § 2.2 for the deterministic rule). Frozen at gather time. */
  readonly witnessOrder: readonly string[];
  /** Recorded arrival timestamps used to derive `witnessOrder`. ms
   * since epoch (Realtime server-side timestamp in multiplayer; engine
   * call-time `Date.now()` in hot-seat). Stored for replay/audit. */
  readonly arrivalTimestamps: Readonly<Record<string, number>>;
  /** Per-player narration log; one entry per witness step so the UI
   * can show the journey-witness as a scroll. Sentence text is the
   * UI's concern; the engine just records the step. The
   * discriminated-union shape lets the UI distinguish a played card
   * from a pass without inventing a sentinel arcanum value. */
  readonly witnessLog: readonly KetherWitnessLogEntry[];
  /** Hand size per player at gather time, used to enforce the
   * § 2.3 pass cap (⌈personalQueueLengths[id] / 2⌉). Frozen on entry. */
  readonly personalQueueLengths: Readonly<Record<string, number>>;
  /** Pass count per player so far in this ritual; checked against
   * the cap on every `kether-witness-pass` action. */
  readonly passCounts: Readonly<Record<string, number>>;
  /** Sparks staged for the closure window (post-witness only). */
  readonly stagedClosureSparks: readonly { playerId: string; sefirah: SefirahKey }[];
  /** Set true by the first `threshold-confirm` action so subsequent
   * `kether-close-stage-spark` actions are rejected (§ 2.4
   * first-confirm-wins rule). Cleared/N/A once the phase exits. */
  readonly closureLocked: boolean;
}
```

`KetherRitualState` lives on `GameState` (not `TurnSnapshot`) for the
same reason `PendingModifiers` does (per `encounter-prep-phase.md`
§ 4): all players need to see the ritual state in real time via the
multiplayer Realtime channel. It is `undefined` outside `phase ===
'kether'` and cleared when the phase ends (game won or lost).

### 5.2 Validation at action time

The reducer validates each action when dispatched:

- `kether-witness-play`: dispatcher's `playerId` must equal
  `witnessOrder[witnessTurnIndex]`; the named `arcanum` must be in the
  dispatcher's hand. On success: card moves to discard,
  `witnessLog` gains a `{ kind: 'played', ... }` entry,
  `witnessTurnIndex` advances (skipping empty queues per § 5.3).
  Invalid → rejection (`turn-reducer-error`, kinds:
  `kether-not-your-turn`, `kether-card-not-in-hand`).
- `kether-witness-pass`: same turn-pointer check; player must hold at
  least one card (passing an empty queue is a no-op, not a +1
  Separation tick). The player's `passCounts[playerId]` must be
  strictly less than `⌈personalQueueLengths[playerId] / 2⌉` (§ 2.3
  pass cap); attempts beyond the cap are rejected
  (`kether-pass-cap-exceeded`). On success: `+1 Separation`,
  `passCounts[playerId]` increments, `witnessLog` gains a
  `{ kind: 'passed', ... }` entry, pointer advances. After the
  Separation increment, the reducer inline-checks the
  `separation-overflow` end-state per § 4.4 — if it fires, the ritual
  exits early to the loss state.
- `kether-close-stage-spark` / `kether-close-unstage-spark`: only legal
  during `'close'` sub-phase AND only while
  `closureLocked === false`; Spark must be currently held by the
  named player. Modifiers are visible-to-all but not consumed until
  `threshold-confirm`. Symmetrical add/remove. Post-lock attempts
  are rejected (`kether-closure-locked`).
- `threshold-confirm`: only legal during `'close'` sub-phase AND only
  while `closureLocked === false` (a second confirm is a no-op
  rejection per § 2.4's first-confirm-wins rule —
  `kether-already-confirmed`). The reducer flips
  `closureLocked: true`, then consumes all staged Sparks (each
  contributes +1 Illumination via the existing `spark-spent` event),
  evaluates the gap, sets the post-ritual `EndgameStatus`, and
  transitions `phase` out of `'kether'` (per § 3.4).

Drop semantics for staged Sparks (parallel to the chassis's drop logic
in `encounter-prep-phase.md` § 5): if a staged Spark is no longer held
at confirm time (e.g. simultaneous burn race — unlikely but covered
defensively), it is silently dropped from the contribution and the
reducer emits a meta field listing dropped sparks so the UI can
surface "your Spark was no longer available."

### 5.3 Round-robin pointer details

`witnessOrder` is fixed at ritual entry (the order the players
arrived at Kether, with the last-arrived first; deterministic rule
per § 2.2). `witnessTurnIndex` advances on each `witness-play` or
`witness-pass`. The reducer's advance step skips any player with an
empty queue, looking forward in `witnessOrder` (wrapping) for the
next player who still holds cards. A player with an empty queue
cannot pass (an empty queue is not refusal — it is exhaustion); only
players who still hold cards can play or pass.

When all queues are empty, the reducer transitions sub-phase
`witness → close` and freezes the pointer.

#### K1 / K2 pointer-ownership boundary — locked

The pointer-advance logic and the multiplayer authorize gate touch
overlapping concerns ("whose turn is it?"). To keep the boundary
clean and prevent drift between layers:

- **K1 (engine) owns the pointer-advance logic.** The reducer's
  advance step (skip-empty, wrap, transition-to-close) is the single
  authoritative implementation. K1 also exposes a **pure query
  helper**:
  ```typescript
  // engine/endgame.ts (or a sibling module — owned by K1)
  export function currentWitnessPlayerId(state: GameState): string | null;
  ```
  Returns the player whose turn it currently is in the round-robin,
  or `null` outside `phase === 'kether'` / outside the witness sub-phase.
  The helper is a pure read of `KetherRitualState.witnessOrder` and
  `witnessTurnIndex`; it does not mutate state.
- **K2 (multiplayer authorize gate) is a pure read of the snapshot.**
  K2's authorize gate for `kether-witness-play` and
  `kether-witness-pass` does:
  ```typescript
  if (action.playerId !== currentWitnessPlayerId(state)) reject;
  ```
  K2 does **not** duplicate the advance logic (no skip-empty, no
  wrap, no end-of-witness detection — those are K1 reducer concerns).
- **Consequence:** any future change to advance rules
  (e.g. a different tie-break, a new "queue jump" affordance) is a
  **K1-only** change. K2's gate is stable across such changes
  because it consults the same pure query that the reducer
  consumes. Property test in K2's suite: "for every legal sequence
  of witness actions, K2's authorize gate accepts exactly the action
  whose `playerId` matches `currentWitnessPlayerId(state)`."

---

## 6. Sign awareness — out of scope for MVP

`design/avatars.md` defines a per-Sefirah verdict matrix keyed by
**zodiac sign** for the 8 individual-encounter Sefirot. Each Sefirah's
avatar speaks 12 distinct verdicts, one per sign, calibrated by
planetary dignity.

This shape **does not transfer to Kether**.

### 6.1 Why the chassis's sign axis doesn't fit

The chassis's sign axis works because:

- There is **one** active player to address.
- The avatar is **one** voice with a **one-line verdict**.
- The verdict is **deterministic** from `[sefirah][sign][outcome]`.

At Kether all three break:

- There is no single addressee — the team is the audience.
- There is no single voice — the team is the avatar; the "verdict" is
  the chorus of round-robin sentences plus the binary illumination
  margin.
- The verdict is not deterministic from sign — it is the literal
  history of the team's choices (illumination/separation as recorded
  by the engine across the whole game). Sign-flavored copy on top of
  that history would be theatrical noise.

### 6.2 What we explicitly out-scope

- **No per-sign Kether verdict matrix.** No row in
  `design/avatars.md` § 7 for Kether. The existing
  `design/avatars.md` § 7.9 ("Kether — collective Final Threshold")
  defers to this document; that deferral stands — the answer is
  "there is no matrix." K1 / K3 must NOT add a Kether row to the
  per-Sefirah verdict picker (`data/sefirah-verdicts.ts`); the
  existing `EncounterAvatarKey = Exclude<SefirahKey, 'kether' | 'malkuth'>`
  narrowing in that file already enforces this and is correct.
- **No per-sign aggregation for the gap formula.** The illumination
  margin is the formula. Sign doesn't contribute a stat to it. (The
  team's *Kether stat* — Unity, rolled at setup — already factors
  into every cooperative assist per `reference/sefirot.md`; that
  feeds illumination through ordinary play, not at the Threshold.)
- **No "each player's sign contributes a different stat at the
  Threshold" mechanic.** Considered and rejected — it would re-
  introduce the d20+stat machinery the ritual is specifically
  replacing, and would produce 12-class balance work we don't need
  for MVP.

### 6.3 Future variant — sign-flavored narration prompts

A polish ticket can later layer **sign-flavored narration prompts**
on top of the witness ritual. For each card played, the UI would
suggest a one-sentence prompt template chosen from the player's sign
capsule (`design/avatars.md` § 3). These are **suggestions for the
player's free-form narration**, not deterministic verdicts. They do
not affect the engine state and require no change to the gap
formula.

That ticket is **K5** in § 7. Out of MVP scope.

---

## 7. Spawn-tickets

This document is the contract. Spawn-tickets implement against it.
Each is filed as a separate issue with `Closes #<num>` references back
to this doc, mirroring the `#223 → E1–E4` pattern in
`encounter-prep-phase.md` § 8.

**Boundaries (locked):**

- **K1 owns** the engine: `KetherSubPhase` and `KetherRitualState`
  types, the `phase === 'kether'` transitions, the witness round-
  robin reducer, the closure-window staging logic, the
  end-state branching. Extends `engine/endgame.ts` with the ritual
  state-machine layer above the existing `resolveFinalThreshold`
  primitive (which becomes an internal helper, not the public
  surface). TDD-driven; the existing `engine/__tests__/endgame.test.ts`
  pins the gap-and-spark math and stays green.
- **K2 owns** the multiplayer wiring: five new `ClientAction` kinds in
  `lib/room-actions.ts:applyClientAction`, the broadened authorize
  gate for `phase === 'kether'`, and the multiplayer-flow integration
  test driving a full 2-player ritual end-to-end (pass and fail
  branches both pinned).
- **K3 owns** the UI: a new `FinalThresholdScreen` component that
  renders the gather → witness → close sub-states. Wired so that
  `phase === 'kether'` short-circuits the `EncounterScreen` and the
  `ChallengeModal`-equivalent paths. Includes the witness scroll
  (per-card narration log) and the closure-window Spark staging
  panel.
- **K4 owns** the `useTurn` adapter: exposes `ketherSubPhase`,
  `ketherRitualState`, and per-step methods (`ketherWitnessPlay`,
  `ketherWitnessPass`, `ketherCloseStageSpark`,
  `ketherCloseUnstageSpark`, `thresholdConfirm`). Hot-seat collapses
  cleanly (single-machine, no Realtime); the round-robin still
  rotates between local "players" — same rhythm.

K1 must land first (state shape). K2 and K4 can land in parallel
once K1's `TurnEvent` shape is agreed. K3 lands last (it consumes
both K1 state and K4 hooks).

### 7.1 Sub-tickets

- **K1.** engine: add `phase === 'kether'` and `KetherSubPhase`,
  `KetherRitualState` on `GameState`, the round-robin witness reducer,
  the closure-window staging reducer, and the
  `kether-gather → kether-witness → kether-close → won/lost`
  transitions. Refactor `engine/endgame.ts:resolveFinalThreshold`
  into a private helper invoked by the new `threshold-confirm`
  reducer path. TDD; existing endgame tests stay green; new property
  tests pin "every queue eventually empties," "Spark closure can
  raise illumination by exactly the staged count," and "passing a
  card raises Separation by exactly 1."
- **K2.** multiplayer: five new `ClientAction` kinds in
  `applyClientAction`. Authorize gate broadening for `phase ===
  'kether'` (per § 3.3 and § 5.3's K1/K2 boundary rule).
  Multiplayer-flow integration test driving full ritual (pass and fail
  branches both pinned).
  - **Disconnect / abandonment defense.** A held witness whose wire
    connection drops mid-ritual would otherwise stall the round-robin
    indefinitely. Pinned rule:
    - **Multiplayer**: if the active witness's wire connection is
      idle for **> 30 seconds** without a `kether-witness-play` /
      `kether-witness-pass` action **OR** the player explicitly
      disconnects (presence channel signal), K2 surfaces a
      **"skip witness"** affordance to the **host** (the room's
      creator-seat — `state.players[0]` by convention). The host
      pressing skip dispatches a `kether-witness-pass` on behalf of
      the absent player. The forced pass:
      - Counts as a normal pass (+1 Separation).
      - Counts toward the absent player's pass cap (per § 2.3).
      - Hits the cap-exceeded rejection if it would, in which case
        K2 instead force-plays the absent player's first witness-queue
        card via `kether-witness-play` (deterministic: lowest
        `arcanumNumber`). The rationale: disconnection is not a
        get-out-of-jail card; the cap is a *deliberate-griefing*
        gate, not a force-pass-everything affordance.
    - If the absent player remains disconnected for the rest of the
      ritual, the host's skip affordance reappears on every absent
      seat-rotation. Reconnection mid-ritual is honored — the
      reconnected player resumes acting on their next turn.
    - **Authorize-gate carve-out for the host-skip path.** A normal
      `kether-witness-play` / `kether-witness-pass` action is rejected
      by the K2 gate when the dispatcher's `playerId` doesn't match
      `currentWitnessPlayerId(state)` (per § 5.3). The host-skip
      action sets a discriminator field
      (`{ kind: 'kether-witness-pass', playerId: <absent>, dispatchedByHost: true }`)
      that the K2 gate accepts only when (a) the dispatcher *is* the
      host (`state.players[0].id`), (b) the named `playerId` is the
      current witness, and (c) the absence-detection condition is
      satisfied (idle > 30s OR presence signal absent). All three
      gates run server-side; the field is not honored on a
      client-fabricated payload from a non-host.
    - **Hot-seat**: not applicable. One human at the keyboard cannot
      "disconnect" from the round-robin; the local witness UI just
      blocks the rotate-to-next-player button until the current
      witness acts.
  - K2's integration test pins the disconnect path: 2-player ritual
    where Player B disconnects after Player A's first witness step;
    Player A (as host) skips B's turn; ritual completes with the
    expected pass-cost-driven separation tick.
- **K3.** UI: `FinalThresholdScreen`. Renders gather (team-arrival
  hold + reveal animation), witness (round-robin scroll with the
  current player's witness queue highlighted, the narration text
  field, the per-card animation), and close (staged-Sparks panel,
  illumination/separation gauge, threshold-confirm button).
  Replaces `EncounterScreen` for `phase === 'kether'`; includes the
  **pre-ritual hold view** (per § 2.1) that renders to players already
  at Kether while waiting for the rest — explicit "waiting for the
  team" copy + a roster of which players have arrived. Also
  includes the **abbreviated solo-coda variant** (per § 2.2) for
  hot-seat 1-player runs: the round-robin chorus UI collapses to a
  single-voice scroll; per-card play/pass buttons; same closure-window
  panel.
- **K4.** `useTurn` adapter: expose ritual state and per-step
  methods. Hot-seat one-click collapse for ergonomic single-machine
  play (still round-robin in turn order, but the per-action button
  is just "play" or "pass"; no separate "ready" gate).
- **K5.** *Future / polish.* Sign-flavored narration prompts for the
  witness phase (per § 6.3). Adds a per-sign prompt template table
  to `design/avatars.md` § 3 and a render hook in K3's
  `FinalThresholdScreen`. Out of MVP scope; file the ticket so the
  hook isn't lost.

---

## 8. Out of scope

- **The 8 individual-encounter mechanics** (Gevurah, Chesed, Tiferet,
  Hod, Netzach, Yesod, Binah, Chokmah). Owned by ticket #284 and the
  chassis in `encounter-prep-phase.md`.
- **Per-Sefirah avatar art and voice acting** for the 8 deities
  (Epic #125).
- **Tutorial copy and pre-game framing** for the Threshold ritual
  (Epic #224).
- **Pantheon rotation** at Kether. The 8 Sefirot have a
  pluggable-pantheon architecture per `design/avatars.md` § 6;
  Kether's "the team is the avatar" stance is pantheon-independent
  by construction. No work needed.
- **Re-roll / retry of the Threshold within a run.** § 4.2 locks
  this out for MVP. A future variant ticket may revisit.

---

## 9. Status

**LOCKED.** Spawn-tickets K1–K5 unblocked. K1–K4 are MVP; K5 is a
post-MVP polish.
