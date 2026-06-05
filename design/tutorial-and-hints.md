# Tutorial and Hint System

Design specification for `design/mechanics.md`-grounded contextual hints and a scripted first-turn tutorial. All sub-tickets for Epic #5 are blocked on this doc being reviewed and merged.

---

## 1. Hint definition shape

```typescript
interface HintDefinition {
  id: string;                      // unique, kebab-case, e.g. 'welcome-overlay'
  priority: number;                // integer; lower value surfaces first when multiple hints are eligible
  when: HintTrigger;               // what game event surfaces this hint
  where: HintAnchor;               // UI element or screen region to attach to
  copy: string;                    // hint text shown to the player (plain string; no JSX)
  severity: 'info' | 'warn';      // info = optional knowledge; warn = likely to fail without this
  dismissibleVia: DismissMethod[]; // at least one method required
  prerequisiteId?: string;         // if set, only surface after that hint's id is dismissed
}
```

`priority` replaces lexicographic ordering — it is the only signal the engine uses to resolve ties.
`prerequisiteId` forms a linear chain for the scripted tutorial; the hint engine must not surface a hint until its prerequisite's `isDismissed()` returns `true`.

### `HintTrigger`

`TurnPhase` mirrors the engine type at `engine/types.ts:63` exactly:

```typescript
type TurnPhase = 'move' | 'challenge' | 'end' | 'kether';
// 'assist' is a sub-phase modifier (assistRequests array in GameState),
// not a top-level TurnPhase value. 'kether' is the Final Threshold ritual.
```

```typescript
type FirstEvent =
  | 'move-phase'       // first time any move phase begins
  | 'challenge'        // first time an encounter/challenge opens
  | 'spark-earned'     // first time a Sefirah is cleared and a Spark lands
  | 'discard-prompt';  // first time the end-of-turn discard cap prompt appears

type HintTrigger =
  | { kind: 'game-start' }
    // Fires once when `initializeGame` completes and PlayScreen first renders.

  | { kind: 'phase-enter'; phase: TurnPhase; minTurn?: number }
    // Fires when the active player's turn phase becomes `phase`.
    // If `minTurn` is set, only fires on or after that turn number.
    // IMPORTANT: the engine re-evaluates `isEligible` for ALL hints
    // (including phase-enter hints) after every dismiss event. A
    // phase-enter hint with a prerequisiteId will surface immediately
    // in the same tick as a dismiss if the game is already in the
    // matching phase and the prerequisite was just cleared.

  | { kind: 'first-event'; event: FirstEvent }
    // Fires on the *first ever* occurrence of the named event in this
    // browser session. Never re-fires once that event has happened.

  | { kind: 'turn-number'; n: number; phase: TurnPhase };
    // Fires exactly when turn = n and phase = phase.
    // Use for "here's what is new on turn N" explanations.
```

**Evaluation contract.** After any game-state change (phase transition, game-start, dismiss event), the engine:

1. Collects all hints whose trigger matches current state AND whose `prerequisiteId` (if set) is dismissed.
2. Filters out any hint already dismissed.
3. Surfaces the hint with the **lowest `priority`** value. At most one hint is shown at a time.
4. On dismiss, repeats from step 1.

`phase-enter` triggers are re-evaluated at dismiss time as well as at phase transitions, so a hint chained after a `first-event` hint will surface immediately in the same phase if the game is already in the matching phase.

### `HintAnchor`

The `NamedRegion` values map to DOM anchors. The anchor DOM attribute is the one the hint renderer uses for `getBoundingClientRect`:

| `NamedRegion` | DOM anchor | Notes |
|---|---|---|
| `'hand'` | `[data-hand]` | `Hand.tsx` root element. |
| `'action-bar'` | `[data-action-bar]` | Must be added to the `<div>` in `PlayScreen.tsx` that directly contains `[data-phase-hint]` (the phase indicator span), the active-player name span, and the Meditate/End-Turn button group. This is the flex-row action bar, NOT the enclosing `<section aria-label="Tree of Life board">`. |
| `'board'` | `[aria-label="Tree of Life board"]` | TreeBoard wrapper. |
| `'meters'` | `[aria-label="Game status"]` | Status sidebar. |
| `'encounter-modal'` | `[aria-labelledby^="encounter-"]` | EncounterScreen dialog root. |

```typescript
type NamedRegion = 'hand' | 'action-bar' | 'board' | 'meters' | 'encounter-modal';

type HintAnchor =
  | { kind: 'overlay' }
    // Full-screen dimmed backdrop, centred panel. Used for story/welcome beats.

  | { kind: 'region'; name: NamedRegion }
    // Callout anchored above (or below if space-constrained) the named region.

  | { kind: 'element'; dataAttr: string };
    // data-attribute name (without brackets), e.g. 'data-card-slot'.
    // The hint renderer queries `document.querySelector('[' + dataAttr + ']')`.
    // Use only when no NamedRegion fits; document the attribute in PlayScreen.tsx.
```

