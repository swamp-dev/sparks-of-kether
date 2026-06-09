# Journal — #315: GiftModal auto-focus first button on pick-card/pick-recipient steps

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-08T21:40:00-04:00 — push 1 (PR open)

**Pushed:** 3 commits — failing tests for pick-card/pick-recipient autoFocus (red), fix adding `autoFocus={idx === 0}` to both steps, comment style fix to match refuse-warning pattern.
**Why:** Deferred from PR #313 review. Screen readers announced the dialog title but focus stayed on the backdrop; keyboard users had to Tab to reach the first button.
**Notes:** `over-cap` step has the same a11y gap (no autoFocus on first discard button) — filed as tech-debt follow-up.
**Commit(s):** cfc91c1..HEAD
