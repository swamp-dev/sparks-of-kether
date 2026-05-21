# Journal — #188: fix(verdicts): add outcome=undefined guard in pickVerdict for full consistency

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T03:17:42-04:00 — push 1 implementation

**Pushed:** fix(verdicts): add outcome=undefined guard in pickVerdict (#188)
**Why:** `signCell[outcome]` is typed as `readonly string[] | undefined` under `noUncheckedIndexedAccess`; the prior check (`variants.length === 0`) would throw an opaque `TypeError` rather than the named Error that `pickFraming` and `pickPlayerResponse` already produce.
**Notes:** test + fix in one commit (trivial 1-line followon from #28)
**Commit(s):** `ce70f7a`
