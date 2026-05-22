# Journal — #124: refactor(encounter): prefer throw form for never-exhaustion in derivePose

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T03:45:00Z — push 1 switch to throw form

**Pushed:** Replace `return _exhaustive` with `throw new Error(\`Unhandled UiSubPhase: ${_exhaustive}\`)` in `derivePose` for a more useful runtime error if the bad state is ever forced through via `as any`.
**Why:** Compile-time safety is unchanged; the throw form produces a diagnostic message instead of silently returning `never`.
**Notes:** One-line change in `encounter-pose.ts`.
**Commit(s):** `3121c21`
