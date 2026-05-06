---
name: start-ticket
description: Begin a Sparks of Kether ticket end-to-end — read the ticket fully, confirm acceptance criteria with the user, fetch the latest main, and create a fresh worktree + branch with the standard sok-/<type>-/ naming. Use at the very beginning of every ticket. Stops short of writing code; the agent then begins TDD work in the new worktree.
---

# /start-ticket

Step 1 of the canonical 8-step workflow in [`docs/workflow.md`](../../../docs/workflow.md).
Codifies the ticket-bootstrap routine so worktrees and branches are
named consistently and acceptance criteria are read out loud before any
code lands.

## Preconditions

- You're invoked from the **main repo directory** (not from another
  worktree). If `git rev-parse --show-toplevel` doesn't end in
  `/sparks-of-kether`, stop and tell the user.
- A ticket number is supplied as an argument (e.g. `/start-ticket 401`).
  If missing, ask the user.

## Steps

Follow in order. If a step fails, surface the failure to the user
before proceeding.

### 1. Read the ticket

```bash
gh issue view <N> --json number,title,labels,body,state
```

Read the body fully. If the ticket references files in `design/`,
`reference/`, `docs/`, or links other issues, **read those too** before
moving on. The point is to be able to name the acceptance criteria
without re-reading.

### 2. Confirm acceptance criteria

Print back to the user:

- Ticket title.
- Acceptance criteria (the bullets the ticket lists, verbatim).
- Anything in the ticket that looks ambiguous or under-specified.

Ask: "Ready to start?" If the user says no, stop. If they want to
clarify, address the clarification before creating the worktree —
worktrees are cheap to make but a wasted one is friction.

### 3. Derive `<type>` and `<slug>`

`<type>` from the ticket's labels:

- `feat` if labelled `feature` / `enhancement` / nothing-but-feature-shaped.
- `fix` if labelled `bug` / `fix`.
- `chore` for tooling / infra / deps.
- `refactor`, `test`, `docs` mirror the label.

If the labels are ambiguous (e.g. multiple of the above), **ask the
user** which prefix to use. Do not guess.

`<slug>` from the title: lowercase, hyphenated, ≤ 5 words, drop
articles. Example: `"Add per-Sefirah avatar copy"` → `add-per-sefirah-avatar-copy`.

### 4. Fetch latest main

```bash
git fetch origin main
```

Always against `origin/main`. Do not branch from a stale local `main`.

### 5. Refuse to overwrite an existing worktree

```bash
git worktree list
```

If `../sok-<N>-<slug>` already exists, **stop** and tell the user. Do
not `--force`. Either the user wants to keep working there (and ran the
skill by mistake) or there's a stale worktree to clean up first.

### 6. Create the worktree

```bash
git worktree add ../sok-<N>-<slug> -b <type>/<N>-<slug> origin/main
```

If the branch name already exists locally or on origin, **stop** —
ticket numbers should be one-to-one with branches.

### 7. Print next steps

Tell the user:

- The worktree path (`../sok-<N>-<slug>`).
- The branch name (`<type>/<N>-<slug>`).
- A reminder: `cd` into the worktree before making changes.
- Whether TDD applies (engine logic / reducers / pure functions = yes;
  pure UI = the agent decides).

Then **stop**. Do not start writing code in the same skill invocation.

## Invariants

- Never overwrite an existing worktree (`git worktree add --force` is
  forbidden).
- Never pick a branch type without explicit confirmation when labels
  are ambiguous.
- Never modify the ticket body, state, or labels.
- Never branch from anything except `origin/main`.
- One ticket = one worktree = one branch.