### `DismissMethod`

```typescript
type DismissMethod =
  | 'tap-anywhere'
    // A click/tap outside the hint panel calls markDismissed(hint.id).

  | 'hinted-action'
    // The action described by the hint calls markDismissed(hint.id) on completion.
    // CONTRACT: the component responsible for the action (e.g. the card tap handler
    // in Hand.tsx, the Meditate button in PlayScreen.tsx) must call markDismissed
    // for the currently-active hint ID when hinted-action is in dismissibleVia.
    // The hint engine exposes a getActiveHint(): HintDefinition | null query for this.

  | { kind: 'timeout'; ms: number }
    // Auto-dismiss after ms milliseconds. Counts as dismissed for prerequisite purposes.
    // Only for info-severity, non-blocking hints.

  | 'explicit-button';
    // A "Got it" button inside the hint panel is required to dismiss.
    // Use for warn-severity hints where accidental tap-anywhere would be bad.
```

**Narrowing `DismissMethod`:** use `typeof dm === 'string'` to separate string literals from the `timeout` object variant, then narrow further:

```typescript
function isTimeoutDismiss(dm: DismissMethod): dm is { kind: 'timeout'; ms: number } {
  return typeof dm === 'object' && dm.kind === 'timeout';
}
```

---

## 2. Tutorial step sequence

Seven steps forming a linear chain. Each step has a `prerequisiteId` pointing to the step before it. Steps 1–5 occur on turns 1–2; steps 6–7 require reaching an uncleared Sefirah and clearing it.

### Explicit prerequisiteId chain

| Step | `id` | `prerequisiteId` |
|---|---|---|
| 1 | `'tutorial-welcome'` | *(none)* |
| 2 | `'tutorial-hand-intro'` | `'tutorial-welcome'` |
| 3 | `'tutorial-play-card'` | `'tutorial-hand-intro'` |
| 4 | `'tutorial-draw-replenish'` | `'tutorial-play-card'` |
| 5 | `'tutorial-meditate'` | `'tutorial-draw-replenish'` |
| 6 | `'tutorial-challenge-intro'` | `'tutorial-meditate'` |
| 7 | `'tutorial-spark-earned'` | `'tutorial-challenge-intro'` |

`priority` values: 10, 20, 30, 40, 50, 60, 70 respectively (spacing allows inserting future hints between steps without renumbering).

### Step 1 — Welcome

| Field | Value |
|---|---|
| `id` | `'tutorial-welcome'` |
| `priority` | `10` |
| `when` | `{ kind: 'game-start' }` |
| `where` | `{ kind: 'overlay' }` |
| `severity` | `info` |
| `dismissibleVia` | `['explicit-button']` |
| `prerequisiteId` | *(none)* |

**copy:**
> "Welcome to the Tree of Life. Ten Sefirot stand between Malkuth and the Crown. Play your cards to open paths — and ascend together."

**Skip behavior:** "Got it" dismisses; step 2 surfaces on next move-phase entry.

---

### Step 2 — Your Hand

| Field | Value |
|---|---|
| `id` | `'tutorial-hand-intro'` |
| `priority` | `20` |
| `when` | `{ kind: 'first-event'; event: 'move-phase' }` |
| `where` | `{ kind: 'region'; name: 'hand' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', 'hinted-action']` |
| `prerequisiteId` | `'tutorial-welcome'` |

**copy:**
> "Each card in your hand is an Arcanum — and a key to one or more paths on the Tree. Tap a card to see which paths it unlocks."

**`hinted-action` wiring:** `Hand.tsx`'s card tap handler calls `markDismissed(getActiveHint()?.id)` when a card slot is tapped, if the active hint is `'tutorial-hand-intro'`.

---

### Step 3 — Play a Card

| Field | Value |
|---|---|
| `id` | `'tutorial-play-card'` |
| `priority` | `30` |
| `when` | `{ kind: 'phase-enter'; phase: 'move'; minTurn: 1 }` |
| `where` | `{ kind: 'region'; name: 'action-bar' }` |
| `severity` | `warn` |
| `dismissibleVia` | `['hinted-action']` |
| `prerequisiteId` | `'tutorial-hand-intro'` |

**Why `phase-enter` (not `first-event`).** Step 2 uses `first-event:move-phase`, which fires once ever. Step 3 uses `phase-enter:move` so the engine re-evaluates it at dismiss time — when step 2 is dismissed the game is still in move phase, so step 3 surfaces immediately.

