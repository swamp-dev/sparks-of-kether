# Ticket workflow

The canonical 8-step process for any change to this repo. **Source of truth.**
`CLAUDE.md`, the global rules under `~/.dotfiles/.claude/rules/`, and the
skills under `.claude/skills/` all reference this doc. If you change the
workflow, change it here first.

---

## The eight steps

| # | Step | Automation |
|---|---|---|
| 1 | Worktree + branch off latest `main`; read the ticket fully | `/start-ticket <N>` |
| 2 | Implement, with TDD where it makes sense | manual |
| 3 | Code review via the `code-reviewer` subagent | `/finish-ticket` |
| 4 | Fix critical and significant findings | manual |
| 5 | Re-review if the fixes were substantial (see heuristic below) | `/finish-ticket` re-fires the reviewer |
| 6 | Open the PR — Conventional-Commit title, `Closes #NN` in body, link to `journal/<NN>-<slug>.md` + short excerpt | `/finish-ticket` |
| 7 | When hosted CI is green, **merge** | `/ship-ticket <P>` |
| 8 | Cleanup — comment closeout note on the ticket(s), remove worktree, delete branch | `/ship-ticket <P>` |

Steps are sequential. No skipping. Step 7 is **gated** — see "Self-merge
authority" below.

---

## Per-PR checklist (mandatory)

Every PR clears this five-step checklist before it ships. This is the
mandatory checklist from `~/.dotfiles/.claude/rules/local-ci-and-admin-merge.md`,
restated here so this doc is self-contained.

1. **Code review** — invoke the `code-reviewer` subagent on the diff.
2. **Address findings** — fix every critical and significant item; defer
   minor items to the PR body.
3. **Run all CI jobs locally** — `pnpm ci:local` mirrors the four
   hosted-CI jobs (verify, build, e2e, integration). All must pass.
4. **Apply fixes** for anything that fails. If a fix touches behaviour
   outside the original review's scope, restart the checklist.
5. **Re-review on low confidence** — if step 4 was non-trivial, run
   `code-reviewer` again before declaring the PR ready.

These five steps run **every time**, regardless of hosted-CI status.
`/finish-ticket` automates steps 1–2 and 5; `pnpm ci:local` is step 3.

### "Substantial fix" heuristic for step 5

`/finish-ticket` re-fires the reviewer automatically if **any** of these
hold for the diff between first review and current state:

- New files added that weren't in the original review.
- More than 50 net lines added since first review.
- Any new exported / publicly-used symbol introduced.
- The fix landed in an area flagged critical or significant by the first
  pass (not just minor lint nits).

If none of these hold, treat the fix as minor and skip re-review.

---

## Self-merge authority

By default in `~/.dotfiles/.claude/rules/collaboration.md`, agents do not
`gh pr merge` — the user merges. **For this project, that default is
relaxed under explicit conditions.** The agent may `gh pr merge` (via
`/ship-ticket`) when **all** of the following hold:

- The agent personally ran the per-PR checklist on **this specific PR**
  in **this session**.
- Hosted CI is green at the merge moment — `gh pr checks <P>` shows
  every job passing, none in-flight, none stale.
- One PR per `/ship-ticket` invocation. The skill refuses a list of PRs.
  The agent never sweeps "all green PRs" or anything resembling the
  2026-04 11-PR autonomous-merge incident.
- The PR's title and body match what `/finish-ticket` produced — no
  silent edits between checklist completion and merge.

If any condition fails, `/ship-ticket` stops and reports. The user
merges manually from there.

**This is not the admin-merge bypass** in
`~/.dotfiles/.claude/rules/local-ci-and-admin-merge.md`. That bypass is
for hosted-CI infrastructure failure and stays a separate, narrower
decision.

---

## Cleanup

After merge, `/ship-ticket` does:

