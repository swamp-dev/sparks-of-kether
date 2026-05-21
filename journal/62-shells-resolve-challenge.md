# Journal — #62: test(shells): add resolveChallenge integration test for banishment

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T00:28:00+00:00 — initial implementation

**Pushed:** test(shells): add resolveChallenge integration test for banishment (#62)
**Why:** The existing banishment describe block claimed "The resolveChallenge integration is covered in checks.test.ts" but no such test existed there. This adds the actual integration test directly — builds a state with an active Yesod Shell, calls resolveChallenge with intuition=20 (guarantees pass at DC 12), and asserts shells.yesod transitions to 'banished'. Also fixes the misleading comment to "covered below".
**Notes:** none
**Commit(s):** `6c02fa7`