**Why `warn`.** The player cannot progress until they play a card or Meditate; missing this instruction causes the turn to feel stuck. No `tap-anywhere` escape for the same reason.

**copy:**
> "Select a card, then tap a glowing path on the board to travel it. You must play a card to Move — or choose Meditate to draw 2 instead."

**`hinted-action` wiring:** the card-play handler in `PlayScreen.tsx` and the Meditate button both call `markDismissed` when the active hint is `'tutorial-play-card'`.

---

### Step 4 — Draw Replenishment

| Field | Value |
|---|---|
| `id` | `'tutorial-draw-replenish'` |
| `priority` | `40` |
| `when` | `{ kind: 'turn-number'; n: 2; phase: 'move' }` |
| `where` | `{ kind: 'region'; name: 'action-bar' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', { kind: 'timeout', ms: 6000 }]` |
| `prerequisiteId` | `'tutorial-play-card'` |

**copy:**
> "Your hand refills toward 4 cards at the start of each turn. You can hold up to 6."

**Timeout + prerequisite:** a timeout dismiss writes `markDismissed(id)` exactly like a tap-dismiss, so it satisfies step 5's prerequisite check.

---

### Step 5 — Meditate

| Field | Value |
|---|---|
| `id` | `'tutorial-meditate'` |
| `priority` | `50` |
| `when` | `{ kind: 'phase-enter'; phase: 'move'; minTurn: 2 }` |
| `where` | `{ kind: 'region'; name: 'action-bar' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', 'hinted-action']` |
| `prerequisiteId` | `'tutorial-draw-replenish'` |

**Note on turn-2 timing:** step 4 (`turn-number:n=2`) and step 5 (`phase-enter:move minTurn:2`) can both become eligible on turn 2, move phase. The prerequisite chain prevents this: step 5 requires step 4 to be dismissed first. Even if step 4 auto-dismisses via timeout, the dismiss event re-evaluates and surfaces step 5.

**copy:**
> "No good path? Meditate — draw 2 extra cards once per turn. You can still Move after Meditating."

**`hinted-action` wiring:** Meditate button calls `markDismissed` when the active hint is `'tutorial-meditate'`.

---

### Step 6 — Challenge

| Field | Value |
|---|---|
| `id` | `'tutorial-challenge-intro'` |
| `priority` | `60` |
| `when` | `{ kind: 'first-event'; event: 'challenge' }` |
| `where` | `{ kind: 'region'; name: 'encounter-modal' }` |
| `severity` | `warn` |
| `dismissibleVia` | `['explicit-button']` |
| `prerequisiteId` | `'tutorial-meditate'` |

**copy:**
> "This Sefirah is uncleared. Roll d20 + your stat against its Difficulty Class. Succeed to earn its Spark — or accept Separation and try again next turn."

**Skip behavior:** "Got it" button required before the encounter controls become interactive. The EncounterScreen renders the hint overlay over its own content; the roll/burn controls are `pointer-events-none` while the hint is visible.

---

### Step 7 — Spark Earned

| Field | Value |
|---|---|
| `id` | `'tutorial-spark-earned'` |
| `priority` | `70` |
| `when` | `{ kind: 'first-event'; event: 'spark-earned' }` |
| `where` | `{ kind: 'region'; name: 'meters' }` |
| `severity` | `info` |
| `dismissibleVia` | `['tap-anywhere', { kind: 'timeout', ms: 8000 }]` |
| `prerequisiteId` | `'tutorial-challenge-intro'` |

**copy:**
> "You've earned a Spark — a one-use ability from this Sefirah's gift. Clear all nine to face the Final Threshold at Kether together."

**Skip behavior:** Auto-dismisses after 8 s or any tap. This is the last tutorial step.

---

## 3. Dismissal-preference contract

### Storage mechanism

Tutorial progress is persisted in **`localStorage`** under the key prefix `sok:hint:`.

```
localStorage key: sok:hint:<id>
value:            'dismissed'
```

Example: `localStorage.getItem('sok:hint:tutorial-welcome') === 'dismissed'` after step 1.

**Rationale.** Tutorial hints are per-device UX preference. Supabase is the source of truth for game state; dismissal state should survive page refresh but does not need cross-device sync. Anonymous auth means users lack a stable cross-device identity anyway.

### Implementation

All `localStorage` access wraps in `try/catch` (quota / Safari Private Browsing throws on write):

```typescript
function isDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false; // SSR guard
  try {
    return localStorage.getItem(`sok:hint:${id}`) === 'dismissed';
  } catch {
    return false;
  }
}

function markDismissed(id: string): void {
  try {
    localStorage.setItem(`sok:hint:${id}`, 'dismissed');
  } catch {
    // Private-browsing mode or quota exceeded — silently ignore.
  }
}

function clearAllHints(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('sok:hint:'));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Silently ignore.
  }
}
```

