# Journal — #271: docs(design): extend mechanics.md player-count range to 1–6 with deck-scaling rule

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-04T00:00:00+00:00 — push 1 (initial implementation + review fix)

**Pushed:** Updated `design/mechanics.md` to reflect 1–6 player range:
- Lede: "2–4 players" → "1–6 players"
- Components table: Major Arcana decks entry updated for 1–2 / 3–4 / 5–6 tiers
- Deck scaling rule: prose → table (1–2 → 1 deck / 22, 3–4 → 2 decks / 44, 5–6 → 3 decks / 66)
- Design notes: player-count scaling bullet updated; solo fallbacks reference #277 instead of dangling "see solo encounter rules"

Code-reviewer flagged dangling cross-reference `(see solo encounter rules)` — fixed to `(see #277)`. Starting-hand table gap deferred as #290 (not in this ticket's scope).
