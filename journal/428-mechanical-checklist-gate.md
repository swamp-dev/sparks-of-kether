# Journal — #428: mechanical per-PR checklist gate

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-06T14:05:26-04:00 — initial draft + review fixes

**Pushed:** New `scripts/checklist-stamp.mjs` (~135 lines) — `PostToolUse:Agent` hook handler. Reads stdin payload, filters for `subagent_type=code-reviewer`, parses verdict from "## Verdict" markdown header, writes `.claude/state/checklist-<sanitized-branch>.json` with `{ branch, head_sha, ran_at, verdict, verdict_hash, reviewer_text_length }`. New `.claude/settings.json` registers the hook (`PostToolUse → Agent → command: node scripts/checklist-stamp.mjs`). `.claude/skills/ship-ticket/SKILL.md` step 3 rewritten to read the stamp and validate `head_sha == PR HEAD` AND `verdict == ship`, fail-closed otherwise. `.claude/skills/finish-ticket/SKILL.md` step 8 callout notes the auto-stamping and that `/ship-ticket` will refuse without it. `docs/workflow.md` § Self-merge authority — first bullet now requires the stamp. `.gitignore` adds `.claude/state/` (state files never committed) plus the same `/node_modules` anchored variant B2 introduced (independent fix; same pattern).

**Why:** Highest-leverage AI-dev safety improvement from PR #419's plan. Honor-system Journal marker (which the agent itself writes) is fakeable; mechanical hook-written stamp is not (without actually invoking `code-reviewer`). Gap matters more as autonomy grows.

**Notes:**
- `code-reviewer` first verdict: **fix** — 1 critical + 4 significant + 2 improvements. Critical: `<P>` literal in shell snippet — replaced with `$PR_NUMBER` plus a one-liner explaining variable provenance. Significant: (1) verdict-ordering bug — `'fix-then-ship'.includes('ship') === true` would misclassify; reversed check order to `block → rework → fix → ship` so stricter verdicts win. Smoke-tested. (2) `parseVerdict` single-line assumption — documented in function comment. (3) `CLAUDE_PROJECT_DIR` env var was undocumented; dropped, command is plain `node scripts/checklist-stamp.mjs`. (4) Detached HEAD case — added `if (branch === 'HEAD') return;` guard. Smoke-tested by detaching HEAD and confirming no stamp written. Improvements: hash docstring tightened (forensic-audit purpose); branch collision (`feat/foo/bar` vs `feat_foo_bar`) acknowledged as theoretical (violates naming convention).
- `code-reviewer` re-review verdict: **ship.** All five prior findings cleanly resolved; one minor observation about the hook firing on every Agent call (correct design — settings.json matcher can't filter by `subagent_type`; the script's early-return is fast).
- **Honest about the gate's adversarial limits:** The agent has Write tool access and can forge a stamp file. The mechanical gate is robust against accidental skip / "I forgot" / "context got compacted between review and ship" — not against a determined adversarial agent. Documented as such; the load-bearing safety remains the agent's discipline plus the hooks-make-skipping-harder-than-doing-it-right ratio.
- Live test of A1 path-filter: this PR touches `.claude/`, `scripts/`, `docs/`, `journal/`, `.gitignore` — none in `code` / `e2e` / `integration` filters. Hosted CI should run only `verify` + `detect changes`.
- typecheck + lint clean; tests/docs 133 passed (137 after the new files in `journal/` get picked up).
- **B2 #429 coordination:** B1's worktree was created before B2 merged. After B2 lands (just shipped #436), B1 will rebase onto a main that has the per-ticket Journal layout. Conflict expected in `/ship-ticket` step 3 — both B1 and B2 rewrote it. Resolution: B1's stamp-file gate becomes the authoritative mechanical gate; B2's per-ticket file becomes the human-readable audit record alongside.

**Commit(s):** single commit (settings.json + checklist-stamp.mjs + 2 SKILL.md + workflow.md + .gitignore + this entry).
