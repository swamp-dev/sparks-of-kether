# Journal — #550: refactor(data): move blessing/verdict/framing into Pantheon

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T12:55:16-04:00 — push 1: move blessing/verdict/framing into Pantheon

**Pushed:** refactor(data): move blessing/verdict/framing into Pantheon (#550)
**Why:** Phase A4 of Epic #293 — final refactor step. Moves three large data files (verdicts/blessings/framing) and their tests into `data/pantheons/greco-roman/`. Greco-roman pantheon is now self-contained; Phase B (Egyptian) is unblocked. Pickers stay in their files (data + picker are co-located by design) — surfaced as a deliberate scope decision for review.
**Notes:** none
**Commit(s):** `22106eb`

## 2026-05-08T13:13:45-04:00 — push 2: address review (extract matrix types; refactor pickers to take matrix param)

**Pushed:** refactor(pantheon): extract matrix types to shared registry; pickers take matrix as parameter (#550)
**Why:** Code-reviewer flagged two SIGNIFICANTs that I'd skipped in push 1.

SIGNIFICANT 1 — `data/pantheons/types.ts` was importing `VerdictMatrix`, `FramingMatrix`, `SefirahBlessingMatrix` from `greco-roman/` data files. The `Pantheon` interface — the contract every future pantheon must satisfy — borrowed its slot types from a specific pantheon's implementation. Reviewer: shared interface types should not depend on a specific pantheon's data files; future-Egyptian would either silently inherit greco-roman's types (conceptually wrong) or hit a real type error and force the extraction anyway. **Extracted** all matrix type definitions (`ChallengeOutcome`, `VerdictMatrix`, `PlayerResponseMatrix`, `FramingMatrix`, `FramingPlaceholderMap`, `SefirahBlessingMatrix`) to `data/pantheons/types.ts`. The greco-roman data files import them from `../types` and re-export for direct readers (tests, engine helper). Plus extended the `Pantheon` interface with `sefirahPlayerResponses` and `sefirahFramingPlaceholder` slots so all pantheon-coupled content surfaces through the registry.

SIGNIFICANT 2 — EncounterScreen hardcoded greco-roman picker imports (`pickVerdict`, `pickPlayerResponse`, `pickFraming`) while `usePantheon()` was already in the file. When Egyptian ships, the component would render Egyptian avatar names but call greco-roman pickers — silent multi-pantheon breakage, no compile-time signal. **Refactored** all four pickers (`pickVerdict`, `pickPlayerResponse`, `pickBlessing`, `pickFraming`) to take the matrix as the first parameter. Pickers stay in their data files (literary co-location preserved); only the signature changes. EncounterScreen now passes `pantheon.sefirahVerdicts` etc. — pantheon-aware by construction. `quoteForBlessing` (the engine wrapper around `pickBlessing`) gets the same treatment. `BlessingRitual` (the only other caller) reads `pantheon.sefirahBlessings` via `usePantheon()` and passes it through.

Plus stale-doc cleanups: 6 paths updated across `data/index.ts`, `data/pantheons/greco-roman/blessings.ts`, `data/pantheons/greco-roman/framing.ts`, `components/setup/__tests__/BlessingRitual.test.tsx`, `components/game/__tests__/EncounterScreen.test.tsx`.
**Notes:** Re-review will fire per step 8a (fixes touched both SIGNIFICANT-flagged areas + introduced new exports). Local typecheck/lint/test all green.
**Commit(s):** `9a534a7` (fix); journal entry committed alongside.
