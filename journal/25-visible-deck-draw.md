# Journal — #25: feat(play): visible deck — clickable for drawing

Append-only. Never edit or delete past entries. One entry per `git push` on this branch.

---

## 2026-05-21T22:09:52-04:00 — push 1: failing test + implementation

**Pushed:** test(deck): add failing test for DrawDeck component (#25); feat(deck): visible draw deck alongside DiscardPile (#25)
**Why:** Ticket #25 — draw deck had no on-screen representation; adding a face-down CardBack visualization with count badge paired with DiscardPile in the right-column aside.
**Notes:** Since #502 shipped (discrete 'draw' phase folded into end-turn / Meditate), the deck is informational-only — no click-to-draw interaction. The acceptance criteria's click-to-draw path was superseded; implemented visualization + count only. Initial deck count for a 2-player game is 16 (22 cards − 2×3 dealt). `drawToHand` on end-turn is a no-op when the next player already has ≥ STARTING_HAND_SIZE cards.
**Commit(s):** `060836f..ac854fc`
