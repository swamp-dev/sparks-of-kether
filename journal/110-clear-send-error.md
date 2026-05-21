# Journal — #110: fix(chat): clear error banner after successful sendMessage retry

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T22:43:55-04:00 — initial push, test + fix

**Pushed:** test(use-chat): add failing test — sendMessage should clear error on success; fix(use-chat): clear error state on successful sendMessage; chore(journal): create journal file for #110
**Why:** After a failed sendMessage, the error banner stayed visible on subsequent success. Mirrored the `setError(null)` call that the history-fetch path already uses on the history-fetch success path.
**Notes:** none
**Commit(s):** `c54f272..6bbdc9c`
