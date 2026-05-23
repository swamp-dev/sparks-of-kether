# Journal — #228 feat(voice): avatar verdict narration

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/228
PR: (to be opened)

---

## 2026-05-22 — push 1: EncounterScreen verdict voice wiring + tests

**Pushed:** `EncounterScreen.tsx` verdict voice wiring + new
`EncounterScreen.voice.test.tsx` (4 tests). Plus review fixes.

**Design decisions:**

- **Variant index recovery via `variants.indexOf(line)`** — `pickVerdict` consumes
  an RNG draw and returns a string, not an index. The index is recovered by
  searching the same variants array. Safe because all variant strings are unique
  within a cell (copy discipline invariant). Cast clamped to `idx <= 2` before
  `as 0 | 1 | 2` to guard against a future 4th variant silently casting out of range.

- **`firedVoiceForOutcomeRef` guard** mirrors the existing `firedForOutcomeRef` pattern
  used for pass/fail sound cues. Ties the voice trigger to a specific `CheckOutcome`
  object identity so re-renders inside react state don't re-fire.

- **`useVoice()` + `firedVoiceForOutcomeRef` declared before the loopback effect** so
  `stopVoice()` can be called inside the `react → prep` transition block without a
  forward reference. The stop is folded into the existing loopback block rather than
  a separate effect — avoiding the mount-phase fire that the separate approach produced.

- **`cloneNode` stub in FakeAudio** — `useSound` calls `cloneNode()` on cached Audio
  elements. Without it the voice tests threw `TypeError: cached.cloneNode is not a function`.

**Code review findings addressed:**
- Variant index cast: `(idx >= 0 && idx <= 2 ? idx : 0) as 0 | 1 | 2` (was missing upper bound)
- Stop-on-retry: folded into existing loopback block; removed separate effect that fired on mount
- Duplicate `renderHook` import merged into single import line
- Disabled-voice test: replaced vacuous conditional assertion with direct `toBeUndefined()`
