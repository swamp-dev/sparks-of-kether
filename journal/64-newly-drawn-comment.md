# Journal — #64: docs(engine/draws): comment newlyDrawn slice invariant

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T22:30:00-04:00 — initial implementation

**Pushed:** docs(draws): comment newlyDrawn slice invariant (#64)
**Why:** The `pHand.slice(player.hand.length)` line relies on `pHand` only growing by appending — a correct but implicit invariant that a future refactor could silently break. One-line comment makes the assumption explicit.
**Notes:** none
**Commit(s):** TBD
