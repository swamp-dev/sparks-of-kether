# Journal — #128: test: add className prop assertions to AvatarStack and OrreryBackdrop

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T17:35:54-04:00 — initial push

**Pushed:** test: add className prop assertions to AvatarStack and OrreryBackdrop
**Why:** Locks in the className separator fix from #102: regression guards on AvatarStack and OrreryBackdrop assert a passed className lands on the root element without double-spaces or leading/trailing spaces.
**Notes:** none
**Commit(s):** `5674f83`

## 2026-05-20T17:44:49-04:00 — fix push after review

**Pushed:** fix(test): inspect raw class attribute to catch whitespace regressions
**Why:** Reviewer (SIGNIFICANT): `toHaveClass` splits on `\s+` internally and cannot detect double-spaces or leading/trailing spaces — the exact defects the tests claimed to guard. Switched both assertions to `getAttribute('class')` with explicit regex checks.
**Notes:** re-review required (fix landed in SIGNIFICANT-flagged area)
**Commit(s):** `5de818a`

## 2026-05-20T17:51:30-04:00 — second fix push after re-review

**Pushed:** fix(test): add absent-className case to pin the trailing-space regression
**Why:** Reviewer (SIGNIFICANT × 2): tests only exercised the truthy-className path; the original bug (trailing space when className is absent) went untested. Added no-className render assertions to both tests to make the regression guard complete.
**Notes:** re-review required (second SIGNIFICANT finding addressed)
**Commit(s):** `85b119a`
