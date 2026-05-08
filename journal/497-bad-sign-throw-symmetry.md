# Journal — #497: test(framing): add bad-sign throw test for pickFraming + pickVerdict symmetry

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T19:50:31-04:00 — push 1: bad-sign throw symmetry on pickFraming + pickVerdict

**Pushed:** test(framing): add bad-sign throw test for pickFraming + pickVerdict symmetry.
**Why:** Reviewer note on #478. `pickFraming` already had a bad-avatar throw test;
the symmetric bad-sign case wasn't covered. `pickVerdict`'s test file lacked the
bad-sign throw case too. Added one `it('throws if the sign key is unrecognised')`
to each describe block, mirroring the bad-avatar pattern. Both functions throw
on bad sign — pickFraming via explicit guard (`variants === undefined ||
variants.length === 0`), pickVerdict via TypeError on undefined-property
access — `.toThrow()` matches both shapes.
**Notes:** none.
**Commit(s):** TBD on push.
