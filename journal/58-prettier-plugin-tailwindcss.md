# Journal — #58: chore(tooling): prettier-plugin-tailwindcss + repo-wide format pass

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-15T19:05:36-04:00 — initial push: prettier + format pass

**Pushed:** chore(tooling): prettier-plugin-tailwindcss + repo-wide format pass (#58)
**Why:** Install `prettier-plugin-tailwindcss@0.8.0`, add plugin to `.prettierrc`, add `pnpm format:check` to CI verify job, and run `pnpm format` once to apply combined Prettier reflow + Tailwind class sort across the repo. Discovered codebase had format drift across ~255 files on top of class-sort opportunity; bundled all three concerns into one PR. Re-applied against current main (shells PR #66, music PR #59, orrery PR #60 all landed since the prior branch was cut on May 14).
**Notes:** format:check, typecheck, lint all green. 2840 tests passed (1 todo).
**Commit(s):** `c599eca`
