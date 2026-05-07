# Journal — #442: fix(lobby): guard hexToRgbTriplet against non-#rrggbb input

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T13:31:06-04:00 — push 1 final-push before code-review

**Pushed:** test(lobby): add hex-to-rgb-triplet input-shape tests; fix(lobby): guard hexToRgbTriplet against non-#rrggbb input
**Why:** TDD: 12 unit tests covering valid #rrggbb (lower/upper/mixed/#000000) and rejection of malformed shapes (3-digit shorthand, missing #, rgb() function, CSS color names, 7-digit hex, empty string, non-hex chars), plus the regex-guard implementation. The original `hexToRgbTriplet` silently produced `rgba(NaN, NaN, NaN, …)` on bad input; browsers ignore that and the per-row glow vanished with no test failure (existing assertions only check the `#c0392b` prefix). New behaviour throws at render time with the bad input quoted in the error.
**Notes:** none
**Commit(s):** `cf25eb4..71ff0b9`
