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

## 2026-05-16T15:33:30-04:00 — merge conflict resolution push

**Pushed:** chore(merge): merge main into fix/95-subscribe-rooms-realtime
**Why:** Main PRs #90/#91 touched use-lobby.ts and use-lobby.test.tsx, causing conflicts. Main's #91 already added a rooms Realtime subscription (direct setRoom approach) and migration 0007_pause_state.sql already adds rooms to the publication. Removed duplicate setRefreshTick subscription and redundant migration; kept per-channel subscribe status tracking and roomsChannelHandler alias on top of main's channelHandlers Map.
**Notes:** Rooms state-update test corrected to verify room.state changes directly. CHANNEL_ERROR test updated for per-channel status dispatch.
**Commit(s):** `b2fe215`
