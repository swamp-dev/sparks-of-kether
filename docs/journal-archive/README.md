# Journal archive

Time-sliced snapshots of older [`Journal.md`](../../Journal.md) entries.

## What lives here

One file per calendar month: `journal-YYYY-MM.md`. Each file is a verbatim
copy of the entries that fell out of `Journal.md`'s rolling 30-day window
when the archive script last ran.

## How files get here

`Journal.md` is append-only and grows ~10-30 lines per push. To keep its
size manageable without losing history, `scripts/archive-journal.mjs`
slices entries older than ~30 days into per-month files in this directory.

Run it manually:

```sh
pnpm archive:journal
```

The script is idempotent — running twice produces no further changes.

## Reading order

Entries within each `journal-YYYY-MM.md` file appear in chronological
order, oldest first. The link list at the top of `Journal.md` orders the
archive files most-recent-first.

## Editing rule

**Do not edit archived files.** The append-only invariant from
[`Journal.md`](../../Journal.md) extends here: archives are a verbatim
record of what was once in `Journal.md`. Git history is the canonical
log; this directory is a presentation-layer convenience.

## Reference

- Ticket: [#300](https://github.com/swamp-dev/sparks-of-kether/issues/300)
- Script: [`scripts/archive-journal.mjs`](../../scripts/archive-journal.mjs)
- Tests: [`scripts/__tests__/archive-journal.test.ts`](../../scripts/__tests__/archive-journal.test.ts)
