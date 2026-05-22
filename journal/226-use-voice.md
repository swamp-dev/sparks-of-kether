# Journal — #226 feat(voice): useVoice hook + voice settings

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/226
PR: https://github.com/swamp-dev/sparks-of-kether/pull/261

---

## 2026-05-22 — push 1: implementation + review fixes

**Pushed:** `lib/voice/paths.ts`, `lib/voice/useVoice.ts`, `lib/voice/settings.ts`,
voice toggle in `SettingsButton.tsx`, tests for both.

**What changed:**
- `voiceEnabled` / `setVoiceEnabled` added to the existing `SoundSettingsContext`
  rather than creating a parallel provider. This keeps the component tree flat and
  lets `useVoice` inherit the same render-cycle propagation as SFX and music.
- `useVoice` uses per-path caching with `currentTime = 0` reset (not `cloneNode`)
  because voice clips are 3-10s; cloning would construct a new decode pipeline for
  every play call, wasteful for exclusive-playback use case.
- `preload='none'` is the gate that prevents ~873 clips from preloading on page load.
  Without it, the browser's resource-hint logic would eagerly fetch multiple clips.

**Surprising:** Code review caught a behavioral gap: the hook didn't stop in-flight
audio when the voice toggle flipped off mid-clip. `useSound` never needed this because
SFX are ≤2s fire-and-forget — you don't notice if one plays for another second after
disabling. Voice clips are 3-10s; a user toggling off would hear most of the line.
Fixed with `useEffect([voiceEnabled])` that calls `currentRef.current?.pause()` when
`voiceEnabled` flips false, matching the exact pattern `useMusic` already uses.

The StrictMode concern in the original test wrapper (calling `localStorage.setItem`
inside a component render body) is not a bug today — the write is idempotent and
`beforeEach` clears state — but React's rules prohibit side effects in render. Moved
the seed call before `renderHook(...)` so it runs once, synchronously, before the
component tree is mounted.

