# Tutorial and Hint System

Design specification for `design/mechanics.md`-grounded contextual hints and a scripted first-turn tutorial. All sub-tickets for Epic #5 are blocked on this doc being reviewed and merged.

---

## 1. Hint definition shape

```typescript
interface HintDefinition {
  id: string;                      // unique, kebab-case, e.g. 'welcome-overlay'
  when: HintTrigger;               // what game event surfaces this hint
  where: HintAnchor;               // UI element or screen region to attach to
  copy: string;                    // hint text shown to the player (plain string; no JSX)
  severity: 'info' | 'warn';      // info = optional knowledge; warn = likely to fail without this
  dismissibleVia: DismissMethod[]; // at least one method required
  prerequisiteId?: string;         // if set, only surface after prerequisiteId is dismissed
}
```

### `HintTrigger`

```typescript
type TurnPhase = 'move' | 'challenge' | 'assist' | 'end';

type FirstEvent =
  | 'move-phase'       // first time any move phase begins
  | 'challenge'        // first time an encounter/challenge opens
  | 'spark-earned'     // first time a Sefirah is cleared and a Spark lands
  | 'discard-prompt'   // first time the end-of-turn discard cap prompt appears
  | 'assist-phase';    // first time an assist phase opens with ≥1 eligible ally

type HintTrigger =
  | { kind: 'game-start' }
    // Fires once when `initializeGame` completes and PlayScreen first renders.

  | { kind: 'phase-enter'; phase: TurnPhase; minTurn?: number }
    // Fires when the active player's turn phase becomes `phase`.
    // If `minTurn` is set, only fires on or after that turn number.

  | { kind: 'first-event'; event: FirstEvent }
    // Fires on the *first* occurrence of the named event in this browser session
    // (never re-fires once dismissed).

  | { kind: 'turn-number'; n: number; phase: TurnPhase };
    // Fires exactly when turn = n and phase = phase.
    // Use for "here's what is new on turn 2" explains.
```

**Evaluation contract.** The hint engine evaluates triggers in order of `HintDefinition.when.kind` priority:

1. `game-start`
2. `first-event`
3. `phase-enter`
4. `turn-number`

When multiple hints become eligible in the same event tick, only the one with the lowest `id` (lexicographic) is surfaced. Once it is dismissed the engine re-evaluates and may surface the next one. This prevents two overlays at once.

### `HintAnchor`

```typescript
type NamedRegion =
  | 'hand'             // the Hand fan ([data-hand])
  | 'action-bar'       // the turn action bar ([data-phase-hint] container)
  | 'board'            // the Tree of Life board ([aria-label="Tree of Life board"])
  | 'meters'           // the team status meters sidebar ([aria-label="Game status"])
  | 'encounter-modal'; // the EncounterScreen dialog ([aria-labelledby^="encounter-"])

type HintAnchor =
  | { kind: 'overlay' }
    // Full-screen dimmed backdrop, centred panel. Used for story/welcome beats.

  | { kind: 'region'; name: NamedRegion }
    // Tooltip-adjacent callout anchored to the named UI region.
    // The hint renderer uses the region's bounding rect to position the callout.

  | { kind: 'element'; selector: string };
    // CSS selector for a specific element. Use sparingly — prefer named regions.
    // Example: '[data-card-slot="0"]' to highlight a specific card.
```

### `DismissMethod`

```typescript
type DismissMethod =
  | 'tap-anywhere'
    // Clicking/tapping anywhere outside the hint panel dismisses it.

  | 'hinted-action'
    // Performing the action the hint describes (e.g. playing a card when the
    // hint explains card-play) auto-dismisses. The engine detects this by
    // watching the specific game event that corresponds to the hint's step.

  | { kind: 'timeout'; ms: number }
    // Auto-dismiss after `ms` milliseconds. For non-blocking toasts only.

  | 'explicit-button';
    // A "Got it" button inside the hint panel is required to dismiss.
    // Use for warn-severity hints where accidental tap-anywhere would be bad.
```

---

## 2. Tutorial step sequence

