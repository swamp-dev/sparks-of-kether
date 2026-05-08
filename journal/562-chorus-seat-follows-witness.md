# Journal — #562: fix(kether): hot-seat chorus freezes after first card — PlayScreen pins seat to activePlayerIndex instead of witness pointer

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T23:51:27-04:00 — push 1: TDD red→green for chorus seat rotation

**Pushed:** test(kether): add failing regression for hot-seat chorus seat rotation (#562); fix(kether): hot-seat chorus seat follows witness pointer (#562)
**Why:** Hot-seat chorus froze on the first witness handoff because PlayScreen pinned the rendered seat to `players[activePlayerIndex]`, but the engine rotates `state.ketherRitual.witnessTurnIndex` independently. After P1's first play, P2 became the current witness but the screen stayed mounted for P1 — frozen. Fix derives the seat from `turn.currentWitnessPlayerId` during `phase === 'kether'`, falling back to `activePlayer` for the close sub-phase where the witness pointer is null.
**Notes:** none
**Commit(s):** `23f70a9..17a6bd3`

## 2026-05-08T00:33:22-04:00 — push 2: localize TODO(#325) on close-phase fallback

**Pushed:** fix(kether): localize TODO(#325) on close-phase fallback (#562)
**Why:** Code-reviewer (pass 2 after rebase onto current `origin/main`) returned **Ship** with one minor suggestion: a localized `// TODO(#325)` on the close-phase `activePlayer` fallback line so the multiplayer gap is grep-able when #325 lands. Comment-only edit; tests still green.
**Notes:** Three reviewer passes in this session all returned Ship — pass 1 (clouded by stale rebase base showing 1800+ unrelated deletions), pass 2 (clean diff), pass 3 (verifying TODO landed). PostToolUse:Agent stamp hook didn't fire this session for unknown reasons; the existing on-disk stamp was written via explicit-mode call earlier with a hand-summarised reviewer-output that mis-parsed as `verdict: "fix"`. Re-stamping is gated against the agent (correctly, per the fabricate-gate-inputs rule) — handing the merge off to the user.
**Commit(s):** `aef3b33`
