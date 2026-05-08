# Journal — #535: agents(code-reviewer): replace meta-prose verdict example with concrete sample

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T15:35:00-04:00 — push 1: replace meta-prose verdict example with concrete sample

**Pushed:** docs(agents): concrete verdict-line example in code-reviewer template
**Why:** Deferred from #530 review — the output-format template's verdict line was instructional prose ("Must contain exactly one of: ship, fix, rework, block.") which a copy-from-template render would have produced as the agent's actual verdict line; the parser would have hit `block` (highest precedence) on that prose. A concrete sample line (`No Critical or [high] Significant findings — ship.`) closes the gap without changing parser behaviour.
**Notes:** none
**Commit(s):** single edit to `.claude/agents/code-reviewer.md` + this entry
