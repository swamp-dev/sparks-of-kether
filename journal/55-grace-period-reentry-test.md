# Journal — #55: test(hand): add re-entry-during-grace-period test for peek-shelf

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T00:50:00+00:00 — initial implementation

**Pushed:** test(hand): add re-entry-during-grace-period test for peek-shelf (#55)
**Why:** The cancel-before-fire contract for the peek-shelf grace period had no test. mouseEnter → mouseLeave → immediate mouseEnter must cancel the 120ms timer via expandHand's clearTimeout, keeping the fan expanded. This pins that path alongside the existing timer-firing and non-cancellation tests.
**Notes:** Code-reviewer returned ship. Minor style notes: no mid-sequence assertion after mouseLeave (intentional — existing test at line 570 already covers that state), inline useFakeTimers/useRealTimers without try/finally (matches surrounding test pattern in the suite).
**Commit(s):** `6602c2c`
