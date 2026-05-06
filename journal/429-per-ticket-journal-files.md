# Journal — #429: per-ticket Journal entry files

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-06T13:46:58-04:00 — initial draft + review fixes

**Pushed:** New `journal/` directory with `README.md` codifying the per-ticket-file convention; new `journal/429-per-ticket-journal-files.md` (this file, dogfood); deprecation notice on legacy `Journal.md` (frozen as of B2; new entries forbidden); `.claude/skills/finish-ticket/SKILL.md` step 4/6 + invariants + PR-body template all redirect to per-ticket files; `.claude/skills/ship-ticket/SKILL.md` step 3 derives `<N>` from branch name and reads `journal/<N>-*.md` (with legacy `Journal.md` fallback for pre-B2 branches); `.claude/skills/start-ticket/SKILL.md` adds new step 6b that creates the per-ticket file with the header template at worktree setup; `docs/workflow.md` Journal section + 8-step table + Where-to-find table updated; `CLAUDE.md` Project snapshot + Where-to-look table updated.

**Why:** Append-only `Journal.md` + N concurrent PRs = guaranteed merge conflict on every overlapping rebase. Hit twice in PR #419, again in #431 and #433. Per-ticket files eliminate the conflict surface entirely (two PRs write to two files).

**Notes:**
- **Migration deferred to a follow-up tech-debt ticket.** This PR is convention-shift only. Legacy `Journal.md` stays in place with deprecation notice; future tech-debt PR will hard-cut (move to `docs/journal-archive/`) once stabilized. `scripts/archive-journal.mjs` not touched — keeps archiving the now-frozen `Journal.md`; per-ticket files have ~30-day grace before archival is needed.
- `code-reviewer` first verdict: **fix** — 5 findings. (1) `sed` derivation in ship-ticket step 3 had no defensive guard for non-numeric output → added explicit `[[ "$N" =~ ^[0-9]+$ ]]` check that aborts loudly. (2) Multiple-numbers-in-slug regex behavior was correct but undocumented → added comment noting "first digit-run after the type/" intent. (3) `docs/workflow.md` 8-step table line 19 still said "Journal entry copied in" (old behavior) → updated to "link to `journal/<NN>-<slug>.md` + short excerpt." (4) `/start-ticket` SKILL.md was missing the file-create step that `journal/README.md` promised → added new step 6b. (5) Deprecation notice tone tightened ("Append-only — for the historical entries below" was slightly ambiguous → made explicit). Plus the dogfood file was empty — adding this entry as part of the same push fixes that.
- Live test of A1 (#425) path-filter: this PR touches only `.claude/skills/`, `docs/`, `journal/`, `Journal.md`, `CLAUDE.md` — none of which are in `code` / `e2e` / `integration` filters. Hosted CI should run only `verify` + `detect changes`; build / e2e / integration should be SKIPPED. This is the second end-to-end exercise of the path filter (after #434).
- typecheck + lint clean; tests/docs 137 passed (4 new link assertions from the new files in `journal/`).
- Eating dogfood: this PR's worktree was created with the `node_modules` symlink (A2 #426); this very journal entry lives in `journal/429-per-ticket-journal-files.md` (the convention this PR introduces).

**Commit(s):** single commit (journal/ + Journal.md notice + 3 SKILL.md + workflow.md + CLAUDE.md + this entry).
