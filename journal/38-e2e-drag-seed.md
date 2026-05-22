# Journal — #38: test(e2e): seed drag-to-play spec so test.skip guards can be removed

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T10:35:00Z — push 1 switch seed 1492→3, remove test.skip guards

**Pushed:** Changed `seed=1492` to `seed=3` in all three `drag-to-play.spec.ts` tests. `seededRng(3+2) = seededRng(5)` deals player 1 hand `[19, 20, 21]` — arcana 20 (path 31/Judgement, Malkuth→Yesod) and 21 (path 32/The World, Malkuth→Yesod) are both valid moves from game start, so `findValidDragPair` always returns a non-null pair. Removed three `test.skip(pair === null, ...)` guards that were firing on every run with the old seed. Replaced the corresponding `if (pair === null) return` and `if (!cardBox || !pathBox) return` silent-exits with explicit `throw new Error(...)` so future regressions fail loudly rather than silently passing with no assertions.

**Why:** seed=1492 produced no valid card/path pair after the hand-layout rework (#412 followup). All three tests had been silently skipping their assertions on every CI run — the drag and keyboard-fallback paths were completely uncovered.

**Commit(s):** `9439017`

---

## 2026-05-22T11:30:00Z — push 2 fix drag reliability in CI headless browser

**Pushed:** In test 1 (`dragging a card onto a matching path moves the player`), replaced the two-step `page.locator('[data-hand-fan]').hover()` + `page.mouse.move(cardCentre)` sequence with `page.locator('[data-hand-fan]').hover()` + `page.waitForTimeout(350)` + `await card.hover()`. Mouse is now positioned directly at the specific card's centre via `card.hover()` before `mouse.down()`, instead of moving from the hand-fan centre. The prior approach could cross outside the `[data-hand-fan]` element boundary mid-move, triggering a `mouseleave` event that collapsed the fan, shifted the card to peek position, and caused `mouse.down()` to miss the card entirely (drag never started → phase stayed at `move`). `startX`/`startY` are still computed from `cardBox` and used as the midpoint anchor for the two-step `mouse.move` to the drop target.

**Why:** Hosted CI failure on test 1 after push 1. Tests 2 and 3 were green; they use `.first()` (always near the fan centre, so the cross-boundary move was short and safe) while test 1 targets a specific arcanum card that may be further from fan centre.

**Commit(s):** `f9ba3d1`, `75084ce`
