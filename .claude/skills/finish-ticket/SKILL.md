---
name: finish-ticket
description: Close out a Sparks of Kether ticket end-to-end — run the local gate, invoke code-reviewer, append the final push's Journal entry, commit, push, and open a PR with Closes #NN. Use after the functional work on a ticket is done. Journal entries for intermediate pushes are handled as they happen (per CLAUDE.md step 7); this skill is for the final push + PR-open step only. Stops short of merging — the user merges.
---

# /finish-ticket

Ticket closeout routine for this repo. Codifies the last-mile PR-opening
steps from `CLAUDE.md` so they happen consistently and nothing gets
skipped.

> **Per-push journaling is the default rule** (CLAUDE.md step 7). Every
> `git push` on a feature branch has its own Journal entry. This skill
> handles the Journal entry for the *final* push that immediately
> precedes opening the PR. Intermediate pushes — e.g. during TDD
> iteration or while addressing review feedback — journal themselves
> as they happen, not through this skill.

## Preconditions

Before invoking this skill:

- You are in a worktree (not on `main`).
- The functional code changes for the ticket are complete and working.
- Every **prior** push on this branch already has a Journal entry (per the
  per-push rule). If one is missing, append it before running `/finish-ticket`.
- You know the ticket number (`#NN`).

If any of these is not true, stop and fix before running `/finish-ticket`.

## Steps

Follow in order. If a step fails, surface the failure to the user before
proceeding.

### 1. Confirm branch

```bash
git branch --show-current
```

If the result is `main` or `master`, **stop immediately** and tell the
user they're on the wrong branch.

### 2. Run the local gate

```bash
pnpm typecheck && pnpm lint && pnpm test
```

If any fails, stop and report to the user. Do not auto-fix lint
errors — the human should decide. (Pre-scaffold tickets skip this step
because `package.json` doesn't exist yet; see `CLAUDE.md` § Test commands.)

### 3. Run CI status check (if a PR is already open for this branch)

```bash
gh pr checks --watch 2>/dev/null || true
```

Skip if there's no PR yet (first time running for this ticket).

### 4. Verify Journal.md is current

Walk backwards through the branch's commit log:

```bash
git log --oneline origin/main..HEAD
```

Every push that appears there should already have a corresponding Journal
entry. If any push is missing an entry, **stop** and tell the user —
append the missing entries first, then resume.

This skill only adds the entry for the final (still-unpushed) push.

### 5. Gather fields for this final push's Journal entry

Ask the user four questions:

1. **What does this final push contain?** (short summary of commits)
2. **Why this push?** (e.g. "final code-reviewer fixes", "last doc tweaks")
3. **Any notes for future agents?** ("none" is fine)
4. **Which commit(s)?** (the agent can compute this from `git log`, but
   confirm with the user if ambiguous)

### 6. Append to `Journal.md`

Append a new block at the **bottom** of `Journal.md`, using the current
ISO-8601 timestamp with timezone. The date should come from
`date -Iseconds` or equivalent:

```markdown

## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — #NN: Short context line

**Pushed:** <field 1>
**Why:** <field 2>
**Notes:** <field 3>
**Commit(s):** `<sha-short>` (or range)
```

Never edit or delete past entries — append only.

### 7. Commit the Journal entry + any outstanding work

Stage everything, commit, push. Prefer folding the Journal entry into the
push's main commit when the remaining work is small; otherwise make a
separate `docs(journal): entry for #NN <tag>` commit.

```bash
git add <files>
git commit -m "<type>(<scope>): <short summary> (#NN)"
git push
```

### 8. Invoke code-reviewer

Call the `code-reviewer` subagent on the diff. Prompt it with:

- The ticket URL (`https://github.com/swamp-dev/sparks-of-kether/issues/NN`).
- The acceptance criteria from the ticket.
- Any ticket-specific context the reviewer would need.

Surface findings to the user by severity (CRITICAL / SIGNIFICANT / MINOR).
Fix all CRITICAL and SIGNIFICANT findings. Minor findings may be deferred
with a note in the PR body.

If fixes are made: commit them, append a **new** Journal entry for that
push, push again, re-run code-reviewer if meaningful changes were made.
Each of those pushes follows the per-push Journal rule.

### 9. Open the PR

```bash
gh pr create --title "<conventional-commit title>" --body "<body>"
```

The title follows conventional-commit format: `<type>(<scope>): <description>`.

The body must include:

- **Summary** — 1-paragraph description.
- **Changes** — bullet list of key changes.
- **Test plan** — checklist of what was verified.
- **Journal entries** — copy the relevant Journal entries from `Journal.md`
  for this branch's pushes (read-only reference — `Journal.md` is source of truth).
- **Closes #NN** — on its own line so GitHub auto-links.

### 10. Print the PR URL and stop

Print the PR URL for the user. Then stop.

**Do NOT:**

- Run `gh pr merge` — ever.
- Force-push.
- Auto-approve the PR.
- Continue with the next ticket without explicit user direction.

The user merges on their own schedule. Your session ends here.

### 11. Cleanup (separate session, after merge)

When the user returns in a later session and says the PR was merged, run:

```bash
git worktree remove ../sok-<N>-<slug>
git branch -d <type>/<N>-<slug>
```

Do not perform cleanup in the same session as the PR open — leave after
step 10.

## Invariants

- One ticket = one branch = one PR.
- Every push has a Journal entry; `Journal.md` grows, never shrinks.
- User merges; agents do not.
- Hooks and signing are never bypassed.
- If in doubt, ask the user.
