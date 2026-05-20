# Journal — #99: test(reset): tighten 403 assertion to include playersUpdates.toHaveLength(0)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T19:05:00-04:00 — initial implementation push

**Pushed:** test(reset): tighten 403 assertion to include playersUpdates.toHaveLength(0) (#99)
**Why:** The 403 test in the reset route asserted gameEventsDeletes, gameStatesDeletes, and roomUpdates were zero but omitted playersUpdates — leaving a gap in the no-writes invariant. One-line addition closes the gap.
**Notes:** none
**Commit(s):** `13e1d02`
