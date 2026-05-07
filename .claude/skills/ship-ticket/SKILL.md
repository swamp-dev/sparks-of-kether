---
name: ship-ticket
description: Merge a Sparks of Kether PR and clean up — verify the per-PR checklist ran on this PR in this session, confirm hosted CI is green, squash-merge, comment a closeout note on each closed ticket, then remove the worktree and delete the local branch. Use only after `/finish-ticket` has opened a PR for this branch in this session AND hosted CI shows all four jobs green. One PR per invocation; never sweeps multiple PRs.
---

# /ship-ticket

Steps 7–8 of the canonical 8-step workflow in
[`docs/workflow.md`](../../../docs/workflow.md): merge + cleanup. Gates
the merge on the conditions in `docs/workflow.md` § Self-merge authority.

> **One PR per invocation.** This skill takes a single PR number. It
> refuses lists. It never sweeps "all green PRs." This is the explicit
> guardrail against the 2026-04 11-PR autonomous-merge incident
> documented in `~/.dotfiles/.claude/rules/collaboration.md`.

## Preconditions

Before invoking this skill:

- A PR number `<P>` is supplied as an argument (e.g. `/ship-ticket 401`).
  If missing, try resolving from the current branch first:

  ```bash
  current_branch=$(git branch --show-current)
  matches=$(gh pr list --head "$current_branch" --state open --json number -q '.[].number')
  ```

  If exactly one open PR matches, use it. If zero or multiple match,
  stop and ask the user (the agent must not guess between candidates).
  If a list is supplied as an argument, **refuse** — re-run the skill
  once per PR. (Anti-sweep guardrail; see step 1.)
- `/finish-ticket` was run on this PR's branch in this session, and the
  per-PR checklist (review → fix → re-review on substantial fixes)
  completed.
- You can see the corresponding Journal entries on the branch — the
  re-review marker in particular.

If any of these is unclear, **ask the user explicitly**. Do not infer.

## Steps

Follow in order. If a step fails, surface the failure and stop.

### 1. Refuse multiple PRs

If the argument contains more than one PR number (whitespace-separated,
comma-separated, or a range), **stop immediately** with:

> "/ship-ticket takes one PR per invocation. Re-run once per PR."

This is the anti-sweep guardrail. Never bypass it, even if the user
says "merge them all" — ask them to re-run the skill per PR.

### 2. Resolve PR metadata

```bash
gh pr view <P> --json number,title,headRefName,baseRefName,state,mergeable,closingIssuesReferences,url
```

Confirm:

- `state` is `OPEN`.
- `baseRefName` is `main`.
- `mergeable` is `MERGEABLE` (not `CONFLICTING`, not `UNKNOWN`).

If anything else, stop and report.

Capture the branch name (`headRefName`) — it should match
`<type>/<N>-<slug>`. Derive `<N>` and the worktree path
`../sok-<N>-<slug>` for the cleanup steps.

### 3. Verify the per-PR checklist stamp (mechanical gate)

`/finish-ticket` step 8.5 writes a stamp file at
`.claude/state/checklist-<sanitized-branch>.json` via
`scripts/checklist-stamp.mjs` after each `code-reviewer` invocation.
The `PostToolUse:Agent` hook in `.claude/settings.json` writes the
same stamp automatically when the hook is loaded, but the explicit
step is the load-bearing path. **This is the mechanical gate** —
unlike a Journal entry the agent writes itself, the stamp is the
output of running a script with the reviewer's actual response text.

