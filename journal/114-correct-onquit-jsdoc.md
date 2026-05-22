# Journal — #114: fix(game): correct onQuit JSDoc in PlayScreen — hot-seat does receive it

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T00:42:00Z — push 1 correct onQuit JSDoc

**Pushed:** Replace misleading "Absent in hot-seat mode (no session to leave)" JSDoc with accurate description matching actual usage in `app/play/page.tsx`.
**Why:** The old text would lead future callers adding a hot-seat entry point to omit `onQuit`, breaking the Leave Game affordance for hot-seat players.
**Notes:** Pure JSDoc change — no logic, no tests needed.
**Commit(s):** `73c1c6a`
