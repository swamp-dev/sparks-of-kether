# Journal — #126: fix(presence): extend className separator audit to remaining components

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T04:11:00-04:00 — push 1 implementation

**Pushed:** fix(components): replace `${className ?? ''}` with safe separator pattern across 27 components (#126)
**Why:** Replaces `${className ?? ''}` (which produces a trailing space when className is absent) with `${className ? \` ${className}\` : ''}` across all remaining instances in the codebase. The separator space is moved inside the conditional so it only appears when className is defined. TreeBoard snapshot updated to reflect the correct (no trailing space) output.
**Notes:** 28 files changed (27 components + 1 snapshot). Prettier check passed — only JS expression structure changed, not Tailwind class order.
**Commit(s):** TBD
