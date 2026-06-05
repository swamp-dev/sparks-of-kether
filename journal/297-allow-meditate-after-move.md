# Journal — #297: feat(turn): allow Meditate before or after Move

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T00:54:53-04:00 — push 1

**Pushed:** PR-ready implementation. The underlying engine behavior (Meditate
allowed from `'end'` phase after a no-challenge Move) was already in place
from #287/#289. This ticket completes the story: adds a turn-machine test
explicitly chaining `move → meditate` to lock in and document the ordering;
updates `design/mechanics.md` to consolidate the formerly split step 2 +
step 5 into a single clear "Move and/or Meditate (in any order)" description;
updates phase-contract comments in `engine/types.ts` and `lib/turn-machine.ts`;
updates the tutorial hint copy in `design/tutorial-and-hints.md`.

**Why:** Draft 1. #287/#289 added the engine + UI support but didn't update
the design doc or add an explicit end-to-end ordering test. The mechanics.md
still said "Move or Meditate" (step 2) with a separate step 5 for the
post-Move case — confusing for players and future contributors.

**Notes:** No behavioral change — all five acceptance criteria were already
met by #287. This PR is doc + test hygiene on top of that foundation. The
test verifies path 32 (Malkuth→Yesod, card 21 = The World) because that's
the canonical no-challenge arrival used in other tests.

**Commit(s):** see PR
