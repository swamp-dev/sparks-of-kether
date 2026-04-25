# Sparks of Kether — Build Journal

> **Append only.** Never edit or delete past entries. This file is the
> long-term memory of the project — a record of **every push**, what it
> contained, and why.

## Rule

**Every `git push` gets one Journal entry.** Append at the bottom of this
file, commit the entry *with* (or immediately before) the pushed work so
the branch and the log stay in sync. Each entry carries:

- An **ISO-8601 timestamp** with time and timezone (`YYYY-MM-DDTHH:MM:SS±ZZ:ZZ`).
- A **ticket number** (`#NN`) in the heading.
- A short **context line**.
- Body fields: what was pushed, why, notes for future agents, commit sha(s).

A single ticket typically accumulates several entries (initial push, review
fixes, polish). That's expected — the file is chatty on purpose.

## Entry template

Copy, fill in, append at the **bottom**:

```markdown
## YYYY-MM-DDTHH:MM:SS±ZZ:ZZ — #NN: Short context line

**Pushed:** what this push contains (bullet or short paragraph).
**Why:** motivation (e.g. "draft 1", "review fixes for X", "CI green").
**Notes:** anything worth remembering for future agents. "None" is fine.
**Commit(s):** `<sha-short>` (or a range: `<sha1>..<shaN>`)
```

**Tone:** terse, honest, useful. Not marketing. If a push went smoothly,
"Notes: none" is fine. If something was painful, say so — future agents
will thank you.

---

## Entries

## 2026-04-24T16:09:58-04:00 — #2: CLAUDE.md initial draft + code-review fixes

**Pushed:** First draft of `CLAUDE.md` (191 lines), revised in-worktree to
address two critical and four significant findings from the `code-reviewer`
subagent — inline Journal fallback for pre-infra tickets, branch/worktree
naming asymmetry, pre-scaffold `pnpm` caveat, step-10 session boundary,
Journal source-of-truth rule, Stack-change-rule alignment; plus minor
`KabballahGame.md` Do-NOT and TDD-commit clarification.

**Why:** Bootstrap the canonical workflow file. Every other ticket depends
on `CLAUDE.md` being in place.

**Notes:** Back-filled retroactively — this push happened before the
per-push Journal rule existed. The rule was introduced in #44 (this ticket).

**Commit(s):** `8127a36`
**PR:** #40 (merged as `0cb5bb8`)

---

## 2026-04-24T16:11:46-04:00 — #3: CONTRIBUTING.md initial draft

**Pushed:** 41-line `CONTRIBUTING.md`. Short human-facing welcome; defers
to `CLAUDE.md` for the canonical workflow.

**Why:** Make the repo approachable on GitHub without duplicating workflow
rules.

**Notes:** Back-filled. Skipped `code-reviewer` given trivial size.

**Commit(s):** `d48968f`
**PR:** #41 (merged as `50fbc53`)

---

## 2026-04-24T16:12:56-04:00 — #4: Journal.md initial draft

**Pushed:** `Journal.md` (56 lines) with the now-superseded
append-on-closeout rule and one first entry for itself.

**Why:** Institutional-memory file referenced by `CLAUDE.md`.

**Notes:** Back-filled. The append-on-closeout rule is being replaced with
the per-push rule right here in #44.

**Commit(s):** `9be6c7f`
**PR:** #42 (merged as `dd6597f`)

---

## 2026-04-24T16:14:21-04:00 — #5: /finish-ticket skill initial draft

**Pushed:** `.claude/skills/finish-ticket/SKILL.md` (164 lines). Ten-step
closeout routine + separate-session cleanup. Explicit Do-NOT list
(no `gh pr merge`, no force-push, etc.).

**Why:** Automate the last mile of every ticket so nothing gets skipped.

**Notes:** Back-filled. Skipped `code-reviewer` on the initial push to
save context; the skill's Journal-append steps are being rewritten in #44
for the per-push rule.

**Commit(s):** `5ea714b`
**PR:** #43 (merged as `bd2d23f`)

---

## 2026-04-24T16:25:36-04:00 — #44: switch to per-push Journal entries + back-fill

**Pushed:**
- Back-filled Journal entries for every push on tickets #2, #3, #4, #5
  (four entries, real commit timestamps, ticket refs, PR refs).
- Rewrote `Journal.md` header to document the per-push rule, new
  timestamp format (ISO-8601 with timezone), and new entry template.
- Rewrote `CLAUDE.md` step 7 — "Append a Journal entry" → "Journal
  every push"; updated template inline.
- Rewrote `.claude/skills/finish-ticket/SKILL.md` — the skill no longer
  owns the Journal-append step; it handles only the *final* push's entry
  plus PR-open. Adds a "verify prior pushes already have entries" gate
  (step 4). Description and preconditions updated.

**Why:** User feedback mid-implementation: one entry per ticket at
closeout loses detail. Per-push entries preserve the iteration history.

**Notes:** This entry documents the push that introduces the per-push
rule; pushes *before* this rule were back-filled to match.

**Commit(s):** `844785f`

---

## 2026-04-24T16:25:36-04:00 — session: meta-findings from bootstrap phase

