# Journal — #345: fix(encounter): failed challenge can be re-rolled for free ("Burn another card to retry" burns nothing)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-10-19T12:38:56-04:00 — push 1: draft

**Pushed:** failing reducer tests; reducer gates (`retry-requires-new-burn` at prep-confirm, `retry-nothing-to-burn` at react-retry); EncounterScreen Roll gate + callout, Retry hidden when nothing burnable, "Burn a card to retry" label; mechanics.md clarification.
**Why:** draft 1 — closes the free re-roll loop from the 2026-10-14 playtest.
**Notes:** the gate keys on the live partition (`partitionPendingBurns`) so burns consumed by the failed attempt keep their bonus but don't buy another roll. Eleven existing fixtures retried with an empty hand or re-confirmed with no new burn (envelope lifecycle, Yesod, Chokmah, room-actions, multiplayer-flow, three per-Sefirah gate tests, two voice tests) — each got a card to burn or a staged burn before the second confirm. `isRetry` now also reads `retryCount` / prior spark burns, which is what #362 asks for.
**Commit(s):** `6fac73e..d727087`
