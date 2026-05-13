# Journal — #592: test(end-turn): assert rejected:end-turn audit row in 422 wrong-phase test

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T15:47:00-04:00 — push 1: pin no-audit-on-422 contract

**Pushed:** test(end-turn): pin no-audit-on-422 contract for wrong-phase rejection
**Why:** Deferred from #522 review — the 422 wrong-phase test asserted response shape + no snapshot mutation but did not assert the audit-row contract. Route's actual behaviour: 422 returns immediately with no audit insert (unlike 403 which writes `rejected:<kind>`). Pin the negative assertion so a contract change can't ship silently.
**Notes:** none
**Commit(s):** single edit to `app/api/rooms/[code]/events/__tests__/route.test.ts` + this entry
