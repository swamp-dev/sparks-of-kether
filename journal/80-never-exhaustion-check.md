# Journal — #80: fix(encounter): add never-exhaustion check to derivePose

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T14:24:45-04:00 — final push

**Pushed:** fix(encounter): add never-exhaustion check to derivePose
**Why:** Adds explicit react branch + never-typed variable so TypeScript errors at compile time if a new UiSubPhase is added without handling it in derivePose.
**Notes:** none
**Commit(s):** `3c3e5bc`

## 2026-05-20T14:28:35-04:00 — fix push after first review

**Pushed:** fix(encounter): export UiSubPhase from encounter-pose — single source of truth
**Why:** Reviewer found SIGNIFICANT issue: UiSubPhase was duplicated in EncounterScreen.tsx; never check only guarded the local copy. Exported the type and imported it in EncounterScreen.tsx to eliminate the duplication.
**Notes:** New exported symbol introduced (UiSubPhase); re-review required.
**Commit(s):** `33f6c5b`
