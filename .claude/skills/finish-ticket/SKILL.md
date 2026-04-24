---
name: finish-ticket
description: Close out a Sparks of Kether ticket end-to-end. Runs the local quality gate, prompts for a Journal.md entry, appends it, commits, pushes, invokes code-reviewer, opens a PR with Closes #NN, and prints the URL. Use at the end of every ticket implementation once the functional work is done. Stops short of merging — the user merges.
---

# /finish-ticket

Ticket closeout routine for this repo. Codifies the last-mile steps from
`CLAUDE.md` so they happen consistently and nothing gets skipped.

## Preconditions

Before invoking this skill:
- You are in a worktree (not on `main`).
- The code changes for the ticket are complete and working.
- You know the ticket number (`#NN`).

If any of these is not true, stop and fix before running `/finish-ticket`.

## Steps

Follow these in order. Do not skip. If a step fails, surface the failure
to the user before proceeding.

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
errors — the human should decide. (Pre-scaffold tickets #2–#5 skip this
step because `package.json` doesn't exist yet; see `CLAUDE.md` § Test commands.)

### 3. Run CI status check (if a PR is already open for this branch)

```bash
gh pr checks --watch 2>/dev/null || true
```

Skip if there's no PR yet (first time running for this ticket).

### 4. Gather Journal entry fields

Ask the user four questions — one prompt per field — and record the answers:

1. **What did you build?** (1–2 sentences on the concrete output)
2. **Any surprises?** (unexpected things during implementation)
3. **Any trips or blockers?** (what took longer than it should have)
4. **Notes for future agents?** (anything the next handler should know)

If the ticket was entirely uneventful, "none" is an acceptable answer for
surprises/trips/notes. Don't invent color.

### 5. Append to `Journal.md`

Append a new block at the **bottom** of `Journal.md`, using today's date
(ISO: `YYYY-MM-DD`):

```markdown

## YYYY-MM-DD — Ticket #NN: Short title

**What I built:** <field 1>
**Surprises:** <field 2>
**Trips / blockers:** <field 3>
**Notes for future agents:** <field 4>
**PR:** #NN (or "pending" if the PR number isn't known yet)
```

Never edit or delete past entries — append only.

### 6. Commit outstanding changes

Stage everything touched, including the Journal update. Commit with a
conventional-commit message:

```bash
git add <files>
git commit -m "<type>(<scope>): <short summary> (#NN)"
```

If the Journal update is the only remaining change, commit it as:

```bash
git commit -m "docs(journal): add entry for #NN"
```

### 7. Push the branch

```bash
git push -u origin <branch-name>
```

### 8. Invoke code-reviewer

Call the `code-reviewer` subagent on the diff. Prompt it with:
- The ticket URL (`https://github.com/swamp-dev/sparks-of-kether/issues/NN`).
- The acceptance criteria from the ticket.
- Any ticket-specific context the reviewer would need.

Surface findings to the user by severity (CRITICAL / SIGNIFICANT / MINOR).
Fix all CRITICAL and SIGNIFICANT findings. Minor findings may be deferred
with a note in the PR body.

If fixes are made, commit them (small, separate commits), push, and
optionally re-run code-reviewer on the diff.

### 9. Open the PR

```bash
gh pr create --title "<conventional-commit title>" --body "<body>"
```

The title follows conventional-commit format:
`<type>(<scope>): <description>`

The body must include:
- **Summary** — 1-paragraph description
- **Changes** — bullet list of key changes
- **Test plan** — checklist of what was verified
- **Journal entry** — the entry written in step 5, as a read-only copy
- **Closes #NN** — on its own line so GitHub auto-links

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
- Journal.md grows, never shrinks or reshuffles.
- User merges; agents do not.
- Hooks and signing are never bypassed.
- If in doubt, ask the user.
