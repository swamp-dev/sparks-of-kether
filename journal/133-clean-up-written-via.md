# Journal — #133: chore(workflow): clean up dead written_via assertions in finish-ticket step 8.5

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T00:40:21Z — push 1 remove dead written_via assertions

**Pushed:** Remove `written_via` from the `jq` projection in finish-ticket step 8.5 and drop the matching "Expected: ... `written_via` is `agent`" prose line.
**Why:** `/ship-ticket` step 3 no longer checks `written_via`, so the assertion was dead and confusing to future readers.
**Notes:** Scope is a single two-line edit to `.claude/skills/finish-ticket/SKILL.md`. No logic change — verification output still shows `verdict` and `head_sha`.
**Commit(s):** `1dd7da2`
