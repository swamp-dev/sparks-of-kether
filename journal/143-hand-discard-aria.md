# Journal — #143: test(hand): add edge-case coverage for discardMode aria-disabled (multi-card + visible=false)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T21:43:00-04:00 — initial implementation

**Pushed:** test(hand): add edge-case coverage for discardMode aria-disabled (multi-card + visible=false) (#143)
**Why:** The existing aria-disabled test only used a single-card hand. Two edge cases were unverified: (1) per-slot correctness for multi-card hands and (2) visible=false short-circuiting ariaDisabled to true even when discardMode=true (Hand.tsx:490).
**Notes:** Two new it() blocks added to Hand.discard.test.tsx; no production code touched.
**Commit(s):** `cfc442ccb3cc9244195e59594e1e8a1022939a18`
