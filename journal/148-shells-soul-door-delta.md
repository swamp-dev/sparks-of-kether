# Journal — #148: test(shells): add soulDoorDelta to resolveChallenge call in banishment integration test

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T21:27:00-04:00 — initial implementation

**Pushed:** test(shells): add soulDoorDelta to resolveChallenge call in banishment integration test (#148)
**Why:** Every other resolveChallenge call in shells.test.ts explicitly passes soulDoorDelta: 0. The banishment integration test introduced in #149 omitted it (the optional field auto-injects safely), creating a style inconsistency. Added soulDoorDelta: 0 to match surrounding convention.
**Notes:** One-field addition to modifiers object; no behavior change.
**Commit(s):** `3a42166744e377cf6fd931ddc7013a4cbb38585a`
