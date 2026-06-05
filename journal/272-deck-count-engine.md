# Journal — #272: feat(engine): deckCountFor and initializeGame support 1 and 5–6 players

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T03:35:00+00:00 — push 1 (TDD + review pass)

**Pushed:** Widened `deckCountFor` from 2–4 to 1–6 using TDD.

**Changes:**
- `engine/setup.ts`: `deckCountFor` return type `1 | 2` → `1 | 2 | 3`; new cases for 1 (returns 1) and 5–6 (returns 3); throw message updated to `must be 1..6`. JSDoc updated.
- `engine/__tests__/setup.test.ts`: failing tests committed before implementation; `signs` array extended to 6; `deckCountFor` block now covers 1–6 in one it() and throws only on 0/7; it.each extended with rows for 1, 5, 6 players; 1-player named test moved to `starting state` suite; redundant 5-and-6 test removed (covered by it.each rows).

**Code review findings (one pass):**

**Significant — addressed in PR body (deferred to Ticket D):**
- `lib/start-game.ts` still gates at `players.length < 2` and `> 4` — contradicts engine's new 1..6 range. Explicitly out of scope per ticket ("Server-side validation — Ticket D, #274"). Noted in PR body with reference to #274.

**Minor — fixed:**
- `deckCountFor(7)` lacked exact message assertion (inconsistent with 0-player test). Added full-string match for both 0 and 7.
- `initializes with 1 player` was misclassified under `determinism` suite. Moved to `starting state` suite; renamed to `(solo)`.
- Redundant `initializes with 5 and 6 players` test (duplicates it.each rows 5, 6) removed.

**`initializeGame` body needed no changes** — `deckCountFor` was its only player-count gate; the rest of the function maps over the `players` array generically.
