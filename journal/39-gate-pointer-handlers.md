# Journal — #39: refactor(hand): gate pointer move/up/cancel handlers on draggable

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T13:40:00Z — push 1 ternary-to-undefined for all four handlers

**Pushed:** Gate `onPointerMove`, `onPointerUp`, and `onPointerCancel` on `draggable` using `draggable ? handler : undefined` — matching the existing `onPointerDown` gate. Also normalized `onPointerDown` from inline `{ if (draggable) ... }` to the same ternary style so all four handlers are consistent; the ternary-to-undefined form is cleaner because React omits the DOM listener entirely when `draggable` is false. Test added covering all three of move/up/cancel on a non-draggable card.
**Why:** Cosmetic consistency. The state machine no-ops on stray events, so there was no behavioral bug — but the unconditional handlers were a reader-trap suggesting the handlers fired regardless of draggable state.
**Commit(s):** `541d9da`, `ed5e94d`
