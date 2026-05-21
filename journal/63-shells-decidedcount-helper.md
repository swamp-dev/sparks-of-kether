# Journal — #63: test(shells): move decidedCount helper before for-loop in integration test

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T19:50:00-04:00 — initial implementation push

**Pushed:** test(shells): move decidedCount helper before for-loop in integration test (#63)
**Why:** The function was declared after the for-loop that uses it. JS hoisting makes it work, but the declaration order was confusing. Moving it above the loop matches the natural read-order.
**Notes:** none
**Commit(s):** TBD
