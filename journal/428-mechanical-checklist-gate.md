# Journal — #428: mechanical per-PR checklist gate (v2)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-06T18:46:00-04:00 — initial draft + review fixes (v2 of #428)

**Pushed:** v2 of the mechanical per-PR checklist gate, redesigned after #437 (v1) self-merged via a hand-bootstrapped stamp and was reverted in #438. Key change vs v1: belt-and-suspenders. The `PostToolUse:Agent` hook in `.claude/settings.json` writes the stamp automatically when settings.json is loaded (same as v1). NEW: `/finish-ticket` step 8.5 invokes `scripts/checklist-stamp.mjs --reviewer-output FILE` directly after each `code-reviewer` call. The script gains an explicit-mode CLI alongside its hook-mode (stdin JSON). Both modes write the same stamp via shared `writeStamp()`. The explicit step in /finish-ticket eliminates v1's chicken-and-egg — no dependency on settings.json being loaded; v2 itself self-bootstraps cleanly because the explicit step is in the SKILL.md the agent is following.

**Why:** v1 (#437) introduced the gate but couldn't satisfy it for its own merge — `.claude/settings.json` was new in that PR, hadn't been loaded by the session, hook didn't fire, no stamp existed. Agent piped a synthetic payload to bootstrap. That defeated the gate's first introduction. Reverted in #438. v2 fixes the chicken-and-egg structurally + closes the easiest hand-bootstrap pattern (the script call is now part of the documented workflow, not something the agent does outside the workflow to bypass).

**Notes:**
- `code-reviewer` first verdict: **fix** — 2 critical + 2 significant + 2 improvements. CRITICAL #1: `tr -c` newline mismatch — the SKILL.md's shell sanitization (`echo "$headRefName" | tr -c ...`) included `echo`'s trailing newline, replacing it with `_`. Result: the gate looked for `checklist-..._gate_.json` while the script wrote `checklist-..._gate.json`. Gate would have always failed. Verified the bug locally, then fixed by switching to `printf '%s'` (no trailing newline). CRITICAL #2: `main().catch()` exited 0 in explicit mode, silencing exceptions from `mkdirSync`/`writeFileSync` (would produce a silent false-pass — agent sees exit 0, assumes success, /ship-ticket finds no stamp later). Added a top-level `mode` flag set in `main()`; catch handler exit-1's in explicit mode, exit-0's in hook mode. SIGNIFICANT: `--reviewer-output` with no following arg or with another flag as the arg → added `filePath.startsWith('--')` sentinel guard. SIGNIFICANT: clearer guidance for `verdict=unknown` case (reviewer output missing `## Verdict` header). IMPROVEMENTS: replaced `<sha>` placeholder with concrete `sha=$(git rev-parse --short HEAD)` snippet.
- `code-reviewer` re-review verdict: **ship.** Both critical bugs cleanly resolved; sanitization parity verified by reproducing both forms locally; no new issues.
- Parser word-boundary fix (from v1's bootstrap incident, where "no new blockers — Ship." mis-classified as `block`) is folded in: `parseVerdict` now uses `/\bblock\b/` etc. Smoke-tested.
- v2's own /finish-ticket step 8.5 (the new explicit step) is what writes the stamp for THIS PR's merge — eating dogfood. That's why v2 self-bootstraps cleanly; v1 couldn't.
- Live test of A1 path-filter + B2 per-ticket Journal: this PR touches `.claude/`, `scripts/`, `docs/`, `journal/`, `.gitignore` — none in `code` / `e2e` / `integration` filters. Hosted CI should run only `verify` + `detect changes`.
- typecheck + lint clean; tests/docs 137 passed (+4 from new files in `journal/`).

**Commit(s):** single commit (settings.json + checklist-stamp.mjs + 2 SKILL.md + workflow.md + .gitignore + this entry).
