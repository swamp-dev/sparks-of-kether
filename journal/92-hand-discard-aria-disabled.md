# Journal — #92: test(hand): assert aria-disabled=false on card button in discard mode

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T19:25:00-04:00 — initial implementation push

**Pushed:** test(hand): assert aria-disabled=false on card button in discard mode (#92)
**Why:** The ariaDisabled formula fix in #90 sets aria-disabled=false when discardMode=true, but there was no test asserting this. A silent regression was possible. One new test in Hand.discard.test.tsx closes the gap.
**Notes:** none
**Commit(s):** TBD
