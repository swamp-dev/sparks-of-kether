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
- Anything in the ticket that looks ambiguous or under-specified —
  state the best-interpretation the agent will proceed with.

Then continue straight to step 3. The read-back is the safety
mechanism; the user can interrupt streaming output if anything
looks wrong. No explicit "Ready?" prompt — that gate added friction
without buying safety.

### 3. Derive `<type>` and `<slug>`

`<type>` from the ticket's labels:

- `feat` if labelled `feature` / `enhancement` / nothing-but-feature-shaped.
- `fix` if labelled `bug` / `fix`.
- `chore` for tooling / infra / deps.
- `refactor`, `test`, `docs` mirror the label.

If the labels are ambiguous (multiple of the above match), pick
deterministically using this priority order — most-specific wins:

```
fix > chore > refactor > test > docs > feat
```

E.g. a ticket labelled both `bug` and `enhancement` becomes `fix`.
A ticket with no recognized label defaults to `feat`. State the
chosen prefix in the agent's narration so the user can interrupt
if it's wrong; do not block on a question.

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

### 6a. Symlink `node_modules` from the main repo

**Run from the main repo directory** (the same cwd step 6 ran from —
the parent of the new worktree). The relative path in `ln -s` is
resolved from the link's location, not from cwd, but the command
itself must be run somewhere `../sparks-of-kether/node_modules` and
`../sok-<N>-<slug>/` are sibling-resolvable from the parent. Running
this from inside the worktree creates a self-referential broken link.

```bash
ln -s ../sparks-of-kether/node_modules ../sok-<N>-<slug>/node_modules
```

Skips the 30–90s `pnpm install` penalty on every fresh worktree —
worktrees share the same `package.json` and `pnpm-lock.yaml` with the
branch's HEAD, so the resolved `node_modules` is bit-identical between
the main repo and any branch off `origin/main`. The symlink resolves
to the same content-addressable pnpm store either way.

**Stop conditions** — handle each before invoking `ln -s`:

- `../sparks-of-kether/node_modules` doesn't exist → stop, tell the
  user to run `pnpm install` in the main repo first, then re-invoke
  `/start-ticket`.
- `../sok-<N>-<slug>/node_modules` already exists as a symlink
  pointing at the right place → no-op, log "node_modules already
  symlinked", continue.
- `../sok-<N>-<slug>/node_modules` exists as anything else (regular
  dir, file, dangling symlink) → stop and report. Re-invocations after
  partial failure should fail loudly, not silently corrupt state.

**⚠️ Warning — `pnpm install` inside the worktree mutates the MAIN
repo's `node_modules`.** The symlink is followed; the underlying
directory is shared. If the agent runs `pnpm install` from inside a
worktree (e.g. to update deps for a ticket that touches
`package.json`), the install writes through to the shared store and
every other worktree's deps update too. This is intentional — dep
changes propagate — but it's the opposite of what most developers
expect from a per-worktree directory. Surface this in the Journal if
the agent does it.

### 6b. Create the per-ticket Journal file

Per the convention codified in #429 (B2), each branch has its own
Journal file at `journal/<NN>-<slug>.md`. Create it now with the
header template so `/finish-ticket` and intermediate-push journaling
have a destination from the first push:

```bash
cat > ../sok-<N>-<slug>/journal/<N>-<slug>.md <<EOF
# Journal — #<N>: <ticket title>

Append-only. Never edit or delete past entries. One entry per \`git push\`
on this branch.

---
EOF
```

Use the ticket's title from step 1 in the header. Stop and report if
the file already exists (would mean a stale leftover from a prior
incomplete worktree setup).

See [`journal/README.md`](../../../journal/README.md) for the entry
template and the per-ticket-vs-legacy-`Journal.md` rule.

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
- Branch type is derived deterministically from labels (priority order
  in step 3); ambiguity is resolved by the priority, not by asking.
- Never modify the ticket body, state, or labels.
- Never branch from anything except `origin/main`.
- One ticket = one worktree = one branch.
- The `node_modules` symlink is intentional shared state — follow-the-
  symlink semantics mean `pnpm install` from inside a worktree mutates
  the shared store. If the agent needs per-worktree dependency
  isolation (rare — only for testing dep upgrades against a specific
  branch), it must `rm node_modules` (which removes the symlink only,
  **not** the shared target — never `rm -rf` here) and then
  `pnpm install` to populate a private directory, and document that
  drift in the Journal.
