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
- Build log: [`Journal.md`](Journal.md) — append-only, updated at ticket closeout

---

## Stack

| Area | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript strict mode |
| Package manager | pnpm |
| Node | 20 LTS |
| Styling | Tailwind + per-Sefirah color tokens |
| Client state | Zustand |
| Backend | Supabase (Postgres + Realtime + anonymous auth) |
| Testing | Vitest + React Testing Library + Playwright |
| Deploy | Vercel (preview per PR) |

If a ticket wants to change one of these, the Epic (issue #1) must be
**updated** first — a comment is not sufficient. Do not drift silently.

---

## Working agreement

Every ticket follows this loop. There are no shortcuts.

1. **Read the ticket.** Then read the linked sections of `design/` and
   `reference/`. Do not begin coding until you can name the acceptance
   criteria out loud.
2. **Create a worktree** off the latest `main`:
   ```bash
   git fetch origin main
   # Worktree dir uses an sok- prefix to avoid collisions with other
   # repos in ~/dev/. Branch uses the type prefix; ticket number links
   # directory and branch together for easy cleanup.
   git worktree add ../sok-<N>-<slug> -b <type>/<N>-<slug> origin/main
   cd ../sok-<N>-<slug>
   ```
   Branch prefix follows the ticket type: `feat/`, `fix/`, `chore/`,
   `refactor/`, `test/`, `docs/`. `<N>` is the ticket number.
3. **TDD when it makes sense.** Engine logic, reducers, pure functions,
   game-rule edge cases — write the failing test first. UI is fine to
   test after implementation where writing the test first would mean
   mocking too much.
4. **Small, focused commits.** Conventional-commit format:
   `<type>(<scope>): <short summary>`. For TDD work, separate the failing
   test commit from the implementation commit so the history tells the
   story. For non-TDD work (most UI, docs), one commit per logical unit
   is fine.
5. **Local CI must be green** before review (and again after any
   review-driven fix, before merge). The canonical command is:
   ```bash
   pnpm ci:local         # full: verify + build + e2e + integration
   pnpm ci:local:fast    # verify + build only (used by the pre-push hook)
   ```
   For dev iteration `pnpm typecheck && pnpm lint && pnpm test` is fine.
   `pnpm ci:local` mirrors every job in `.github/workflows/ci.yml`
   exactly; pushing without it green is the move that gets caught later
   by hosted CI (when it works) or by the per-PR checklist (always).
   See `~/.claude/rules/local-ci-and-admin-merge.md` for the full
   per-PR checklist and the narrow conditions under which an admin
   merge bypassing hosted CI is allowed.

   A native git pre-push hook is auto-installed by `pnpm install`
   (via `scripts/install-git-hooks.mjs` from the `prepare` lifecycle
   script). It runs `pnpm ci:local:fast` on every push so obvious
   failures never reach GitHub.
6. **Code review before PR.** Invoke the `code-reviewer` subagent on the
   diff. Fix all critical and significant findings. Minor findings can
   be deferred (note them in the PR description).
7. **Journal every push.** Every single `git push` on the branch —
   initial, review fixes, doc tweaks, CI-green attempts — gets **one**
   entry appended to the bottom of [`Journal.md`](Journal.md). Write the
   entry *before* the push so it lands in the same push. Never edit past
   entries — append only.

   Required format (full template at top of `Journal.md`):

   ```markdown
   ## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — #NN: Short context line

   **Pushed:** what this push contains.
   **Why:** motivation (e.g. "draft 1", "review fixes for X").
   **Notes:** anything worth remembering; "None" is fine.
   **Commit(s):** `<sha-short>`
   ```

   Commit the Journal update alongside the rest of the push. Suggested
   commit name: `docs(journal): entry for #NN <short tag>`. For tiny
   pushes, fold the Journal entry into the main commit.
8. **Open the PR** with title in conventional-commit format and
   `Closes #NN` in the body. Copy the Journal entry from `Journal.md`
   into the PR body as a read-only reference. **If you need to revise,
   edit `Journal.md` and regenerate the PR body** — `Journal.md` is the
   source of truth.
9. **Stop.** The user merges on their own schedule. Agents do not
   `gh pr merge`. Your session on this ticket ends here.
10. **In a separate session, after the user says the PR was merged**,
    clean up:
    ```bash
    git worktree remove ../sok-<N>-<slug>
    git branch -d <type>/<N>-<slug>
    ```
    Do not wait around in the same session for the merge — leave.

---

## Do NOT

These are tripwires. If you find yourself about to do one, stop and ask.

- **Never `gh pr merge`.** The user merges. Not you. Not ever unless explicitly authorized in the current session for a specific PR.
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
pnpm install            # one-time. Also installs the pre-push git
                        # hook via the `prepare` lifecycle script.
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

# Aggregates that mirror the full CI workflow locally:
pnpm ci:local           # verify + build + e2e + integration. Fail-fast.
pnpm ci:local:fast      # verify + build only. Run by the pre-push hook.
```

CI runs the four jobs in `.github/workflows/ci.yml` (verify, build,
e2e, real-Supabase integration) on every PR to `main`. The `pnpm
ci:local` aggregate mirrors all four — running it locally before a
merge is mandatory per `~/.claude/rules/local-ci-and-admin-merge.md`.

Skip flags for `ci:local` (use sparingly, never on the actual
PR-merge run):

```bash
SKIP_E2E=1 pnpm ci:local           # skip Playwright (saves ~15s)
SKIP_INTEGRATION=1 pnpm ci:local   # skip Supabase boot (saves ~70s)
```

<!-- code-ref: package.json -->
<!-- code-ref: scripts/ci-local.sh -->
<!-- code-ref: scripts/install-git-hooks.mjs -->
<!-- code-ref: .githooks/pre-push -->

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
| What was built, by whom, what surprised them? | `Journal.md` |
| What work is queued? | GitHub issues (milestone: _MVP: Playable web version_) |
| What's the master plan? | Epic issue #1 |

---

## One last thing

If a ticket says to read a file, **read it fully** before writing code.
If a ticket is ambiguous, **ask the user** rather than guess. The design
docs are the source of truth; the ticket is the execution scope; this
file is the rules of the road.
