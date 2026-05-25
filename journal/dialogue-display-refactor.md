# dialogue-display-refactor

## 2026-05-24 — push 1 (initial implementation)

**What shipped:**

New `DialogueLine` component (`components/game/encounter/DialogueLine.tsx`) — a single-line dialogue bar with left-accent border, speaker nameplate, and `RevealLine` body. Supports four variants: `avatar` (Sefirah accent), `player` (veil tint), `pass` (tiferet gold), `fail` (gevurah red). All Tailwind class strings are full literals for JIT extraction.

`sefirah-frame-tokens.ts` extended with `dialogueBorderL` and `dialogueSpeakerText` fields for all 10 Sefirot.

`EncounterScreen.tsx` wired up with `dialoguePhase` state (`'framing' | 'player-response' | 'ready'`). Prep now sequences: avatar framing line → zodiac player-response line → PrepPanel ready. Old player-response voice effect (#229) replaced with a phase-keyed effect that fires when `dialoguePhase === 'player-response'`, eliminating the ordering dependency that required a comment.

`VerdictReveal.tsx` delegates text reveal to `DialogueLine` (pass/fail variants). Sparkle and fail-separation overlays stay owned by `VerdictReveal`.

13 new `DialogueLine.test.tsx` tests; 6 existing `EncounterScreen.test.tsx` tests updated to advance fake timers past the framing animation before asserting on `[data-player-response]`.

**Surprising thing:** The `exactOptionalPropertyTypes` strictness flag — forwarding `onComplete?: () => void` from `DialogueLine` to `RevealLine` directly caused a type error. Fixed by conditional-spreading: `{...(onComplete !== undefined ? { onComplete } : {})}`.

## 2026-05-24 — push 2 (review fixes)

Code review flagged that `playerResponseVoiceFiredRef` was missing — on retry, `dialoguePhase` resets to `'framing'` and then back to `'player-response'`, so the player-response voice would re-fire each retry round. Added the latch to match the greeting's once-per-encounter behavior.

Also cleaned up: stale `avatarCaption` prep branch (now the portrait has no caption in prep — `DialogueLine` owns that text), added coupling comment between `framingComplete` and `dialoguePhase`, added `'ready'` phase intent note, removed spurious `async` from `renderPrep` test helper.
