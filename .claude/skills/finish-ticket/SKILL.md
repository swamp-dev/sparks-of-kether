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

### 4. Verify the per-ticket Journal file is current

This branch's Journal lives at `journal/<NN>-<slug>.md` (matching the
branch name). Walk backwards through the branch's commit log:

```bash
git log --oneline origin/main..HEAD
```

Every push that appears there should already have a corresponding entry
in `journal/<NN>-<slug>.md`. If any push is missing an entry, **stop**
and tell the user — append the missing entries first, then resume.

If the file doesn't exist yet (e.g. branch was created before B2 #429
landed), create it with the header template from
[`journal/README.md`](../../../journal/README.md) before adding the
entry.

This skill only adds the entry for the final (still-unpushed) push.

### 5. Gather fields for this final push's Journal entry

Ask the user four questions:

1. **What does this final push contain?** (short summary of commits)
2. **Why this push?** (e.g. "final code-reviewer fixes", "last doc tweaks")
3. **Any notes for future agents?** ("none" is fine)
4. **Which commit(s)?** (the agent can compute this from `git log`, but
   confirm with the user if ambiguous)

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

The `PostToolUse:Agent` hook in `.claude/settings.json` ALSO writes
the stamp automatically when settings.json is loaded at session
start, but the explicit invocation here is the **load-bearing path** —
it doesn't depend on hook config being loaded. Belt-and-suspenders.
The hook is the redundant safety net; this step is the gate.

Save the reviewer's full markdown response to a temp file (use the
Write tool — the agent already has the response in context), then
invoke the script:

```bash
sha=$(git rev-parse --short HEAD)
out=/tmp/checklist-reviewer-${sha}.md
# Write tool saves the reviewer's full response to $out, then:
node scripts/checklist-stamp.mjs --reviewer-output "$out"
rm "$out"
```

The script reads the file, parses the verdict from the `## Verdict`
markdown header, and writes
`.claude/state/checklist-<sanitized-branch>.json` with `{ branch,
head_sha, ran_at, verdict, verdict_hash, written_via }`.

**Verify the stamp was written and the verdict is what you expect**
before continuing:

```bash
jq '{verdict, head_sha, written_via}' .claude/state/checklist-*.json
```

Expected: `verdict` matches what the reviewer returned (`ship`, `fix`,
`block`, or `rework`); `head_sha` matches current HEAD;
`written_via` is `explicit`. If `verdict` is `unknown`, the reviewer
output is missing the `## Verdict` markdown header (truncation /
unusual format) — re-run code-reviewer asking for a clean verdict
section before continuing. If anything else looks off, surface to
the user — `/ship-ticket` will refuse without a fresh, valid stamp.

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
8.5** — the stamp script — so the stamp captures the latest verdict
at the latest HEAD SHA. The script overwrites the stamp on each
invocation; nothing extra needed beyond running it again.

**Record the re-review in the Journal entry for the push that
contained the fixes** — `/ship-ticket` reads `journal/<NN>-<slug>.md`
to verify the per-PR checklist actually ran. A line like
`Notes: re-reviewed after fixes; reviewer returned clean` is enough.

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

**First-run label setup** — check whether the `tech-debt` label
exists; create if missing. Use `--json name` (the stable interface)
not the default tabular output:

```bash
gh label list --limit 200 --json name --jq '.[].name' | grep -qx "tech-debt" \
  || gh label create tech-debt \
    --description "Deferred minor finding from a /finish-ticket review" \
    --color "fbca04"
```

**Enumerate deferred minors.** From the persisted list, drop anything
actually fixed during step 8/8a (those already shipped in the diff).
What remains are the deferred-minor candidates.

**Confirm one-by-one with the user.** For each candidate:

```
Open tech-debt issue for: "<short summary>"?
Body would link parent: #<N> (this PR's ticket).
[y / n / skip-rest]
```

- `y` → file the issue (next step).
- `n` → don't file this one; note it for the "Considered but not
  tracked" PR-body section; continue to the next.
- `skip-rest` → don't file any remaining; note all skipped for the
  PR-body section; continue to step 9.

**Per-finding confirmation is required.** Bulk-file mode is rejected
explicitly — chatty reviewers would otherwise spam the backlog with
nice-to-haves no one asked to track.

**File each confirmed issue:**

```bash
gh issue create \
  --label tech-debt \
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
- **Considered but not tracked** (if any `n` / `skip-rest` from
  step 8b) — list the deferred-minor summaries the user chose not to
  file. So the record exists somewhere even if it didn't earn a
  ticket.
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
  uses the heuristic in step 8a above — `/ship-ticket` will refuse to
  merge a PR whose per-ticket Journal file does not show the checklist
  completing.
- Tech-debt follow-up issues (step 8b) are filed **per finding with
  explicit user confirmation**. Bulk-file mode is forbidden — the
  failure mode is backlog spam from chatty reviewer runs.
- Hooks and signing are never bypassed.
- If in doubt, ask the user.
