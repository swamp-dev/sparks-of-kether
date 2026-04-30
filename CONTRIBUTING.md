# Contributing to Sparks of Kether

Thanks for stopping by. Sparks of Kether is a cooperative web game — a
journey up the Kabbalistic Tree of Life with real-time multiplayer. See
[README.md](README.md) for the pitch and [`design/`](design/) for the rules.

## Quick start

```bash
git clone git@github.com:swamp-dev/sparks-of-kether.git
cd sparks-of-kether
pnpm install     # also installs a git pre-push hook via the `prepare` script
pnpm dev
```

Open http://localhost:3000.

## How to contribute

1. Browse [open issues](https://github.com/swamp-dev/sparks-of-kether/issues)
   or the [Epic tracking issue](https://github.com/swamp-dev/sparks-of-kether/issues/1).
2. Comment on a ticket to claim it (avoids duplicated work).
3. Fork the repo (external contributors) or create a branch (maintainers).
4. Follow the workflow in [`CLAUDE.md`](CLAUDE.md) (read it once before
   your first PR) — worktree off `main`, TDD where it makes sense, green
   `pnpm ci:local`, code review, PR with `Closes #NN`.
5. Open a PR. The maintainer merges.

## Local CI

Run the full CI suite locally before review and again before merge:

```bash
pnpm ci:local         # full: typecheck + lint + test:coverage + build + e2e + integration
pnpm ci:local:fast    # verify + build only (the pre-push hook runs this automatically)
```

`pnpm ci:local` mirrors every job in `.github/workflows/ci.yml`. The git
pre-push hook (auto-installed by `pnpm install` via
`scripts/install-git-hooks.mjs`) runs the fast variant on every push so
obvious failures never reach GitHub. [`CLAUDE.md`](CLAUDE.md) carries the
operational details of the per-PR checklist and the conditions under
which an admin merge bypassing hosted CI is allowed.

## Doc drift-checks

Two vitest specs guard against documentation rotting away from the code
it cites:

- [`tests/docs/anchors.test.ts`](tests/docs/anchors.test.ts) — opt-in
  `<!-- code-ref: path/to/file.ts:symbolName -->` HTML-comment anchors
  that resolve to a real file and a real top-level export. Use these
  when documenting a load-bearing claim about a specific file or symbol;
  a future rename then fails CI instead of silently rotting the doc.
- [`tests/docs/links.test.ts`](tests/docs/links.test.ts) — every relative
  Markdown link `[text](path)` and image `![alt](path)` must resolve
  to a file or directory in the repo.

Both run as part of `pnpm test`. No setup required.

## Marketing assets

Screenshots used by the README hero and gallery live in
[`assets/marketing/`](assets/marketing/), curated from the visual
regression baselines under `e2e/visual-regression.spec.ts-snapshots/`.
See [`assets/marketing/README.md`](assets/marketing/README.md) for the
index, the size budget, and how to refresh the pack after a baseline
update.

For a visual index of every screen in the app — public routes, dev
tooling, and component demos — see [`docs/screens.md`](docs/screens.md).

## Code of conduct

Be kind. This is a hobby project about unity and lovingkindness — act like it.

## Questions?

Open a discussion or comment on the Epic issue.
