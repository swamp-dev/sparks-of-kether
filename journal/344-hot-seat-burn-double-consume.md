# Journal — #344: fix(encounter): hot-seat card burn consumes two cards for one staged burn

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-10-14T23:45:25-04:00 — push 1: failing tests + fix

**Pushed:** test(encounter): add failing tests for burn picker double-consumption (#344); fix(encounter): burn picker stages the chosen cards; prep-confirm is the single consumer (#344); fix(encounter): lock burn steppers while the release picker is open (#344)
**Why:** One staged burn cost two cards in hot-seat: the picker dispatched `encounter-burn-discard` for the chosen card, then `submitChallenge` synthesised the burn from the head of the remaining hand. Multiplayer double-consumed too whenever the pick differed from the hand head. The picker now stages the chosen card(s) via a new `useTurn.prepStageCardBurns`, `submitChallenge` synthesises only the delta beyond burns already on the envelope (cards and sparks — a retry over-burned both), and `partitionPendingBurns` in `turn-machine` is the single owner of "which pending burns are still in hand". `encounter-burn-discard` (event, hook method, engine reducer, test) removed.
**Notes:** #90 had framed the picker as an *extra* forced discard on top of the burn; `design/mechanics.md` has no such cost, so the picker now chooses which card burns. Existing picker tests passed a stale `turn` prop captured at render, which is why they never saw the double consumption — the new regression test owns the hook in a harness component so the screen re-renders with the live hook, as PlayScreen does. Several fixtures that seeded "already burned" cards while leaving them in hand were corrected to match real engine state. Manually verified in a scripted Playwright run against `pnpm dev`: two-card hand at the encounter, burned the non-head card, `+3`, discard +1, only that card left the hand. code-reviewer (first pass, at `1ac21e3`) returned **ship** with no critical/significant findings; two minors fixed in the third commit (steppers stay live while the picker is open; no multiplayer-mode picker test), one documented (in-hand == not-yet-consumed can't diverge mid-encounter), two noted in the PR body (cumulative count double-counts after confirm, pre-existing and unrendered; `isRetry` ignores spark-only retries). Re-review on the delta (>50 net lines, mostly tests) returned **ship**; its comment-wording minors landed as the fourth commit.
**Commit(s):** `cb5b9fd..0c9e27d`
