# Journal — #470: refactor(blessing): drop dead className prop from RitualLedger

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T20:22:27-04:00 — push 1: drop dead className prop

**Pushed:** refactor(blessing): drop dead className prop from RitualLedger.
**Why:** Per #470 — the `className` prop on `RitualLedgerProps` was a dead
escape hatch; the only caller (`BlessingRitual:279`) doesn't pass one. Drop
prop + the `${className ?? ''}` interpolation. Surfaced in #413 review.
**Notes:** none.
**Commit(s):** TBD on push.
