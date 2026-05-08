# Journal — #468: docs(finish-ticket): remove stale '/ship-ticket reads Journal' from step 8a

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T19:58:41-04:00 — push 1: drop stale journal-gate claim

**Pushed:** docs: replace stale "/ship-ticket reads journal" parenthetical
in `.claude/skills/finish-ticket/SKILL.md` step 8a; same fix in
`journal/README.md` § "Where the workflow writes" (third bullet).
**Why:** Per #468 — the claim that `/ship-ticket` reads the per-ticket
Journal to verify the per-PR checklist post-dates the stamp mechanism
(#428/#439); the merge gate is now `.claude/state/checklist-*.json`,
not the journal. Journal remains the human-readable audit record. Pre-existing
staleness in two doc locations now corrected.
**Notes:** none.
**Commit(s):** TBD on push.

## 2026-05-08T00:05:00-04:00 — push 2: extend cleanup per reviewer findings

**Pushed:** docs: drop stale journal-gate claims from workflow.md + full-send + follow-process.
**Why:** Code-reviewer (push-1 review) flagged that `docs/workflow.md` line 157
carried the same stale "/ship-ticket reads the per-ticket file" claim — a
SIGNIFICANT finding. Sweep-found the same shape in `.claude/skills/full-send/SKILL.md:45`
("missing Journal marker" listed as a gate-failure mode) and
`.claude/skills/follow-process/SKILL.md:18` ("Journal marker" listed as a
possible per-PR-checklist artifact). Replaced all three with stamp-aware
wording.
**Notes:** Re-review fired per /finish-ticket step 8a heuristic — fixes
landed in an area the first pass flagged SIGNIFICANT.
**Commit(s):** `028e9aa`

## 2026-05-07T20:06:43-04:00 — push 3: extend cleanup per second-pass review

**Pushed:** docs(ship-ticket): drop journal-re-review-marker precondition.
**Why:** Second-pass review flagged that `.claude/skills/ship-ticket/SKILL.md`
Preconditions (lines 36-37) still listed "You can see the corresponding
Journal entries on the branch — the re-review marker in particular" as
a precondition. SIGNIFICANT — same staleness pattern, in the very skill
the cleanup describes. Replaced with stamp-aware wording pointing at
the step-3 mechanical gate.
**Notes:** Second-pass reviewer also flagged a minor: push-2 entry
timestamp `2026-05-08T00:05:00-04:00` was synthetic (today is still
2026-05-07). Per append-only convention I'm not editing past entries;
this push-3 entry uses an actual `date -Iseconds` timestamp. Re-review
fires again per step 8a (same SIGNIFICANT-area criterion).
**Commit(s):** `bfa54ab`

## 2026-05-07T20:10:40-04:00 — push 4: extend cleanup per third-pass review

**Pushed:** docs(full-send): drop stale "Journal-marker" reference in step-5 description.
**Why:** Third-pass reviewer found one more spot — `.claude/skills/full-send/SKILL.md:34`
listed "Journal-marker" as the first named example of the gate
mechanism. Fixed by replacing with stamp-aware wording matching the
rest of the cleanup. Reviewer also flagged a minor on the
follow-process frontmatter (no-Journal-entry vs gate-input
fabrication conflated in description); body is authoritative and
distinguishes correctly, leaving frontmatter as-is.
**Notes:** Re-review fires again per step 8a heuristic.
**Commit(s):** TBD on push.
