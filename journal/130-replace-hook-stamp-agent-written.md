# Journal — #130: chore(workflow): replace unreliable hook stamp with agent-written stamp

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T17:57:09-04:00 — implementation + fix-round (pushes 1–2)

**Pushed:** chore(workflow): replace unreliable hook stamp with agent-written stamp; fix(workflow): address review — absolute stamp path + delete orphaned artifacts
**Why:** Replace PostToolUse:Agent hook (unreliable) with explicit agent-written stamp in /finish-ticket step 8.5; fix reviewer findings: absolute stamp path for split-session safety, delete checklist-stamp.d.mts, remove stale references in docs/workflow.md and code-reviewer.md
**Notes:** Auto-mode classifier hard-blocked all .claude/settings.json and .claude/skills/ edits; user applied skill file changes manually. stamp path fix required /usr/bin/python3.11 (zsh alias not resolving in Bash subprocess). PR requires human merge (gate-introducing rule).
**Commit(s):** `3122766..d5d0d3e`
