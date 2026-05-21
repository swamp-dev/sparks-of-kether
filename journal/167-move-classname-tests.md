# Journal — #167: test(hand): move className tests to Hand — interaction describe block

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T00:28:06-04:00 — push 1 implementation

**Pushed:** test(hand): move className tests to Hand — interaction block (#167)
**Why:** The three #127 className tests were inside Hand — magnification under prefers-reduced-motion (#463) which is semantically unrelated to className composition; moved them to Hand — interaction where they belong.
**Notes:** none
**Commit(s):** `01d442a`

## 2026-05-21T00:51:03-04:00 — push 2 merge conflict resolution

**Pushed:** merge: resolve conflict with main after #168 — keep #168 test in magnification block, #127 tests in interaction block
**Why:** #168 merged to main while this branch was open; it added its interior-spaces test right after the three #127 tests in the magnification block. Our branch had already removed those three #127 tests from magnification (moved to interaction); resolved by keeping only the #168 test at the conflict location. Also removed spurious extra blank line introduced by the merge.
**Notes:** none
**Commit(s):** `737dbb5`
