---
name: finish-ticket
description: Close out a Sparks of Kether ticket through PR-open — run the local gate, invoke code-reviewer (and re-review on substantial fixes), append the final push's Journal entry, commit, push, and open a PR with Closes #NN. Use after the functional work on a ticket is done. Journal entries for intermediate pushes are handled as they happen (per docs/workflow.md); this skill handles the final push + PR-open. Stops short of merging — `/ship-ticket` handles step 7 (CI verify + merge + cleanup) once hosted CI is green.
---

# /finish-ticket

Steps 3–6 of the canonical 8-step workflow in [`docs/workflow.md`](../../../docs/workflow.md):
code-review → fix → re-review on substantial fixes → open PR. After this
skill the agent stops; `/ship-ticket <P>` handles the merge once hosted
CI is green.

> **Per-push journaling is the default rule** (see [`docs/workflow.md`](../../../docs/workflow.md)
> § Journal every push). Every `git push` on a feature branch has its
> own entry in `journal/<NN>-<slug>.md`. This skill handles the entry
> for the *final* push that immediately precedes opening the PR.
> Intermediate pushes — e.g. during TDD iteration or while addressing
> review feedback — journal themselves as they happen, not through
> this skill.

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
pnpm typecheck
pnpm lint || (pnpm lint --fix && pnpm lint)
pnpm test
```

`typecheck` and `test` failures stop immediately — surface to the
user. Lint runs once, and on failure the agent retries with
`--fix` before declaring it broken. Standard ESLint autofix only
rewrites mechanically-safe transformations, so the retry is safe.
If lint still fails after `--fix`, stop and report — what's left
is non-autofixable rules that need a human decision (genuine style
or correctness call).

If autofix made changes, surface that in the agent's narration so
the diff doesn't surprise the user later. (Pre-scaffold tickets
skip this step because `package.json` doesn't exist yet; see
`CLAUDE.md` § Test commands.)

### 3. Run CI status check (if a PR is already open for this branch)

```bash
gh pr checks --watch 2>/dev/null || true
```

Skip if there's no PR yet (first time running for this ticket).

### 4. Verify the per-ticket Journal file is current (auto-backfill)

This branch's Journal lives at `journal/<NN>-<slug>.md` (matching the
branch name). Walk through the branch's commit log:

```bash
git log --oneline origin/main..HEAD
git log origin/main..HEAD --format='%H%n%s%n%b%n---%n' --stat
```

Every push that appears there should already have a corresponding
entry in `journal/<NN>-<slug>.md`. If any push is missing an entry,
**auto-backfill** rather than stopping:

- Identify push boundaries from the reflog where possible
  (`git reflog show --date=iso <branch>`); fall back to "one entry
  per commit" when the reflog has been pruned or is ambiguous.
- For each missing push, synthesize an entry from the commit
  subject (Pushed), the leading line of the commit body or the
  conventional-commit type+scope (Why), `none` (Notes), and the
  commit SHA range (Commit(s)). Use the commit's authored timestamp
  in ISO-8601 format for the heading.
- Append the synthesized entries in chronological order, oldest
  first. The file is append-only so this is safe even if the agent
  later adds entries above the live HEAD; the timestamps reflect
  the actual commit order.
- Surface what was backfilled in the agent's narration, with the
  generated entries inline, so the user can interrupt if they look
  wrong.

If the file doesn't exist yet (e.g. branch was created before B2 #429
landed), create it with the header template from
[`journal/README.md`](../../../journal/README.md) before adding the
entries.

This skill only adds the entry for the final (still-unpushed) push
in step 5; backfill in this step covers everything earlier.

### 5. Derive fields for this final push's Journal entry

Generate the entry directly from git state — no interview. The agent
already has all four fields between `git log`, the diff, and the
session's own context.

| Field | Source |
|---|---|
| **Pushed** | Concatenated commit subjects from `git log <last-pushed-sha>..HEAD --format=%s`. If only one commit, use its subject; if many, semicolon-separated. |
| **Why** | Leading line of the most recent commit body, or the conventional-commit `<type>(<scope>): ...` summary if the body is empty. (Note: this step writes the entry for the push that *precedes* code-review. Fix-pushes during the 8/8a re-review loop journal themselves separately under the per-push rule and naturally describe themselves via their own commit messages, e.g. `fix(scope): address review finding X`.) |
| **Notes** | Default `none`. Populate only with things knowable *before* code-review fires (since this entry is written in step 6, before step 8): lint autofix used in step 2, dep change in this push, gate-relevant context from earlier in the session. Post-review events (re-review verdict, deferred-minor count) belong in the fix-push's own entry, written under the per-push rule. |
| **Commit(s)** | `<oldest-sha-short>..<newest-sha-short>` from the same range, or a single short SHA if the range is one commit. |

Print the generated entry inline to the user before appending in
step 6, so the user can interrupt if it looks wrong. Do not block
on a question — proceed unless the user redirects.

### 6. Append to `journal/<NN>-<slug>.md`

Append a new block at the **bottom** of the per-ticket file, using the
current ISO-8601 timestamp with timezone. The date should come from
`date -Iseconds` or equivalent:

```markdown

## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — push N context line

**Pushed:** <field 1>
**Why:** <field 2>
**Notes:** <field 3>
**Commit(s):** `<sha-short>` (or range)
```

Note the heading no longer carries `#NN` — the filename already does.
Never edit or delete past entries — append only.

**Never write to the legacy `Journal.md` at the repo root.** That file
is frozen as of B2 (#429) and exists only as the historical archive.

### 7. Commit the Journal entry + any outstanding work

Stage everything, commit, push. Prefer folding the Journal entry into the
push's main commit when the remaining work is small; otherwise make a
separate `docs(journal): entry for #NN <tag>` commit.

```bash
git add <files>
git commit -m "<type>(<scope>): <short summary> (#NN)"
git push
```

### 8. Invoke code-reviewer (first pass)

Call the `code-reviewer` subagent on the diff. Prompt it with:

- The ticket URL (`https://github.com/swamp-dev/sparks-of-kether/issues/NN`).
- The acceptance criteria from the ticket.
- Any ticket-specific context the reviewer would need.

Surface findings to the user by severity (CRITICAL / SIGNIFICANT / MINOR).
Fix all CRITICAL and SIGNIFICANT findings. Minor findings may be deferred
with a note in the PR body.

Note the commit SHA at the moment of the first review (`git rev-parse HEAD`)
— step 8a uses it to compute "what changed since the first review."

### 8.5. Write the checklist stamp

After code-reviewer returns its verdict, write the stamp directly so
`/ship-ticket` step 3 can verify the review ran in this session:

```bash
branch=$(git branch --show-current)
branch_safe=$(printf '%s' "$branch" | tr -c 'a-zA-Z0-9._-' '_')
head_sha=$(git rev-parse HEAD)
verdict=<ship|fix|block|rework>   # from the reviewer's ## Verdict section
ran_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
main_repo=$(git worktree list --porcelain | awk '/^worktree/{print $2; exit}')
mkdir -p "${main_repo}/.claude/state"
cat > "${main_repo}/.claude/state/checklist-${branch_safe}.json" <<EOF
{
  "branch": "$branch",
  "head_sha": "$head_sha",
  "ran_at": "$ran_at",
  "verdict": "$verdict",
  "written_via": "agent"
}
EOF
```

Verify it was written:

```bash
main_repo=$(git worktree list --porcelain | awk '/^worktree/{print $2; exit}')
jq '{verdict, head_sha, written_via}' "${main_repo}/.claude/state/checklist-${branch_safe}.json"
```

Expected: `verdict` matches what the reviewer returned (`ship`, `fix`,
`block`, or `rework`); `head_sha` matches `git rev-parse HEAD`;
`written_via` is `agent`.

If `verdict` is `unknown`, the reviewer output is missing the
`## Verdict` markdown header — re-run code-reviewer asking for a
clean verdict section.

### 8a. Re-review on substantial fixes

After fixes are committed, decide whether step 5 of the per-PR checklist
fires. Compare the diff between the first-review SHA and current HEAD:

```bash
git diff <first-review-sha>..HEAD --stat
```

**Re-fire `code-reviewer` if any of the following hold:**

- New files were added that weren't in the first review.
- More than 50 net lines added since the first review.
- A new exported symbol was introduced as a fix to a critical or
  significant finding (not as part of a typo / formatting fix).
- The fixes landed in an area the first pass flagged CRITICAL or
  SIGNIFICANT (not just minor lint nits).

**Skip re-review only if all four are false** — i.e. the fixes were
genuinely minor (typo, formatting, comment tweak, single-line guard).
When in doubt, re-review; the cost is small and the safety is real.

Loop steps 8 → 8.5 → 8a until either the reviewer returns no critical/
significant findings or the user explicitly accepts the remaining
findings as deferred-minor. **Each re-review must also re-run step
8.5** — write a fresh stamp — so the stamp captures the latest verdict
at the latest HEAD SHA. The stamp write overwrites the previous file;
nothing extra needed beyond writing it again.

**Record the re-review in the Journal entry for the push that
contained the fixes** — the per-ticket Journal file is the
human-readable audit record of the re-review. (The merge gate is the
stamp at `.claude/state/checklist-<sanitized-branch>.json`, written by
step 8.5; the Journal is no longer consulted by `/ship-ticket`.) A
line like `Notes: re-reviewed after fixes; reviewer returned clean`
is enough.

For every push during 8/8a, follow the per-push Journal rule.

### 8b. File tech-debt issues for deferred minors

Code-reviewer's minor-severity findings often get deferred to the PR
body and then vanish on merge — the closed PR description is nobody's
backlog. This step turns each deferred minor into a tracked
`tech-debt` issue so they don't rot. Runs **before** step 9 so the
spawned issue numbers can be linked in the PR body where they're
durable across the merge.

**Persist the deferred-minors list explicitly before leaving step
8/8a.** Write it to a scratch variable, temp file, or visible chat
block — anything that survives a context summarization between the
reviewer's output and step 8b. Don't rely on the reviewer's text still
being in window.

**First-run label setup** — check whether `tech-debt` and
`priority:low` labels exist; create if missing. Use `--json name`
(the stable interface) not the default tabular output:

```bash
gh label list --limit 200 --json name --jq '.[].name' | grep -qx "tech-debt" \
  || gh label create tech-debt \
    --description "Deferred minor finding from a /finish-ticket review" \
    --color "fbca04"

gh label list --limit 200 --json name --jq '.[].name' | grep -qx "priority:low" \
  || gh label create "priority:low" \
    --description "Backlog: address when convenient, no SLA" \
    --color "cccccc"
```

**Enumerate deferred minors.** From the persisted list, drop anything
actually fixed during step 8/8a (those already shipped in the diff).
What remains are the deferred-minor candidates.

**Cap the auto-file at 5 issues.** A chatty reviewer can produce
double-digit minor findings; auto-filing all of them would spam the
backlog. The cap closes that without reintroducing the per-finding
y/n loop:

- If 5 or fewer candidates remain, file them all as
  `tech-debt` + `priority:low` (next paragraph).
- If more than 5 remain, file the first 5 in reviewer-order and
  list the rest in the PR body's **"Deferred minors (untracked)"**
  section (one bullet per finding, short summary). The `priority:low`
  label keeps tracked items out of the active queue; the PR-body
  list keeps the untracked ones discoverable.

**Auto-file the capped candidates.** No per-finding confirmation. The
filed issues land as `tech-debt` + `priority:low` so they sit in a
backlog bucket the user can sweep later. The `priority:low` label is
the prioritization signal; the cap is the volume signal — together
they address both axes of backlog noise.

**File each issue:**

```bash
gh issue create \
  --label tech-debt \
  --label "priority:low" \
  --title "<short summary derived from the finding>" \
  --body "$(cat <<'BODY'
Deferred from #<N> review (PR #<P>).

<full finding text from code-reviewer, verbatim>

Parent: #<N>.
BODY
)"
```

The title should be ≤ 70 characters and describe the *fix*, not the
finding. Example: code-reviewer says "test using `>= 1` instead of
`=== 1` is unnecessarily lax" → issue title `test(sefirah): tighten
unique-color assertion to === 1`. (The example uses a real prior
finding from this repo for concreteness; agents should keep the
shape — `<scope>: <fix-imperative>` — and adapt to the language of
the actual finding.)

**On `gh issue create` failure** (network blip, auth hiccup, label
race), surface the failure to the user immediately, ask whether to
retry / skip / abort the rest. Capture which issues were filed so
far. A partial run that filed 2 of 5 is fine — note it in the PR
body alongside the others.

Print the filed issue numbers in the agent's narration after the
loop (e.g. "Filed 3 tech-debt follow-ups: #441, #442, #443") so the
user can scan the list at a glance.

Capture each new issue number for step 9 to embed in the PR body.

### 9. Open the PR

```bash
gh pr create --title "<conventional-commit title>" --body "<body>"
```

The title follows conventional-commit format: `<type>(<scope>): <description>`.

The body must include:

- **Summary** — 1-paragraph description.
- **Changes** — bullet list of key changes.
- **Test plan** — checklist of what was verified.
- **Journal entries** — link to `journal/<NN>-<slug>.md` (the source
  of truth) plus a short excerpt of the most recent entry inline as
  context. The full audit trail lives in the per-ticket file; the PR
  body excerpt is for at-a-glance review.
- **Tech-debt follow-ups** (if any from step 8b) — list the spawned
  issue numbers (e.g. `Tech-debt follow-ups: #441, #442`). Issue
  numbers live in the PR body, not in the Journal entry — the journal
  push that mentions this PR pre-dates the tech-debt issues being
  filed and is append-only.
- **Deferred minors (untracked)** (only if step 8b's cap was hit and
  some findings weren't filed) — bulleted summaries of the
  untracked findings. They live in the PR body so they remain
  discoverable on merge even though they didn't earn their own
  issue.
- **Closes #NN** — on its own line so GitHub auto-links.

### 10. Print the PR URL and hand off to /ship-ticket

Print the PR URL for the user. Then **stop** this skill.

Once hosted CI is green, the agent (or user) runs `/ship-ticket <P>`
to merge and clean up. Do not invoke `/ship-ticket` from inside this
skill — the wait for hosted CI is asynchronous and operator-driven.

**Do NOT from inside this skill:**

- Run `gh pr merge` — that's `/ship-ticket`'s job, and only after the
  conditions in `docs/workflow.md` § Self-merge authority hold.
- Force-push.
- Auto-approve the PR.
- Remove the worktree or delete the branch — those happen in
  `/ship-ticket` after merge.

## Invariants

- One ticket = one branch = one PR.
- Every push has a Journal entry; the per-ticket file
  (`journal/<NN>-<slug>.md`) grows, never shrinks. The legacy
  `Journal.md` at the repo root is frozen — never write to it.
- The five-step per-PR checklist runs every time. Step 5 (re-review)
  uses the heuristic in step 8a above. The merge gate is the
  mechanical stamp file at `.claude/state/checklist-<sanitized-branch>.json`
  written by the agent in step 8.5 — `/ship-ticket` refuses to merge
  unless the stamp exists, its `head_sha` matches the live PR HEAD,
  and `verdict` is `ship`. The per-ticket Journal file
  (`journal/<NN>-<slug>.md`) remains the human-readable audit record
  but is no longer the gate.
- Tech-debt follow-up issues (step 8b) are filed automatically with
  `tech-debt` + `priority:low` labels. The `priority:low` label is
  the backlog signal — it keeps these out of the active queue without
  losing the finding.
- Hooks and signing are never bypassed.
- If in doubt, ask the user.
