# Journal — #47: test(portrait-assets): deduplicate large/small tests with test.each

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T01:10:00+00:00 — initial implementation

**Pushed:** test(portrait-assets): deduplicate large/small tests with it.each (#47)
**Why:** Two identical test bodies differing only in 'large' vs 'small' — replaced with it.each(['large', 'small'] as const) to halve the code. Same 2 test cases, identical generated test names, as const ensures the union type narrows correctly for portraitPath's signature.
**Notes:** Code-reviewer returned ship. No production code touched.
**Commit(s):** `93c8ee9`
