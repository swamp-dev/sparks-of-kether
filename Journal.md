# Sparks of Kether — Build Journal

> **Append only.** Never edit or delete past entries. This file is the
> long-term memory of the project — a record of what each agent built,
> what surprised them, and what they learned. Over many tickets it
> becomes institutional memory: the next agent can skim recent entries
> to catch up fast.

Every ticket closeout appends one entry, using the template below.
The [`/finish-ticket`](.claude/skills/finish-ticket/SKILL.md) skill
(added in ticket #5) automates the process; before it lands, append
by hand.

## Entry template

Copy this block, fill in the fields, append at the **bottom** of the file:

```markdown
## YYYY-MM-DD — Ticket #NN: Short title

**What I built:** one or two sentences on the concrete output.
**Surprises:** what was unexpected during implementation.
**Trips / blockers:** what took longer than it should have; why.
**Notes for future agents:** anything the next ticket handler should know.
**PR:** #NN
```

**Date format:** ISO (`YYYY-MM-DD`). Keep entries chronological.

**Tone:** terse, honest, useful. This is a working log, not marketing.
If a ticket went smoothly, "Surprises: none. Trips: none." is fine.
If something was painful, say so — future agents will thank you.

---

## Entries

## 2026-04-24 — Ticket #4: Add Journal.md (append-only build log)

**What I built:** This file. Header explaining the append-only rule, the
entry template, and the first entry (this one).

**Surprises:** None — straightforward docs work.

**Trips / blockers:** None.

**Notes for future agents:**
- The `/finish-ticket` skill (ticket #5) automates appends; until it lands,
  append by hand at the **bottom** of this file — never at the top.
- If a PR gets revised after the Journal entry is written, update the
  entry here (this is the source of truth) and regenerate the PR body
  description.
- Entries are not retroactively edited for style. If a past entry has a
  typo, leave it. The point is a true log, not a tidy one.

**PR:** #42
