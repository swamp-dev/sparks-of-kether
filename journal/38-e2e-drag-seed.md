# Journal — #38: test(e2e): seed drag-to-play spec so test.skip guards can be removed

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T10:35:00Z — push 1 switch seed 1492→3, remove test.skip guards

**Pushed:** Changed `seed=1492` to `seed=3` in all three `drag-to-play.spec.ts` tests. `seededRng(3+2) = seededRng(5)` deals player 1 hand `[19, 20, 21]` — arcana 20 (path 31/Judgement, Malkuth→Yesod) and 21 (path 32/The World, Malkuth→Yesod) are both valid moves from game start, so `findValidDragPair` always returns a non-null pair. Removed three `test.skip(pair === null, ...)` guards that were firing on every run with the old seed. Replaced the corresponding `if (pair === null) return` and `if (!cardBox || !pathBox) return` silent-exits with explicit `throw new Error(...)` so future regressions fail loudly rather than silently passing with no assertions.

**Why:** seed=1492 produced no valid card/path pair after the hand-layout rework (#412 followup). All three tests had been silently skipping their assertions on every CI run — the drag and keyboard-fallback paths were completely uncovered.

**Commit(s):** `9439017`
