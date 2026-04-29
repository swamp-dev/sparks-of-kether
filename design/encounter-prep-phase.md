<!-- code-ref: lib/turn-machine.ts:turnReducer -->
<!-- code-ref: engine/checks.ts:resolveChallenge -->
<!-- code-ref: lib/room-actions.ts:applyClientAction -->
<!-- code-ref: lib/room-actions.ts:ClientAction -->

# Encounter Prep → Resolve → React (Refinement of Epic #117)

Ticket: **#223**. Parent epic: **#117** (turn-based encounter system with Sefirot avatars).

The current `'challenge'` phase collapses the entire encounter — modifier selection, ally assist, card-burn, spark-burn, the d20 roll, the outcome — into a single `submit-challenge` action. That action is mechanically dense but visually thin: the player picks all modifiers and the d20 fires immediately. This refinement splits it into three explicit acts.

This document is the contract for sub-tickets fanned out under Epic #117.

---

## 1. Why split

Three reasons surfaced during the #212 / #117 design conversation:

1. **Pacing.** A "modifier-then-roll" interaction reads as a single moment. Splitting it into prep → resolve → react gives each encounter a three-act rhythm — the same rhythm an action-RPG provides via "stage gear → fight → loot," but in turn-based form. Each act has its own visual beat.
2. **Multiplayer coordination.** Allies currently have no real window to confer. By the time a non-active player sees the active player's action, it has already resolved. A distinct `'prep'` phase gives allies a chance to opt into assists, offer to spend a Spark on the active player's behalf, or signal "save the burn for later, you've got this."
3. **Strategic legibility.** Modifier selection becomes a visible decision instead of a hidden one. Everyone at the table sees "Andy is burning 2 cards and asking Bea for an assist" before the d20 fires. That changes the texture of the encounter from individual problem-solving to coordinated response.

---

## 2. The three acts

### 2.1 Prep

The **active player only** drives prep — every prep-stage action is dispatched by the active player. This keeps the authorize gate (`lib/authorize.ts`) simple: active-player-only stays the rule. Ally consent (assist, Spark loan) is gathered out-of-band (voice, chat, the table-talk Realtime view of staged modifiers) and the active player ratifies it by staging the modifier themselves.

The active player declares modifier intent:

- **Card burns** (+3 each, cumulative). The card moves to discard at *resolution*, not at declaration — so a player can revoke a card-burn during prep.
- **Spark burns** (+5 each). Same revocability. Sparks belong to a specific player; the modifier carries a `sourcePlayerId` so the active player can stage their own Spark or an ally's offered Spark. The Spark is consumed from `sourcePlayerId.sparksHeld` at confirm.
- **Assist requests** referencing an ally standing at the same Sefirah. The active player adds the assist; the ally sees it appear in real time and can object (voice/chat) → active player removes the modifier. Each assist contributes ½ ally stat (rounded down). The ally's stat at *confirm* time is what counts; intermediate stat changes (none in current mechanics, but future-proof) don't apply mid-prep.

The `d20` is **not rolled** during prep. `PendingModifiers` accumulates on `GameState` (visible to all players via Realtime).

A `prep-confirm` action transitions to **resolve**.

### 2.2 Resolve

The d20 rolls. Pending modifiers are locked in (cards moved to discard, sparks consumed, assist contributions credited). The outcome is computed via the existing `engine/checks.ts:resolveChallenge` — the engine logic doesn't change; only the *moment* it fires changes.

The visual layer animates the d20 + modifier stack-up + result.

### 2.3 React

After resolve:

- **On pass:** state advances normally — Spark earned, illumination +1, Sefirah cleared. Phase transitions to `'draw'` per existing flow.
- **On fail:** the player chooses:
  - **Burn another card and re-roll** → loops back to prep (with the failed-roll history visible so the player can stack additional burns on top).
  - **Accept setback** → existing `accept-setback` action fires; separation +1 (or +2 on shortcut), player pushed back, phase to `'draw'`.

React is also where the avatar's energy gets named in the visual layer (Epic #117's per-Sefirah avatar moves slot in here). The resolve animation IS the avatar's encounter move; the react copy is the avatar's verdict ("Hermes nods. Speak again.").

---

## 3. Phase model — recommended approach

Three implementation patterns considered. Recommended is **(B) sub-phase under `'challenge'`**.

### (A) Replace `'challenge'` with three top-level phases

