# Journal — #30: agents(code-reviewer): clarify medium/low Significant verdict policy

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T03:52:59-04:00 — push 1 implementation

**Pushed:** docs(agents): clarify medium/low Significant findings land in ship verdict (#30)
**Why:** The `fix` verdict semantics named only Critical and `[high]` Significant as blockers, leaving ambiguous whether `[medium]`/`[low]` Significant findings block a ship. Added a parenthetical to the `ship` definition making it explicit that they do not. Documentation clarity only — no parser or behavior change.
**Notes:** none
**Commit(s):** TBD
