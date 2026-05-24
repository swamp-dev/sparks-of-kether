# Journal — #231 feat(voice): Kether narrator voice

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/231
PR: (to be opened)

---

## 2026-05-22 — push 1: narrator wiring + narratorVoicePath

**Pushed:** `narratorVoicePath()` in `lib/voice/paths.ts` + narrator
hooks in `FinalThresholdScreen.tsx` + `FinalThresholdScreen.narrator.voice.test.tsx`
(3 tests).

**Design decisions:**

- **Two moments: trial-open and closure-open** — The ticket's minimum
  requirement (2+ distinct moments) is met with `threshold-open` firing
  when subPhase enters 'trial' and `threshold-close` firing when subPhase
  enters 'close'. The pass/fail outcome voice (after `thresholdConfirm`)
  is deferred: the engine transitions `phase: 'kether' → 'end'` atomically
  with `closureLocked: true`, so FinalThresholdScreen unmounts before a
  `closureLocked` effect could fire. Pass/fail narration belongs in the
  EndGame screen as a follow-up.

- **Hooks before early returns** — FinalThresholdScreen has two
  PreRitualHoldView early returns before the main render. All hooks
  (`useVoice`, `useRef`, `useEffect`) are declared at the top of the
  function before those guards, and `narratorSubPhase` is derived early
  from `state.phase` + `state.ketherRitual?.subPhase` so the effects
  have the correct value without duplicating the subPhase logic.

- **Removed duplicate `const ritual` declaration** — the original code
  had `const ritual = state.ketherRitual` after the first early return.
  Since we now derive `ritual` before the guards for the narrator, the
  later declaration was removed to avoid a duplicate binding.

- **`narratorVoicePath(context)` in `lib/voice/paths.ts`** — parallel to
  `greetingVoicePath`, accepts a string context key and returns the
  `/audio/voice/narrator-kether-{context}.mp3` path.
