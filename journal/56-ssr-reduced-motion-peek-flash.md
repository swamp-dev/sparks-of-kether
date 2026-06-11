# Journal — #56: fix(hand): avoid single-frame peek flash for reduced-motion users on SSR

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-11T00:27:12-04:00 — initial fix + PR

**Pushed:** Added `useLayoutEffect` in `Hand.tsx` to read `matchMedia` directly before the first browser paint. `useReduceMotion()` starts `false` for SSR safety and corrects via `useEffect` (after paint) — the existing `useEffect([reduceMotion])` handled live changes but not the mount flash. The new `useLayoutEffect` runs synchronously before paint and is a no-op during SSR.
**Why:** Tech-debt ticket from PR #636 review. One-liner change, no test additions needed — existing `stubMatchMedia` + contract test already pin the behavior; jsdom's `act()` masks the paint-timing distinction in tests.
**Notes:** Reviewer (code-reviewer) flagged that the `'(prefers-reduced-motion: reduce)'` query string is now duplicated between `useReduceMotion.ts` and `Hand.tsx`. Filed follow-up tech-debt issue to move the initial read into the hook itself (verdict: Ship — not a blocker).
**Commit(s):** `4fce791`