A scripted hot-seat walkthrough that teaches the minimal core loop. Seven steps, one per key game moment. Each step has a `prerequisiteId` pointing to the step before it, forming a linear chain. The last step in the chain (`spark-earned`) is reached only in a real game — steps 1–5 occur on turns 1–2.

### Step 1 — Welcome (`welcome-overlay`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'game-start' }` |
| `where` | `{ kind: 'overlay' }` |
| `severity` | `info` |
| `dismissibleVia` | `['explicit-button']` |
| `prerequisiteId` | *(none — first step)* |

**copy:**
> "Welcome to the Tree of Life. Ten Sefirot stand between Malkuth and the Crown. Play your cards to open paths — and ascend together."

**Skip behavior:** Dismissing closes the overlay and surfaces step 2 on the next move phase.

---

### Step 2 — Your Hand (`hand-intro`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'first-event'; event: 'move-phase' }` |
| `where` | `{ kind: 'region'; name: 'hand' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', 'hinted-action']` |
| `prerequisiteId` | `'welcome-overlay'` |

**copy:**
> "Each card in your hand is an Arcanum — and a key to one or more paths on the Tree. Tap a card to see which paths it unlocks."

**Skip behavior:** Tapping any card (the `hinted-action`) dismisses the hint and proceeds to step 3.

---

### Step 3 — Play a Card (`play-card-hint`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'first-event'; event: 'move-phase' }` |
| `where` | `{ kind: 'region'; name: 'action-bar' }` |
| `severity` | `warn` |
| `dismissibleVia` | `['hinted-action']` |
| `prerequisiteId` | `'hand-intro'` |

**copy:**
> "Select a card, then tap a glowing path on the board to travel it. You must play a card to move — or choose Meditate to draw 2 instead."

**Skip behavior:** Only `hinted-action` (playing a card or clicking Meditate). No tap-anywhere escape — this is `warn` severity and the player must engage.

---

### Step 4 — Draw Replenishment (`draw-replenish-hint`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'turn-number'; n: 2; phase: 'move' }` |
| `where` | `{ kind: 'region'; name: 'action-bar' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', { kind: 'timeout', ms: 6000 }]` |
| `prerequisiteId` | `'play-card-hint'` |

**copy:**
> "Your hand refills toward 4 cards at the start of each turn. You can hold up to 6."

**Skip behavior:** Auto-dismisses after 6 s, or on any tap. Non-blocking; the player can keep moving.

---

### Step 5 — Meditate (`meditate-hint`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'phase-enter'; phase: 'move'; minTurn: 2 }` |
| `where` | `{ kind: 'region'; name: 'action-bar' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', 'hinted-action']` |
| `prerequisiteId` | `'draw-replenish-hint'` |

**copy:**
> "No good path? Meditate — draw 2 extra cards once per turn. You can still Move after Meditating."

**Skip behavior:** `hinted-action` fires when the player taps the Meditate button.

---

### Step 6 — Challenge (`challenge-intro`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'first-event'; event: 'challenge' }` |
| `where` | `{ kind: 'region'; name: 'encounter-modal' }` |
| `severity` | `warn` |
| `dismissibleVia` | `['explicit-button']` |
| `prerequisiteId` | `'meditate-hint'` |

**copy:**
> "This Sefirah is uncleared. Roll d20 + your stat against its Difficulty Class. Succeed to earn its Spark — or accept Separation and try again next turn."

**Skip behavior:** Requires explicit "Got it" before the player can interact with the encounter modal controls.

---

### Step 7 — Spark Earned (`spark-earned-hint`)

| Field | Value |
|---|---|
| `when` | `{ kind: 'first-event'; event: 'spark-earned' }` |
| `where` | `{ kind: 'region'; name: 'meters' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', { kind: 'timeout', ms: 8000 }]` |
| `prerequisiteId` | `'challenge-intro'` |

**copy:**
> "You've earned a Spark — a one-use ability from this Sefirah's gift. Clear all nine to face the Final Threshold at Kether together."

**Skip behavior:** Auto-dismisses after 8 s. This is the last tutorial step.

---

## 3. Dismissal-preference contract

### Storage mechanism

Tutorial progress is persisted in **`localStorage`** under the key prefix `sok:hint:`.

