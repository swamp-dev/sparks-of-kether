# Journal — #43: fix(discard-pile): omit click-to-browse from aria-label when dragActive

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T00:55:00Z — push 1 fix aria-label redundancy

**Pushed:** Replace the old label+append approach with a `baseLabel` + ternary that makes the drop prompt and click-to-browse affordances mutually exclusive.
**Why:** When `dragActive=true`, the old code appended "Drop a card here to discard." after the existing label (which already contained "Click to browse.") — the resulting string named both affordances even though only drag was active, misleading screen-reader users.
**Notes:** Also incidentally fixes a missing period between "Discard pile, empty" and "Drop a card here to discard." in the empty+dragActive path. Reviewer flagged the empty+dragActive case had no test coverage; added inline before merge. Pre-existing `synth.test.ts` PRNG flake appeared in one background run; confirmed same failure on main.
**Commit(s):** `6f729c9`, `dc59233`
