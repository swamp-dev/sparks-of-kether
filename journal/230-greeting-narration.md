# Journal — #230 feat(voice): avatar arrival greeting narration

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/230
PR: (to be opened)

---

## 2026-05-22 — push 1: greeting voice wiring + tests

**Pushed:** `avatarGreetingVoicePathFor` helper in `lib/sound/cues.ts` +
cues tests extended + `EncounterScreen.tsx` greeting latch effect +
`EncounterScreen.greeting.voice.test.tsx` (3 tests).

**Design decisions:**

- **Effect declaration order determines voice winner** — both player response
  (#229) and greeting (#230) fire at `uiSubPhase === 'prep'`. React runs
  effects in declaration order within a single render cycle; `useVoice` is
  exclusive (each `playVoice` stops the previous clip). Declaring greeting
  AFTER player response means the greeting fires last and wins the exclusive
  voice slot on initial mount. On retry, the greeting latch is already set
  so only the player response fires.

- **`avatarGreetingFiredRef` latch** — mirrors the `avatarStingFiredRef`
  pattern from the arrival sting effect. Fires exactly once per encounter
  mount; a retry loopback (`react → prep`) does not reset it.

- **`avatarGreetingVoicePathFor` in `lib/sound/cues.ts`** — placed alongside
  `avatarArrivesCueFor` since both map a SefirahKey to audio for the avatar
  arrival moment. Uses `greetingVoicePath` from `lib/voice/paths` to build
  the public audio path.

- **Kether returns null** — consistent with `avatarArrivesCueFor`. The Kether
  narrator moment is handled separately by #231 in `FinalThresholdScreen`.

- **Malkuth maps to Hestia** — mirrors the sting mapping. Hestia's companion
  role in Malkuth gets both the sting and the spoken greeting.

- **Stash pop conflict resolution** — #229 (player response wiring) landed in
  main before this branch could push. Rebased onto updated main; stash pop
  conflicted in the same region of EncounterScreen.tsx. Resolution: kept
  both effects in the correct order (player response first, greeting second).
