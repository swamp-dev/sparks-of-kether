# Journal — #45: fix(sound): deduplicate audio-unlock on repeated enable toggles

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T13:30:00Z — push 1 module-level flag gates unlock to first gesture

**Pushed:** Add `let audioContextUnlocked = false` module-level flag in `settings.tsx`. `unlockAudioContext()` checks the flag and returns early if already unlocked; sets the flag inside the `try` block after `new Audio()` succeeds (reviewer: set optimistically before `play()` but after the constructor, so a constructor throw doesn't poison future calls). Export `_resetAudioUnlockForTests()` for tests to reset module-level state; moved to `beforeEach` in the SFX describe block so future audio tests can't forget. New test verifies unlock fires only once across multiple off→on toggles.
**Why:** Each off→on toggle was firing a fresh `new Audio().play()` even though browser MEI is already unlocked after the first gesture. Harmless in production but noisy in tests (double-fire in StrictMode, log noise from HTMLMediaElement not-implemented in jsdom).
**Commit(s):** `d95a4b1`, `7655368`
