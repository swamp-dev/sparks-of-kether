# Journal — #636: feat(hand): peek-shelf — slide-up fan, remove scale bloom and clip box

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T18:33:31-04:00 — push 1: peek-shelf implementation

**Pushed:** feat(hand): peek-shelf — slide-up fan, no scale bloom, no overflow-x-clip (#636)
**Why:** Hand UX rethink: replace FAN_REST_SCALE=0.35 scale-bloom (root cause of "never settles" jank) with translateY-based reveal; remove overflow-x-clip (root cause of "box" clipping); per-card magnify reduced to 1.12× in-place lift (was 1.5× with centering teleport).
**Notes:** Branch feat/636-hand-peek-shelf was superseded by this clean branch (feat/636-hand-peek-shelf-2) to avoid a force-push. Old PR #637 closed; PR #638 opened from this branch.
**Commit(s):** `a1952bf`

## 2026-05-14T19:12:46-04:00 — push 2: review fixes

**Pushed:** fix(hand): address review — clear stale hide timer in scheduleHide; add reduced-motion test (#636)
**Why:** First code-review pass returned fix on two SIGNIFICANT findings: (1) scheduleHide didn't clear previous timer before setting new one, enabling timer accumulation on fast re-enter/re-leave; (2) reduced-motion AC "hand always fully visible" had no test. Re-review returned ship.
**Notes:** re-reviewed after fixes; reviewer returned clean (ship)
**Commit(s):** `ec5a9b5`
