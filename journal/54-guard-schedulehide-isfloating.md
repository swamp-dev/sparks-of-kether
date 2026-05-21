# Journal — #54: test(hand): guard scheduleHide focus calls with isFloating

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T23:38:03-04:00 — push 1 implementation

**Pushed:** test(hand): guard scheduleHide and expandHand with isFloating in focus handlers (#54)
**Why:** In inline mode handleFocusIn/Out called expandHand and scheduleHide unconditionally, despite the fan transform being gated on isFloating. Added isFloating guard to match the existing onMouseEnter/Leave pattern. Also adds two tests: floating-mode focus cycle and inline-mode timer-count assertion.
**Notes:** TDD — inline-mode timer-count test written first (confirmed failing pre-fix), guard applied, test passes. Typecheck and lint clean.
**Commit(s):** `aef2f59`

## 2026-05-20T23:46:00-04:00 — push 2 prettier format fix

**Pushed:** style: prettier format fix for Hand.test.tsx (#54)
**Why:** CI format:check caught a formatting issue in the new test block (missing trailing newline / indentation). No behavior change.
**Notes:** none
**Commit(s):** `7352225`
