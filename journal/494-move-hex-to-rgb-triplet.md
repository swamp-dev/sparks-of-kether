# Journal — #494: refactor(lib): move hexToRgbTriplet out of components/setup/Lobby.tsx

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T20:49:43-04:00 — push 1: move hexToRgbTriplet to lib/

**Pushed:** refactor(lib): move hexToRgbTriplet out of components/setup/Lobby.tsx.
**Why:** #494 — pure utility was living in a React component file, exported
"only for tests" with an apologetic comment. Moved to `lib/hex-to-rgb-triplet.ts`,
relocated test to `lib/__tests__/hex-to-rgb-triplet.test.ts`, updated the
single import in `Lobby.tsx`. The export is now sensible by default; dropped
the apology comment.
**Notes:** none.
**Commit(s):** TBD on push.
