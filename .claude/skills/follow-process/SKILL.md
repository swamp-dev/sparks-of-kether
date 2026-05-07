---
name: follow-process
description: Mid-session course-correction nudge. Tells the agent to re-read docs/workflow.md, name explicitly what it skipped (no Journal entry, code-reviewer not run, /ship-ticket gate input fabricated, etc.), and resume from the right step. Lightweight — doesn't restart work.
---

# /follow-process

Pause. Re-read [`docs/workflow.md`](../../../docs/workflow.md) end-to-end.

Then look back at the work you've done in this session and the work
in flight on this branch. **Name explicitly what you skipped or
short-circuited.** Examples of common drift:

- Pushed a commit without a Journal entry in `journal/<N>-<slug>.md`.
- Used the legacy `Journal.md` instead of the per-ticket file (#429).
- Invoked `code-reviewer` and addressed findings, but didn't complete
  whatever the current `/finish-ticket` SKILL.md says about recording
  the verdict / writing the per-PR-checklist artifact (Journal marker,
  mechanical stamp, whatever the active gate is).
- Ran fixes that were substantial (per `/finish-ticket`'s re-review
  heuristic) but didn't re-fire `code-reviewer`.
- About to `/ship-ticket` without verifying CI is green against the
  current HEAD SHA, or with the per-PR-checklist gate's input missing
  / stale.
- Considering bulk-merging multiple PRs (anti-11-PR-incident
  guardrail in `/ship-ticket`).
- Opened a PR with the body's `Closes #NN` line, but didn't link the
  per-ticket Journal file or include the short excerpt.

If you find drift, **don't paper over it** — say what you skipped and
back-fill the right step. If a step is impossible to back-fill (e.g.
you can't write a Journal entry for a push that already happened
without it), surface that explicitly and add a follow-up entry on the
next push by default. No question to the user; the user can interrupt
if they want a different recovery.

If you find no drift, say so plainly: "checked workflow.md against
this session's work; no drift." Don't re-list every step you did
correctly.

## When to use

Invoked by the user mid-session when something looked off, or
proactively by the agent if it realizes (e.g. through a context
review) that it's been operating on assumptions instead of the
documented process. Lightweight — doesn't reset the work, just
realigns.
