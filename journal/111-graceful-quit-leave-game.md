# Journal — #111: feat(game): graceful quit — let players leave a game in progress

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T23:18:19-04:00 — initial push, tests + implementation

**Pushed:** test(settings): add failing tests for onQuit graceful-leave flow; feat(game): graceful quit — Leave Game + confirm in Settings popover (#111)
**Why:** No way to intentionally leave a game existed. Added `onQuit` prop to SettingsButton (inline two-step confirm), threaded through PlayScreen and both play pages (single-player + multiplayer). In multiplayer, departure triggers the existing auto-pause mechanism.
**Notes:** none
**Commit(s):** `54b46b0..ff95ce5`
