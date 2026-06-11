# Journal — #321: test(e2e): mobile card-select test assumes card at slot 0 is always playable

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-11T01:14:43-04:00 — initial fix + review fixes + PR

**Pushed:** Two commits:
1. `7b917d4` — Added two guards: `[data-hand][data-visible="true"]` visibility check (confirms viewer owns this hand, so onCardSelect is wired) + `count() > 0` check (initially non-idiomatic, caught by review).
2. `2dbc28a` — Review fixes: replaced `expect(await count()).toBeGreaterThan(0)` (no auto-retry, wrong target) with `await expect(card0).toBeVisible()` (web-first, auto-retries against the correct slot); tightened guard 1 comment to say viewer===owner rather than "active player's turn".
**Why:** Tech-debt ticket from PR #15 review. The original test had an implicit assumption that slot 0 always exists and is playable — the guards make it explicit and fast-fail.
**Notes:** Two deferred minors from second review pass: guard 1 comment still slightly overstates the causal chain (data-visible alone doesn't prove onCardSelect is wired — that also requires isMyTurn && pendingDiscardCount===0); and `click({ timeout: 5_000 })` is more restrictive than Playwright's default 30s. Neither is worth a follow-up ticket.
**Commit(s):** `7b917d4`..`2dbc28a`
