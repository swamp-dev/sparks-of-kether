# Journal — #127: fix(hand): replace .trim() on className template literal in Hand.tsx

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T22:53:00-04:00 — initial implementation

**Pushed:** fix(hand): replace .trim() on className template literal in Hand.tsx (#127)
**Why:** The floating-mode outerClassName was built with `${className ?? ''}` producing a trailing space when className is absent. Consistent with the #102 fixes, replaced with conditional interpolation so no trailing space is produced and .trim() is no longer needed.
**Notes:** none
**Commit(s):** TBD
