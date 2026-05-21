# Journal — #168: test(hand): strengthen className tests to catch pre-fix trailing-space bug

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T00:06:42-04:00 — push 1 implementation

**Pushed:** test(hand): add className interior-spaces regression test (#168)
**Why:** Adds a regression guard asserting that className values with interior spaces are preserved in the DOM — guarding against reintroduction of the .trim() call removed in #127.
**Notes:** none
**Commit(s):** `513ed44`

## 2026-05-21T00:15:57-04:00 — push 2 prettier-safe fix

**Pushed:** fix(test): use variable to preserve interior spaces through prettier (#168)
**Why:** Prettier stripped leading/trailing spaces from the inline className string literal; using a named variable preserves the whitespace so the assertion is meaningful.
**Notes:** none
**Commit(s):** `21c63b4`
