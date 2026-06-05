# Journal — #303: test(hotseat): reset capturedLobbyPlayers in beforeEach

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T04:20:00Z — push 1 beforeEach reset fix

**Pushed:** Move `capturedLobbyPlayers = []` from `it()` bodies into `beforeEach()` in the two `describe` blocks that assert on the variable.

- `app/play/__tests__/page.test.tsx` — added `beforeEach` import; added `beforeEach(() => { capturedLobbyPlayers = []; })` to both `PlayPage — 1-player (solo) flow` and `PlayPage — 6-player flow` describes; removed the two manual resets from inside the `it()` bodies.
- The second test in the solo describe (`reaches PlayScreen after Begin`) had no reset at all — it was silently order-dependent on the first test having assigned `capturedLobbyPlayers`. The `beforeEach` makes each test independent of insertion order.

**Code review:** Ship (no CRITICAL/SIGNIFICANT findings). Reviewer confirmed the fix is mechanically correct and complete.

**Why:** Deferred from PR #303 / ticket #275 review. Test-ordering bugs are silent — they pass today but fail if a new test is inserted or the runner reorders them. `beforeEach` is the idiomatic fix.

**Commit(s):** `2761e0e`
