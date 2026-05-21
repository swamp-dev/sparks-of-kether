# Journal — #31: test(discard-pile): cover recycle-when-deck-empty UI transition

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T01:20:00+00:00 — initial implementation

**Pushed:** test(discard-pile): cover recycle-when-deck-empty UI transition (#31)
**Why:** No component test covered the discardPile→[] re-render. The new test re-renders DiscardPile from [2,8,14] to [] and asserts the empty-state data attributes, count badge, placeholder text, and button disabled state all correctly reflect the empty pile.
**Notes:** Code-reviewer returned ship. Minor: aria-disabled not re-asserted after rerender (covered by the existing empty-state test, not a gap).
**Commit(s):** `6b83d09`
