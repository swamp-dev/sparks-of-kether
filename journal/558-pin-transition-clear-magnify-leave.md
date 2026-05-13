# Journal — #558: test(hand): pin transition is cleared one render after magnify leave

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-13T11:50:29-04:00 — push 1: pin exit-cleanup half of prev-active invariant

**Pushed:** test(hand): pin transition is cleared one render after magnify leave (#558)
**Why:** Deferred from #463 review pass 3. The existing exit-transition test asserts the transition persists for one render after `mouseLeave` (entry half of the prev-active invariant) but not that it's eventually cleared once a different card becomes active (exit half). A regression where the post-commit effect tracking `prevActiveIndexRef` dropped the `activeIndex === undefined` case would silently keep stale transitions around. New `it` block uses a 6-card hand to put `first` and `farLast` in disjoint ±2 magnify neighbour sets, magnifies `first`, mouseLeaves, then mouseEnters `farLast` — `first.style.transition` must be back to empty.
**Notes:** Mutation-tested: wrapping the `prevActiveIndexRef.current = activeIndex` assignment in `if (activeIndex !== undefined)` causes exactly this new test to fail (1/53) and the persists-for-one-render companion test continues to pass — confirming the new test catches the cited regression and isn't redundant with prior coverage. No production-code changes.
**Commit(s):** single edit to `components/hand/__tests__/Hand.test.tsx` + this entry
