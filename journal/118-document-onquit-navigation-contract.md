# Journal — #118: test(settings): document onQuit post-navigation contract in quit test

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T18:08:00-04:00 — initial push

**Pushed:** test(settings): document onQuit post-navigation contract in quit test
**Why:** The popover stays open after onQuit fires — the component does not call close() itself; navigation-triggered unmounting is the cleanup path. A comment now documents this contract so a future soft-transition change will know to add the missing DOM assertion.
**Notes:** none
**Commit(s):** `9bdcac6`