```
localStorage key: sok:hint:<id>
value:            'dismissed'
```

Example: after step 1 is dismissed, `localStorage.getItem('sok:hint:welcome-overlay') === 'dismissed'`.

**Rationale.** Tutorial hints are per-device preference, not per-user game state. Supabase is the source of truth for game state; tutorial completion is UX metadata that should survive page refresh but does not need cross-device sync. The game's anonymous auth model means users may not have a stable identity across devices anyway.

### Reading dismissal state

```typescript
function isDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false; // SSR guard
  return localStorage.getItem(`sok:hint:${id}`) === 'dismissed';
}
```

### Writing dismissal

```typescript
function markDismissed(id: string): void {
  localStorage.setItem(`sok:hint:${id}`, 'dismissed');
}
```

### Prerequisite check

Before surfacing any hint, the engine checks:

1. `isDismissed(hint.id)` → if already dismissed, skip.
2. If `hint.prerequisiteId` is set, `isDismissed(hint.prerequisiteId)` → if not dismissed yet, skip.

### Reset for testing

A "Restart tutorial" affordance (settings menu or dev console) clears all `sok:hint:*` keys:

```typescript
function clearAllHints(): void {
  const toRemove = Object.keys(localStorage).filter((k) => k.startsWith('sok:hint:'));
  toRemove.forEach((k) => localStorage.removeItem(k));
}
```

---

## 4. Styling baseline

Hint overlays use the project's existing Tailwind token vocabulary. Follow `docs/typography.md` for copy sizing and `docs/motion.md` for entrance animations.

### Full-screen overlay (`kind: 'overlay'`)

```
z-index:     z-60  (above action-bar z-40, above hand z-30, above status z-50)
backdrop:    fixed inset-0 bg-void/80 backdrop-blur-sm
panel:       relative mx-auto mt-[20vh] max-w-sm rounded-xl
             border border-veil/20 bg-ground/90 p-6 shadow-2xl
entrance:    opacity-0 → opacity-100, translateY(8px) → translateY(0)
             duration-300 ease-emerge
```

Copy inside: `font-display` for the opening line (display context), `font-sans text-sm` for body, `text-veil/70` for secondary text. The "Got it" button mirrors the primary button style in `components/ui/Button.tsx`.

### Region callout (`kind: 'region'`)

```
z-index:     z-50
position:    absolute, placed relative to the anchor region's bounding rect
             (above the region by default; flipped if not enough viewport space)
panel:       max-w-xs rounded-lg border border-veil/20 bg-ground/80
             px-4 py-3 shadow-xl backdrop-blur-sm
pointer:     4px CSS triangle at the bottom edge of the panel, pointing down at the region
entrance:    opacity-0 scale-95 → opacity-100 scale-100
             duration-200 ease-emerge
```

Copy: `font-sans text-sm leading-relaxed`. The anchor region receives a pulsing ring while the hint is visible: `ring-2 ring-kether/60 ring-offset-2 ring-offset-void` on the region's wrapper element. (`kether` is `#ffffff` in `tailwind.config.ts` — the Crown's pure-white token.)

### Toast variant (`dismissibleVia` includes `{ kind: 'timeout' }`)

For auto-dismissing informational hints, use a lighter toast style:

```
position:    fixed bottom-20 left-1/2 -translate-x-1/2
z-index:     z-50
panel:       rounded-full border border-veil/10 bg-ground/70 px-5 py-2.5
             backdrop-blur-sm shadow-lg
entrance:    opacity-0 translateY(8px) → opacity-100 translateY(0)
             duration-200 ease-emerge
exit:        opacity-100 → opacity-0, duration-200 ease-flow
```

Copy: `font-sans text-sm` in a single line (keep under 72 characters for this format).

### Reduced-motion

All animations must respect `prefers-reduced-motion`. Replace opacity+transform transitions with opacity-only:

```tsx
<div className="duration-200 ease-emerge motion-safe:translate-y-2 motion-safe:data-[shown=true]:translate-y-0
                opacity-0 data-[shown=true]:opacity-100 transition-[opacity,transform]" />
```
