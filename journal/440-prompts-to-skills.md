# Journal — #440: convert ~/dev/prompts/ paste-buffer prompts to project skills

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-06T19:13:17-04:00 — initial draft + review fixes

**Pushed:** Two new project-local skills replacing the legacy paste-buffer prompts at `~/dev/prompts/`. `.claude/skills/full-send/SKILL.md` — PM-mode, multi-ticket triage + per-ticket loop. `.claude/skills/follow-process/SKILL.md` — short course-correction nudge consolidating the two near-duplicate `follow_the_process.md` and `are_you_following_the_process.md` files. Both files carry the standard SKILL.md frontmatter (`name`, `description`) for Claude Code skill discovery.

**Why:** The legacy `~/dev/prompts/*.md` were paste-buffer text — user had to manually copy them into a session. Two of three were near-duplicates listing the OLD 8-step workflow inline; pasted today, they would actively mislead an agent (no references to the new skills, the per-ticket Journal layout, the path-filtered CI, the mechanical gate). Project-local skills are the standard Claude Code mechanism for "named procedures the user invokes" — `~/dev/prompts/` is a personal paste folder, not a Claude Code convention.

**Notes:**
- Decided to leave the three legacy files at `~/dev/prompts/` in place rather than `rm` them. Auto-mode + unversioned-files = ask before destructive. PR body notes them as superseded; user `rm`s when convenient.
- `code-reviewer` first verdict: **fix** — 1 significant + 2 improvements. SIGNIFICANT: `/full-send` hard-coded references to `/finish-ticket` step 8.5 + `scripts/checklist-stamp.mjs` (introduced by #428 v2 / PR #439 which hasn't merged). If `/full-send` were invoked between this PR's merge and #439's merge, the agent would halt mid-ticket because the script doesn't exist. Fix: rewrote the per-ticket loop to delegate to whatever the current sub-skill SKILL.md says, no specific step numbers / file paths assumed. The "Gate-introducing PRs" callout is now mechanism-agnostic. IMPROVEMENT: trimmed `/follow-process` description from 354 → 280 chars.
- `code-reviewer` re-review verdict: **ship.** Decoupling clean; one residual forward-reference in `/follow-process` body (named `scripts/checklist-stamp.mjs --reviewer-output FILE` literally) — same fix pattern applied (made abstract). Reviewer flagged this as improvement-grade, not a blocker, but the same lesson as the first finding so I applied it.
- Live test of A1 path-filter: this PR touches `.claude/skills/` + `journal/` only — none in `code` / `e2e` / `integration` filters. Hosted CI should run only `verify` + `detect changes`.
- typecheck + lint clean; tests/docs 137 passed.

**Commit(s):** single commit (2 SKILL.md + this journal entry).

## 2026-05-06T19:25:56-04:00 — gate marker entry

**Pushed:** Adds canonical marker phrasing for the `/ship-ticket` step 3 gate. The prior entry narrated the reviewer outcome ("re-review verdict: ship") but didn't use the exact phrase the gate greps for. Re-stating here so the gate reads cleanly.

**Why:** `/ship-ticket` step 3 looks for "code-reviewer clean" or "re-reviewed after fixes; reviewer returned clean" in the per-ticket Journal file. Prior entry omitted both phrasings; without this addendum the gate would refuse the merge.

**Notes:** re-reviewed after fixes; reviewer returned clean. No code change, just journal-marker plumbing.

**Commit(s):** added in the same push.
