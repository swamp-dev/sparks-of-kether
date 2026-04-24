# Sparks of Kether — Build Journal

> **Append only.** Never edit or delete past entries. This file is the
> long-term memory of the project — a record of **every push**, what it
> contained, and why.

## Rule

**Every `git push` gets one Journal entry.** Append at the bottom of this
file, commit the entry *with* (or immediately before) the pushed work so
the branch and the log stay in sync. Each entry carries:

- An **ISO-8601 timestamp** with time and timezone (`YYYY-MM-DDTHH:MM:SS±ZZ:ZZ`).
- A **ticket number** (`#NN`) in the heading.
- A short **context line**.
- Body fields: what was pushed, why, notes for future agents, commit sha(s).

A single ticket typically accumulates several entries (initial push, review
fixes, polish). That's expected — the file is chatty on purpose.

## Entry template

Copy, fill in, append at the **bottom**:

```markdown
## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — #NN: Short context line

**Pushed:** what this push contains (bullet or short paragraph).
**Why:** motivation (e.g. "draft 1", "review fixes for X", "CI green").
**Notes:** anything worth remembering for future agents. "None" is fine.
**Commit(s):** `<sha-short>` (or a range: `<sha1>..<shaN>`)
```

**Tone:** terse, honest, useful. Not marketing. If a push went smoothly,
"Notes: none" is fine. If something was painful, say so — future agents
will thank you.

---

## Entries

## 2026-04-24T16:09:58-04:00 — #2: CLAUDE.md initial draft + code-review fixes

**Pushed:** First draft of `CLAUDE.md` (191 lines), revised in-worktree to
address two critical and four significant findings from the `code-reviewer`
subagent — inline Journal fallback for pre-infra tickets, branch/worktree
naming asymmetry, pre-scaffold `pnpm` caveat, step-10 session boundary,
Journal source-of-truth rule, Stack-change-rule alignment; plus minor
`KabballahGame.md` Do-NOT and TDD-commit clarification.

**Why:** Bootstrap the canonical workflow file. Every other ticket depends
on `CLAUDE.md` being in place.

**Notes:** Back-filled retroactively — this push happened before the
per-push Journal rule existed. The rule was introduced in #44 (this ticket).

**Commit(s):** `8127a36`
**PR:** #40 (merged as `0cb5bb8`)

---

## 2026-04-24T16:11:46-04:00 — #3: CONTRIBUTING.md initial draft

**Pushed:** 41-line `CONTRIBUTING.md`. Short human-facing welcome; defers
to `CLAUDE.md` for the canonical workflow.

**Why:** Make the repo approachable on GitHub without duplicating workflow
rules.

**Notes:** Back-filled. Skipped `code-reviewer` given trivial size.

**Commit(s):** `d48968f`
**PR:** #41 (merged as `50fbc53`)

---

## 2026-04-24T16:12:56-04:00 — #4: Journal.md initial draft

**Pushed:** `Journal.md` (56 lines) with the now-superseded
append-on-closeout rule and one first entry for itself.

**Why:** Institutional-memory file referenced by `CLAUDE.md`.

**Notes:** Back-filled. The append-on-closeout rule is being replaced with
the per-push rule right here in #44.

**Commit(s):** `9be6c7f`
**PR:** #42 (merged as `dd6597f`)

---

## 2026-04-24T16:14:21-04:00 — #5: /finish-ticket skill initial draft

**Pushed:** `.claude/skills/finish-ticket/SKILL.md` (164 lines). Ten-step
closeout routine + separate-session cleanup. Explicit Do-NOT list
(no `gh pr merge`, no force-push, etc.).

**Why:** Automate the last mile of every ticket so nothing gets skipped.

**Notes:** Back-filled. Skipped `code-reviewer` on the initial push to
save context; the skill's Journal-append steps are being rewritten in #44
for the per-push rule.

**Commit(s):** `5ea714b`
**PR:** #43 (merged as `bd2d23f`)

---

## 2026-04-24T16:25:36-04:00 — #44: switch to per-push Journal entries + back-fill

