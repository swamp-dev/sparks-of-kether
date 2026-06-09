# Journal — #317: GiftModal over-cap step auto-focus first discard button

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-08T22:20:00-04:00 — push 1 (PR open)

**Pushed:** 2 commits — failing test for over-cap autoFocus (red), fix adding `autoFocus={idx === 0}` to the first discard button.
**Why:** Deferred from #315 review. Same gap: the over-cap step rendered with focus on the backdrop; keyboard users had to Tab to reach the first discard button.
**Notes:** Exact same pattern as pick-card and pick-recipient steps in #315. Test setup requires overriding player 2's hand to HAND_CAP=5 to trigger the over-cap path.
**Commit(s):** 95b51c0..HEAD
