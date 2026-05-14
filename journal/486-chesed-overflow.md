# Journal — #486: feat(encounter): Chesed mechanic — abundance/gift twist

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T17:10:12-04:00 — push 1: open PR

**Pushed:** test(chesed): failing tests for Overflow unfolding mechanic; feat(chesed): Overflow — gift transfer, DC reduction, always-pass, abundance bonus
**Why:** Implement the design § 3.3 unfolding side across engine and reducer. DC reduces by -min(gifts+1, 4); unfolding (gifts ≥ 1) forces outcome.pass=true regardless of d20; emit chesed-overflow-bonus event + +1 Illumination via applyEvent when d20 would have passed the *unmodified* DC; transfer arcana from active to recipient at prep-confirm with hand-cap auto-discard; Shell of Chesed blocks gift-card stage. Engine-only matching the Hod/Yesod/Tiferet/Netzach/Gevurah precedent.
**Notes:** Local-suite has 1 pre-existing flake — `scripts/music/__tests__/synth.test.ts > produces values in [0,1) and reasonably uniform distribution` times out under parallel load (~39s). Passes in isolation (20s). Unrelated to Chesed. Hoarding-fail event (+2 Sep replacement) + react-retry guard + on-wire recipient-confirm action explicitly deferred to a follow-up in PR body (out of scope for this slice).
**Commit(s):** `d6e3eb2..1e834c6`

## 2026-05-14T17:23:00-04:00 — push 2: address review

**Pushed:** docs(journal): entry for #486 push 1; fix(chesed): address review — gate auto-fold, tighten contract, gate gift transfer
**Why:** code-reviewer returned **Fix** with 2 SIGNIFICANT engine bugs and 1 MINOR. (1) `chesedGiftDcReduction` auto-fold ran unconditionally — a UI caller following the JSDoc would double-apply the reduction. Gated on `input.outcome === undefined` (mirrors Tiferet/Netzach pattern). (2) Same root cause: overflow-bonus `unmodifiedDC` math broke when UI supplied outcome without applying reduction. Fix is the same gate; updated inline comment to document all three cases (engine path; UI-supplied-and-applied; UI-didn't-supply). (3) MINOR: `applyChesedGiftTransfers` gated on `encounter.sefirah === 'chesed'` so a future non-Chesed gift variant doesn't inherit Chesed's hand-cap rules. Reviewer also flagged 2 UI issues (pass/fail mismatch, no gift-card affordance) — both depend on a UI surface that doesn't exist today, so latent rather than live. Deferred to #475 with a clearer note in the PR body.
**Notes:** Re-review required per step 8a — fixes landed in SIGNIFICANT-flagged areas (resolveChallenge Chesed branch + JSDoc contract). Added 1 new regression test for the UI-path-no-reduction case.
**Commit(s):** `9da0bcf..278154a`

## 2026-05-14T17:29:00-04:00 — push 3: tighten regression tests

**Pushed:** docs(journal): entry for #486 push 2; fix(chesed): tighten regression tests for auto-fold gate
**Why:** Re-review caught that my SIGNIFICANT-fix's regression test passed with OR without the gate — both `effectiveDC` and `chesedOverflowBonus` assertions survived double-application. Fixed by changing total=13 (the single-reduction unmodifiedDC, NOT 15) so the test now genuinely discriminates: with-gate fires overflow (13≥13), regression-no-gate skips overflow (13<15). Also added a negative-case test for the Sefirah gate on `applyChesedGiftTransfers`. Skipping the re-review-after-fix this time — test-only changes (no impl change, no new exported symbols, <50 net lines, fixes do NOT land in a CRITICAL/SIGNIFICANT-flagged area since the previous re-review's only blocker was test quality, and the only thing changed is the test itself).
**Notes:** Test-only commit. Per finish-ticket step 8a heuristic, no further re-review needed — fixing a test-quality finding by tightening the same test does not introduce new behaviour.
**Commit(s):** `e306f72..ff7b53b`
