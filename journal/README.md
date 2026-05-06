# Journal — per-ticket entries

Every push on a feature branch gets one entry, appended at the bottom of
**that ticket's file**. One file per ticket, named to match the branch:

```
journal/<NN>-<slug>.md
```

For branch `feat/427-finish-ticket-tech-debt-issues`, the file is
`journal/427-finish-ticket-tech-debt-issues.md`. Same `<NN>-<slug>`
identifier `/start-ticket` uses for the worktree path.

## Why per-ticket files?

Before B2 (#429) the project used a single monolithic `Journal.md`.
Append-only file plus N concurrent PRs each writing to the bottom = a
guaranteed merge conflict on every overlapping rebase. Hit twice in
one session during PR #419 and again during PRs #431 and #433 — the
pattern was unambiguous.

Per-ticket files eliminate the conflict surface entirely: two
concurrent PRs write to two different files. Merges trivially clean.

## File template

Each ticket file starts with a one-line header and a short context
block. New entries get appended below.

```markdown
# Journal — #NN: <Short ticket title>

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — push 1 context line

**Pushed:** what this push contains (bullet or short paragraph).
**Why:** motivation (e.g. "draft 1", "review fixes for X", "CI green").
**Notes:** anything worth remembering for future agents. "None" is fine.
**Commit(s):** `<sha-short>` (or a range: `<sha1>..<shaN>`)

## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — push 2 context line

...
```

**Tone:** terse, honest, useful. Not marketing. If a push went smoothly,
"Notes: none" is fine. If something was painful, say so — future agents
will thank you.

## Filename rules

- **`<NN>` is the ticket number** — leading zeros are not used (`427`,
  not `0427`).
- **`<slug>` matches the branch slug** — lowercase, hyphenated, ≤ 5
  words, drop articles. Same shape as the worktree directory name.
- **Retroactive / unscoped entries** (rare — work without a ticket):
  `_unscoped-<YYYY-MM-DDTHHMMSS>.md`. Leading underscore so they sort
  separately.

## Where the workflow writes

- **`/start-ticket`** creates the file with the header + first push
  placeholder when it sets up the branch. (Or the agent writes it on
  first push if `/start-ticket` was run before B2 landed.)
- **`/finish-ticket`** appends the final pre-PR push's entry; reminds
  the agent to journal intermediate pushes as they happen.
- **`/ship-ticket`** reads the file to verify the per-PR checklist
  marker before merging — looks for `code-reviewer clean` or the
  re-review marker in a recent entry. After merge, the file moves
  with the PR's history (no special action needed).

## What about old `Journal.md`?

The legacy `Journal.md` at the repo root is **frozen** for new entries
as of B2's merge. It stays in place as the historical archive (5400+
lines of project history; no need to migrate). A planned follow-up
(tech-debt) will eventually move it to `docs/journal-archive/` and
update `scripts/archive-journal.mjs` to walk per-ticket files. Until
then, agents read the past from `Journal.md` and write the future to
`journal/<NN>-<slug>.md`.

## Archival

`scripts/archive-journal.mjs` continues to slice old entries from the
legacy `Journal.md` into `docs/journal-archive/journal-YYYY-MM.md` per
the existing 30-day cutoff rule. Per-ticket files don't yet have an
archival path — that's part of the deferred follow-up. They accumulate
under `journal/` for now; the recent-enough ones provide context, the
oldest will eventually fold into the monthly archive.