```bash
# Variables: $PR_NUMBER and $headRefName were captured in step 2.
# Sanitize the branch name the same way the script does. Use
# `printf '%s'` (NOT echo) so no trailing newline gets fed into tr —
# `tr -c` would replace the newline with `_` and the resulting
# filename wouldn't match what the script writes.
branch_safe=$(printf '%s' "$headRefName" | tr -c 'a-zA-Z0-9._-' '_')
stamp=".claude/state/checklist-${branch_safe}.json"

if [ ! -f "$stamp" ]; then
  echo "Refusing merge: no checklist stamp at $stamp. Run /finish-ticket (which invokes scripts/checklist-stamp.mjs in step 8.5) for this branch first."
  exit 1
fi

stamp_sha=$(jq -r '.head_sha' "$stamp")
stamp_verdict=$(jq -r '.verdict' "$stamp")

# Capture HEAD_SHA fresh — the gate must validate against the LIVE PR
# HEAD, not a value carried from earlier in the session.
HEAD_SHA=$(gh pr view "$PR_NUMBER" --json headRefOid -q .headRefOid)

if [ "$stamp_sha" != "$HEAD_SHA" ]; then
  echo "Refusing merge: stamp is for SHA $stamp_sha but PR HEAD is $HEAD_SHA. Re-run code-reviewer + step 8.5 on the current commit."
  exit 1
fi
if [ "$stamp_verdict" != "ship" ]; then
  echo "Refusing merge: stamp records verdict='$stamp_verdict' (expected 'ship'). Address findings and re-run reviewer + step 8.5."
  exit 1
fi
```

This gate is **fail-closed**: missing stamp, stale SHA, or non-`ship`
verdict all stop the skill. The script overwrites the stamp on each
invocation, so the re-review loop in `/finish-ticket` step 8a
naturally produces a fresh stamp at the new HEAD.

