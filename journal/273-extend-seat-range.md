# Journal — #273: chore(db): extend seat range 0–3 → 0–5 for 6-player rooms

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-04T00:00:00+00:00 — push 1 (initial implementation + review fix)

**Pushed:** Migration 0009 extends seat range and replaces join_room_next_seat RPC.

- `supabase/migrations/0009_extend_seats_to_six.sql`:
  - Drops `players_seat_range_chk` (seat between 0 and 3), adds (seat between 0 and 5)
  - Replaces `join_room_next_seat` RPC: ceiling 4→6, `generate_series(0,3)`→`generate_series(0,5)`
  - Corrected volatility from `stable` to `volatile` (review finding: function reads
    rows that change between calls; `stable` was a copy-paste from 0006 without scrutiny)
- `lib/rooms.ts`: `MAX_PLAYERS_PER_ROOM` 4→6; updated 0..3 comment to 0..5
- `tests/integration/joinRoom.test.ts`: 3 new tests — 6-player fill, 7th-player rejection,
  seats 4+5 assigned correctly after 0–3 taken

**Known post-state:** Join succeeds for players 5–6; game start via `validateAndBuildSetup`
still rejects >4 (out of scope — handled in later epic tickets D and F). PR body documents this.

All 15 integration tests pass locally (`supabase db reset` + `pnpm test:integration`).