**Pushed:**
- Back-filled Journal entries for every push on tickets #2, #3, #4, #5
  (four entries, real commit timestamps, ticket refs, PR refs).
- Rewrote `Journal.md` header to document the per-push rule, new
  timestamp format (ISO-8601 with timezone), and new entry template.
- Rewrote `CLAUDE.md` step 7 — "Append a Journal entry" → "Journal
  every push"; updated template inline.
- Rewrote `.claude/skills/finish-ticket/SKILL.md` — the skill no longer
  owns the Journal-append step; it handles only the *final* push's entry
  plus PR-open. Adds a "verify prior pushes already have entries" gate
  (step 4). Description and preconditions updated.

**Why:** User feedback mid-implementation: one entry per ticket at
closeout loses detail. Per-push entries preserve the iteration history.

**Notes:** This entry documents the push that introduces the per-push
rule; pushes *before* this rule were back-filled to match.

**Commit(s):** `844785f`

---

## 2026-04-24T16:25:36-04:00 — session: meta-findings from bootstrap phase

Not tied to one ticket — findings from the whole bootstrap session
(repo init, reference material, design docs, Epic #1, 38 tickets,
tickets #2–#5 implemented). Worth writing down while fresh.

**Bootstrap problem.** Tickets #2–#5 create the workflow infrastructure
(CLAUDE.md, CONTRIBUTING.md, Journal.md, /finish-ticket). While
implementing them, the agent cannot *use* the infrastructure — Journal.md
doesn't exist, the skill doesn't exist, CLAUDE.md is what you're
writing. Build in "pre-infra" fallbacks: inline procedures in the first
file, back-fill entries once Journal.md exists. Don't pretend the
infrastructure is ready for itself.

**`git worktree mv` subtlety.** Renaming the working directory mid-
session (`mv kaballahGame sparks-of-kether`) pins the Bash tool's CWD
to the old path — every subsequent shell call fails with "Path does not
exist." Workaround is to recreate the old dir as an empty placeholder
until the session ends, or always run `cd /abs/path &&` prefixes. Prefer
renaming between sessions when possible.

**Bash single-quote gotcha in batch scripts.** Writing ticket bodies
inside `'…'` strings silently truncates them at any apostrophe
(possessives, contractions). 21 out of 38 tickets made it through before
the script choked on `other players'`. Always grep
`'[a-zA-Z]|[a-zA-Z]'[a-zA-Z]|[a-zA-Z]s' ` before running. Better: use
single-quoted heredocs `<<'EOF'`. Captured in `~/.claude/skills/create-issues/SKILL.md`.

**Code-reviewer pays off on prose.** The `code-reviewer` subagent caught
2 critical + 4 significant issues in CLAUDE.md (pure docs, 191 lines)
that looked fine to the author. Worth invoking even on non-code work
when the doc is load-bearing.

**`gh pr merge --delete-branch` skips local-branch delete if the branch
is checked out in a worktree.** Must sequence: merge on GH → remove
worktree locally → `git branch -D` the local branch. Error messages are
clear but surprised me.

**Repo renaming gotcha for the `gh` tool.** After renaming the repo dir,
`gh repo view` works fine (it reads .git/config's remote, not the path),
but the `gh` tool also doesn't care about worktree locations. Tooling
behaved better than expected.

**Ticket granularity tuning.** PR-sized (1–4h) felt right. The Epic with
38 tickets is skim-able; each ticket is self-contained; agents can pick
one up cold. Smaller tickets would have been busywork; larger would have
needed sub-tasks.

**Symbolic minimalist art choice saved grief.** Original design doc
envisioned figurative Rider-Waite-style card art. Pivoting to "Hebrew
letter + geometric glyph + color band" means Claude can actually
generate all 22 SVGs consistently — figurative at scale is a known
Claude weakness. Worth keeping in mind for future mystical/symbolic games.

**The design→reference→tickets→code cascade works.** The medium-agnostic
design doc (`design/mechanics.md`, `design/shells.md`) became fodder for
clean typed-data tickets and engine-logic tickets. Re-use across media
(board game, app, computer game) is a real option.

**Commit(s):** bundled with `#44` commit above.

