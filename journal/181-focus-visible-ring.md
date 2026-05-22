# Journal — #181: fix(a11y): add focus-visible ring to remaining bg-illumination buttons across codebase

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T13:20:00Z — push 1 focus-visible ring on 9 buttons

**Pushed:** Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-illumination/80` to 9 bg-illumination primary action buttons that were missing it: Roll + Continue in ChallengeModal, Confirm closure in FinalThresholdScreen, Continue in EncounterScreen, End turn in PlayScreen, New game in HomeRoomForms, Confirm in ZodiacSignPicker, Resume in ContinueGame, Begin in Lobby. Pattern matches the established reference in DiscardPile.tsx and other recently-updated components. No tests added — checking Tailwind class strings is brittle snapshot testing with no business-logic value.
**Why:** Keyboard users pressing Tab had no visible focus indicator on these primary action buttons. Pattern was established in PRs #170 and #179; this ticket completes the sweep of remaining bg-illumination buttons identified in the #179 review.
**Commit(s):** `4d62168`
