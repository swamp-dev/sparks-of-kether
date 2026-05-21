# Journal — #141: test(lobby): strengthen dead-branch comment in makeFakeChannel and add matching on-handler note

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T21:56:00-04:00 — initial implementation

**Pushed:** test(lobby): strengthen dead-branch comment in makeFakeChannel and add matching on-handler note (#141)
**Why:** The subscribe fallback's "unreachable in practice" comment gave no actionable guidance. Replaced with a comment naming the two known channel prefixes and explaining the consequence of a third type (silent SUBSCRIBED). Added a matching comment to the on-handler's implicit no-else fallback for coherence.
**Notes:** Comment-only changes in use-lobby.test.tsx; no behavior change.
**Commit(s):** `957473e22603130d6c999e8dbb539a98622c45ba`
