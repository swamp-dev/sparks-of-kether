# Journal — #490: feat(encounter): Chokmah mechanic — Act Before Thought

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T18:19:46-04:00 — push 1: open PR

**Pushed:** test(chokmah): failing tests for Act Before Thought mechanic; feat(chokmah): Act Before Thought — DC tilt + retry counter + fire-flash bonus
**Why:** Implement the design § 3.8 mechanic across engine and reducer. New `chokmahTilt(n)` helper + `CHOKMAH_FLASH_BONUS` + `CheckModifiers.chokmahTilt`. resolveChallenge at Chokmah computes `totalN = modifierCountAtConfirm + (encounter.chokmahPriorAttempts ?? 0)` and folds `chokmahTilt(totalN)` into the DC; fire signs (Aries/Leo/Sagittarius) on a 0-modifier flash get +2 flatBonus. react-retry case extends `withRetryBumpedEnvelope` to bump `chokmahPriorAttempts` by `max(1, modifierCountAtConfirm)` so failed attempts carry forward. Engine-only matching the precedent. **Last of the 6 per-Sefirah mechanic engine tickets** (after Hod #353, Yesod #354, Tiferet #488, Netzach #489, Gevurah #487, Chesed #486, Binah #491).
**Notes:** AC bullet 1 ("Design § committed and reviewed") was already satisfied — § 3.8 is LOCKED. Lint required removing an inferable `= 0` type annotation on the new optional parameter; trivial.
**Commit(s):** `ea70663..0b71d1e`

## 2026-05-14T18:23:00-04:00 — push 2: correct misleading inline comment

**Pushed:** docs(journal): entry for #490 push 1; fix(chokmah): correct misleading comment on fire-flash-bonus gate
**Why:** code-reviewer returned **Ship** with one SIGNIFICANT comment-vs-code mismatch: the inline comment at the fire-flash-bonus gate said "applies on the engine path AND the UI path ... regardless of input.outcome" but the actual condition gates on `input.outcome === undefined`. Code was correct; comment was wrong. Rewrote the comment to match the code (engine-path-only, mirrors the #486/#489 contract pattern).
**Notes:** Comment-only fix — no code change. Re-fire reviewer once to refresh the stamp at the new HEAD; the previous stamp's verdict was already `ship` at the pre-fix SHA.
**Commit(s):** `ee002df..714cd46`
