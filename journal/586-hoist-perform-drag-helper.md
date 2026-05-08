# Journal — #586: test(play): extract performDragWithDropTarget helper to file scope

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T15:19:00-04:00 — push 1: hoist performDragWithDropTarget to module scope

**Pushed:** test(play): hoist performDragWithDropTarget to module scope
**Why:** Deferred from #462 review — the `drag-to-play` (#412) and `drag-to-discard` (#462) describes each carried a verbatim copy of the helper. With both describes settled, file-scoped helpers no longer carry the brittleness risk that justified the duplication; one definition keeps the gesture shape in one place.
**Notes:** none
**Commit(s):** `cf5ce0c` (helper hoist) + journal entry below
