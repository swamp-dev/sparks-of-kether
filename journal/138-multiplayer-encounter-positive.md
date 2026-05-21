# Journal — #138: test(multiplayer): add positive-case assertion for EncounterScreen in challenge phase

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T22:00:00-04:00 — initial implementation

**Pushed:** test(multiplayer): add positive-case assertion for EncounterScreen in challenge phase (#138)
**Why:** The existing non-active-player test only asserted the negative case (p2 doesn't see the overlay). Without a positive assertion, the test passed even if EncounterScreen was broken for everyone. Added a paired it() block with currentPlayerId="p1" asserting the overlay IS present — now the test self-validates both sides of the isMyTurn gate.
**Notes:** One new it() block added to PlayScreen.multiplayer-turn.test.tsx; no production code touched.
**Commit(s):** `e2e42679db578b0d6e06663dc0e22d17a6402fa3`
