# Journal — #637: fix checklist-stamp routing when main repo is on a different branch

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T23:07:00-04:00 — push 1: fix + tests

**Pushed:** fix(gate): stamp reviewed-branch via haystack scan, not cwd HEAD
**Why:** The PostToolUse:Agent hook was firing correctly but writeStamp read `git rev-parse HEAD` at the routed cwd (main repo), which was on `feat/636-hand-peek-shelf-2` rather than the PR branch being reviewed (`feat/526-music-engine`). Stamp landed in the wrong file; /ship-ticket refused to merge. Identified during #526 merge attempt.
**Notes:** Added `findReviewedBranchAmong` (pure, exported, 5 new tests) + `findReviewedBranch` (git I/O shell). hookMode now always scans local branches against haystack before writing stamp. Falls back to cwd HEAD only when no branch is found. 29 tests pass, typecheck clean, lint clean.
**Commit(s):** `37ff112`
