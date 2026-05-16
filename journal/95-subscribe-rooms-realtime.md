# Journal — #95: fix(lobby): subscribe to rooms Realtime so non-hosts see state changes without refresh

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T12:39:08-04:00 — initial implementation push

**Pushed:** test(lobby): add failing test for rooms Realtime channel in useLobby; fix(lobby): subscribe to rooms Realtime so non-hosts see state changes
**Why:** Non-hosts never saw rooms.state changes (e.g., playing → lobby after host reset) because useLobby only subscribed to the players table. Added a second postgres_changes subscription on rooms filtered to roomId + migration 0007 to add rooms to supabase_realtime publication.
**Notes:** none
**Commit(s):** `acc10c3..2be8ae8`

## 2026-05-16T12:48:09-04:00 — address review findings

**Pushed:** fix(lobby): address review — rooms CHANNEL_ERROR test + integration guard
**Why:** Code reviewer flagged: (1) no isolated CHANNEL_ERROR test for the rooms channel, (2) integration publication test missing rooms assertion. Added per-channel subscribe status tracking in the test mock, dedicated rooms CHANNEL_ERROR test, expect(tables).toContain('rooms') in integration test, updated useLobby docstring.
**Notes:** Re-review required (new file + >50 net lines changed).
**Commit(s):** `22ca18d`
