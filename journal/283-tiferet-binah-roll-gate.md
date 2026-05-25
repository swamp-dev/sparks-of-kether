# Journal — #283: Tiferet + Binah roll-gate not surfaced in UI

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-24T20:00:00+00:00 — push 1: fix + tests

**Pushed:** Three commits — failing tests for Tiferet and Binah roll gates
(mirroring `EncounterScreen.gevurah.test.tsx`), implementation adding
`tiferetRequiresBurn`/`binahRequiresBurn` flags to `EncounterScreen.tsx`,
and a comment clarifying the `availableCardBurns == hand.length` contract
(reviewer note from code-reviewer, verdict: ship).

**What changed:** `EncounterScreen.tsx` now computes and surfaces gates for
all three sefirot (Gevurah, Tiferet, Binah) that require a card burn before
rolling. The D20Button is disabled and an explanatory hint is shown when the
gate is active. 12 new tests cover the cases; all 3317 existing tests continue
to pass.

**Surprising:** The engine gates for Tiferet and Binah had existed since the
Gevurah fix (same commit), but the UI wire-up was omitted — only Gevurah was
wired. The bug existed silently for both Sefirot until a player reached Apollo.