1. For every ticket the PR closes (`gh pr view <P> --json
   closingIssuesReferences`), `gh issue comment <N>` with a one-paragraph
   closeout note: what shipped, anything to watch for, link to PR.
   `Closes #NN` in the PR body has already changed the issue state — the
   comment is just the human-readable record.
2. `git worktree remove ../sok-<N>-<slug>` from the main repo. Never
   `--force` — if the worktree has uncommitted changes, stop and report.
3. `git branch -d <type>/<N>-<slug>` to drop the local branch.

Cleanup runs in the same session as the merge. There is no longer a
"separate session" requirement.

---

## Branches, commits, naming

- **Worktree:** `../sok-<N>-<slug>` (the `sok-` prefix avoids collisions
  with other repos in `~/dev/`).
- **Branch:** `<type>/<N>-<slug>` where `<type>` ∈ `feat`, `fix`, `chore`,
  `refactor`, `test`, `docs`. `<N>` is the ticket number.
- **Commits:** Conventional-Commit format,
  `<type>(<scope>): <short summary>`. For TDD work, separate the failing-
  test commit from the implementation commit.
- **PR title:** Conventional-Commit format. **PR body** must contain
  `Closes #NN` on its own line and link to the per-ticket Journal file
  (`journal/<NN>-<slug>.md`) plus a short excerpt of the most recent
  entry. The per-ticket file stays the source of truth — if you revise,
  edit the file and regenerate the PR body.

---

## Journal every push

Every `git push` on a feature branch — initial, review fixes, doc
tweaks, CI-green attempts — gets **one** entry appended to the bottom
of **this branch's per-ticket file** at
[`../journal/<NN>-<slug>.md`](../journal/README.md). Append-only;
never edit past entries. Write the entry *before* the push so it
lands in the same push.

The per-ticket layout (#429 / B2) replaced the legacy monolithic
`Journal.md` to eliminate the merge-conflict surface where every
concurrent PR fought for the bottom of one file. `Journal.md` at the
repo root is **frozen** — read-only history; never write to it.

`/finish-ticket` handles the entry for the final pre-PR push;
intermediate pushes journal themselves as they happen. `/start-ticket`
should create `journal/<NN>-<slug>.md` with the header template; if
the file is missing on first journal write, the agent creates it
inline using the template in [`../journal/README.md`](../journal/README.md).

`/ship-ticket` reads the per-ticket file as an **audit record** that
the per-PR checklist ran. The Journal is written by the agent itself,
so the marker is a documentation artifact, not a security control —
nothing stops an agent from writing "code-reviewer clean" without
having actually re-run the reviewer. The skill enforces the structural
parts of the gate (one PR per invocation, hosted CI green, mergeable
state, branch matches); the human-judgment part (did the review
actually happen) lives with the agent that ran it. Cutting corners on
the Journal makes that audit record useless to future readers, but the
load-bearing safety is the agent's own discipline.

---

## Where to find what

| Question | File |
|---|---|
| Per-PR checklist (canonical) | `~/.dotfiles/.claude/rules/local-ci-and-admin-merge.md` |
| Default merge authority across projects | `~/.dotfiles/.claude/rules/collaboration.md` |
| Generic 9-step end-to-end process | `~/.dotfiles/.claude/rules/end-to-end-process.md` |
| TDD patterns, bug-fix process | `~/.dotfiles/.claude/rules/development-workflow.md` |
| This project's stack, naming, test commands | [`../CLAUDE.md`](../CLAUDE.md) |
| Game design (rules) | [`../design/`](../design/) |
| Symbolic reference data | [`../reference/`](../reference/) |
| Build log (current per-ticket entries) | [`../journal/`](../journal/README.md) |
| Build log (legacy / pre-#429 history) | [`../Journal.md`](../Journal.md) |

---

## One last thing

If you're an agent and the workflow seems to want you to do something
risky — sweep multiple PRs, force-push, bypass the checklist — **stop
and ask the user**. The conditions in this doc are deliberately tight;
when in doubt, default to the more conservative read.
