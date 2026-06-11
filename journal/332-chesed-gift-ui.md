# Journal — #332: Chesed gift mechanic — hoarding-fail UI

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-11T02:08:00-04:00 — push 1 (PR open)

**Pushed:** Full #332 implementation — engine hoarding-fail detection + routing + EncounterScreen UI + 5 new tests.

**Commit c27258d:** `feat(engine): Chesed hoarding-fail branch — detect, mark, route`
- `EncounterEnvelope.hoardingFail?: boolean` on types.ts
- `chesed-hoarding-fail` event (+2 Sep) in events.ts
- `resolveChallenge` marks `hoardingFail` when: failed at Chesed, non-empty hand, no gifts staged; TypeScript-narrowed via extracted `hoardingEncounter` variable
- `acceptHoardingSetback` absorbs the setback; no position rollback (non-shortcut path, same as standard chassis)
- `turnReducer` blocks `react-retry` with `chesed-hoarding-blocks-retry`; routes `accept-setback` through `acceptHoardingSetback` using `state.encounter.sefirah` (not `event.sefirah`)

**Uncommitted changes (this push):**
- `EncounterScreen.tsx`: Chesed gift prep UI (gift fieldset, pick-card → pick-recipient state machine, DC preview, shell-blocked/empty-hand messages); `ReactPanel` hides retry and changes accept copy to "+2 Separation" when `hoardingFail`
- 5 new `EncounterScreen.test.tsx` tests (3 prep + 2 react, seed=7 for guaranteed fail)
- `use-turn.test.ts`: `reactRetry` test moved to Yesod (path 25) — Chesed hoarding guard was blocking retry with non-empty hand
- `checks.test.ts`: event name updated to `chesed-hoarding-fail`; narrowing fix applied

**Why:** Design § 3.3 Chesed Overflow hoarding path. Failing at Chesed with cards in hand and no gifts staged = +2 Sep, no retry.

**Notes:** `rollbackPosition` is NOT called from `acceptHoardingSetback` — correct per chassis. Path 16 (Chokmah ↔ Chesed) is Mercy pillar (non-shortcut); non-shortcut setbacks never roll back position. The first code-reviewer incorrectly flagged this as critical; second-pass confirmed the original implementation was right. Event name changed from `check-failed-hoarding` → `chesed-hoarding-fail` to match `design/per-sefirah-mechanics.md` § 3.3 spec.

**Commit(s):** `c27258d` (engine) + staged UI/test changes (this push)