The per-ticket Journal file (`journal/<NN>-<slug>.md` per #429)
remains the **human-readable audit record** of why the verdict was
what it was — but it's no longer the gate. The stamp file is.

**Adversarial limit**: a determined agent with Write tool access
could forge the stamp file. The mechanical gate is robust against:
- accidental skip ("I forgot to run code-reviewer / step 8.5")
- context compaction ("the reviewer output got summarized away")
- false-positive Journal markers (the prior honor-system pattern)
- bootstrap chicken-and-egg (`/finish-ticket` step 8.5 doesn't
  depend on settings.json being loaded; the script call works
  whether the hook fires or not)

It is NOT robust against an agent intentionally bypassing review.
The gap from "the script ran with reviewer-shaped data" to "the
reviewer actually produced that data" is unavoidable as long as the
agent has Write access and can construct synthetic payloads. The
stamp's `verdict_hash` is recorded for forensic audit but never
validated by the gate; future tooling could add live cross-validation
against the captured reviewer output if needed.

### 4. Confirm hosted CI is green against the current commit

Two pieces matter — the checks pass, and they ran against the commit
about to be merged.

```bash
# Latest commit on the PR's branch as GitHub sees it.
HEAD_SHA=$(gh pr view <P> --json headRefOid -q .headRefOid)

# Checks for that commit, with the SHA they ran against.
gh pr checks <P>
gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" \
  --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion) \(.head_sha)"'
```

**`verify`** and **`detect changes`** must show `status=completed
conclusion=success` AND `head_sha=$HEAD_SHA`. These two always run
regardless of what changed, so they're the load-bearing signal that
the workflow itself ran cleanly.

**`build`**, **`end-to-end (playwright)`**, and **`real-Supabase
integration`** must each show one of:
- `conclusion=success` — the job ran and passed; OR
- `conclusion=skipped` — the `detect changes` job's path filter said
  this job's paths weren't touched by the diff. Skipped-by-filter is
  success-equivalent for the merge gate (the job had nothing to do).

If any of those three jobs is `pending`, `in_progress`, `failure`, or
`cancelled`, stop and report. If any job ran against a different SHA
than `$HEAD_SHA`, stop and report — the latter case means a push
landed after CI ran and the checks are stale; ask the user to wait
for CI to re-run against the new HEAD.

**Refuse `skipped` if `detect changes` is anything other than
`conclusion=success`.** A downstream skip can mean "filter said no"
(legitimate) OR "a needed job failed and this one was
dependency-skipped" (illegitimate) OR "the workflow itself partially
ran due to runner outage." Cross-checking `detect changes` distinguishes
the legitimate case — if `detect changes` is `failure`, `cancelled`,
`skipped`, or didn't run at all, treat any downstream `skipped` as a
failure and stop.

**Never `--admin` merge from this skill** — that path is governed by
the narrow conditions in
`~/.dotfiles/.claude/rules/local-ci-and-admin-merge.md` and remains a
separate, explicit decision the user makes.

### 5. Merge

```bash
gh pr merge <P> --squash --delete-branch
```

Squash + delete-remote-branch matches the project convention. If the
merge errors (race condition, branch protection mismatch), stop and
report — do not retry, do not switch strategies.

### 6. Closeout comment on each linked ticket

For every issue in `closingIssuesReferences` from step 2:

```bash
gh issue comment <N> --body "$(cat <<'EOF'
Shipped in #<P> (<PR title>).

<one-paragraph note: what shipped, anything to watch for, follow-ups>

PR: <PR URL>
EOF
)"
```

The PR's `Closes #N` already changed the issue state — this comment is
the human-readable record so future agents searching the ticket find
the shipping context without having to chase the PR.

Keep the note short. If there's nothing to watch for, say "no follow-ups
expected." If there is, name it specifically.

### 7. Remove worktree and delete local branch

From the **main repo directory** (not the worktree being removed):

```bash
# Step 7a: gate on a real-directory node_modules first.
# /start-ticket symlinks node_modules to the main repo (skips
# pnpm install). If node_modules exists as a real directory instead,
# the agent must have run `pnpm install` inside the worktree at some
# point — per /start-ticket invariants, rare but possible — and the
# install wrote a private directory. User data may be there; the
# human decides. Refuse cleanup so nothing gets clobbered.
if [ -d "../sok-<N>-<slug>/node_modules" ] && [ ! -L "../sok-<N>-<slug>/node_modules" ]; then
  echo "Refusing cleanup: ../sok-<N>-<slug>/node_modules is a real directory, not a symlink. The worktree had a per-worktree pnpm install. Inspect and clean up manually."
  exit 1
fi

# Step 7b: drop the symlink (or dangling symlink) so git stops calling
# it untracked. `-L` tests the link inode, so dangling symlinks are
# also handled correctly. Removing the symlink only unlinks the
# pointer; the shared store in the main repo stays intact. Surface rm
# failures explicitly — a silent rm failure followed by a
# worktree-remove failure makes the actual cause hard to diagnose.
if [ -L "../sok-<N>-<slug>/node_modules" ]; then
  rm "../sok-<N>-<slug>/node_modules" || {
    echo "Failed to remove node_modules symlink at ../sok-<N>-<slug>/node_modules — check permissions / filesystem."
    exit 1
  }
fi

git worktree remove ../sok-<N>-<slug>
git branch -d <type>/<N>-<slug>
```

Never `--force` either `worktree remove` or `branch -d`. If
`git worktree remove` still fails after the symlink unlink (other
untracked or modified files), **stop** and tell the user — they may
have in-flight work the merge didn't pick up. If `git branch -d` fails
(branch not fully merged into main according to local refs), run
`git fetch origin main` first; if it still fails, stop and report.

### 8. Print confirmation and stop

Print:

- `Merged: #<P> — <title>`
- `Closed: #<N1>, #<N2>, ...` (the tickets the PR closed)
- `Cleaned up: worktree ../sok-<N>-<slug>, branch <type>/<N>-<slug>`

Then stop. The session ends here unless the user starts another
ticket.

## Invariants

- **One PR per invocation.** No exceptions. No batch mode.
- Per-PR checklist verified in this session before merge — never
  inferred from CI state alone.
- Hosted CI green (all four jobs) at the merge moment. No `--admin`.
- Squash + delete-remote-branch only. No alternative merge strategies.
- Closeout comment on every closed ticket — `gh issue comment` only;
  never `gh issue close` (the PR's `Closes #N` already does that).
- `git worktree remove` and `git branch -d` only. Never `--force`.
- If anything is unclear, ask the user. The merge is one of the few
  irreversible actions the agent takes — be conservative.
