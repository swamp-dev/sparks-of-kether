# Journal — #489: feat(encounter): Netzach mechanic — water-element-sign bonus

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T13:37:07-04:00 — push 1: open PR

**Pushed:** test(netzach): failing tests + PlayerState fields for Declared Desire; feat(netzach): Declared Desire — sign bonus, retry tilt, pendingStatBuff
**Why:** Implement the design § 3.5 mechanic across engine and reducer — sign-conditional +2 flatBonus for water + Venus-ruled signs, +1 retry-DC for undeclared retries, pendingStatBuff cross-encounter stat bump, and prep-confirm write-through of declaredDesire. Engine-only matching the Hod/Yesod precedent; UI deferred to #475's UX workstream.
**Notes:** Reducer guards on stage-time (reject declare-desire at non-Netzach Sefirot / at Malkuth target) deferred to a follow-up — not in the AC; engine correctness preserved via the resolve-time `sefirah === 'netzach'` gate and the prep-confirm `state.encounter?.sefirah === 'netzach'` gate on the write.
**Commit(s):** `b9cd8c2..8b7e0e1`

## 2026-05-14T13:49:00-04:00 — push 2: address review (re-review fires)

**Pushed:** docs(journal): entry for #489 push 1; fix(netzach): address review — buff turn-expire, Malkuth block, drop event
**Why:** code-reviewer returned **Fix** verdict (not Ship) with 1 CRITICAL and 2 SIGNIFICANT findings: (1) `pendingStatBuff` leaked across turns because `endTurn()` never cleared it — violates the design's "expires on phase=end" contract; (2) staging `declare-desire: 'malkuth'` at Netzach silently wrote a useless permanent declaredDesire and burned the player's one-per-game declaration; (3) the second-declaration drop at confirm was silent — the UI had no signal to render "Already declared: X". All three are real correctness gaps I had deferred as scope; the reviewer pushed back and was right.
**Notes:** Re-review required per step 8a — fixes added a new exported `TurnReducerError` kind (`invalid-desire-target`), modified `endTurn`, and changed the prep-confirm meta-event surface. >50 lines net, new exported symbol, area was flagged CRITICAL. Will re-fire code-reviewer.
**Commit(s):** `c968ece..21617cc`
