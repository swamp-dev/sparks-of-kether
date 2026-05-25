# Journal — #286: feat(encounter): burn-phase UX improvements

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-25T11:15:00Z — push 1: implementation + tests

**Context:** Two burn-phase affordances were too easy to miss. (1) The gate
hint telling players they must burn a card before rolling was tiny (`text-xs
opacity-80`). (2) The "now physically discard a card" picker used a hidden
trash icon on hover — which was broken anyway because `Hand.interactive =
false` when `discardMode=true`, so `onCardSelect` never fired.

**What shipped:**

- **Unified burn-gate flags** — `gevurahRequiresBurn / tiferetRequiresBurn
  / binahRequiresBurn` props on `PrepPanel` collapsed into `requiresBurn?
  boolean` + `requiresBurnSefirah? 'gevurah' | 'tiferet' | 'binah'` +
  `frameBorderClass: string`. Selector in the three gate test files updated
  from per-sefirah `data-*` attributes to unified `data-requires-burn`.

- **Prominent gate hint** — replaced the subtle paragraph with a full-width
  left-border callout (`border-l-4 bg-veil/10 text-sm`) using the
  Sefirah-colour border and sefirah-specific copy:
  - Gevurah: "demands a sacrifice"
  - Tiferet: "weighs the cost"
  - Binah: "sits with the loss"
  - Fallback (prevents silent Binah copy when sefirah unknown)

- **Burn-discard picker redesign** — hover-trash flow replaced with select→
  confirm: click a card to select (shows `arcanumByNumber(n).name — confirm
  release?`), then click "Release this card". This avoids the `discardMode`
  constraint entirely (`onCardSelect` + `selectedArcanum` only). `data-burn-
  discard-picker` region, `data-action="confirm-burn-discard"` button.

- **D20Button disabled during picker** — `disabled={requiresBurn === true ||
  onRoll === undefined}` so the Roll button is correctly disabled (not just
  de-handled) while the picker is open; screen readers don't see an enabled
  button that does nothing.

- **Voice narration** — `burnDiscardNarratorPath()` added to `lib/voice/
  paths.ts`. One-fire `useRef` guard plays the clip once per picker opening;
  ref resets when `awaitingBurnDiscard` goes false so retry re-plays.

- **Tests** — 5 new picker interaction tests in `EncounterScreen.test.tsx`
  (picker hidden before roll; appears on roll; card selection shows name +
  confirm; confirm closes picker + roll fires; re-selection changes choice).
  New `EncounterScreen.burnDiscard.voice.test.tsx` covers: plays on open,
  silent when voice disabled, one-fire guard, ref reset on retry.

**Surprised by:**
- `Hand.interactive = false` when `discardMode=true` — the old hover-trash
  picker was always broken. Discovered via the code comment in `Hand.tsx`:
  `interactive = visible && onCardSelect !== undefined && !discardMode`.
  The fix was to drop `discardMode` entirely and use `onCardSelect` + a
  confirm button.
- `exactOptionalPropertyTypes` bites: `requiresBurnSefirah={undefined}` is
  a type error when the interface declares the prop optional with a union type
  (not `| undefined`). Fixed with conditional spread.
