# Journal — #186: test(blessing): pin focus-visible ring classes on Next/Roll/Continue/Hasten buttons in BlessingRitual

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T02:20:00-04:00 — push 1 implementation

**Pushed:** test(blessing): pin focus-visible ring classes on buttons in BlessingRitual (#186)
**Why:** PRs #170/#178/#179 added explicit focus rings to all four interactive buttons; without className assertions, a future Prettier reformat or tailwind-merge refactor could silently drop them. Added one test per button in a new describe block.
**Notes:** none
**Commit(s):** `e429e0e`

## 2026-05-21T02:32:00-04:00 — push 2 review fix

**Pushed:** fix(test): move focus-ring describe block after page-layout section (#186)
**Why:** Code reviewer flagged that the new describe was inserted between the #413 comment header and its describe block, splitting them and making the file structure confusing. Moved to end of file.
**Notes:** re-reviewed after fix; reviewer returned Ship.
**Commit(s):** `21a2ea8`
