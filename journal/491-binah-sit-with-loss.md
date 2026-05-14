# Journal — #491: feat(encounter): Binah mechanic — Sit With Loss

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T17:50:45-04:00 — push 1: open PR

**Pushed:** test(binah): failing tests for Sit With Loss mechanic; feat(binah): Sit With Loss — assist block + arcanum-scaled burn bonus
**Why:** Implement the design § 3.7 mechanic across engine and reducer. New `TurnReducerError` kind `binah-no-assists` rejects `assist-request` at `prep-add-modifier` when `state.encounter?.sefirah === 'binah'`. Engine `resolveChallenge` folds `binahBurnTierBonus(arc)` summed across staged cardBurns into `flatBonus` — Math.floor(arc/4) per the design's tier table (0-3→0, 4-7→1, 8-11→2, 12-15→3, 16-19→4, 20-21→5). Higher-rank concrete losses thus matter more. Engine-only matching the Hod/Yesod/Tiferet/Netzach/Gevurah/Chesed precedent.
**Notes:** Design AC bullet 1 ("Design § committed and reviewed") was already satisfied — § 3.7 was LOCKED in the design doc; commented on the ticket earlier in this session. The design prose says "ceil(arc/4)" but the table tells the actual rule; closed-form `Math.floor(arc/4)` matches the table exactly.
**Commit(s):** `5ead750..865e53a`

## 2026-05-14T17:59:00-04:00 — push 2: address review

**Pushed:** docs(journal): entry for #491 push 1; fix(binah): JSDoc clarifies binahBurnTierBonus returns extra-only
**Why:** code-reviewer returned **Fix** with 1 SIGNIFICANT doc gap and surfaced a design-doc contradiction (line 975 prose "replaces" vs lines 941/945 table "on top of"). JSDoc fix: previous example said `"+5 at Binah" on arc=10` but the function returns 2 (extra), not 5 (full). UI implementer would render the wrong subscript. Fixed by rewriting the tier table to show BOTH extra AND total-per-burn, plus a "UI rendering note" with the exact formula `CARD_BURN_BONUS + binahBurnTierBonus(arc)`. Design-doc errata for line 975: classifier (correctly) blocked the edit as scope creep — design docs are the source of truth per CLAUDE.md, and modifying them mid-engine-ticket to match impl reverses the authoritative direction. Noted in PR body for the design author to resolve.
**Notes:** Doc-only fix (no logic change, no new exported symbols). Per finish-ticket step 8a, re-review skip is defensible — but I'll re-fire reviewer once to refresh the stamp at the current HEAD (the prior stamp is at the pre-fix SHA).
**Commit(s):** `74232b0..ad81ff7`
