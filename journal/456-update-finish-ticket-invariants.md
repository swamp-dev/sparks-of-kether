# Journal — #456: docs(finish-ticket): update Invariants — gate is stamp, not Journal

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T13:47:14-04:00 — push 1 final-push before code-review

**Pushed:** docs(finish-ticket): update Invariants — gate is stamp, not Journal
**Why:** The Invariants block in `.claude/skills/finish-ticket/SKILL.md` predated the stamp-based gate (#428/#439) and still claimed `/ship-ticket` refused to merge a PR whose per-ticket Journal file didn't show the checklist completing. That's the prior honor-system gate; the live mechanism is the stamp file at `.claude/state/checklist-<sanitized-branch>.json` written by `scripts/checklist-stamp.mjs`, validated against PR HEAD SHA and verdict. Updated to reflect the actual mechanism while keeping the Journal-as-audit-record framing.
**Notes:** doc-only change; no mechanism change. Gate-adjacent (touches `.claude/skills/finish-ticket/SKILL.md`) — opening the PR but flagging for human merge per the structural-exception rule in `/full-send`.
**Commit(s):** `d03c633`

## 2026-05-07T13:50:30-04:00 — push 2 review-fix push

**Pushed:** docs(finish-ticket): add stamp-existence to Invariants gate condition list
**Why:** Reviewer first pass flagged that the new Invariants prose listed `head_sha` match AND `verdict=ship` as the gate conditions, but `/ship-ticket` step 3 actually checks stamp existence first. One-word tightening — "unless the stamp exists, its head_sha matches…". Fix is genuinely minor (single-word addition) so re-review is skipped per step 8a heuristic.
**Notes:** re-review skipped — fix is single-line prose, no new files / no >50 net lines / no new exported symbol / not in a CRITICAL/SIGNIFICANT-flagged area
**Commit(s):** `dc3bf66`
