# Journal — #22: feat(encounter): per-Sefirah idle motion polish for avatars

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-15T20:11:25-04:00 — push 1 · idle motion catalogue

**Pushed:** feat(encounter): per-Sefirah idle motion polish for avatars (#22)
**Why:** Add per-Sefirah idle motion at stage size — Hermes (hod) jitters, Selene (yesod) drifts, Ares (gevurah) holds dead still; all other avatars keep the existing 6 s breath halo as their assigned idle.
**Notes:** Two new Tailwind keyframes (`idle-jitter`, `idle-drift`). `[animation-delay:600ms]` on both body animations so the avatar-emerge entrance settles before idle begins (AC: entrance plays first). `data-avatar-idle-motion` attribute on the portrait wrapper for test hooks. 7 new AvatarPortrait tests; docs/motion.md updated with the per-character idle catalogue.
**Commit(s):** `f426ab4` (pending fix commit)
