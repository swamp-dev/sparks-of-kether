# Journal — #504: fix(verdict-reveal): pass reducedMotion snapshot down to RevealLine for consistency

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T19:14:27-04:00 — push 1: pass reducedMotion to RevealLine

**Pushed:** fix(verdict-reveal): pass reducedMotion snapshot down to RevealLine.
**Why:** Tree-consistency — VerdictReveal already takes a `reducedMotion` snapshot
prop from EncounterScreen; nested RevealLine read live `useReduceMotion()`.
Mid-encounter OS-pref change could momentarily diverge. One-line wire-down via
the existing `reducedMotionOverride` prop.
**Notes:** none.
**Commit(s):** `b9b985d`
