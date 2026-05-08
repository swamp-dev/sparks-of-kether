# Journal — #530: chore(agents): add sparks-specific code-reviewer override at .claude/agents/code-reviewer.md

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T21:17:12-04:00 — push 1: project-local code-reviewer override

**Pushed:** chore(agents): add sparks-specific code-reviewer override at `.claude/agents/code-reviewer.md`.
**Why:** Address two pain points documented for the global `code-reviewer`. (1) ~70/30 real-vs-defensive finding ratio per memory `feedback_review_findings_honest_assessment.md` (2026-05-06): ~30% of findings across 8 reviews were defensive or fabricated, driving fix-everything-to-clear-queue churn. (2) The global agent's `Testing Responsibilities` section duplicates `/finish-ticket` step 9's local CI matrix — `## Test Results` output goes nowhere. Project-local override at `.claude/agents/code-reviewer.md` transparently shadows the dotfiles version for sparks (same name = override) without affecting other projects. Adds per-finding `[high|medium|low]` confidence markers, severity-vs-confidence orthogonality note, diff-scope discipline rule, falsifiability rule, and `## Acceptance criteria` section between Improvements and Verdict. Removes the `Testing Responsibilities` block, the redundant `Red flags` list, and three of four invocation `<example>` blocks; compresses language-specific bullets to one line. Preserves load-bearing parts: `## Verdict` header + the four verdict words (`ship`/`fix`/`rework`/`block`), severity headers (`## Critical Issues`, `## Significant Problems`, `## Improvements`), agent name `code-reviewer` — so `scripts/checklist-stamp.mjs:parseVerdict` and every skill that invokes `code-reviewer` by name keep working with zero changes.
**Notes:** Pre-commit parser sanity check passed 5/5 — sample outputs for each verdict word plus the historically-tricky "no new blockers — Ship." phrasing all classify correctly via the `parseVerdict` regex from `scripts/checklist-stamp.mjs:71-78`. No `Testing Responsibilities` / `Test Results` section in the new file. Diff is two new files (the agent + this journal); no existing code touched, so skills, scripts, and prompts in finish-ticket are all untouched.
**Commit(s):** TBD on push.
