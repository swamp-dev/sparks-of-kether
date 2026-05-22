# Journal — #199: fix(a11y): add aria-live to DiscardPile count label for AT parity with DrawDeck

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T13:10:00Z — push 1 aria-live + aria-atomic on count paragraph

**Pushed:** Add `aria-live="polite" aria-atomic="true"` to the count `<p>` in `DiscardPile.tsx` (line 112). The `<p>` is always mounted — a persistent node whose text changes in place — which is the reliable `aria-live` use case (contrast #117 where the node was freshly injected). `aria-atomic="true"` ensures AT announces the full "2 cards" string rather than just the changed `<span>` text node. Matches the treatment already on DrawDeck (#25). Test added asserting both attributes are present on the `<p>`.
**Why:** When a card was discarded mid-turn, the count updated silently for screen readers. The button's aria-label also includes the count and re-announces on focus, but mid-turn updates without focus movement were a gap.
**Commit(s):** `07142e3`
