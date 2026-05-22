# Journal — #53: feat(hand): call expandHand directly in handleHoverEnter

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T13:55:00Z — push 1 expandHand in handleHoverEnter

**Pushed:** Added `if (isFloating) expandHand()` as the first statement in `handleHoverEnter`, matching the existing pattern in `handleFocusIn`. Test added: `fireEvent.mouseEnter(cardWrapper)` verifies the fan expands (`translateY(0)`) when mouseenter fires on a card's wrapper div directly.

**Why:** `mouseenter` does not bubble (DOM spec), so the fan div's own `onMouseEnter={expandHand}` never fires when the pointer enters a card-wrapper child. The card's hover handler was relying on a bubbling path that doesn't exist — the expansion was only working because React's synthetic event system treats `mouseover` (which does bubble) as the driver for `onMouseEnter`. Making the call explicit in `handleHoverEnter` removes the dependency on that implementation detail and makes the behavior match `handleFocusIn`.

**Commit(s):** `af8260b`, `ddb2624`
