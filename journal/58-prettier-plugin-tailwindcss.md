# Journal — #58: chore(tooling): prettier-plugin-tailwindcss + repo-wide format pass

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-15T19:05:36-04:00 — initial push: prettier + format pass

**Pushed:** chore(tooling): prettier-plugin-tailwindcss + repo-wide format pass (#58)
**Why:** Install `prettier-plugin-tailwindcss@0.8.0`, add plugin to `.prettierrc`, add `pnpm format:check` to CI verify job, and run `pnpm format` once to apply combined Prettier reflow + Tailwind class sort across the repo. Discovered codebase had format drift across ~255 files on top of class-sort opportunity; bundled all three concerns into one PR. Re-applied against current main (shells PR #66, music PR #59, orrery PR #60 all landed since the prior branch was cut on May 14).
**Notes:** format:check, typecheck, lint all green. 2840 tests passed (1 todo).
**Commit(s):** `c599eca`

## 2026-05-16T17:15:00+00:00 — CI re-trigger: fresh action run for supabase/setup-cli

**Pushed:** Journal-only bump to force a fresh CI run.
**Why:** Original CI run (2026-05-15) used `supabase/setup-cli@v1` at a pinned old action SHA that installs CLI `1.226.4` instead of `2.98.2`. CLI `1.226.4` rejects `db.major_version = 17` in `supabase/config.toml` with `Invalid db.major_version: 17`. Re-running the original workflow job reuses the same old action SHA. A fresh push triggers the workflow from the current `setup-cli@v1` action state, which correctly installs `2.98.2`.
**Notes:** No code changes. Integration test expected to pass with current action version.
**Commit(s):** `a43e525`

## 2026-05-16T17:30:00+00:00 — rebase onto main + conflict resolution

**Pushed:** Rebased format pass onto current main (which includes save-resume #91, discard-icons #94, lightbox #88, lobby-reset #89). Resolved 17 merge conflicts by taking main's version for all non-format files, then re-running `pnpm format` to reapply prettier + tailwind class sort. `components/game/DiscardPrompt.tsx` deleted (main removed it). All 2931 tests pass, typecheck green, lint green.
**Why:** Code-review found that the branch was cut before the `supabase/setup-cli` version bump in save-resume (#91) landed on main. The branch's `ci.yml` still pinned CLI `1.226.4`, which rejects `db.major_version = 17`. Rebase onto main picks up the `2.98.2` pin.
**Notes:** The previous entry's explanation ("fresh CI run picks up current action state") was wrong — the `version:` field in the workflow overrides action-level defaults; only a rebase picks up `2.98.2`.
**Commit(s):** `6644711..4011174`
