# Journal — #96: test(lobby): remove dead channelSubscribeStatus fallback in use-lobby mock

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T19:20:00-04:00 — initial implementation push

**Pushed:** test(lobby): document unreachable fallback in makeFakeChannel subscribe callback (#96)
**Why:** The subscribe callback in makeFakeChannel had a dead ternary branch — if neither lobby_players:* nor lobby_room:* matches, it falls back to 'SUBSCRIBED'. The original channelSubscribeStatus variable was already removed; this adds a comment clarifying the fallback is unreachable in practice (useLobby only creates those two channel types).
**Notes:** none
**Commit(s):** TBD