Not tied to one ticket — findings from the whole bootstrap session
(repo init, reference material, design docs, Epic #1, 38 tickets,
tickets #2–#5 implemented). Worth writing down while fresh.

**Bootstrap problem.** Tickets #2–#5 create the workflow infrastructure
(CLAUDE.md, CONTRIBUTING.md, Journal.md, /finish-ticket). While
implementing them, the agent cannot *use* the infrastructure — Journal.md
doesn't exist, the skill doesn't exist, CLAUDE.md is what you're
writing. Build in "pre-infra" fallbacks: inline procedures in the first
file, back-fill entries once Journal.md exists. Don't pretend the
infrastructure is ready for itself.

**`git worktree mv` subtlety.** Renaming the working directory mid-
session (`mv kaballahGame sparks-of-kether`) pins the Bash tool's CWD
to the old path — every subsequent shell call fails with "Path does not
exist." Workaround is to recreate the old dir as an empty placeholder
until the session ends, or always run `cd /abs/path &&` prefixes. Prefer
renaming between sessions when possible.

**Bash single-quote gotcha in batch scripts.** Writing ticket bodies
inside `'…'` strings silently truncates them at any apostrophe
(possessives, contractions). 21 out of 38 tickets made it through before
the script choked on `other players'`. Always grep
`'[a-zA-Z]|[a-zA-Z]'[a-zA-Z]|[a-zA-Z]s' ` before running. Better: use
single-quoted heredocs `<<'EOF'`. Captured in `~/.claude/skills/create-issues/SKILL.md`.

**Code-reviewer pays off on prose.** The `code-reviewer` subagent caught
2 critical + 4 significant issues in CLAUDE.md (pure docs, 191 lines)
that looked fine to the author. Worth invoking even on non-code work
when the doc is load-bearing.

**`gh pr merge --delete-branch` skips local-branch delete if the branch
is checked out in a worktree.** Must sequence: merge on GH → remove
worktree locally → `git branch -D` the local branch. Error messages are
clear but surprised me.

**Repo renaming gotcha for the `gh` tool.** After renaming the repo dir,
`gh repo view` works fine (it reads .git/config's remote, not the path),
but the `gh` tool also doesn't care about worktree locations. Tooling
behaved better than expected.

**Ticket granularity tuning.** PR-sized (1–4h) felt right. The Epic with
38 tickets is skim-able; each ticket is self-contained; agents can pick
one up cold. Smaller tickets would have been busywork; larger would have
needed sub-tasks.

**Symbolic minimalist art choice saved grief.** Original design doc
envisioned figurative Rider-Waite-style card art. Pivoting to "Hebrew
letter + geometric glyph + color band" means Claude can actually
generate all 22 SVGs consistently — figurative at scale is a known
Claude weakness. Worth keeping in mind for future mystical/symbolic games.

**The design→reference→tickets→code cascade works.** The medium-agnostic
design doc (`design/mechanics.md`, `design/shells.md`) became fodder for
clean typed-data tickets and engine-logic tickets. Re-use across media
(board game, app, computer game) is a real option.

**Commit(s):** bundled with `#44` commit above.

---

## 2026-04-24T16:34:31-04:00 — #6: Next.js 14 App Router scaffold (initial push)

**Pushed:**
- `package.json` (Next 14.2, React 18.3, TS 5.5, ESLint, Prettier; pnpm 10.33.2 via corepack; Node ≥20).
- `tsconfig.json` — strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`; path aliases for `app/`, `components/`, `engine/`, `data/`, `lib/`, `test/`.
- `next.config.mjs` (reactStrictMode, no poweredByHeader).
- `.eslintrc.json` — `next/core-web-vitals` + `@typescript-eslint/strict` + `stylistic`; consistent-type-imports rule.
- `.prettierrc` + `.prettierignore` + `.editorconfig`.
- `.gitignore` expanded for Node/Next artifacts (node_modules, .next, next-env.d.ts, etc.).
- `app/layout.tsx` + `app/page.tsx` (placeholder "Sparks of Kether — coming soon" on deep-indigo background).
- Empty directories `components/`, `engine/`, `data/`, `lib/`, `test/` seeded with `.gitkeep`.
- `pnpm-lock.yaml` generated.
- `README.md` gets a "Running the web app" section with quick-start commands and directory layout.

**Why:** Ticket #6 — foundation for every downstream ticket. Nothing else can start until this lands.

**Notes:**
- Verified locally: `pnpm install` clean, `pnpm typecheck` clean, `pnpm lint` clean, `pnpm build` succeeds (4 static routes), `pnpm dev` serves HTTP 200 at `/` with placeholder content.
- Node 24 used locally (user's machine); Node ≥20 declared in `engines`. Not a problem but worth noting.
- pnpm emitted a warning about ignored build scripts for `unrs-resolver@1.11.1` (Next.js transitive). Left unaddressed — not exercising native resolver paths.
- Pre-review commit; code-reviewer has not run yet.

**Commit(s):** `163367f` (amended to `5a66fc4` on push — sha drift noted)

---

## 2026-04-24T16:39:40-04:00 — #6: scaffold review fixes (second push)

**Pushed:** `code-reviewer` subagent findings addressed:
- **Blocker:** `next-env.d.ts` was gitignored but the file exists on disk.
  Per Next.js convention the file should be committed so fresh clones get
  type references immediately. Removed from `.gitignore` (with a comment
  linking the Next.js docs) and added to tracked files.
- **Blocker:** `pnpm test` script was missing; CLAUDE.md's local gate
  (`pnpm typecheck && pnpm lint && pnpm test`) is mandatory from ticket
  #6 onward. Added a placeholder `test` script that echoes a note and
  exits 0, so the gate works until ticket #8 wires up Vitest.
- **Significant:** ESLint `stylistic` was fighting Prettier. Added
  `eslint-config-prettier` (v9.1) to `extends` to turn off
  Prettier-conflicting rules.
- **Minor:** Removed redundant `noImplicitAny` and `strictNullChecks`
  from `tsconfig.json` (`strict: true` already implies both).
- **Minor:** Simplified `tsconfig.json` path aliases to just `@/*` →
  `./*` (the sub-path aliases were redundant).
- **Minor:** Added `metadataBase` to `app/layout.tsx` (env-overridable)
  to pre-empt the Next.js build warning about relative OG URLs.
- **Minor:** Added `app/icon.svg` — a simple radiant-spark glyph on the
  deep-indigo background. Prevents favicon 404s on every request and
  matches the SVG-only art direction.

**Why:** Reviewer flagged the first push would leave the scaffold mildly
inconsistent with its own working agreement (missing `pnpm test`) and
with Next.js conventions (`next-env.d.ts`). Fixing now keeps every
subsequent ticket on a clean foundation.

**Notes:**
- Re-ran the full local gate after fixes: install, typecheck, lint,
  test (placeholder), build — all clean.
- `app/icon.svg` is 12 lines of SVG; Next.js App Router serves it as
  the favicon automatically.

**Commit(s):** `7d4fdf0`

---

## 2026-04-24T16:50:08-04:00 — #7: Tailwind 3 + Sefirah color tokens + typography

**Pushed:**
- Installed Tailwind 3.4 + PostCSS + Autoprefixer.
- `tailwind.config.ts` — color tokens for all 10 Sefirot (`bg-kether`,
  `bg-chesed`, etc.) keyed to Golden-Dawn / Kabbalistic hex values,
  plus `bg-ground` (deep indigo `#0e0a1f`), `bg-veil` (off-white text),
  three `pillar-*` accents, and `illumination`/`separation` meter colors.
- `tailwind.config.ts` — font families `font-display` (Cinzel),
  `font-sans` (Inter), `font-hebrew` (Noto Sans Hebrew), each wired to
  CSS variables set by `next/font`.
- `postcss.config.mjs` with Tailwind + Autoprefixer.
- `app/globals.css` — Tailwind directives + default dark scheme
  (`color-scheme: dark`, body = ground, text = veil).
- `app/layout.tsx` — loads the three fonts via `next/font/google` and
  attaches their CSS variables to `<html>`; body uses `font-sans`.
- `app/page.tsx` — placeholder home page migrated from inline styles
  to Tailwind utilities.
- `app/tokens/page.tsx` — dev-only `/tokens` gallery: all 10 Sefirah
  swatches (color, Hebrew name in RTL, English name, quality keyword,
  class name), the three pillar accents, and the three typography stacks.
- Hebrew text everywhere uses `dir="rtl" lang="he"` on the containing
  element so bidi rendering is unambiguous even in an LTR page.

**Why:** Ticket #7. Every UI component in later phases needs Tailwind
tokens to match the design spec — no literal hex values scattered
across the codebase.

**Notes:**
- User feedback mid-implementation: Hebrew strings are stored in
  logical (Unicode) order, which renders RTL by default via bidi, but
  adding explicit `dir="rtl"` is safer in mixed-script contexts. Done.
- Initial lint failure on `tokens/page.tsx` — `ReadonlyArray<T>` and
  `type Foo = {...}` syntax are forbidden by `@typescript-eslint/stylistic`
  (prefers `readonly T[]` and `interface`). Fixed in the same push.
- Verified dev server served `/tokens` with HTTP 200; all 10
  `bg-sefirah` classes present in rendered HTML; all 10 Hebrew names
  rendered with `dir="rtl" lang="he"` attrs.
- Initial attempts hit port collisions (3000, 3001 occupied by
  zombies); next dev fell back to 3002. Killed stray `next-server`
  processes between checks.

**Commit(s):** `3e51e8f`

---

## 2026-04-24T16:57:53-04:00 — #7: Tailwind review fixes (second push)

**Pushed:** code-reviewer subagent findings addressed:
- **Blocker:** Hebrew font fallback `'Noto Sans Hebrew'` could trigger
  Google Fonts CDN fetch on Windows/Linux if `--font-hebrew` fails to
  resolve — violates "no external CDN" acceptance criterion. Dropped
  named fallbacks from all three font stacks; they now degrade to
  generic `serif` / `sans-serif` only. `next/font` self-hosts the
  woff2 files so the named fallback added risk with zero benefit.
- **Blocker:** Binah swatch (`#1a1a1a`) was invisible against
  `ground` (`#0e0a1f`) at 1.12:1 contrast. Added `border
  border-white/15` to every swatch so each card shape is visible
  regardless of bg color.
- **Significant:** `/tokens` was publicly indexable in production.
  Added a `process.env.NODE_ENV === 'production'` guard that calls
  `notFound()` at build/request time. Dev `/tokens` → 200 (verified).
  Prod build pre-renders the 404 page for the route.
- **Minor:** Netzach (4.1:1) and Yesod (3.6:1) fail WCAG AA for body
  text on `text-veil`. Added per-swatch `contrastNote` with a warning
  banner so future UI work knows to use dark text for body copy on
  those grounds.
- **Minor:** Tailwind `content` globs extended from `{ts,tsx}` to
  `{js,jsx,ts,tsx}` — defensive.
- **Minor:** Added `aria-label` to every swatch + `role="list"` /
  `role="listitem"` structure + `aria-labelledby` on section headings.
- **Minor:** Added comment explaining the deliberate
  `illumination`/`separation` duplication of `tiferet`/`binah`.
- **Minor:** Documented the EB Garamond gap in a comment at the top
  of `tokens/page.tsx` — ticket said "Cinzel or EB Garamond"; chose
  Cinzel, flagged `font-body-serif` as a future token name if a body
  serif is later wanted.

**Why:** Review pass. Bringing the scaffold onto the same quality
line as the design/reference docs.

**Notes:**
- Prod smoke-test of `/tokens` via `pnpm start` was flaky (port
  collision with other next processes in the sandbox); confirmed via
  build output `○ /tokens` + the presence of `notFound()` at SSG
  time that the route is prerendered as 404 in production.
- Dev server still returns 200 on `/tokens`.
- All three gates clean: typecheck, lint (no warnings), build.

**Commit(s):** `2c3499e`

---

## 2026-04-24T17:20:35-04:00 — #8: Vitest + RTL + Playwright skeleton (initial push)

**Pushed:**
- Added dev deps: `vitest@4`, `@vitejs/plugin-react`, `jsdom`,
  `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `@playwright/test`.
- `vitest.config.ts` — jsdom env, globals, `test/setup.ts` setupFile,
  excludes `e2e/`, path alias `@` → repo root (matches tsconfig),
  coverage reporter config.
- `test/setup.ts` — imports `@testing-library/jest-dom/vitest` and
  registers `afterEach(cleanup)` so RTL renders don't bleed.
- `playwright.config.ts` — testDir `e2e/`, chromium project, webServer
  **conditional** on `PLAYWRIGHT_BROWSERS_INSTALLED`; keeps `pnpm e2e`
  cheap in CI / local gate when browsers aren't installed.
- `lib/__tests__/sanity.test.ts` — 2 vitest smoke tests.
- `components/__tests__/home.test.tsx` — 2 RTL smoke tests rendering
  `app/page.tsx` and asserting on title + coming-soon.
- `e2e/home.spec.ts` — 1 Playwright stub (skips unless
  `PLAYWRIGHT_BROWSERS_INSTALLED` is set).
- `package.json` — replaced echo-placeholder `test` with `vitest run`;
  added `test:watch`, `test:coverage`, `e2e`.
- `.gitignore` — added Playwright/vitest artifacts
  (playwright-report/, test-results/, blob-report/, playwright/.cache/).

**Why:** Ticket #8. Unblocks TDD for every ticket from #10 onward —
engine logic, reducers, and UI all rely on this stack.

**Notes:**
- Hit a TS error in `playwright.config.ts` from
  `exactOptionalPropertyTypes: true` rejecting `workers: undefined`.
  Fixed with a conditional spread `...(CI ? { workers: 1 } : {})`.
- First `pnpm e2e` attempt timed out because webServer tried to start
  `pnpm dev` on port 3000 which was held by a zombie. Better fix than
  chasing the port: made `webServer` itself conditional on
  `PLAYWRIGHT_BROWSERS_INSTALLED`. No browsers = no web server = no
  startup cost = clean skip.
- Full gate green: typecheck ✓, lint ✓, test ✓ (4/4), e2e ✓ (1
  skipped), build ✓.
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `c7f2d1a`

---

## 2026-04-24T17:25:22-04:00 — #8: testing review fixes (second push)

**Pushed:** code-reviewer findings addressed:
- **Significant (blocker):** removed `**/*.spec.ts` from vitest
  `exclude`. That glob would have silently swallowed any future
  `engine/__tests__/*.spec.ts` unit test. `**/e2e/**` alone is
  sufficient to keep Playwright files out. Added an explicit
  comment warning the next contributor not to re-add it.
- **Significant (CI-adjacent):** added a loud `console.warn` in
  `playwright.config.ts` that fires whenever `CI` is set but
  `PLAYWRIGHT_BROWSERS_INSTALLED` isn't. Prevents green-wash when
  ticket #9's workflow wires up `pnpm e2e` without the env flag.
  Verified: `CI=1 pnpm e2e` now prints the warning loudly before
  skipping.
- **Minor:** removed `globals: true` from vitest config. The test
  files already import `describe/it/expect` explicitly, so the flag
  bought nothing and muddied the contract. Added a comment explaining
  the decision.

**Why:** Review pass; bring testing skeleton onto the quality line
before #9's CI starts depending on it.

**Notes:**
- All gates re-ran clean: typecheck ✓, lint ✓, test ✓ (4/4), e2e ✓
  (1 skipped), CI-mode e2e ✓ (warning printed, 1 skipped, exit 0).
- RTL/jest-dom wiring confirmed good by reviewer; sample tests
  exercise the full setup chain.

**Commit(s):** `19cf339`

---

## 2026-04-24T17:30:48-04:00 — #9: GitHub Actions CI (initial push)

**Pushed:**
- `.github/workflows/ci.yml` — two jobs:
  - `verify` runs `pnpm install --frozen-lockfile`, `pnpm typecheck`,
    `pnpm lint`, `pnpm test` on Ubuntu latest / Node 20 with pnpm
    cache via `pnpm/action-setup@v4` and `actions/setup-node@v4`.
  - `build` depends on `verify` and runs `pnpm build` separately so
    a failed build doesn't mask a failed test (and vice versa).
- `concurrency` group cancels in-flight runs on PR re-pushes; does
  not cancel `main`-branch runs (those always finish).
- `permissions: contents: read` — least-privilege default.
- 10-minute timeout per job; pnpm version pinned to 10.33.2 to match
  `packageManager` in `package.json`.

**Why:** Ticket #9. Guardrail every subsequent PR — the "green
locally before review" rule in CLAUDE.md only really holds if a
second pair of eyes (CI) also runs the gate.

**Notes:**
- Intentionally NOT running `pnpm e2e` in CI — browsers aren't
  installed and the Playwright config from #8 skips silently when
  `PLAYWRIGHT_BROWSERS_INSTALLED` is unset (with the loud CI warning
  I added in #8's review pass). A later ticket can opt CI into e2e
  by installing chromium and exporting the env var.
- Local dry-run of every CI step clean: install, typecheck, lint,
  test (4/4), build (5 routes).
- Pre-review commit; code-reviewer runs next.
- **Followup for user after merge:** configure `verify` and `build`
  as required status checks in the repo's branch protection rules.
  Repo-settings action, not a file change.

**Commit(s):** `4bd9665`

---

## 2026-04-24T17:34:05-04:00 — #9: CI review fixes (second push)

**Pushed:** code-reviewer findings addressed (no blockers, one minor
+ one durability nit):
- **Minor:** duplicated the "Keep in sync with packageManager field
  in package.json" comment on the `build` job's `pnpm/action-setup`
  block. Previously only the `verify` job carried it.
- **Durability:** added a `CLAUDE.md` Do-NOT rule: "Never bump pnpm
  in `package.json` without also updating `.github/workflows/ci.yml`
  in the **same commit**." Codifies the reviewer's recommendation
  so the drift risk is written down, not just commented.

**Why:** Review pass. The CI workflow itself was clean — no security,
structural, or correctness issues. The fixes are forward-looking
durability.

**Notes:**
- Reviewer confirmed: action versions current, concurrency correct,
  `contents: read` sufficient, `--frozen-lockfile` correct, SHA
  pinning unnecessary for a private hobby repo, Node 20 in CI vs
  Node 24 locally is the correct direction given `engines.node: >=20`.
- Not touching the "build reinstalls from scratch" observation —
  the separate job is deliberate for failure-label clarity in the
  GitHub UI. Reviewer agreed this was a reasonable trade.
- Local gate still clean (no functional changes — just comments).

**Commit(s):** `346079e`

---

## 2026-04-24T17:57:18-04:00 — #10: typed data from reference/*.md (initial push)

**Pushed:** first real Phase 1 ticket — converted the symbolic tables
in `reference/*.md` into typed, immutable TypeScript modules.

- `data/types.ts` — discriminated `Attribution` union (element/planet/sign);
  keyed types for `SefirahKey`, `StatKey`, `LetterKey`, `LetterClass`,
  `Pillar`, `SoulAspectKey`; `readonly` everywhere; record interfaces for
  `Sefirah`, `HebrewLetter`, `Arcanum`, `Path`, `SoulAspect`.
- `data/sefirot.ts` — 10 records, Kether through Malkuth, colors matching
  Tailwind tokens, DCs from `design/mechanics.md`, Shell keywords from
  `reference/correspondences.md`. `challengeDC` is `null` only for Kether
  (collective Final Threshold) and Malkuth (starting waypoint).
- `data/letters.ts` — 22 records, aleph → tav, gematric values, Sepher
  Yetzirah class, attribution, path number.
- `data/arcana.ts` — 22 records, 0–21, keywords + attribution matching
  the letter.
- `data/paths.ts` — 22 records, 11–32, `pillarsCrossed` tuple, `from`/`to`
  in traditional top-down order but treated as bidirectional by the engine.
- `data/soul-aspects.ts` — 6 playable classes (the personality Sefirot);
  title, flavor, ability + weakness per `design/mechanics.md`.
- `data/index.ts` — re-exports + throwing lookup helpers (`sefirahByKey`,
  `arcanumByNumber`, `pathByArcanum`, etc.). Throws on miss because
  symbolic content is fixed at build time; a miss is a programming error,
  not a runtime-data issue.

**Why:** Ticket #10. Every engine/UI ticket from here on consumes typed
records; no one should re-parse markdown at runtime.

**Notes:**
- **TDD-first:** wrote `data/__tests__/data.test.ts` with 27
  structural-invariant tests *before* the data files (10-count,
  number ranges, class partition 3/7/12, gematria allow-list,
  lookup round-trips, arcanum↔path↔letter cross-consistency, Soul
  Aspect alignment with its Sefirah's stat). Then built the data
  until every test went green. 31/31 passing (plus 4 pre-existing
  scaffold tests).
- First-run typecheck failed with a `baseUrl deprecated` error —
  turned out the worktree had no `node_modules` yet; `pnpm install
  --frozen-lockfile` fixed it. The deprecation warning itself is a
  future-TS concern (7.0), but the `bundler` module resolution
  accepts it for now.
- Build remains clean (5 static routes).
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `c5acbf8`

---

## 2026-04-24T18:04:07-04:00 — #10: review fixes (second push)

**Pushed:** code-reviewer findings addressed. No critical issues; two
significant, plus test-invariant additions + doc comments:

- **Significant:** `challengeDC: number | null` was hiding two
  semantically distinct states (Malkuth "no-check" vs Kether
  "collective Final Threshold"). Refactored `Sefirah.challenge` to a
  discriminated union `{ kind: 'check'; dc } | { kind: 'no-check' } |
  { kind: 'collective' }` in `types.ts`; updated every record in
  `sefirot.ts`. The engine now branches exhaustively in a switch
  instead of guessing from a null sentinel.
- **Significant:** lookup helpers in `index.ts` were O(n) linear
  scans. Rewrote all six (`sefirahByKey`, `sefirahByNumber`,
  `letterByKey`, `arcanumByNumber`, `pathByNumber`, `soulAspectByKey`)
  as Map-backed, built once at module load. O(1) access, no public
  API change.
- **Minor (tests):** added two new invariants that the reviewer
  flagged as absent: pillar partition is exactly 3 mercy / 3
  severity / 4 balance, and no path connects a Sefirah to itself.
  Also updated the old `challengeDC is null` test to exercise the
  new discriminated shape.
- **Minor (docs):** added a comment on `Element` explaining Earth is
  deliberately absent (Sepher Yetzirah Mother letters only cover 3
  elements; Earth arrives with Minor Arcana/Four Worlds later).
  Added a Golden-Dawn-vs-Thoth attribution note to `letters.ts` so a
  future agent who swaps to Thoth knows to update both letters and
  arcana together.
- **Minor (flag):** added a `TODO(engine)` on Yesod's weakness
  description pointing to the setup ticket (#29) where the
  sub-Malkuth starting state will need a real mechanical hook.

**Why:** Reviewer said: fix before engine tickets consume this —
the null sentinel bug would ship silently, and the O(n) pattern
would get copied. Better to fix while the surface is just `data/`.

**Notes:**
- Gates all re-ran clean: typecheck ✓, lint ✓, test ✓ (33/33 — was
  31, added the two new invariants), build ✓.
- Didn't touch the Attribution type-guard suggestion or the color
  precision nit — both can wait for the first UI component that
  actually needs them.
- Factual data accuracy was reviewer-verified against Golden Dawn /
  Sepher Yetzirah; no corrections needed.

**Commit(s):** `662b467`

---

## 2026-04-24T18:26:41-04:00 — #11: movement engine (initial push)

**Pushed:** first pure engine module, TDD-first.

- `engine/types.ts` — foundation types for every engine ticket:
  - `Result<T, E>` discriminated union (engine never throws on
    *expected* failures — returns a tagged Result so callers branch).
  - `PlayerState`, `GameState` (minimal subsets; later tickets
    extend with stats/sparks/counters).
  - `MoveRejection` tagged union: `unknown-player`, `unknown-path`,
    `card-not-in-hand`, `path-does-not-connect`.
  - `MoveResult = Result<GameState, MoveRejection>`.
- `engine/movement.ts` — four pure functions:
  - `adjacentSefirot(key)` — connected Sefirot via the `paths` table.
  - `canTravelPath(state, playerId, pathNumber)` — validates without
    mutating; returns the `Path` on success so `applyMove` doesn't
    re-look it up.
  - `applyMove(state, playerId, pathNumber)` — returns a fresh
    `GameState` with position updated, arcanum moved from hand to
    discard. Other players untouched. Removes exactly one copy if
    duplicates exist.
  - `adjacentPaths(state, playerId)` — path numbers the player can
    play right now (hand ∩ paths touching position).
- `engine/__tests__/movement.test.ts` — 18 tests across 4 describe
  blocks; 51/51 overall (scaffold 4 + data 29 + movement 18).
- Removed `engine/.gitkeep`.

**Why:** Ticket #11. First real engine-logic ticket, unblocks every
subsequent reducer (checks, sparks, shells, endgame).

**TDD note:** Wrote the tests first — valid-move acceptance,
bidirectional traversal, every rejection kind, invariant that
`applyMove` never mutates on failure, duplicate-removal edge case,
multi-player preservation. Then built the minimum implementation to
pass each. Caught and removed a leftover `pathByNumber` import (my
first pass had a `void pathByNumber` hack to silence unused; lint
caught it, cleaned up).

**Design choices worth noting for future engine tickets:**
- **Throw for programmer errors, Result for expected failures.**
  `adjacentPaths` throws on unknown player (stale id = caller bug);
  `canTravelPath` / `applyMove` return Results because the UI
  surfaces those failures.
- **`canTravelPath` returns the `Path` on success.** Avoids
  `applyMove` doing the lookup twice. Keeps the reducer pure + cheap.
- **Paths are bidirectional everywhere.** Either endpoint works.
- **No turn-ownership here.** That's ticket #25 (turn
  orchestration). Movement only validates can-travel given cards +
  position — whose turn it is is out of scope for this module.

**Notes:**
- All gates green: typecheck ✓, lint ✓, test ✓ (51/51), build ✓.
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `ac68975`

---

## 2026-04-24T18:31:38-04:00 — #11: review fixes (second push)

**Pushed:** code-reviewer findings addressed — no critical issues;
two significant + one suggested helper + two new tests.

- **Significant:** `applyMove` was doing a second `findPlayer` call
  after `canTravelPath` already validated — latent footgun (two
  lookups to stay in sync) plus a defensive throw that couldn't
  actually fire in pure code. Changed `canTravelPath` to return
  `Result<MoveValidationContext, MoveRejection>` where the context
  is `{ path, player }`. `applyMove` destructures both from the
  validated Result and never re-queries.
- **Significant:** `MoveRejection.card-not-in-hand` gained a
  `pathNumber` field so the UI can render "you need X to travel
  path Y" without re-deriving the path from the arcanum.
- **Suggested helper:** added `tryPathByNumber(n)` to
  `data/index.ts` — non-throwing Path-or-undefined lookup. Engine
  now calls this instead of duplicating `paths.find` for its
  Result-returning validation. Keeps the throw-on-miss variant for
  programmer-error use cases.
- **Missing invariant (added):** two new `applyMove` tests —
  sequential apply (path 32 → path 28, hand shrinks to empty,
  discard grows to [21, 17]) and second-apply fails on a path that
  the updated position no longer touches. Both prove the reducer
  truly commits new state rather than re-reading the original.

**Why:** Reviewer said "Ship" but flagged two patterns worth fixing
*before* ticket #12 lands. Fixing now is cheap; after #12/#13/#14
accumulate, it's intrusive.

**Notes:**
- Didn't add `ok()`/`fail()` constructor helpers — reviewer said
  they can wait for a helper module.
- Didn't touch the `JSON.stringify` brittleness in the
  "no-mutation-on-failure" test — reviewer called it acceptable.
- Flagged future-ticket coupling: sparks (#13) may need to decide
  whether spark-granted paths go through `hand` or a parallel slot;
  turn ownership (#25) will add an `unknown-turn` rejection. Both
  non-breaking additions but worth the ticket authors seeing them.
- All gates clean: typecheck ✓, lint ✓, test ✓ (53/53 — was 51,
  added 2 sequential-apply invariants), build (not re-run; no
  runtime surface changed).

**Commit(s):** `962b67b`

---

## 2026-04-24T18:42:45-04:00 — #12: challenge resolution (initial push)

**Pushed:** second engine reducer. Seeded RNG + stat check +
state-mutating challenge reducer.

- `engine/rng.ts` — Mulberry32 PRNG behind an `Rng` interface
  (`d20()`, `int(min, max)`). Seeded → deterministic; prod uses
  `seededRng(Date.now())`.
- `engine/checks.ts` — three reducers + three modifier constants
  (`CARD_BURN_BONUS=3`, `SPARK_BURN_BONUS=5`, `SHORTCUT_DC_PENALTY=3`):
  - `rollCheck({stat, dc, modifiers, rng})`: pure math. Stacks
    assist (+½ each ally stat, floored), card burns (+3 each),
    spark burns (+5 each). `shortcutPenalty` bumps *effective DC*
    rather than subtracting from total.
  - `resolveChallenge(...)`: state mutator. Rejects unknown
    player, Malkuth/Kether (`no-standard-check`), already-cleared
    Sefirot. On pass: marks cleared, grants Spark, +1 Illumination.
    On fail: returns outcome with state UNCHANGED so caller picks
    retry vs setback.
  - `acceptSetback(state)`: +1 Separation. Position rollback lives
    at the movement layer; this reducer owns the counter bump only.
- `engine/types.ts` — extended `PlayerState` with `stats`,
  `clearedSefirot`, `sparksHeld`. Extended `GameState` with
  `illumination`/`separation`. Ticket #15 will wire event sourcing
  on top.
- `test/fixtures.ts` — shared `makePlayer`/`makeState`/`statSheet`
  so movement + checks tests use one factory. Movement tests
  refactored to use them (20 tests, still green).
- `engine/__tests__/checks.test.ts` — 17 tests.

**Why:** Ticket #12. Unblocks sparks (#13 consumes stored sparks)
and shells (#14 can now spawn pressure on failure).

**TDD note:** Wrote checks tests first — DC-met-exactly boundary,
modifier stacking, shortcut-penalty effect, seeded-RNG
determinism, every rejection kind, pass/fail state mutation,
setback. Two catches:
- Test mocks for `Rng` had to include both `d20` and `int` since
  `d20()` calls `this.int(1, 20)`.
- Collapsed "Malkuth has no check" and "Kether is collective"
  into one `no-standard-check` rejection — engine response is
  identical; UI gets the Sefirah key for rendering.

**Design choices for future tickets:**
- `shortcutPenalty` raises `effectiveDC`, not a negative modifier.
  UI shows "DC 19 (penalty)" not "you rolled -3."
- State unchanged on failure — caller picks retry or setback.
  Reducer stays side-effect-free on the failure branch.
- `resolveChallenge` takes an object input. Future tickets add
  optional context (Shell flags, etc.) without breaking call sites.

**Notes:**
- All gates green: typecheck ✓, lint ✓, test ✓ (70/70 — was 53,
  added 17 for checks), build ✓.
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `18eea24`

---

## 2026-04-24T18:48:31-04:00 — #12: review fixes (second push)

**Pushed:** code-reviewer flagged three significant issues. All
addressed:

- **Significant — `acceptSetback` +1 vs +2 mismatch:**
  `design/mechanics.md` says shortcut-path failures are +2
  Separation, not +1. The original reducer added 1
  unconditionally; caller would have had to double-call. Changed
  signature to `acceptSetback(state, { shortcut?: boolean })`:
  default adds 1, `shortcut: true` adds 2. Added a test.
- **Significant — `ok: true` wrapping a failed outcome:**
  `resolveChallenge` returns `Result<ChallengeSuccess, _>` where
  `ok: true` means "resolved cleanly," not "passed." Future
  engineers could easily misread. Added a prominent JSDoc warning
  on `ChallengeSuccess` noting that `outcome.pass` is the real
  success flag, and that on failure `newState === input.state`
  (same reference). Added a reference-equality assertion to the
  failure test.
- **Significant — array types invite duplicates and O(n) lookups:**
  Changed `PlayerState.clearedSefirot` and `PlayerState.sparksHeld`
  from `readonly SefirahKey[]` to `ReadonlySet<SefirahKey>`. The
  `already-cleared` guard was load-bearing for the array version;
  the Set makes uniqueness structural. `resolveChallenge` now uses
  `.has()` for O(1) membership, `new Set(...).add()` for immutable
  update. Fixture defaults updated to `new Set()`. Test expectations
  updated to `toEqual(new Set([...]))` / `.size`.

**Improvements also taken:**
- Documented RNG seed semantics: 32-bit, seed 0 is valid, prod
  should use `Date.now() >>> 0` or `Math.floor(Math.random() * 0x100000000)`.
- Documented that `nextFloat()` is [0, 1) so `int(min, max)` has
  no upper-bound off-by-one; `int(n, n)` correctly returns `n`.

**Skipped (low value now):**
- "Negative burns throw" — the type is `number`; negative values
  would reduce total. Doesn't seem like a real footgun, and
  `exactOptionalPropertyTypes` already prevents undefined.
  Revisit if a UI ticket passes user-editable negative values.
- Cross-Sefirah-assist rejection. `rollCheck` has no Sefirah
  context by design — the caller filters. Tests don't exercise a
  rejection that `rollCheck` doesn't actually make.
- `makePlayers` helper — one-off in movement tests for now.

**Notes:**
- All gates re-ran clean: typecheck ✓, lint ✓, test ✓ (71/71 — was
  70, added the shortcut-setback test), build (unchanged since
  last push, not re-run).
- Reviewer also praised the "`shortcutPenalty` raises effectiveDC,
  not a negative modifier" design — kept as-is.

**Commit(s):** `3dc9ea3`

---

## 2026-04-24T19:41:43-04:00 — #13: Sparks & one-use abilities (initial push)

**Pushed:** ten Spark abilities as a pure `useSpark` reducer.

- `engine/types.ts` — extended:
  - `PlayerState.pendingAbilities: PlayerAbilityFlags` — counter +
    boolean flags Spark spends set; later subsystems consume.
  - `GameState` gained `deck`, `revealedCards`,
    `shellCancellationsAvailable`, `spentSparks`.
  - `EMPTY_ABILITY_FLAGS` constant for setup.
- `engine/sparks.ts`:
  - `SparkAbility` discriminated union (10 variants).
  - `earnSpark(state, playerId, sefirah)` — grants; idempotent;
    throws on unknown player.
  - `useSpark(state, playerId, ability): Result<GameState, SparkRejection>`.
    Rejects unknown-player / spark-not-held / payload-invalid.
    On success spends the Spark and appends a `SpentSpark` record.
  - Ten per-ability updaters:
    - **Chesed (Grace):** transfer card giver→receiver. Rejects
      missing card / missing receiver / self-gift.
    - **Gevurah (Severance):** `shellCancellationsAvailable++`.
    - **Tiferet (Harmony):** `pendingAbilities.harmonyArmed = true`.
    - **Hod (Clarity):** add arcanum to `revealedCards` if any
      player holds it. Otherwise Spark spent, no reveal (by design).
    - **Netzach (Courage):** `courageRetryAvailable = true`.
    - **Yesod (Intuition):** replace top-N of deck. Rejects
      non-permutations / over-long reorders.
    - **Binah (Acceptance):** `acceptanceArmed = true`.
    - **Chokmah (Flash):** `flashExtraMoves++`.
    - **Kether (Unity):** each player draws 1 from deck top;
      exhaustion mid-draw → remaining players get nothing.
    - **Malkuth (Grounding):** `separationShields++`, stacks.
- `test/fixtures.ts` — added new required state/player fields.
- `engine/__tests__/sparks.test.ts` — 31 tests.

**Why:** Ticket #13. Unblocks turn orchestration (#25), challenge
consumption of flags, and shells (#14 will read
`shellCancellationsAvailable`).

**TDD note:** 31 tests first, then impl. Design decisions:

- **Hod's "named card not held" is NOT a rejection.** Spark still
  spent, no reveal. Makes the ability feel like a gamble not a
  guaranteed info-win.
- **Kether's deck-exhaustion mid-draw is NOT a rejection.**
  Partial distribution still counts. Full rollback would require
  reverting earlier draws or refusing when N > deck.len; the
  ability's spirit is "share what's available."
- **Chesed refuses self-gift.** Not in mechanics.md, but a silent
  no-op could mask a UI bug.

**Design choices for later tickets:**
- `PlayerAbilityFlags` keeps separate flags per ability even where
  similar. Different subsystems consume at different times;
  conflating would invite a bug.
- `spentSparks` is append-only. #15 (counters) will use its length
  as a contribution to Illumination regardless of current Spark
  inventory.
- `resolveChallenge` from #12 awards Sparks via direct `sparksHeld`
  mutation; could delegate to `earnSpark` but that's a refactor,
  deferred.

**Notes:**
- All gates green: typecheck ✓, lint ✓, test ✓ (102/102 — was 71,
  added 31), build ✓.
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `d7c5f44`

---

## 2026-04-24T19:47:05-04:00 — #13: review fixes (second push)

**Pushed:** code-reviewer fixes — one critical, three significant,
one improvement.

- **Critical (CLAUDE.md rule violation):** `useSpark` used a `!`
  non-null assertion on `findPlayer(applied.value, ...)` — banned
  by CLAUDE.md. Replaced with an explicit guard that throws with a
  contract-violation message naming the offending ability kind.
  Makes the invariant ("no ability may remove the acting player")
  explicit and enforced at the mutation site.
- **Significant (Kether + The Fool):** Arcanum 0 is a valid card
  and must be drawable. Previous code used `??` and
  `(number | null)[]` — correct by accident. Refactored to a
  direct `state.deck[idx]` read + `if (card === undefined)` guard,
  with a loud comment forbidding truthiness-check refactors
  (`!card` / `|| undefined`) that would swallow The Fool.
- **Significant (Chesed missing from invariant sweep):** Chesed
  was the one ability not in the "spark spent exactly once" sweep —
  ironic since it's the highest-risk double-mutate candidate.
  Added a dedicated cross-player test.
- **Significant (missing self-gift test):** Chesed rejects giver
  === receiver in code but no test enforced it. Added.
- **Significant (missing Chokmah stacking test):** Malkuth had a
  stacking test, Chokmah didn't. Added one.
- **Improvement (Yesod permutation via string-join):** Fragile —
  `[1, 11]` and `[11, 1]` both sort to `'1,11'` and would pass a
  non-permutation for multi-digit values. Switched to sorted
  element-wise comparison.

**Why:** Critical fix was a rule violation with a real latent
bug. The others were defensive. Worth taking now before #14
reads `shellCancellationsAvailable`.

**Notes:**
- All gates green: typecheck ✓, lint ✓, test ✓ (105/105 — was
  102, added 3 new tests).
- Reviewer praised `SparkAbility` + `ABILITY_TO_SEFIRAH` mapping,
  `useSpark` sequencing, `spentSparks` shape, flag split.

**Commit(s):** `300664d`

---

## 2026-04-24T22:44:59-04:00 — #14: Shells (initial push)

**Pushed:** the Qliphothic-pressure system. Ten Shells, awakening on
Separation thresholds, banishing on Sefirah-clear, deflectable by
Gevurah cancellations.

- `engine/types.ts` — extended:
  - `ShellStatus = 'dormant' | 'active' | 'banished'`.
  - `ShellStateMap = Readonly<Record<SefirahKey, ShellStatus>>`.
  - `EMPTY_SHELL_STATE` (all dormant).
  - `GameState.shells` + `GameState.shellsDeflected` (counter for
    thresholds consumed by Gevurah cancellations — distinct from
    banishment so a deflected Shell can still wake later).
- `engine/shells.ts`:
  - `pickNextShellTarget(state)` — fewest team Sparks among dormant
    Sefirot; tie-break by lowest-on-tree (highest sefirah number).
  - `maybeActivateShell(state)` — idempotent. Activates Shells
    until `thresholdsHandled = floor(sep/3)` (capped at 4). Each
    pass: consume cancellation if available (deflect, Shell stays
    dormant) → otherwise pick target → stillborn-banish if cleared,
    else activate.
  - `banishShell(state, sefirah)` — public. Idempotent.
  - `isShellActive(state, sefirah)` generic + 10 named per-Shell
    helpers.
  - `countShellsBy(map, status)`, `SHELL_THRESHOLD_STEP=3`,
    `MAX_ACTIVATIONS=4`.
- `test/fixtures.ts` — defaults for new fields.
- `engine/__tests__/shells.test.ts` — 27 tests.

**Why:** Ticket #14. Last antagonistic mechanic before counters
(#15) and endgame (#16). Reads `shellCancellationsAvailable` from
#13.

**TDD note:** Wrote 27 tests first; 3 failed on first run — useful
forcing function on design:
1. **Stillborn test** assumed the picker would land on a cleared
   Sefirah by tie-break. Realised the picker correctly avoids
   cleared ones via the "fewest Sparks" rule. Rewrote setup to
   clear ALL 10 Sefirot — picker tie-breaks to Malkuth, which IS
   cleared → stillborn-banish.
2. **Cancellation tests** initially expected deflection to leave
   shells fully dormant, but my impl banished one to account for
   the threshold. Refactored: added `shellsDeflected` counter so
   deflected Shells stay dormant and can wake on later thresholds.
   Cleaner semantically.
3. Final 132/132 (was 105, +27 shells).

**Design choices for later tickets:**
- `banishShell` is standalone; #25 (turn orchestration) wires it
  to challenge-clear events. Could delegate to `resolveChallenge`
  from #12 in a refactor — deferred.
- 10 named effect helpers are pure derivations of `isShellActive`.
  Call sites read clearer ("if (isInertiaActive(state))").
- Shell *effects* (movement costs 2 under Inertia, etc.) are NOT
  enforced here. Subsystems read the helpers and apply their own
  behaviour. This module owns lifecycle only.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (132/132), build ✓.
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `b8f1bf1`

---

## 2026-04-24T22:49:27-04:00 — #14: review fixes (second push)

**Pushed:** code-reviewer said "Ship." with one significant clarity
nit + two safety/readability improvements. All addressed:

- **Significant — silent break in `maybeActivateShell` loop:** when
  `pickNextShellTarget` returns `null` mid-loop, exit was opaque.
  Added an explanatory comment saying this branch is unreachable
  under MAX_ACTIVATIONS=4 + 10 Shells, but is a defensive guard
  against future ticket changes.
- **Improvement — unsafe `Object.keys as SefirahKey[]` cast:**
  `countShellsBy` only needs values; switched to `Object.values()
  .filter` — same semantics, no type cast.
- **Improvement — `isShellActive` could be misused at call sites
  that should prefer named helpers:** added a JSDoc note pointing
  callers at `isInertiaActive` etc. and explaining the generic
  form is for engine internals + parameterized tests.

**Why:** Polish items. Worth doing now before #15 (event sourcing)
adds another layer of indirection that obscures intent.

**Notes:**
- Gates remain green: typecheck ✓, lint ✓, test ✓ (132/132 — no
  new tests; pure refactors and comments).

**Commit(s):** `e229677`

---

## 2026-04-24T23:42:19-04:00 — #15: event-sourced counters + pillar streak (initial push)

**Pushed:** event-sourcing layer for Illumination/Separation; pillar
streak detection; refactor of every counter write through `applyEvent`.

- `engine/events.ts` — NEW. `GameEvent` discriminated union (8
  variants): `spark-earned`, `spark-spent`, `card-gifted`,
  `check-failed-accepted` (with `shortcut` flag),
  `pillar-streak-imbalance`, `pillar-streak-equilibrium`,
  `shell-activated`, `gift-refused`. `deltaFor(event)` is the
  single table of counter rules.
- `engine/counters.ts` — NEW. `applyEvent`/`applyEvents` reducers,
  `recordPillarMove(streak, pillar)` emits zero, one, or two
  threshold events per move. `STREAK_THRESHOLD = 3`.
- `engine/types.ts` — `PillarStreakState`, `EMPTY_PILLAR_STREAK`,
  `GameState.pillarStreak`.
- `test/fixtures.ts` — defaults updated.
- `engine/__tests__/counters.test.ts` — 20 tests, TDD-first.
- **Refactor**:
  - `engine/checks.ts` `resolveChallenge` success → emits
    `spark-earned` instead of bumping `illumination` directly.
  - `engine/checks.ts` `acceptSetback` → emits
    `check-failed-accepted`. Signature now takes
    `{ playerId, sefirah, shortcut? }` so the event has context.
    Tests updated to pass the required fields.
  - `engine/sparks.ts` Chesed Grace → emits `card-gifted`. This
    fixes a pre-existing bug: prior to this refactor, gifts
    weren't bumping Illumination, despite mechanics.md mandating it.
  - `engine/shells.ts` `maybeActivateShell` → emits
    `shell-activated` on every real activation (not stillborn,
    not deflect). Adds +2 Separation per the design rule.

**Why:** Ticket #15. Single source of truth for counter rules
(events.ts) makes #16 (endgame) trivial — it'll be a fold-and-
compare, no need to chase counter-write sites across modules.

**TDD note:** Wrote 20 counter tests first, then implemented. One
test had wrong expected value: after two same-pillar moves,
switching pillar gave alternationCount=2 in my expectation but
=1 in the impl (correct — same-pillar resets alternationCount to
0, then the switch goes 0→1). Updated test, not impl.

**Cascading shell activations:** Shell-activated +2 Separation
can cross the next threshold and activate ANOTHER Shell on the
next call (not within the same call — `expected` is computed
from input sep before the loop). At sep=5, one call activates 1
shell and raises sep to 7; a second call sees sep≥6 and activates
another. Updated the "calling twice at sep=5" test to assert this
intentional cross-call cascade behaviour.

**Pre-existing bug fix flagged:** `card-gifted` event now bumps
Illumination on Chesed gift. Before this refactor, gifts were
silent. This is a behaviour fix, not just a refactor — called out
explicitly in the commit message.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (152/152 — was 132,
  added 20 for counters), build ✓.
- Pre-review commit; code-reviewer runs next.

**Commit(s):** `33f3006`

---

## 2026-04-24T23:51:26-04:00 — #15: review fixes (second push)

**Pushed:** code-reviewer found four significant gaps. All addressed:

- **`spark-spent` event never emitted.** `useSpark` removed the
  Spark from `sparksHeld` but didn't bump Illumination. Same class
  as the Chesed-gift bug. Added emission after `recordSpend`.
- **`recordPillarMove` was dead code.** `applyMove` never called
  it. Wired the streak update + event fold into `applyMove`'s
  success path. Pillar tracking now actually fires.
- **`assist-contributed` event variant added.** Per
  `design/mechanics.md`, a successful assisted check awards the
  *assistant* +1 Illumination per assist. Variant added to
  `events.ts`; one event emitted per non-empty `assistStats` entry
  in `resolveChallenge` on success.
- **`move-downward` event variant added.** Per design, a voluntary
  move toward Malkuth (higher `sefirah.number`) grants +1 Illumination
  as humility. Variant added; `applyMove` emits it when the
  destination's number exceeds the origin's.

**Improvements taken:**
- Documented the dual-threshold-emission case in `recordPillarMove`
  jsdoc — same-pillar resets alternation to 0 and cross-pillar
  resets sameCount to 1, so dual emission is structurally
  unreachable. The dual checks remain as defensive code.
- Documented the streak-state bifurcation (state updates inline,
  side-effects via events).
- Added a one-sentence note that the triggering move isn't
  counted toward the next streak (sameCount → 0, not 1).
- New tests:
  - `assist-contributed` and `move-downward` deltas in counters.test.ts.
  - Integration: `applyMove` downward → +1 Illumination.
  - Integration: `applyMove` upward → 0 Illumination.
  - Integration: `applyMove` updates `pillarStreak`.
  - Integration: per-Spark, `useSpark` emits +1 Illumination on spend.

**Why:** All four reviewer findings were live counter gaps. The
ticket explicitly says "every counter change traceable to an event"
— with these gaps, that wasn't true. Now it is.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (166/166 — was 152,
  added 14 here), build ✓.
- Reviewer praised closed-union shape, applyEvent same-reference
  on zero-delta, acceptSetback signature, shell-activated emission
  scope, and the card-gifted behavior fix folded in.

**Commit(s):** `6c118a9` (pushed as `9013877`)

---

## 2026-04-25T00:12:12-04:00 — #15: second-round review polish

**Pushed:** Re-ran `code-reviewer` on the fix commit (user asked
whether the fix itself had been reviewed; it hadn't). Verdict:
"Ship." Two minor improvements taken:

- **`assist-contributed` JSDoc contradiction.** Previously said
  "the challenger does not get the +1 — the assistant does" and
  then admitted the event was anonymous. Reviewer flagged the
  mismatch. Rephrased: "Illumination is team-wide, so per-
  assistant attribution isn't needed for the counter; `challengerId`
  and `sefirah` are recorded for audit/log use."
- **`for (let i = 0; ...)` with unused `i`** in `resolveChallenge`
  → `for (const _stat of modifiers.assistStats)`. Same loop count;
  unused-binding intent is now explicit.

**Why:** Closing the workflow loop. Per CLAUDE.md, code review
runs before PR — but I'd been pushing fix commits without
re-review. Surfaced when the user asked directly. Pattern fix:
re-review fix pushes, even minor ones.

**Design question deferred:** reviewer noted a zero-stat assist
still emits +1 Illumination. Whether that's "declared assist" or
"meaningful assist" is a design call. Leaving as-is for #15; a
future ticket can clarify.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (166/166).
- Build not re-run (no runtime change).

**Commit(s):** `42a66c5`

---

## 2026-04-25T00:28:16-04:00 — design clarifications: hand cap, deck scaling, gift handling

**Pushed:** Design-doc changes only (no code). Three rule
clarifications worked out in conversation:

- **Hybrid deck scaling.** A 2-player game uses 1 deck (22 cards);
  3- or 4-player uses 2 decks (44 cards). Two decks lets multiple
  players hold the same path-key — coordination still matters but
  isn't choked by a single rare card.
- **Hand-size cap = 6.** Starting hand uniformly 4, leaving a
  2-card buffer for early gifts/draws before the cap binds.
- **Discard recycle.** When draw pile empties, shuffle discard
  face-down into a new draw pile. Game runs as long as cards
  exist anywhere in the system.
- **Gift-at-cap handling.** A gift offered to a player at the cap
  forces a choice: refuse (+1 Separation) or immediately discard
  one card (no Separation cost) and accept.
- **Gevurah's "Sacred No."** Gevurah may refuse gifts without the
  +1 Separation cost. New strength paired with the existing
  "cannot initiate gifts" weakness.
- **"Gift for free" → "gift outside your turn."** Chesed Spark
  and Soul Aspect copy was misleading — there's no card cost on
  a normal gift; the cost is the timing restriction (gifts
  normally only happen during your own turn). Cleaned up.

**Why:** User flagged two real holes — the "for free" wording
implied a card cost that doesn't exist, and the 22-card deck
math obviously couldn't support a 4-player session.

**Notes:**
- Files changed: `design/mechanics.md` only.
- Engine consequences tracked in #56 (hand-cap enforcement,
  deck-scaling deal, discard recycle reducer).
- Tests/typecheck/lint still green (no code changed).
- Build not re-run (no runtime change).

**Commit(s):** `ae703df`

---

## 2026-04-25T00:52:02-04:00 — #16: endgame + Final Threshold (last Phase 1 ticket)

**Pushed:** TDD-first implementation of the win/loss + Final
Threshold engine layer.

- `checkEndgame(state)` — flat `EndgameStatus` with `status` and
  optional `reason`. Loss precedence: separation overflow at ≥15,
  then stranded (no cards anywhere). Win when all at Kether AND
  illumination ≥ separation + 5.
- `canReachKether(state, from)` — BFS over the induced subgraph
  whose edges are paths whose arcanum cards are pooled across the
  team (hands + deck + discard). 10 Sefirot, 22 paths max — array-
  shift queue is fine. Pure utility, exposed for UI hints.
- `resolveFinalThreshold({ state, cardPlays, sparkBurns })` — the
  Kether ritual. Discards committed plays (no path travel at
  Kether), burns sparks 1-for-1 via the standard `spark-spent`
  event (each = +1 Illumination through `applyEvent`), then
  evaluates the win condition. Returns `Result<…, 'not-all-at-
  kether' | 'game-already-lost' | 'card-not-held' | 'spark-not-
  held'>`. On success, status is `'won'` or `'lost'` with
  `reason: 'illumination-gap'`.

**Why:** Closes the Phase 1 engine. With this, every counter
rule that affects the outcome is in code, and the orchestrator
(later ticket) can drive a full game from setup through threshold.

**Reviewer findings addressed in fix push:**
- Significant: `resolveFinalThreshold` could declare a win on a
  state `checkEndgame` calls lost (separation overflow). Added
  `'game-already-lost'` rejection at the top of the ritual.
- Significant: `'illumination-gap'` lived on `EndgameStatus`
  where it was dead — `checkEndgame` never emits it. Moved onto
  `FinalThresholdSuccess.reason`, its only emission site.
- Minor: BFS adjacency build cleaned via local `addEdge` helper.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (189/189).
- Tests adjusted: the "fresh game returns ongoing" test originally
  used `makeState()` defaults (empty deck), which collided with
  the explicit "stranded" test using identical state. Updated the
  ongoing/won-at-Kether tests to provide a card so the contrast
  with stranded is unambiguous.

**Commit(s):** `6f0935e`, `1b9c186`

