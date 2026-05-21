# Journal — #28: fix(verdicts): add explicit bad-avatar / bad-sign guards in pickVerdict

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T02:49:00-04:00 — push 1 implementation

**Pushed:** fix(verdicts): add bad-sefirah/bad-sign guards in pickVerdict/pickPlayerResponse (#28)
**Why:** Both functions threw opaque `TypeError` on undefined property access when called with an unrecognised sefirah or sign key. Named `Error`s with diagnostic messages mirror `pickFraming`'s explicit guard pattern and make runtime drift easier to diagnose.
**Notes:** Test + implementation in one commit (trivial follow-on, amend noted in commit message).
**Commit(s):** `f6e523b`
