# Journal — #61: engine/movement: document Obsession+Inertia simultaneous interaction

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T22:38:00-04:00 — initial implementation

**Pushed:** docs(movement): document Obsession+Inertia simultaneous interaction (#61)
**Why:** When both shells are active, Obsession fires first and prevents movement, so Inertia's 2-card cost never applies. This is correct behavior but was undocumented — adding a comment prevents a future developer from treating the interaction as a bug.
**Notes:** none
**Commit(s):** TBD
