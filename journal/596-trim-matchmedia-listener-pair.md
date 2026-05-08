# Journal — #596: test: trim legacy listener-pair from sibling matchMedia stubs (EncounterScreen, SettingsButton, sound/settings)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T15:02:13-04:00 — push 1: trim legacy matchMedia listener-pair from sibling stubs

**Pushed:** test: drop legacy listener-pair from sibling matchMedia stubs
**Why:** Reviewer of #559 noted three sibling test files still carry the legacy `addListener`/`removeListener` no-op pair; trim them so only the modern pair remains, matching what `useReduceMotion` and the other consumers actually call.
**Notes:** none
**Commit(s):** range from `7de34d4..HEAD` (single trim commit + this journal entry)
