# Journal — #587: test(play): assert pendingDiscard.count cleared after drag-to-discard

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-13T13:02:56-04:00 — push 1: pin pendingDiscard-cleared invariant via DiscardPrompt presence

**Pushed:** test(play): assert pendingDiscard.count cleared after drag-to-discard (#587)
**Why:** Deferred from #462 review. The existing "dropping a card on the discard pile during pendingDiscard discards the card" test verified pile count + card-left-hand but did not directly assert that the engine cleared `pendingDiscard.count` — the "turn-state updated" half of the acceptance criterion. Closes the loop using `[data-discard-prompt]` as the visible UI proxy: PlayScreen mounts `<DiscardPrompt>` iff `pendingDiscardCount > 0` (PlayScreen.tsx ~L772), so its presence before the drag and absence after directly proves the engine transitioned `pendingDiscard.count` from 1 → 0. The ticket gave the agent a choice between `data-phase` and a test-only engine-state escape hatch; `data-phase` is not informative here because the fixture starts in `phase: 'end'` and stays there post-discard. `[data-discard-prompt]` is the right proxy and uses the project's existing convention (the same test already uses `[data-discard-count]` for the pile-count assertion).
**Notes:** none
**Commit(s):** single edit to `components/game/__tests__/PlayScreen.drag.test.tsx` + this entry
