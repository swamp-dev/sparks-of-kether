# Journal — #57: test(hand): pin HAND_REVEAL_MS value in a test

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T00:35:00+00:00 — initial implementation + review fix

**Pushed:** test(hand): pin HAND_REVEAL_MS=280ms in reveal-transition test (#57); fix(hand): add reduceMotion guard comment and defensive assertion
**Why:** Pins the HAND_REVEAL_MS=280 constant via the fan's inline transition style after mouseEnter. First push added the core test; second push addressed code-reviewer's Significant finding (undocumented reduceMotion=false precondition) by adding an explicit `not.toBe('none')` guard and a comment explaining the jsdom/matchMedia assumption.
**Notes:** Two commits on this branch before opening PR. Code-reviewer ran twice; both returned ship.
**Commit(s):** `6ad9baa..509be19`