`TurnPhase = 'move' | 'prep' | 'resolve' | 'react' | 'draw' | 'end'`. Maximum visibility but maximum blast radius — every consumer of `TurnPhase` (UI, tests, the multiplayer dispatcher's authorize gate) needs an update.

### (B) Sub-phase inside `'challenge'` — RECOMMENDED

Keep `TurnPhase = 'move' | 'challenge' | 'draw' | 'end'` unchanged. Add a `challengeSubPhase: 'prep' | 'resolve' | 'react'` field on the `TurnSnapshot` that's only meaningful when `phase === 'challenge'`. External consumers that only care about top-level phase (e.g. the Hand component which gates clicks on `phase === 'move'`) don't change.

Trade-off: the type system can't enforce the "sub-phase only meaningful when phase=challenge" invariant cleanly without a discriminated union over the snapshot shape. Acceptable; the engine reducer enforces it at runtime.

**Implication for E3 / E4 readers:** any code that reads `snapshot.challengeSubPhase` must first narrow on `snapshot.phase === 'challenge'` to satisfy strict-mode TS. The pattern is:

```typescript
if (snapshot.phase === 'challenge' && snapshot.challengeSubPhase === 'prep') { ... }
```

The `EncounterScreen` (E3) renders only when the parent has already established `phase === 'challenge'`, so its top-level guard is a single check; per-sub-phase rendering is a switch on `challengeSubPhase`.

### (C) Per-sub-phase action kinds without a sub-phase field

Express the three acts via the action vocabulary alone (`prep-modifier`, `confirm-prep`, `submit-challenge`, `react-burn`, `react-accept`). The reducer figures out which act a player is in from what actions they've taken since entering `'challenge'`. Avoids new state fields but makes the reducer logic harder to read and snapshot-debug.

**Decision:** **(B)**. Cleanest existing-code contract; localized diff; the multiplayer route's authorize gate keeps working unchanged because top-level `phase` is unchanged.

---

## 4. State shape changes

```typescript
// lib/turn-machine.ts

export type TurnPhase = 'move' | 'challenge' | 'draw' | 'end'; // unchanged

export type ChallengeSubPhase = 'prep' | 'resolve' | 'react';

export interface TurnSnapshot {
  readonly state: GameState;
  readonly phase: TurnPhase;
  /**
   * Active sub-phase WITHIN a challenge encounter. Undefined or
   * `'prep'` when entering challenge; cycles prep → resolve → react;
   * cleared when phase leaves 'challenge'.
   */
  readonly challengeSubPhase?: ChallengeSubPhase;
}
```

A new `PendingModifiers` field on **`GameState`** (decided — see § 7 multiplayer visibility) accumulates declared-but-not-yet-locked-in modifiers during prep:

```typescript
// engine/types.ts

export interface PendingModifiers {
  readonly cardBurns: readonly number[];                                    // arcanum numbers staged
  readonly sparkBurns: readonly { sefirah: SefirahKey; sourcePlayerId: string }[]; // staged Sparks (active player or ally-offered)
  readonly assistRequests: readonly string[];                               // ally playerIds staged to assist
}
```

`PendingModifiers` is on `GameState` (not `TurnSnapshot`) so it round-trips through the multiplayer Realtime channel — allies see staged modifiers in real time, which is the multiplayer-coordination win § 1 calls out. Cleared when phase leaves `'challenge'`.

**`assistRequests` resolution at confirm time.** The reducer translates `assistRequests` (ally playerIds) into the engine's `CheckModifiers.assistStats` (½ ally stat values, rounded down) at the prep → resolve transition by reading `state.players.find(p => p.id === allyId).stats[sefirahStat]`. The ally's stat at *confirm* time is what counts; declared assists are forward-looking promises until confirm fires. This freeze-at-confirm semantic matters if any future spark / shell mechanic alters stats mid-encounter — currently they don't, but the contract is explicit so future work doesn't have to re-decide.

---

## 5. Action shape changes

New `ClientAction` kinds. **All are dispatched by the active player only** — the authorize gate stays simple. Ally consent is gathered out of band and ratified by the active player.

```typescript
// lib/room-actions.ts

type PrepModifier =
  | { kind: 'card-burn'; arcanum: number }
  | { kind: 'spark-burn'; sefirah: SefirahKey; sourcePlayerId: string }  // sourcePlayerId = active player or ally
  | { kind: 'assist-request'; allyId: string };

ClientAction =
  | ... // existing kinds unchanged
  | { kind: 'prep-add-modifier';    playerId: string; modifier: PrepModifier }
  | { kind: 'prep-remove-modifier'; playerId: string; modifier: PrepModifier }   // same shape; reducer matches and removes
  | { kind: 'prep-confirm';         playerId: string }                            // → resolve
  | { kind: 'react-retry';          playerId: string }                            // fail → back to prep
```

Total: **four** new prep-stage action kinds. Existing `accept-setback` is still used (now from the react sub-state) without change. Existing `submit-challenge` is **removed** end-to-end — both as a `ClientAction` kind in `lib/room-actions.ts` (E2) AND as a `TurnEvent` case in `lib/turn-machine.ts` (E1). The reducer transitions prep → resolve internally when handling `prep-confirm`; there is no remaining external trigger for `submit-challenge`. E1 owns the engine-side deletion; E2 owns the wire-format deletion.

**Ally Spark offers have no in-band action.** The active player stages an ally's Spark unilaterally via `prep-add-modifier` with `{ kind: 'spark-burn'; sourcePlayerId: <allyId> }` after agreeing out of band (voice/chat/the ally watching the staging panel and saying yes). There is no ally-initiated `offer-spark` event on the wire and no "I withdraw" action — the ally's veto path is asking the active player to remove the staged modifier. This is intentional for v1; E3 should NOT build an "offer my Spark" button in the ally UI, only an "ally is offering: X" indicator alongside the active player's staged modifier.

`PrepModifier` is the same shape for both add and remove. **For `prep-remove-modifier`**, the reducer finds the first entry in the relevant `PendingModifiers` array where every field matches by value (`===`) and removes it. JavaScript's default object equality is by reference, which would silently fail; E1's reducer must implement field-by-field value comparison explicitly.

**Validation at confirm time.** When `prep-confirm` fires, the reducer validates each staged modifier:

- `card-burn`: the active player's hand still contains the named arcanum. If not (concurrent gift/play), the modifier is silently dropped (the UI should have prevented this; defensive).
- `spark-burn`: `state.players.find(p => p.id === sourcePlayerId).sparksHeld.has(sefirah)`. Missing → dropped.
- `assist-request`: the ally still stands at the same Sefirah as the active player AND the ally is alive. Missing → dropped.

Dropped modifiers don't count toward the d20 roll. Reducer emits a meta field listing dropped modifiers so the UI can surface "your card was no longer in hand."

---

## 6. Hot-seat compatibility

Single-machine play (`/play` route, `useTurn` hook) doesn't have multiple peers, so the multi-step prep ceremony is overkill. **Decision: option 2 below.** Players get the same visual rhythm as multiplayer; the rhythm is core to the design and shouldn't be flag-gated.

- ~~Auto-advance — `submitChallenge` retains one-shot signature; engine drives prep internally.~~
- **Show prep UI; collapse to one click.** The prep panel renders with modifier-selection affordances. A single "Roll" button confirms all declared modifiers and rolls. No separate "ready" step.
- ~~Hot-seat skips prep entirely.~~

### `UseTurnReturn` shape (E4)

`useTurn` exposes the new state to the UI:

```typescript
// lib/use-turn.ts

export interface UseTurnReturn {
  // ... existing fields
  readonly phase: TurnPhase;
  readonly challengeSubPhase: ChallengeSubPhase | undefined;  // NEW; defined only when phase === 'challenge'
  readonly pendingModifiers: PendingModifiers | undefined;    // NEW; defined only when phase === 'challenge'

  // existing modifier-and-roll one-shot, kept for hot-seat ergonomics:
  readonly submitChallenge: (sefirah, modifiers, outcome?) => Result<...>;
  // NEW per-step methods (used by the multiplayer EncounterScreen; hot-seat may use them or use submitChallenge):
  readonly prepAddModifier:    (modifier: PrepModifier) => Result<...>;
  readonly prepRemoveModifier: (modifier: PrepModifier) => Result<...>;
  readonly prepConfirm:        () => Result<...>;
  readonly reactRetry:         () => Result<...>;
}
```

`submitChallenge` survives in hot-seat as a convenience wrapper that internally dispatches `prepAddModifier` once per modifier, then `prepConfirm`. Multiplayer never calls `submitChallenge` from the UI — the `EncounterScreen` calls the per-step methods directly so each state mutation goes over the wire and other players see the staging in real time.

### React-retry UI behavior in hot-seat

When the player chooses **burn another card and re-roll** from the react sub-state, `useTurn.reactRetry()` clears the resolve outcome and returns the snapshot to `'prep'`. The UI re-renders the prep panel with the cumulative card-burn count visible (e.g. "3 cards burned, +9 modifier") so the player understands they're stacking. The "Roll" button reappears; the player can stage additional modifiers (e.g. another card burn) before clicking it again. Hot-seat preserves the three-act loop including the retry edge — the rhythm is the same as multiplayer, just with one less click per stage.

---

## 7. Multiplayer coordination semantics

Locked decisions for what goes on the wire.

- **Visibility of prep modifiers.** All players see all prep-stage modifiers in real time (via the existing Realtime channel on `game_events` — `PendingModifiers` lives on `GameState`, so each `prep-add-modifier` / `prep-remove-modifier` event broadcasts the snapshot diff). This is the multiplayer-coordination win § 1 calls out.
- **Authorize gate (`lib/authorize.ts`) stays unchanged.** Every prep-stage action is dispatched by the active player. The active-player-only rule keeps the gate's existing structure. **Ally consent is gathered out of band** (voice, chat, the ally seeing the staged modifier appear and tapping a "no" button if their UI offers one — that "no" is itself a hint to the active player to remove the modifier; it doesn't go on the wire).
- **Multiple assists.** The reducer caps `assistRequests` at 2 (matching the typical 2-helper table-talk size). E1 owns the cap value; tests pin it.
- **Revocability.** Modifiers can be added and removed during prep without engine-state changes (cards stay in hand, sparks stay held, ally is unaffected). Validation and consumption happen at `prep-confirm`.
- **Timeout.** None at this layer. If the active player dawdles in prep, the other players wait. A future polish ticket can add an optional "suggest the active player resolve" affordance; out of scope for #223.

