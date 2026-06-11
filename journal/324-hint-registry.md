# Journal — #324: feat(hints): hint type definitions and registry — data/hints.ts

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-11T00:40:00-04:00 — push 1: hint registry + review fix

**Pushed:** `data/hints.ts` (types + HINTS registry), `data/__tests__/hints.test.ts` (8 tests), plus review fix `dismissibleVia: readonly DismissMethod[]`.
**Why:** Draft 1 — all AC met, reviewer finding addressed (type consistency).
**Notes:** Reviewer flagged shallow `Object.freeze` (elements not individually frozen) as significant but verdicted ship-with-one-fix since no mutation paths exist yet. Downstream hook ticket (#325) should deep-clone defensively if it spreads hints. The `as const` widening to `HintDefinition[]` drops narrow literal types — acceptable since downstream types via `HintDefinition` anyway.
**Commit(s):** `5f11df9..a35d271`
