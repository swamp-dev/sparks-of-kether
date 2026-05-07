# Journal — #413: feat(blessing): page redesign — orb label, copy split, layout, fit-on-desktop

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T14:09:09-04:00 — push 1: two-column blessing layout

**Pushed:** feat(blessing): two-column layout at md+ — orb stat-label folded, essence+invocation merged (#413)
**Why:** The Sefirot Blessing screen forced a desktop scroll to see the BLESSINGS RECEIVED ledger. Two-column at md+ puts ceremony left / ledger right so 1280×800 fits without scroll. Mobile preserved single-column. Tightened vertical text density: dropped the standalone `Stat: <name>` line in favour of a small caption folded under the orb medallion, and merged `essence` + `invocation` into one ceremonial paragraph so they read as one block.
**Notes:** none
**Commit(s):** single commit, this push

## 2026-05-07T14:17:10-04:00 — push 2: review fixes

**Pushed:** test(blessing): tighten essence/invocation assertion + drop noise grid-children check; a11y(blessing): aria-hidden on orb stat-label caption (#413)
**Why:** Code-reviewer first pass on push 1 returned `ship` with three significant/improvement items worth fixing: (1) the original `[data-essence]` textContent regex now matches across the merged essence+invocation block — tightened to assert essence text in the parent and the invocation's full text in the nested span separately, so a regression that drops either side fails distinctly; (2) the `gridChildren` assertion I added in push 1 had no signal (any div in the section satisfied it) — removed; (3) the new orb stat-label caption was readable by AT but the same stat name is already in the section's aria-label and the ledger rows — added `aria-hidden="true"` to the caption to remove duplicate readout.
**Notes:** code-reviewer first-pass verdict ship; re-review fired per 8a heuristic because fixes touched the SIGNIFICANT-flagged test file area.
**Commit(s):** single commit, this push
