# Journal — #95: fix(lobby): subscribe to rooms Realtime so non-hosts see state changes without refresh

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T12:39:08-04:00 — initial implementation push

**Pushed:** test(lobby): add failing test for rooms Realtime channel in useLobby; fix(lobby): subscribe to rooms Realtime so non-hosts see state changes
**Why:** Non-hosts never saw rooms.state changes (e.g., playing → lobby after host reset) because useLobby only subscribed to the players table. Added a second postgres_changes subscription on rooms filtered to roomId + migration 0007 to add rooms to supabase_realtime publication.
**Notes:** none
**Commit(s):** `acc10c3..2be8ae8`