---

## 8. Sub-tickets (fan-out under Epic #117)

This document is the contract. Sub-tickets implement against it. Each is filed as a separate issue with `Closes #<num>` references back to this doc.

**Boundaries (locked):**

- **E1 owns** all `TurnEvent` and reducer changes in `lib/turn-machine.ts`, `PendingModifiers` in `engine/types.ts`, the prep / resolve / react sub-phase transitions, and the at-confirm validation drop logic.
- **E2 owns** `ClientAction` extensions in `lib/room-actions.ts` and the `applyClientAction` dispatcher cases that delegate to E1's reducer events. Plus the multiplayer-flow integration test.
- **E3 owns** the new `EncounterScreen` component and the deprecation of `ChallengeModal`.
- **E4 owns** the `UseTurnReturn` facade in `lib/use-turn.ts` — exposing `challengeSubPhase`, `pendingModifiers`, and the per-step methods (`prepAddModifier`, `prepRemoveModifier`, `prepConfirm`, `reactRetry`) — and the hot-seat one-click collapse pattern in `submitChallenge`.

E1 and E4 can be worked in parallel as long as E1's `TurnEvent` shape is agreed first; E1 must NOT modify `lib/use-turn.ts`. E2 depends on E1 (TurnEvent shape). E3 depends on E1 and E4 (state shape). Final order: E1 → E2 + E4 in parallel → E3 last.

