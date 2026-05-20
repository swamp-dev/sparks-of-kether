# Journal — #80: fix(encounter): add never-exhaustion check to derivePose

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T14:24:45-04:00 — final push

**Pushed:** fix(encounter): add never-exhaustion check to derivePose
**Why:** Adds explicit react branch + never-typed variable so TypeScript errors at compile time if a new UiSubPhase is added without handling it in derivePose.
**Notes:** none
**Commit(s):** `3c3e5bc`
