# Journal — #90: feat(hand/encounter): inline discard icons + encounter burn-discard gate

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T00:42:00-04:00 — push 1: full implementation

**Pushed:** test(engine): add failing tests for encounterBurnDiscard reducer; feat(engine): add encounterBurnDiscard pure reducer; feat(turn): wire encounter-burn-discard event through machine and hook; test(hand): add failing tests for Hand discard mode (#90); feat(hand): add discardMode + onDiscard inline icon overlay; feat(play): wire inline discard icons; delete DiscardPrompt bottom-sheet; feat(encounter): gate roll behind burn-discard picker when burns > 0
**Why:** Replaces the DiscardPrompt fixed bottom-sheet with translucent discard icons overlaid on hand cards, letting players hover for path-lighting before committing. Adds burn-discard gate in EncounterScreen so staging card burns requires shedding one card before the die rolls.
**Notes:** none
**Commit(s):** `dd5e422..03be2b4`

## 2026-05-16T01:09:30-04:00 — push 2: address code-review findings

**Pushed:** fix(encounter/hand): address review — defer doRoll via useLayoutEffect; fix aria-disabled in discard mode; picker role region
**Why:** First-pass reviewer returned Fix verdict with one critical correctness bug (React 18 batching caused doRoll to close over pre-discard snapshot, silently overwriting the burn-discard) and two significant accessibility issues (nested role="dialog" inside EncounterScreen's own dialog; aria-disabled=true on card button in discard mode even though the icon is the active affordance). Fixed all three plus the minor redundant onDiscard guard.
**Notes:** Critical fix: added pendingRollAfterBurnDiscardRef + useLayoutEffect to defer doRoll() to the post-discard render. Significant fixes: role="dialog" → role="region" on the burn-discard picker; ariaDisabled now false when discardMode=true (the icon is the affordance). Minor: removed redundant if(onDiscard) guard — TypeScript narrows inside the JSX ternary.
**Commit(s):** `9afd41b..e8920e9`
