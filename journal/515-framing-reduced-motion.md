# Journal — #515: fix(encounter): pass reducedMotion snapshot down to framing-line RevealLine too

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T22:26:23-04:00 — push 1: open PR

**Pushed:** fix(encounter): pass reducedMotion snapshot to framing-line RevealLine
**Why:** Mirrors the #504 wire-down pattern. The verdict-line `RevealLine` was already reading `reducedMotionOverride` from `EncounterScreen`'s snapshot; the framing-line `RevealLine` at line 814 was reading `useReduceMotion()` live, so a user toggling reduced-motion between prep and react sub-phases could see the framing line animate while the verdict line didn't (or vice versa). Pass the existing `reducedMotion` snapshot to the framing line so both sub-phases honour the same value across a single encounter.
**Notes:** none
**Commit(s):** `257c1d4`