### Prerequisite check (before surfacing any hint)

```typescript
function isEligible(hint: HintDefinition): boolean {
  // Skip if the player has already dismissed this hint.
  if (isDismissed(hint.id)) return false;
  // Skip if the prerequisite hint has NOT yet been dismissed
  // (hint.prerequisiteId must be dismissed = true before this hint surfaces).
  if (hint.prerequisiteId !== undefined && !isDismissed(hint.prerequisiteId)) return false;
  return true;
}
```

---

## 4. Styling baseline

Hint overlays use the project's existing Tailwind token vocabulary. Follow `docs/typography.md` for copy sizing and `docs/motion.md` for entrance animations.

### Z-index stack (hint layer)

The project's z-index convention (action-bar z-40, Hand z-30, status z-50) must not be broken. Hint layers sit above everything:

| Layer | z-index | Tailwind |
|---|---|---|
| Region callouts | 55 | `z-[55]` (arbitrary value) |
| Full-screen overlays | 60 | `z-[60]` (arbitrary value) |

Tailwind v3's default scale only goes to `z-50`. Use the arbitrary-value syntax (`z-[55]`, `z-[60]`) rather than adding new named tokens to `tailwind.config.ts`, to avoid polluting the shared token namespace. Existing `z-50` consumers (PauseOverlay, DiscardBrowseOverlay, EncounterScreen backdrop) are sibling modals that are mutually exclusive with tutorial hints — tutorial hints do not need to render over them.

**Z-stack verification note.** `MeditateConfirmDialog` in `PlayScreen.tsx` uses `z-40`, placing it below hint callouts at `z-[55]`. This means a region callout can appear over the meditate confirmation dialog. Whether that is desirable (the hint is more important) or should be prevented (add a guard that blocks hints while the confirm dialog is open) is left to the implementing PR to decide and test.

### Full-screen overlay (`kind: 'overlay'`)

```
z-index:     z-[60]
backdrop:    fixed inset-0 bg-void/80 backdrop-blur-sm
panel:       relative mx-auto mt-[20vh] max-w-sm rounded-xl
             border border-veil/20 bg-ground/90 p-6 shadow-2xl
entrance:    opacity-0 → opacity-100, translateY(8px) → translateY(0)
             duration-300 ease-emerge
```

Copy inside: `font-display` for the opening line (display context), `font-sans text-sm` for body, `text-veil/70` for secondary text. The "Got it" button mirrors the primary button style in `components/ui/Button.tsx`.

### Region callout (`kind: 'region'`)

```
z-index:     z-[55]
position:    fixed, positioned relative to the anchor region's getBoundingClientRect
             (above the region by default; flipped to below if < 120px above viewport top)
panel:       max-w-xs rounded-lg border border-veil/20 bg-ground/80
             px-4 py-3 shadow-xl backdrop-blur-sm
pointer:     4px CSS triangle at the bottom edge of the panel, pointing down at the region
entrance:    opacity-0 scale-95 → opacity-100 scale-100
             duration-200 ease-emerge
```

Copy: `font-sans text-sm leading-relaxed`. The anchor region receives a pulse ring while the hint is visible: `ring-2 ring-kether/60 ring-offset-2 ring-offset-void` on the region's wrapper element. (`kether` = `#ffffff` in `tailwind.config.ts`.)

### Toast variant (`dismissibleVia` includes `{ kind: 'timeout' }`)

For auto-dismissing informational hints, use a lighter toast style. The toast sits above the Hand (`z-30`, `fixed inset-x-0 bottom-0`) so must be placed higher than the hand's visual height (~`bottom-24` on mobile) and given `z-[55]`:

```
position:    fixed bottom-28 left-1/2 -translate-x-1/2
z-index:     z-[55]
panel:       rounded-full border border-veil/10 bg-ground/70 px-5 py-2.5
             backdrop-blur-sm shadow-lg
entrance:    opacity-0 translateY(8px) → opacity-100 translateY(0)
             duration-200 ease-emerge
exit:        opacity-100 → opacity-0, duration-200 ease-flow
```

Copy: `font-sans text-sm` in a single line (keep under 72 characters).

### Reduced-motion

All animations must respect `prefers-reduced-motion`. Replace opacity+transform with opacity-only for motion-reduced contexts:

```tsx
<div className="transition-[opacity,transform] duration-200 ease-emerge
                opacity-0 data-[shown=true]:opacity-100
                motion-safe:translate-y-2 motion-safe:data-[shown=true]:translate-y-0" />
```
