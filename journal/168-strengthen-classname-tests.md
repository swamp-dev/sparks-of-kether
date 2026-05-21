# Journal — #168: test(hand): strengthen className tests to catch pre-fix trailing-space bug

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T00:06:42-04:00 — push 1 implementation

**Pushed:** test(hand): add className interior-spaces regression test (#168)
**Why:** Adds a regression guard asserting that className values with interior spaces are preserved in the DOM — guarding against reintroduction of the .trim() call removed in #127.
**Notes:** none
**Commit(s):** `513ed44`