- **E1.** engine: split challenge phase into prep → resolve → react sub-phases. Adds `challengeSubPhase` to `TurnSnapshot`, `PendingModifiers` to `GameState`, adds the four new `TurnEvent` cases (`prep-add-modifier`, `prep-remove-modifier`, `prep-confirm`, `react-retry`), and **removes the existing `submit-challenge` `TurnEvent` case** (the reducer's prep → resolve transition is now internal, triggered by `prep-confirm`). TDD-driven.
- **E2.** multiplayer: four new `ClientAction` kinds (`prep-add-modifier`, `prep-remove-modifier`, `prep-confirm`, `react-retry`) in `applyClientAction`. Multiplayer-flow integration test driving full prep → resolve → react cycle.
- **E3.** UI: `EncounterScreen` renders three visual sub-states. Replaces `ChallengeModal`. Prep shows modifier-selection + ally indicators; resolve animates d20 + outcome; react shows outcome + burn/setback choices. Per-Sefirah avatar art slots in here.
- **E4.** `useTurn` adapter: expose `challengeSubPhase`, `pendingModifiers`, and per-step methods. Hot-seat `submitChallenge` becomes a convenience wrapper around the per-step methods (one click confirms all staged modifiers). Multiplayer EncounterScreen drives per-step methods directly.

---

## 9. Out of scope

- Per-Sefirah avatar moves (Epic #117 sub-tickets 1–3 own those — this doc is the *frame* the avatar moves slot into).
- Real-time / click-to-hit combat. Considered and rejected during the #212 design conversation; turn-based stays the choice.
- Equipment system. No equipment exists in the current game; Sparks are the closest analogue.
- Tutorial copy for the new phases. Falls under Epic #224 (in-game tutorial + hint system).

---

## 10. Status

**LOCKED.** Sub-tickets E1–E4 unblocked.
