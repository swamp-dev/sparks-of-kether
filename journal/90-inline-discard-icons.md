# Journal — #90: feat(hand/encounter): inline discard icons + encounter burn-discard gate

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T00:42:00-04:00 — push 1: full implementation

**Pushed:** test(engine): add failing tests for encounterBurnDiscard reducer; feat(engine): add encounterBurnDiscard pure reducer; feat(turn): wire encounter-burn-discard event through machine and hook; test(hand): add failing tests for Hand discard mode (#90); feat(hand): add discardMode + onDiscard inline icon overlay; feat(play): wire inline discard icons; delete DiscardPrompt bottom-sheet; feat(encounter): gate roll behind burn-discard picker when burns > 0
**Why:** Replaces the DiscardPrompt fixed bottom-sheet with translucent discard icons overlaid on hand cards, letting players hover for path-lighting before committing. Adds burn-discard gate in EncounterScreen so staging card burns requires shedding one card before the die rolls.
**Notes:** none
**Commit(s):** `dd5e422..03be2b4`
