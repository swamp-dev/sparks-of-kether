# Journal — #87: Add reset endpoint so rooms can return to lobby after a game ends

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-15T23:30:00+00:00 — initial implementation + review fixes

**Pushed:** `POST /api/rooms/[code]/reset` route (host-only, clears game_events +
game_states + players.ready + rooms.state), `resetGame()` hook in `useLobby`,
recovery UI on lobby page when room.state !== 'lobby'. Tests cover all guards and
intermediate failure paths (events delete fail, snapshot delete fail, players update
fail, rooms update fail). Review finding addressed: removed dead `setSession` call,
added error checks to all intermediate writes.

**Why:** Rooms permanently stuck in 'playing' after a game ends — no server-side
mechanism existed to transition back to 'lobby'. Triggered by user bug report:
`{"error":"start-rejected","reason":{"kind":"not-lobby","currentState":"playing"}}`.

**Notes:** Non-host Realtime gap remains: non-hosts see "Waiting for host to reset"
indefinitely after the host resets, because the lobby's Realtime subscription watches
the `players` table, not `rooms`. The room state flip is not broadcast to non-hosts
via Realtime; they need to manually refresh. Filed as a follow-up concern in the PR.

**Commit(s):** `f2a64d3..557f4a0`
