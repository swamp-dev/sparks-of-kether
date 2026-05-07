# Journal — #498: chore(framing): tighten voice-canary regex threshold from >25% to >50%

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T19:34:54-04:00 — push 1: tighten voice-canary threshold to >50%

**Pushed:** chore(framing): tighten voice-canary regex threshold to >50%.
**Why:** Reviewer note on #478: the >25% threshold could survive a significant
voice drift. Tightening to >50% (length / 2 instead of length / 4) catches a
real drift earlier without becoming brittle. Verified hit rates on Hermes /
Demeter / Ares all clear the new threshold with headroom.
**Notes:** none.
**Commit(s):** `37d4b1a`

## 2026-05-07T19:43:00-04:00 — push 2: comment symmetry on Demeter / Ares canaries

**Pushed:** docs(test): mirror #498 explanatory comment on Demeter + Ares canaries.
**Why:** Code-reviewer flagged that only Hermes got the inline comment explaining
the >50% rationale; Demeter and Ares were left without the same context. Restore
symmetry — three-line addition.
**Notes:** Re-review skipped per /finish-ticket step 8a heuristic (no new files,
<50 net lines, no new exports, fixes confined to comments — not a CRITICAL/SIGNIFICANT
area).
**Commit(s):** TBD on push.
