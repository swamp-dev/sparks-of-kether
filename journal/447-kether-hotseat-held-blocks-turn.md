# Journal — #447: fix(kether): hot-seat — held-at-Kether screen blocks the still-climbing player from taking their turn

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T12:35:52-04:00 — push 1 (final): TDD fix for hot-seat Kether soft-lock

**Pushed:** `test(use-turn): failing regression for #447 — Kether-arrival auto-rotate` (commit `487ae18`); `fix(kether): auto-rotate seat when a player arrives at Kether (#447)` (commit `5c8b5c2`). Two-commit TDD slice — the failing test was committed first, then the engine-orchestrator fix turned it green.

**Why:** Hot-seat soft-lock when a player arrives at Kether. Investigation showed the rotation primitive in `engine/turn.ts` already skips held seats correctly (#335) — the actual root cause was upstream: a Kether arrival lands in `phase: 'draw'`, but the hot-seat auto-advance hook in `PlayScreen.tsx` only fires for `phase: 'end'`, so `endTurn` was never invoked. Active seat stuck on the just-arrived (held) player; held branch rendered with no path forward.

**Notes:** TDD test-then-fix shape (per the project's bug-fix process in `~/.claude/rules/development-workflow.md`). The plan covering this work — root-cause analysis, fix-surface choice (engine-orchestrator level, not pure-engine and not UI-cadence), and explicit out-of-scope multiplayer follow-up — lives at `~/.claude/plans/piped-prancing-giraffe.md` (in-flight; will not be archived). Local gate green: typecheck clean, lint clean, 1960 tests / 113 files (+2 over baseline; the two new regression tests are the failing-then-green pair the fix turned over). Multiplayer held-screen-on-self UI work is intentionally NOT in this PR — see "What's deliberately NOT in this PR" in the plan.

**Commit(s):** `487ae18..5c8b5c2`.

## 2026-05-07T12:50:00-04:00 — push 2 (final): review fixes — defensive throw + held-predicate assertion

**Pushed:** `fix(kether): address review — defensive throw + held-predicate assertion` (commit `a9f4013`); plus this journal entry. Two SIGNIFICANT-severity findings from the first code-reviewer pass on push 1: (1) added a defensive `throw` at `lib/turn-machine.ts` so a future `pendingDiscard`-at-`phase: 'move'` regression surfaces loudly instead of silently re-introducing the soft-lock; (2) added a direct `isKetherHeld(state, 'p1') === true` assertion to the regression test.

**Why:** Address review findings before opening the PR. Per the per-PR-checklist re-review rule, fixes that landed in a SIGNIFICANT-flagged area trigger a second code-reviewer pass.

**Notes:** Re-reviewed after fixes; reviewer returned clean (verdict=`ship`, no critical, no significant; two minor observations that the reviewer themselves marked low-priority — kept the inline comment about `arrivedAtKetherAt` as-is since the underlying assertion is correct regardless of the comment's slight phrasing imprecision). Local gate green: typecheck clean, lint clean, 1960 tests / 113 files (no test count change — the throw isn't exercised today, and the new test assertion strengthens an existing test rather than adding a new one).

**Commit(s):** `a9f4013` (fix); journal entry committed alongside.

