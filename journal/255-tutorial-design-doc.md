# Journal — #255: docs(tutorial): design/tutorial-and-hints.md

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-04T00:00:00+00:00 — push 1 (initial + two review passes)

**Pushed:** Created `design/tutorial-and-hints.md` covering all 4 required sections.

Two code-review passes ran before push:

**First pass findings (critical → fixed):**
- `TurnPhase` had `'assist'` — removed, added `'kether'` to match `engine/types.ts:63`
- `FirstEvent` had `'assist-phase'` — assist is a sub-phase modifier, not a TurnPhase
- `action-bar` NamedRegion had no DOM anchor — added anchor table; `data-action-bar`
  must be added to the `<div>` containing `[data-phase-hint]` in `PlayScreen.tsx`
- Step IDs were implicit — now explicit with prerequisiteId chain table
- Lexicographic tie-break → `priority: number` field
- `localStorage` functions missing try/catch — wrapped all three
- Step 3 trigger was `first-event:move-phase` (same as Step 2) — changed to
  `phase-enter:move minTurn:1` so it re-evaluates at dismiss time
- `z-60` non-standard in Tailwind v3 — using `z-[55]`/`z-[60]` arbitrary values
- `hinted-action` contract undocumented — component calls `markDismissed(getActiveHint()?.id)`

**Second pass findings (significant → fixed):**
- `action-bar` description still ambiguous — now says "the `<div>` containing
  `[data-phase-hint]`, NOT the Tree of Life board section"
- `isEligible` double-negation confusing — added inline comment
- `phase-enter` re-evaluation contract needed one clarifying sentence
- `MeditateConfirmDialog` z-40 interaction noted as caveat for implementing PR
