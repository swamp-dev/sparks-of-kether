# CLAUDE.md

Canonical operational rules for any Claude agent working in this repo. This
file is auto-loaded at the start of every Claude session in `sparks-of-kether/`.

Read it before doing anything else. If you are not sure whether a rule applies,
default to the more conservative interpretation and surface the question to
the user.

---

## Project snapshot

**Sparks of Kether** is a cooperative real-time multiplayer web game — an
ascent up the Kabbalistic Tree of Life. The design/rules are locked in
`design/`; the symbolic data is in `reference/`; the implementation lives in
this repo.

- Rules: [`design/mechanics.md`](design/mechanics.md), [`design/shells.md`](design/shells.md)
- Reference data: [`reference/`](reference/) (sefirot, paths, arcana, letters, correspondences)
- Long-form ideation archive: [`KabballahGame.md`](KabballahGame.md) (historical only; do not treat as spec)
- Build log: [`journal/<NN>-<slug>.md`](journal/README.md) — per-ticket files, append-only, one entry per push. Legacy archive at [`Journal.md`](Journal.md) (frozen as of #429).

---

## Stack

| Area | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript strict mode |
| Package manager | pnpm |
| Node | 20 LTS |
| Styling | Tailwind + per-Sefirah color tokens (typography: [`docs/typography.md`](docs/typography.md); motion & atmosphere: [`docs/motion.md`](docs/motion.md)) |
| Client state | Zustand |
| Backend | Supabase (Postgres + Realtime + anonymous auth) |
| Testing | Vitest + React Testing Library + Playwright |
| Deploy | Vercel (preview per PR) |

If a ticket wants to change one of these, the Epic (issue #1) must be
**updated** first — a comment is not sufficient. Do not drift silently.

---

## Working agreement

The canonical 8-step workflow lives in [`docs/workflow.md`](docs/workflow.md).
Read it before starting any ticket.

In summary: `/start-ticket <N>` (worktree + branch + read ticket) →
implement with TDD where it makes sense → `/finish-ticket` (code-review,
fix, re-review on substantial fixes, final-push Journal entry, push,
open PR; intermediate-push Journal entries happen as those pushes
happen, not via this skill) → wait for hosted CI green → `/ship-ticket <P>`
(merge + cleanup, **one PR per invocation**).

The five-step per-PR checklist (review → address → run all CI locally
→ fix → re-review on low confidence) is mandatory and lives in
`~/.dotfiles/.claude/rules/local-ci-and-admin-merge.md`.

Self-merge authority for this project is conditional — `/ship-ticket`
gates it on the per-PR checklist running in the same session AND
hosted CI green for that specific PR. See `docs/workflow.md` § Self-merge
authority for the exact conditions, and `~/.dotfiles/.claude/rules/collaboration.md`
for the cross-project default ("user always merges") this relaxes.

---

## Do NOT

These are tripwires. If you find yourself about to do one, stop and ask.

- **Never `gh pr merge` outside the conditions in [`docs/workflow.md`](docs/workflow.md) § Self-merge authority.** The conditions are tight: per-PR checklist run on this specific PR in this session AND hosted CI green at the merge moment AND one PR per `/ship-ticket` invocation. Never sweep multiple PRs in a single shot. Outside those conditions, the user merges.
- **Never skip hooks** (`--no-verify`, `--no-gpg-sign`). If a hook fails, fix the underlying issue.
- **Never force-push** to `main` or any shared branch.
- **Never amend a pushed commit.** Create a new commit instead.
- **Never commit secrets.** `.env*` is gitignored; keep it that way. Same for any API keys, tokens, or credentials.
- **Never run destructive commands** (`git reset --hard`, `git clean -fd`, `rm -rf`, `git worktree remove --force`, branch delete) without explicit authorization for that specific action in the current session.
- **Never change stack choices** (framework, DB, test runner) without the Epic being updated first.
- **Never write files outside the repo** unless the ticket explicitly calls for it (e.g. `/tmp/` scripts).
- **Never** use the traditional named Qliphothic intelligences. Shells are referred to descriptively only (`Shell of Chesed`, `Shadow of Hod`). See `design/shells.md`.
- **Never** treat `KabballahGame.md` as authoritative. It is the ideation archive, preserved for history. The source of truth is `design/` and `reference/`.
- **Never** bump pnpm in `package.json` without also updating `.github/workflows/ci.yml` in the **same commit**. The `packageManager` field and the workflow's `pnpm/action-setup` version are both sources of truth — they must move together. Drift silently breaks CI.

---

## Naming conventions

| Kind | Convention | Example |
|---|---|---|
| Files | kebab-case | `user-service.ts` |
| React components | PascalCase | `TreeBoard.tsx` |
| Test files | `.test.ts` / `.test.tsx` suffix | `movement.test.ts` |
| Classes / interfaces / types | PascalCase | `GameState` |
| Functions / variables | camelCase | `canTravelPath` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PLAYERS` |
| Directories | kebab-case | `user-management/` |
| Branches | `<type>/<ticket-num>-<slug>` | `feat/11-movement-engine` |

TypeScript strict; no `any`; no `@ts-ignore`. If you reach for one of those,
the problem is upstream — fix it there.

---

## Test commands

```bash
pnpm install            # one-time
pnpm dev                # run the Next.js dev server
pnpm build              # production build (mirrors CI build job)
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm test               # vitest run
pnpm test:watch         # vitest watch
pnpm test:coverage      # vitest run --coverage (mirrors CI verify)
pnpm test:integration   # real-Supabase via local stack (mirrors CI integration)
pnpm e2e                # playwright test (mirrors CI e2e)
pnpm e2e:screenshots    # capture-only screenshots spec
pnpm screenshots        # multi-viewport review captures (PLAYWRIGHT_RUN_REVIEW=1)
pnpm mutation           # stryker mutation testing pilot
pnpm format             # prettier --write
pnpm format:check       # prettier --check (no fixing)

# Opt-in aggregates that mirror the full hosted-CI workflow locally:
pnpm ci:local           # verify + build + e2e + integration. Fail-fast.
pnpm ci:local:fast      # verify + build only.
```

Hosted CI is the merge gate — the four-job matrix in
`.github/workflows/ci.yml` (verify, build, e2e, real-Supabase
integration) runs on every PR to `main` and that green check is the
source of truth. `pnpm ci:local` mirrors all four locally for opt-in
sanity-checking before you push, but is no longer auto-run.

Skip flags for `ci:local` (local-iteration escape hatches, never set
on the definitive pre-merge run):

```bash
SKIP_E2E=1 pnpm ci:local           # skip Playwright
SKIP_INTEGRATION=1 pnpm ci:local   # skip Supabase boot
```

<!-- code-ref: package.json -->
<!-- code-ref: scripts/ci-local.sh -->

---

## Where to look

| Question | File |
|---|---|
| What are the rules of the game? | `design/mechanics.md` |
| How do Shells work? | `design/shells.md` |
| What are the 10 Sefirot? | `reference/sefirot.md` |
| What are the 22 paths? | `reference/paths.md` |
| What do the Hebrew letters mean? | `reference/hebrew-letters.md` |
| What do the Tarot cards correspond to? | `reference/arcana.md` |
| How do the symbolic systems cross-index? | `reference/correspondences.md` |
| What does each screen look like? | `docs/screens.md` |
| How does typography work (display / body / Hebrew)? | `docs/typography.md` |
| How do motion tokens / glow scale / atmosphere layers work? | `docs/motion.md` |
| What was built, by whom, what surprised them? | `journal/<NN>-<slug>.md` per ticket (current convention, post-#429) + `Journal.md` (legacy / frozen) + `docs/journal-archive/` (older months, sliced by `pnpm archive:journal` from the legacy file) |
| What work is queued? | GitHub issues (milestone: _MVP: Playable web version_) |
| What's the master plan? | Epic issue #1 |

---

## One last thing

If a ticket says to read a file, **read it fully** before writing code.
If a ticket is ambiguous, **ask the user** rather than guess. The design
docs are the source of truth; the ticket is the execution scope; this
file is the rules of the road.
