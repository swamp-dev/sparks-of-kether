# Journal — #49: refactor(AvatarPortrait): remove excessive console guard in onError

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T00:55:00Z — push 1 remove typeof console guard

**Pushed:** Remove `typeof console !== 'undefined' && console.warn` guard in `AvatarPortrait.tsx` onError handler; replace with direct `console.warn(...)`.
**Why:** `console` is always defined in browser and Node environments — the guard was unnecessary noise with no protective value.
**Notes:** One-line structural change, no logic or behavior change.
**Commit(s):** `815d93f`
