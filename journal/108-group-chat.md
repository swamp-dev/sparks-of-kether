# Journal — #108: feat: group chat for multiplayer rooms

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T20:44:00-04:00 — full implementation push

**Pushed:** migration, types, hook (with tests), component (with tests), page integrations + review fixes
**Why:** Players in multiplayer rooms had no way to communicate in-game. Added a floating toggle chat panel (bottom-right, z-30) mounted in both lobby and play pages. Chat persists in Postgres so late-joiners see history on refresh.
**Notes:**
- Migration 0008: `chat_messages` table with FK → players ON DELETE CASCADE, composite index (room_id, id DESC), RLS via `is_player_in_room`, idempotent publication add
- Hook: subscription opened before history fetch (TOCTOU fix), ORDER DESC + client-side reverse for newest-50-chronological, dedup guard on Realtime echo
- `sendMessage` returns `Promise<boolean>` — UI only clears input on `true`; `loading=false` immediately when `roomId=null`
- Component: unread badge when collapsed, `aria-controls` conditionally omitted when panel absent from DOM
- Two code-review passes; all critical/significant findings addressed before PR
**Commit(s):** `372b96f..72c8d45`
