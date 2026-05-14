# Journal — #487: feat(encounter): Gevurah mechanic — burn-cost-before-attempt

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T16:06:18-04:00 — push 1: open PR

**Pushed:** test(gevurah): failing tests for Sacred Sacrifice mechanic; feat(gevurah): Sacred Sacrifice — burn-required gate + dearest-card tilt
**Why:** Implement the design § 3.2 mechanic across engine and reducer. New `TurnReducerError` kind `gevurah-requires-burn` gates `prep-confirm` at Gevurah unless the player's hand is empty or they've staged ≥1 card-burn. Dearest-card +2 flatBonus (Math.max of hand) fires at `resolveChallenge` when a staged burn matches the dearest, stacking with the standard +3 cardBurn to net the +5 design intent (parity with Spark-burn). Engine-only matching the Hod/Yesod/Tiferet/Netzach precedent; UI deferred to #475's UX workstream.
**Notes:** none
**Commit(s):** `dc73f6d..bef8ac5`

## 2026-05-14T16:19:30-04:00 — push 2: address review

**Pushed:** docs(journal): entry for #487 push 1; fix(gevurah): address review — pin spark-burn gate case, drop speculative tied-dearest test
**Why:** code-reviewer returned **Fix** verdict with 2 SIGNIFICANT findings: (1) spark-burn-alone gate case was unpinned (design § 3.2 explicitly requires it not satisfy the gate; my condition handled it correctly but no test); (2) tied-dearest forward-looking test pinned a rule for a structurally-unreachable duplicate-arcana variant while my JSDoc framed it as "would scale" without flagging the retry ghost-bonus risk it would introduce. Fixed by adding the spark-burn-alone reducer test and removing the speculative tied-dearest test + future-variant comment. Also added a JSDoc note clarifying Gevurah's no-resolve-time-event design choice.
**Notes:** Re-review required per step 8a — fixes landed in areas the first pass flagged SIGNIFICANT (the gate test surface + the helper's JSDoc/test coverage).
**Commit(s):** `ecba60e..08d871c`
