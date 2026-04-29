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

---

## 2026-04-25T01:40:42-04:00 — #17: Tree of Life board SVG (first Phase 2 ticket)

**Pushed:** Static SVG component for the centerpiece visual. 10
Sefirot in three-pillar geometry, 22 paths between them, accessible
labeling, and a `/demo/tree` dev-only render route.

- `components/tree/TreeBoard.tsx` — viewBox 400×620, pillars at
  x=80/200/320, vertical positions tuned for legibility. Each
  Sefirah node = colored circle + Hebrew glyph + English name +
  number. Each path = labeled line with `<title>` tooltip.
- Pillar orientation: Mercy on viewer's right (matches the project's
  reference convention); other Tree diagrams mirror this — choice
  is now consistent within this codebase.
- Hebrew glyph color hardcoded per Sefirah for known-good contrast
  rather than computed from luminance — borderline cases (Yesod's
  violet, Malkuth's russet) get hand-tuned values.

**Why:** First piece of art tooling. The board is the visual
identity of the game; everything else (cards, tokens, meters)
will be designed to live alongside it.

**Reviewer findings addressed in fix push:**
- Significant: Malkuth label clipped at viewBox bottom — extended
  to 620.
- Significant: outer `role="img"` was masking per-node/per-path
  `aria-label`s. Switched to `role="figure"` + child `<title>`.
  Phase 3 needs per-node AT focus.
- Significant: `↔` in path labels reads as "left right arrow" in
  every screen reader. Replaced with prose ("between X and Y").
- Improvement: gradient ID scoped via `useId()` so two TreeBoards
  in one DOM can coexist.
- Improvement: `renderStarfield` → proper `Starfield` component.
- Improvement: path-label test now asserts letter, arcanum, and
  both endpoint names appear in the aria-label, not just the path
  number.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (171/171), build ✓.
- Started this ticket while #58 was still awaiting merge — Phase 2
  art is independent of the engine work, no shared file conflicts.

**Commit(s):** `180feda`, `bd55a9b`

---

## 2026-04-25T01:56:38-04:00 — #18: 22 Major Arcana SVGs (symbolic minimalist)

**Pushed:** Full Tarot deck for the player's hand. 16-glyph shared
vocabulary, per-card composition, three-thirds layout, parameterized
snapshot tests, demo grid at `/demo/cards`.

- `components/cards/glyphs.tsx` — 16 atomic geometric primitives
  (Triangle, InvertedTriangle, Square, Circle, Crescent, Sun,
  Cross, Wave, Spiral, Lightning, Star, Vesica, Wheel, Scales,
  Hexagram, Crown). Each is a stateless component taking
  `{cx, cy, size, color, opacity}`. `Star` parameterized by
  `points` (5/6/8) and `rotation` (degrees).
- `components/cards/glyph-mapping.ts` — per-card composition
  (1–3 glyphs each) inside a 200×106 glyph zone. Each entry has
  a comment justifying the symbolic choice.
- `components/cards/attribution-colors.ts` — element/planet/sign
  → muted hex. Color band at the card's bottom is keyed off this.
- `components/cards/ArcanumCard.tsx` — 200×320 viewBox, three
  thirds: large Hebrew letter / glyph composition / number+name+
  attribution + accent band. `role="figure"` + `<title>` follows
  the same AT pattern as TreeBoard.

**Why:** With Tree (#17) and Cards (#18) both done, the visual
identity is established. Phase 3 components (#21 interactive tree,
#22 hand fan) can compose these without any further art work.

**Reviewer findings addressed in fix push:**
- Significant: Scales pan arcs drew upside-down (sweep flag 0
  traces ∩, needed 1 for ∪). Justice was rendering with crown-
  shapes instead of pans.
- Significant: Devil's pentagram pointed up despite the comment
  claiming "microcosm flipped". Added `rotation` prop to `Star`
  and rotated the Devil 180°.
- Significant: glyph-zone height comment said 200×100, actually
  200×106 — would have caused ~6px placement errors for future
  authors.
- Improvement: Aquarius and Cancer shared a hex; bumped Aquarius
  to a distinct teal.
- Improvement: glyph keys are stable strings (`glyph-cx-cy`) not
  array indices.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (216/216), build ✓.
- Branched from main while #58 (engine endgame) and #59 (tree
  board) were both still in review. No file conflicts — all three
  are independent.

**Commit(s):** `b499b7c`, `a401b4a`

---

## 2026-04-25T02:09:37-04:00 — #19: tokens (player, Spark, Shell, d20)

**Pushed:** Token-tier SVGs to complement the Tree (#17) and the
Major Arcana (#18).

- `PlayerToken` — colored circle + initial, 4 distinct accent colors.
- `SparkIcon` — 10 Sefirah-keyed inventory glyphs (lit core,
  Sefirah-color, Hebrew mark letter).
- `ShellIcon` — 10 Sefirah-keyed pressure indicators with
  dormant/active/banished states; jagged 12-tooth ring inverts the
  Spark's smooth halo.
- `D20` — hexagonal-projection icon with optional value overlay.

**Why:** Phase 2 art moves from "centerpiece + cards" into the
smaller-asset layer the UI will need everywhere — inventory rows,
on-tree player markers, roll modals, Shell-state panels.

**Reviewer findings addressed in fix push:**
- Significant: Chokmah and Chesed both used ח as their mark letter
  (each Sefirah's first Hebrew letter, naive heuristic). Players
  relying on glyph (colorblind / monochrome) couldn't tell them
  apart. Extracted `sefirahMarkLetter` to `data/sefirah-glyphs.ts`,
  Chesed special-cased to ס. New test asserts 10 distinct glyphs.
- Significant: `darken()` would collapse Binah's near-black base
  into the page background. Added a 0x30 per-channel floor.
- Significant: D20 text at fontSize 14 was tight against the inner
  triangle for two-digit values. Reduced to 11, switched to
  `dominantBaseline="central"`. Also added `data-d20-value` hook
  for the Phase 3 challenge-modal animation.
- Improvement: Shell ring + disc now grouped under one
  `<g opacity={...}>` so future translucent fills won't stack
  weirdly.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (227/227), build ✓.
- Branched from main while #58, #59, #60 are all in review. No
  file conflicts.

**Commit(s):** `68f2708`, `eeac5f3`

---

## 2026-04-25T02:19:51-04:00 — #20: iconography & UI chrome (Phase 2 complete)

**Pushed:** Final Phase 2 art ticket. Smaller chrome SVGs filling
the gap between the centerpiece (Tree, Cards) and the per-game
tokens (Spark, Shell, d20, Player).

- `PillarMarker` (3): Mercy/Severity/Balance chevron variants.
- `StatIcon` (10): one geometric glyph per stat, themed via
  `currentColor` for consumer flexibility.
- `Meter`: `<div role="meter">` with CSS-transition fill, vertical
  or horizontal. Throws on `max <= 0` (programmer error). Visual
  and ARIA agree on clamp semantics.
- `Flourish`: decorative section divider.

**Why:** With this, every static visual the UI tickets in Phase 3
will need is in place. No more art ticketing until Phase 6 polish.

**Reviewer findings addressed in fix push:**
- Significant: `Meter` silently treated `max=0` as `max=1`. Now
  throws — consistent with engine programmer-error pattern.
- Significant: `aria-valuenow` reported raw value while visual
  was clamped (e.g. `aria-valuenow="25"` on a full bar with
  `max=10`). Now both clamp to `[0, max]`.
- Significant: inline `width`/`height` on the Meter root silently
  overrode `className`-based sizing. Removed; sizing now comes
  purely from class or wrapper style.
- Significant: `strength` stat icon used two triangles sharing an
  edge — double-stroke read as a glitch at small sizes. Collapsed
  to a single chevron polygon.
- Tests added: max=0 throw, aria clamp on overflow, CSS transition
  on the fill axis (the "animates smoothly" acceptance criterion).

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (203/203), build ✓.
- Phase 2 (#17–#20) now all in review: #59, #60, #61, and this PR.

**Commit(s):** `4d3f84a`, `800dfd0`

---

## 2026-04-25T17:27:57-04:00 — #21: Tree board interactive (Phase 3 begins)

**Pushed:** First Phase 3 ticket. Extended `TreeBoard` with optional
GameState-driven props that turn the static board into the game's
primary interactive surface.

- New props on `TreeBoard`: `state`, `activePlayerId`, `onPathClick`.
  All optional and additive — without them the board renders exactly
  as before.
- Player tokens render on top of each player's current Sefirah,
  stacking horizontally below the node when multiple players share
  one. The active player's token gets a brighter outer ring.
- Paths the active player can travel render gold + thicker stroke;
  others stay dim. Highlighted paths become `role="button"` with
  `tabIndex={0}` and respond to click + Enter/Space — non-
  highlighted paths stay `role="img"`.
- `components/tree/valid-paths.ts` is the UI-side wrapper around
  the engine's `adjacentPaths`. Soft-fails to `[]` on unknown ids
  so a stale `activePlayerId` during a real-time state transition
  doesn't crash the render path.

**Why:** First piece of UI that actually plays the game — the
board becomes a control, not a decoration.

**Reviewer findings addressed in fix push:**
- Significant: token color was indexed by array position. If a
  player disconnected, the others' colors silently reshuffled.
  Switched to a djb2 hash of `player.id` so colors are stable.
- Significant: dead `onPathClick?.()` optional chains. Captured
  the callback in a const so closures don't carry misleading `?.`.
- Tests added: read-only highlight case (state + activePlayerId,
  no onPathClick); stale-id case (activePlayerId not in state).
- Stacking test now asserts exact cx values (189/211 for two
  tokens centered on Malkuth at x=200).
- Aria-label assertions tightened to the exact template.
- Initial-letter fallback uses player id rather than array index.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (352/352), build ✓.

**Commit(s):** `db8837b`, `0b8f3d0`

---

## 2026-04-25T17:37:59-04:00 — #22: card hand component

**Pushed:** Player hand renders as a fan of cards. ArcanumCard faces
when `visible`, CardBack when not. `onCardSelect` fires on click +
Enter/Space; ArrowLeft/Right roving-tabindex navigation across the
hand. `selectedArcanum` highlights the selection.

- Visibility derived via `isHandVisible(state, viewer, owner)`:
  always true for the owner; otherwise true only when the owner has
  ascended into the upper Tree (Kether/Chokmah/Binah). Tiferet
  intentionally excluded — the supernal threshold matters
  narratively.
- When `visible={false}`, no arcanum number reaches the DOM at all
  (no `data-arcanum`, no ArcanumCard rendered) — defensive against
  a server that mistakenly sends hidden hands.
- `CardBack` shares ArcanumCard's 200×320 footprint so they're
  interchangeable in any layout.

**Why:** First UI surface for actually playing cards. Pairs with
the interactive Tree from #21 — click a card to select, then click
a highlighted path to play. (Two-click flow per the design doc;
drag-and-drop is a later ticket.)

**Reviewer findings addressed in fix push:**
- Significant AT regression: visible read-only hands used HTML
  `disabled`, which strips buttons from the accessibility tree.
  Switched to `aria-disabled` for visible hands so AT users can
  still read their cards. HTML `disabled` only applies to
  face-down cards now.
- `useEffect` focus clamp had `focusIndex` in its dep array,
  causing spurious re-evaluations on every keypress. Switched to
  a functional updater, dep array reduced to `[hand.length]`.
- Tightened the leak test from a substring match (`'arcanum-2'`)
  to an attribute match (`data-arcanum=`) plus card-name
  exclusion.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (355/355), build ✓.
- React key on hand items is `${i}-${arcanum}`. Major Arcana are
  unique within one deck; the 3–4-player hybrid rule allows two
  decks where duplicates can occur. Comment on the key documents
  this; switching to card-instance identity is a future schema
  change to PlayerState.hand.

**Commit(s):** `7c01bc8`, `777e8a5`

---

## 2026-04-25T17:46:34-04:00 — #23: stat sheet / character panel

**Pushed:** Per-player display — 10 stats, optional Soul Aspect
badge with +2 to the bonus stat, Sparks held. `activeStat` highlights
the stat being rolled this turn. Two layout modes: expanded (default,
2-col grid) and compact (single wrap-row of stat chips).

- Soul Aspect bonus is rendered into the displayed total so the
  player rolls with the visible number; a small `(+2)` badge surfaces
  the source via `aria-label="Soul Aspect bonus, +2"` and a `title`
  carrying the base value.
- `activeStat` triggers `bg-illumination/10 ring-1 ring-illumination`
  on the matching row.
- Sparks held render as a row of `SparkIcon`s; an empty state
  shows a "No Sparks held" line.

**Why:** Orchestrator view needs per-player at-a-glance state during
a turn. `activeStat` will tie this panel to the challenge modal (#24).

**Reviewer findings addressed in fix push:**
- Significant: redundant `role="region"` on a `<section>` that
  already gets the implicit region role via aria-label.
- Significant: `(+2)` badge had no `aria-label` for AT.
- Compact-mode bonus test added: bonus logic lives on two render
  branches; existing tests only covered the expanded one.
- `BodyProps` marked `readonly` for parity with public props.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (354/354), build ✓.

**Commit(s):** `452c195`, `526e00a`

---

## 2026-04-25T17:57:01-04:00 — #24: challenge modal + animated d20

**Pushed:** Modal-style UI for resolving a d20 stat-check. State
machine: committing → rolling → reveal (with retry/accept fork on
fail).

- ChallengeModal: takes a `context` (sefirah + stat + ally pool +
  burn limits), a seeded `Rng`, and an `onResolved` callback. Pure
  presentation — never mutates GameState; the orchestrator applies
  the resolution.
- D20Roll: thin animated wrapper around the existing `D20` token.
  Cycles random faces for 800ms via requestAnimationFrame, then
  settles on the final value. Honors `prefers-reduced-motion`.
- Tests use `seededRng` + fake timers so the dice and the
  animation are deterministic.

**Why:** The check modal is the moment-of-truth UX for the entire
game — every Sefirah arrival flows through it.

**Reviewer findings addressed in fix push:**
- Significant: silent DC=0 fallback when context.sefirah was
  non-check (Malkuth/Kether). Now throws.
- Significant: `handleRoll` had no double-click guard. Added
  phase check; new test covers it.
- Documented the rng contract on the props interface (each Roll
  consumes one value).
- Fixed a misleading test comment about "1+20=21 fails" (it
  doesn't — corrected).

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (353/353), build ✓.

**Commit(s):** `dc4be3e`, `6a0f610`

---

## 2026-04-25T18:04:53-04:00 — #25: team Illumination + Separation tracker

**Pushed:** Two vertical meters side-by-side, both keyed to
`SEPARATION_LOSS_THRESHOLD` (15) so heights are commensurable.
Separation overlays Shell-activation threshold markers at
{3, 6, 9, 12}. aria-live announcer reports deltas. Optional
pillar-streak readout below.

**Why:** Self-contained team-counter component for the orchestrator
HUD to compose against game state.

**Reviewer findings addressed in fix push:**
- Significant: threshold marker transforms split between className
  and inline style — inline overwrote className, dropping the X
  centering. All transforms now live in inline style.
- Significant: dead `liveRef` removed.
- Significant: 0/0 streak now labeled "none" (was "imbalance" by
  default — misleading for fresh games).
- Improvement: replaced `indexOf` with map index for the Shell
  number in the threshold tooltip.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (351/351), build ✓.

**Commit(s):** `4866200`, `c480cb3`

---

## 2026-04-25T18:12:11-04:00 — #26: Shell indicator panel (Phase 3 complete)

**Pushed:** Per-Sefirah Shell display: 10 slots in a grid, one per
Sefirah. Each slot uses the existing ShellIcon and shows dormant
/ active / banished state. Active slots render the effect copy
inline; banished slots strike through their keyword.

- `shell-copy.ts` — descriptive (non-traditional) Shell titles +
  one-sentence effect summaries per `design/shells.md`.
- `headingLevel` prop (default 3) drives the panel's heading
  element so callers slot into their own document hierarchy
  without producing a heading skip.
- Each slot is keyboard-focusable (`role=group`, `tabIndex=0`)
  with the full title + effect + status composed into a single
  `aria-label`. AT users tab through the panel and hear the
  context on focus.

**Why:** Last Phase 3 ticket. With this, the team-side UI surface
(Tree + Hand + StatSheet + ChallengeModal + TeamMeters + ShellPanel)
is in place. Phase 4 wires these together via game-flow tickets.

**Reviewer findings addressed in fix push:**
- Significant: AT regression — sr-only span had no programmatic
  association to any focusable element. Slot is now focusable with
  a comprehensive aria-label.
- Significant: hardcoded <h3>. Now level-driven via prop with a
  sensible default.
- Improvement: Tailwind opacity conflict on banished keyword
  resolved by computing the class once.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (350/350), build ✓.
- Phase 3 complete pending merges (#63–#67 + this PR).

**Commit(s):** `005ee00`, `e61c9f5`

---

## 2026-04-25T19:07:04-04:00 — #27: Sefirot-blessing ritual (Phase 4 begins)

**Pushed:** First Phase 4 (game-flow) ticket. Ten-step ritual where
players roll 3d6 for each stat in Kether → Malkuth order.

- `ritual-copy.ts` holds per-Sefirah essence (verbatim from
  reference/sefirot.md) + invocation (one-line imperative).
- Component takes a seeded `Rng` so tests assert deterministic
  stats. State machine per step: 'awaiting' → 'rolled' → 'received'.
- onComplete fires from a useEffect, not synchronously inside the
  advance handler.
- Pre-commit completeness check throws loudly if any stat is
  missing, rather than silently casting an incomplete StatSheet.

**Why:** The ritual is the game's emotional opening — the first
on-screen experience for a new player.

**Reviewer findings addressed in fix push:**
- Significant: `stats as StatSheet` cast was unsound. Now validated
  with an explicit missing-stat check that throws.
- Significant: `onComplete` was firing mid-handler. Moved to
  useEffect keyed on stepIndex crossing the boundary.
- Significant: dead `autoAdvance` prop + empty block removed.
- Tests: onComplete called exactly once; not fired mid-flow;
  first-stat lookup derives from data.
- A11y: RollDisplay wrapped in role=status / aria-live=polite.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (414/414), build ✓.

**Commit(s):** `5882a84`, `4ecd122`

---

## 2026-04-25T19:13:41-04:00 — #28: Soul Aspect picker

**Pushed:** Six-card class picker (Chesed, Gevurah, Tiferet, Hod,
Netzach, Yesod). Each card shows title, +2 stat callout, ability,
and weakness. Selecting + Confirm fires `onPick(aspectKey)`.

- `taken` prop maps already-claimed aspects → taker names. Those
  cards render aria-disabled with the taker name visible (kept
  focusable so AT users can hear "Taken by Andy").
- Pure presentation. The orchestrator applies the +2 bonus and
  persists the choice; this component just emits the pick.

**Why:** Second Phase 4 setup component. After the blessing
ritual produces stats, the aspect picker layers the class
identity on top.

**Reviewer findings addressed in fix push:**
- Significant: `taken` prop typed `Partial<Record<SoulAspectKey,
  string>>` rather than `Record<string, string>` so a typo
  doesn't silently render an aspect as available.
- Improvement: aria-disabled instead of HTML `disabled` so AT
  users can read the taker text.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (413/413), build ✓.

**Commit(s):** `324ca6f`, `785b32c`

---

## 2026-04-25T19:22:12-04:00 — #29: lobby + initializeGame engine deal

**Pushed:** First Phase 4 ticket that touches both engine and UI.

- `engine/setup.ts` — pure `initializeGame(input)` builds a fresh
  GameState. Deck = N copies of arcana 0..21 (N from
  `deckCountFor(playerCount)` per design doc: 2p→1, 3-4p→2).
  Fisher-Yates shuffle driven by seeded Rng, deal
  STARTING_HAND_SIZE=4 to each player from the top, place every
  player at Malkuth, fold Soul Aspect +2 into the matching stat,
  init counters/shells/streak to empty.
- `components/setup/Lobby.tsx` — between-setup-and-play screen.
  Per-player readiness rows, host-only Begin button enabled when
  2-4 players are all ready and have aspects chosen. Pure
  presentation; orchestrator calls `initializeGame` on Begin.

Yesod's "start one Sefirah below Malkuth" weakness is currently
flavor — the engine has no sub-Malkuth waypoint. Documented at
the call site so the future ticket that adds it has clear pickup.

**Why:** Closes the setup → play boundary. Combined with #27 + #28,
the full setup pipeline (ritual → aspect → lobby → deal) now exists.

**Reviewer findings addressed in fix push:**
- Significant: removed `soulAspectBonusStat` parameter that was
  built via a cast and would silently NaN stats on unknown keys.
  Replaced with `soulAspectByKey().bonusStat` (throws on miss).
- Significant: same hazard in Lobby's `ASPECT_TITLE`. Replaced
  with `aspectTitleFor(key)` helper using the same throwing lookup.
- Significant: removed dead `continue` in shuffle that would have
  masked a broken Rng. Now throws explicitly.
- Removed redundant player-count throw — `deckCountFor` is
  authoritative.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (425/425), build ✓.

**Commit(s):** `6966833`, `843c356`

---

## 2026-04-25T19:26:48-04:00 — #30: useTurn hook (turn orchestration core)

**Pushed:** Turn-loop state machine implemented as a React hook
that wraps existing engine reducers. Four phases per turn:
  1. move — applyMove or meditate (skip)
  2. challenge — entered on arrival at uncleared check-kind Sefirah
  3. draw — refill toward 4, cap 6, recycle discard if deck empties
  4. end — endTurn rotates active player, phase resets

- `isActive(playerId)` gates UI per turn ownership. Out-of-turn
  Soul Aspect abilities can bypass via direct engine calls.
- Hook owns phase + active-player index; `state: GameState` is
  settable from outside via `setState(s)`. That keeps it
  composable with Supabase Realtime in Phase 5 (server-push →
  setState → next render).
- Tests cover the phase machine, draw refill, hand cap, and the
  discard-recycle path.

**Why:** The actual TurnOrchestrator React component (composing
Tree + Hand + ChallengeModal + StatSheet + meters around this
hook) is straightforward wiring once those Phase 3 components
hit main. The state-machine contract is the meaningful piece;
the component will follow as a thin shell.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (412/412), build ✓.

**Commit(s):** `507c090`

---

## 2026-04-25T19:34:31-04:00 — #31: Final Threshold UI (Phase 4 complete)

**Pushed:** Endgame screen wrapping the engine's pure
`resolveFinalThreshold`. Each player can play remaining cards
(no path travel — Kether is the end), burn Sparks (+1 Illumination
each), and write an optional one-sentence reflection.

- Live progress: current Illumination, projected after burns,
  target (separation + 5), gap closure status.
- Resolve calls the engine reducer once and emits the
  win/loss/rejection result via `onResolved`.
- JourneySummary post-resolution view: win/loss copy + final
  counters + per-player reflections (display-only; persistence
  is a future feature).

**Why:** Completes Phase 4. Combined with #27/#28 (setup) +
#29 (lobby/deal) + #30 (turn loop), the full game flow exists
end-to-end on the UI side.

**Reviewer findings addressed in fix push:**
- Significant: handleResolve double-fire guard.
- Significant: aria-label said "gap -2" on a cleared threshold;
  switched to prose ("threshold cleared" / "N more needed").
- Memo'd `allAtKether` for parity with other derived values;
  moved above early-return so rules-of-hooks holds.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (413/413), build ✓.

**Commit(s):** `1f79850`, `e754405`

---

## 2026-04-25T20:27:11-04:00 — integration: /play page + Playwright e2e

**Pushed:** The missing top-level page that turns the engine + UI
library into a real game. After Phase 4 merged, every component
existed in isolation but `app/page.tsx` still said "coming soon"
and the `useTurn` hook had no consumer.

- `app/page.tsx` now links to `/play`.
- `app/play/page.tsx` is a phase state machine: ritual(p1) →
  aspect(p1) → ritual(p2) → aspect(p2) → lobby → play. Hot-seat
  for now; Phase 5 swaps the local state for room-based state.
- `components/game/PlayScreen.tsx` composes TreeBoard + Hand +
  StatSheet + TeamMeters + ShellPanel + ChallengeModal +
  FinalThreshold around the `useTurn` hook from #30. Wires
  card-select → path-click → engine.applyMove. Opens the
  challenge modal automatically when arriving at an uncleared
  check Sefirah. Hands off to FinalThreshold when all at Kether.
- `e2e/play-flow.spec.ts` walks the full setup → lobby → play
  flow in a real browser (via Playwright). This is the test the
  "are tests good and meaningful" assessment specifically
  requested — integration coverage no unit test can produce.

**Why:** The user asked "how close to playable" and the honest
answer was "components done; integration missing." This closes
the gap. Single-player hot-seat now plays end-to-end.

**Reviewer findings — all addressed in fix push:**
- CRITICAL: `initializeGame` was being called in render body of
  PlayPage, burning rng values on every re-render. Extracted into
  a `<PlaySession>` child component with useMemo so it runs once.
- SIGNIFICANT: ChallengeModal and engine's `submitChallenge` both
  ran `rollCheck` independently, producing divergent outcomes —
  the player's visible roll was not the roll applied to state.
  Added optional `outcome` field to `ResolveChallengeInput` (and
  threaded through useTurn) so the modal's pre-rolled outcome is
  authoritative. Engine applies it directly; no second roll.
- SIGNIFICANT: ritualRng was shared across both players, making
  P2's stats determined by P1's rolls. Per-player seeds now.
- Plus retry/accept fork in handleChallengeResolved correctly
  honors the player's choice.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (457/457), build ✓,
  e2e ✓ (2/2 passing in real browser).
- Playwright `webServer.timeout` bumped 60s → 180s — first-compile
  of the play route is heavy (Tree SVG + 22 arcana + every icon).

**Documented integration gaps for follow-up tickets:**
- `acceptSetback` wiring on challenge fail → 'accept' (Separation
  cost not yet applied; phase advances cleanly though).
- ChallengeModal modifiers aren't surfaced to the orchestrator
  (zeroed in submitChallenge call). Fix when modal's `onResolved`
  payload widens to carry committed modifiers.
- Single-screen hot-seat: only the active player's hand renders.

**Commit(s):** `eb73412`, `b97d6bf`

---

## 2026-04-26T00:19:01-04:00 — challenge wiring + acceptSetback race fix

**Pushed:** Closes the two integration gaps documented in #74.

- `ChallengeResolution` widened to carry the committed
  `CheckModifiers`. Modal stores them in `committedModifiers`
  state at roll time; `handleFailChoice` includes them.
- `PlayScreen.handleChallengeResolved` forwards the modifiers to
  `submitChallenge` — the engine now applies the same
  assist + burn picture the player saw.
- Failure-accept path applies the engine's separation cost (+1
  normally, +2 on shortcut arrivals) via a new atomic
  `acceptChallengeSetback` action on `useTurn`.
- Failure-retry forces a fresh modal mount via a `retryNonce`
  keyed into the React `key`. Resets on pass / accept so it
  doesn't leak across challenges.

**Reviewer caught a critical bug — fixed in second commit:**
The first commit's accept path called
`turn.setState(acceptSetback(...))` then
`turn.submitChallenge(failed-outcome)`. Both schedule setState
in the same React batch; submitChallenge's internal
`setState(unchanged-on-fail)` ran last and silently overwrote
the setback. The fix adds an atomic `acceptChallengeSetback`
action to useTurn that does both updates in one setState call.

**Why:** The /play flow now applies the player's choices end to
end. Visible roll = engine roll. Visible modifiers = engine
modifiers. Visible setback cost = engine separation tick. Three
classes of integration desync are now closed.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (460/460), build ✓,
  e2e ✓ (2/2 in real browser).
- Single-screen hot-seat (only active player's hand) remains a
  future-ticket gap — multiplayer (Phase 5) is the natural place
  to address that.

**Commit(s):** `c053871`, `46f9d40`

---

## 2026-04-26T01:20:48-04:00 — #32: Supabase schema + typed client (Phase 5 begins)

**Pushed:** First Phase 5 ticket. Lays the multiplayer persistence
layer that subsequent tickets (#33–#36) will build on. The schema
draws a clear line between client writes (game_events append-only
+ self-update on players) and server-authoritative writes
(game_states snapshot, rooms.state transitions).

- `supabase/migrations/0001_init.sql` — rooms / players /
  game_states / game_events with RLS. Membership-based reads;
  client-side appends to events; service-role-only writes to
  game_states.
- `lib/supabase.ts` — typed client wrapper. Browser singleton +
  fresh server-per-call. Round-trippable serialization for the
  engine's Set-typed fields.
- `.env.example` — public anon key vars; service role key
  excluded by design.
- `README.md` — multiplayer setup section.

The actual Supabase project creation is the user's task — that
needs a dashboard. The PR lands the SQL, types, and docs.

**Reviewer found two SQL blockers + a security-comment lie. Fix
push addressed all:**
- Constraint syntax error on `players_seat_range_chk` would have
  prevented the migration from applying.
- `players.id default gen_random_uuid()` would have broken the
  RLS model — every read policy keys on `id = auth.uid()`. Now
  the client must supply `auth.uid()` (enforced at insert
  policy).
- `nickname_hash` column claimed a `crypt()` security check that
  was never implemented. Dropped the column entirely rather than
  leave a misleading "this does X" comment.
- UUID-to-text casts in RLS → native UUID compares (planner can
  use the pkey index).
- Documented that `rooms`/`game_states` have no client INSERT
  policies on purpose (service-role-only writes).

Plus a latent client/server bug: the singleton with
`persistSession: true` would have silently misbehaved if a
server component called it. Split into
`getSupabaseBrowserClient` and `createSupabaseServerClient`.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (468/468), build ✓.
- Tests cover client factory pair + Set-field round-trip +
  scalar preservation.

**Commit(s):** `4079cd6`, `4575cf3`

---

## 2026-04-26T13:32:26-04:00 — #33: room create + join flow

**Pushed:** Second Phase 5 ticket. Home page now offers New
game / Join game; lobby route fetches and renders the joined
players. Hot-seat / single-machine link is preserved as the
solo entry point.

- `lib/room-code.ts` — pure 6-char generator + validator
  (confusable-free alphabet, no I/O/0/1).
- `lib/rooms.ts` — `createRoom` / `joinRoom` client helpers.
  Both ensure an anonymous Supabase session (auth.uid becomes
  the players.id per the RLS contract from #32). createRoom
  retries on code collision and rolls back the orphan room if
  the player insert fails. joinRoom is idempotent for callers
  already in the room.
- `components/setup/HomeRoomForms.tsx` — client-component
  forms with nickname + create / join inputs. Routes to
  `/rooms/[code]/lobby` on success.
- `app/rooms/[code]/lobby/page.tsx` — fetches room + players,
  renders the existing `Lobby` component. Manual refresh
  button until #34 wires Realtime.

The Supabase `Database` typing relaxed `readonly` modifiers
but still collapsed Insert overloads to `never` in v2.104. The
client surface in `lib/rooms.ts` uses an unparameterized
`SupabaseClient` and types reads explicitly via `.single<T>()`
as a pragmatic workaround.

**Reviewer caught three blockers — all fixed in second commit:**
- The `rooms_member_select` RLS made `joinRoom` unreachable for
  any new user (chicken-and-egg: read denied because not yet a
  member). Added `rooms_find_by_code` policy: any authenticated
  user can resolve a code → room id.
- `createRoom`'s rollback `delete` would silently fail because
  no DELETE policy existed. Added `rooms_host_delete_lobby`
  scoped to host + lobby state.
- Lobby page used `use(params)` which is Next 15; project is on
  Next 14. Switched to plain object params.

**Notes:**
- Gates green: typecheck ✓, lint ✓, test ✓ (488/488), build ✓,
  e2e ✓ (2/2 in real browser).
- 18 new unit tests for room-code generation/validation +
  joinRoom/createRoom (mocked Supabase).

**Commit(s):** `2406972`, `6bdd3dc`

## 2026-04-26T20:55:00-04:00 — #34: Realtime state sync — draft 1

**Pushed:**
- `lib/room-actions.ts` — `applyClientAction(state, action, rng)`
  pure dispatcher over the `move | submit-challenge | accept-setback`
  ClientAction union. Submit-challenge accepts an optional pre-rolled
  `outcome` so the modal d20 stays the single source of truth and
  client/server don't double-roll.
- `lib/realtime.ts` — `useRoomState(roomId)` hook. Initial snapshot
  via `.maybeSingle<GameStateRow>()`, then a per-room `postgres_changes`
  UPDATE channel. Strict-mode-safe via cancelled-flag cleanup.
  Returns `{state, connected, error, lastEventId}`.
- `app/api/rooms/[code]/events/route.ts` — POST endpoint. Bearer auth +
  `auth.getUser(token)` identity verification, then loads snapshot,
  folds via `applyClientAction`, appends to `game_events`, writes the
  `game_states` snapshot via the service-role client. RNG seeded from
  `last_event_id + 1`.
- `lib/supabase.ts` — new `createSupabaseServiceClient` helper.
- `app/api/rooms/[code]/events/__tests__/route.test.ts` — 5 tests
  covering the auth gate (missing-bearer, invalid-token,
  identity-mismatch, invalid-json, invalid-action-shape).

**Why:** wires the multiplayer pipeline end-to-end. With #32/#33
shipping the schema and lobby join/create, this is the round-trip
that makes a remote player's action visible on every other client's
screen. Turn-ownership enforcement is #35; presence/disconnect is #36.

**Reviewer caught two blockers — fixed in third commit:**
- The snapshot write went through the caller's anon JWT, but
  `game_states` has no UPDATE RLS policy by design (engine-only
  writer). Postgres would deny the UPDATE — every action would 500
  in production. Switched to the service-role client; added
  `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` with a server-only
  warning.
- `action.playerId` was trusted from the request body. The engine
  would have folded state under a forged identity before the
  `game_events` RLS rejected the insert (after-the-fact, leaking
  implementation detail as 500). Now `auth.getUser(token)` runs
  before any engine work; mismatch returns 403 `identity-mismatch`.

**Notes:**
- The event-insert and snapshot-update are NOT atomic. If the
  snapshot write fails after the event is appended, the event log
  remains the source of truth on restart. Documented in the route
  file; transactional fix likely lands as an edge function in a
  follow-up.
- Hit the same `Database`-generic-collapses-Insert-to-`never` trap
  that `lib/rooms.ts` already documented; aliased the typed client
  to plain `SupabaseClient` for the writes inside the route.
- `vi.mock` callback can't take a `typeof import(...)` annotation
  under the project's eslint config — switched to a static
  `import type * as SupabaseModule from '../supabase'`.
- Gates green: typecheck ✓, lint ✓, test ✓ (503/503), build ✓,
  e2e ✓ (2/2). 15 new unit tests across room-actions, realtime, and
  the events route.

**Commit(s):** `7936db6`, `5e6cb18`, `230896b`

## 2026-04-26T22:55:35-04:00 — #35: Turn ownership & action authorization — draft 1

**Pushed:**
- `engine/types.ts` — `activePlayerId: string` added to `GameState`.
  Server-authoritative turn pointer; the events route checks the
  caller's `auth.uid()` against this field.
- `engine/turn.ts` (NEW) + tests — pure `endTurn(state)` reducer
  that advances `activePlayerId` to the next seat in `state.players`
  order. Wraps last → first; throws if the active id has fallen out
  of the player list (corruption guard).
- `engine/setup.ts` — `initializeGame` defaults
  `activePlayerId = players[0].id`. Empty-players guard added.
- `test/fixtures.ts` — `makeState` defaults `activePlayerId` to the
  first player so existing single-player tests keep working without
  enumerating it.
- `lib/use-turn.ts` — drops local `activePlayerIndex` React state;
  derives the index from `state.activePlayerId`. `endTurn` folds
  through the engine reducer so single-player and multiplayer share
  one advancement rule. Unused `initialActiveIndex` option removed.
- `lib/room-actions.ts` — adds `'end-turn'` ClientAction; dispatcher
  folds via `endTurn`.
- `lib/authorize.ts` (NEW) + tests — pure
  `authorize(action, state, callerId)`. Today's rules: identity
  binding (action.playerId === callerId) and turn-locked (caller
  must equal state.activePlayerId) for every current ClientAction.
  Docstring sketches the forward-compat shape for out-of-turn
  abilities (Spark spends, Soul-Aspect gifts, ally assists).
- `app/api/rooms/[code]/events/route.ts` — wires `authorize` after
  snapshot load, before engine fold. On reject: inserts a
  `rejected:<kind>` audit row into `game_events`, returns 403 with
  the structured rejection reason, and never constructs the
  service-role client (AC #3: rejected events never mutate state).

**Why:** The events route from #34 accepted any authenticated player's
action regardless of whose turn it was. AC for #35: only the active
player can submit move/challenge/setback/end-turn; rejected events
never mutate state; out-of-turn abilities (Sparks, gifts, etc.)
remain supportable for later tickets.

**Reviewer caught two significants — fixed in `cbe9761`:**
- `applyClientAction` could throw (engine corruption guard in
  `endTurn`); the route had no try/catch, surfacing as a raw 500
  stack trace. Wrapped in try/catch returning structured
  `{ error: 'engine-error', cause }`. New test exercises the throw
  via a ghost-active-player snapshot.
- The route's early identity-mismatch check returned a different
  JSON shape than `authorize`'s identity-mismatch rejection. The
  two are defense-in-depth duplicates; aligned both to the same
  `{ error: 'unauthorized', reason: { kind, callerId, claimedPlayerId } }`
  envelope so the contract stays stable if the duplicate is ever
  collapsed.

**Notes:**
- Turn-state field lives in `GameState` (not on the rooms table) so
  the engine and the route share one source of truth. No production
  serialized snapshots exist yet (no INSERT site for `game_states`
  anywhere), so backfilling deserialize was unnecessary.
- The audit log reuses `game_events` with an
  `event_type: 'rejected:<kind>'` prefix. RLS is satisfied (caller
  is auth.uid() + room member). If a client ever subscribes to
  `game_events` directly (replay log), it'll need a
  `WHERE event_type NOT LIKE 'rejected:%'` filter. Latent; deferred.
- Server-side phase tracking (move/challenge/draw) is NOT in this
  ticket. Today the route only checks turn ownership, not phase
  ordering. Future-ticket concern.
- Multiplayer game UI doesn't exist yet, so the ticket's "client UI
  mirrors server rules (grey-out controls)" item has no surface to
  apply to. Will land alongside the multiplayer game page.
- Gates green: typecheck ✓, lint ✓, test ✓ (521/521), build ✓,
  e2e ✓ (2/2). 13 new unit tests across endTurn, room-actions
  (end-turn variant), authorize, and the route's authorization
  gate + engine-error path.

**Commit(s):** `b912089`, `1db6681`, `61a768e`, `df4cd6a`, `3a9d9e2`, `cbe9761`

## 2026-04-27T01:20:49-04:00 — #36: Presence & disconnect handling — draft 1

**Pushed:**
- `lib/grace.ts` (NEW) + tests — pure `computeGraceState` returning
  `{ phase: 'connected' | 'grace' | 'expired', remainingMs }`. Plus
  React `useDisconnectGrace` hook that owns the offline-since
  timestamp and a 1s tick. 60s grace window per AC.
- `lib/presence.ts` (NEW) + tests — `usePresence(roomId, selfPlayerId)`
  Supabase Presence wrapper. Channel keyed on `playerId` so two tabs
  from one player collapse to one online entry. Returns
  `{ onlinePlayerIds: ReadonlySet<string>, connected, error }`.
- `supabase/migrations/0002_player_kick.sql` (NEW) — `players_host_delete`
  RLS policy: host can DELETE non-self players from their own room.
- `lib/rooms.ts` — `kickPlayer` helper. Pre-checks self-kick;
  surfaces RLS-deny (empty result) as `no-row-deleted` so the UI
  can distinguish from a transient error.
- `components/game/PresenceIndicator.tsx` (NEW) + tests — pure
  presentational. Online dot, "(disconnected)" label, grace
  countdown for the active player, host-only Kick button after
  grace expires.

**Why:** #34 + #35 wired the multiplayer state pipeline; this closes
the last Phase-5 ticket by handling the network failure mode that
breaks all multiplayer games — someone drops mid-turn. Per AC:
presence reflects status within 2s, 60s grace timer on active-player
disconnect, host can kick after grace.

**Reviewer caught three significants — fixed in `e585236`:**
- The grace-tick interval kept firing forever past the window. The
  effect's setup-time guard couldn't catch the expiry boundary
  because `setNow` doesn't change deps. Self-clearing in the
  callback now stops the interval at the right moment.
- `PresenceIndicator` hid "(disconnected)" whenever Kick was shown.
  Non-host viewers (no Kick + no countdown) saw only a grey dot.
  Label now always appears for offline players.
- `usePresence` ignored the `CLOSED` channel status; a
  server-initiated close left the hook stuck `connected: true` with
  a stale online set. Now treated like CHANNEL_ERROR / TIMED_OUT.

Plus aria fix: dot spans got `role="img"` so screen readers
announce the online/offline label.

**Notes:**
- `kickPlayer` does NOT advance the engine's `activePlayerId`. The
  snapshot still names the kicked player as active; the next normal
  `end-turn` rotates past them. Soft hang risk if the kicked player
  WAS the active player and no `end-turn` button is reachable —
  flagged for the multiplayer game UI ticket.
- Presence key tab-collapse: closing the second tab does NOT flash
  "offline" because Supabase's per-meta cleanup leaves the surviving
  tab's meta under the same key. Verified.
- "Host leaves the room" is not handled anywhere in the codebase
  (`players_host_delete` blocks self-kick by design). Out of scope
  for #36; worth a follow-up.
- Migrations are non-idempotent (`CREATE POLICY` without IF NOT
  EXISTS), but this matches `0001_init.sql`'s style and Supabase's
  migration tracker handles already-applied skips in production.
- Gates green: typecheck ✓, lint ✓, test ✓ (545/545), build ✓,
  e2e ✓ (2/2). 24 new unit tests across grace, presence, kick, and
  PresenceIndicator.

**Commit(s):** `8a49cd2`, `e4d0ef0`, `edaf357`, `c214286`, `e585236`

## 2026-04-27T09:42:09-04:00 — #81: Start-game flow — draft 1

**Pushed:**
- `lib/start-game.ts` (NEW) + tests — pure
  `validateAndBuildSetup({ room, players, callerId })`. Caller must
  be host; room must be in lobby; 2..4 players; every player has a
  soul_aspect; aspects unique across players. Sorts setups by seat
  so seat 0 (the host) is the starting active player.
- `app/api/rooms/[code]/start/route.ts` (NEW) + tests — bearer auth
  → getUser → caller-session reads → validate → `initializeGame` →
  service-role INSERT `game_states` + UPDATE `rooms.state` to
  'playing'. Catches 23505 unique violation as 409
  `already-started`. On `roomUpdate.error` rolls back the orphan
  game_states row so the host can retry.
- `app/rooms/[code]/lobby/page.tsx` — `onBegin` POSTs to the new
  route; `beginning` flag disables the Begin button while in-flight.
- `components/setup/Lobby.tsx` — `beginning` prop drives
  button-disabled + "Beginning…" label.

**Why:** With #34/#35/#36 the multiplayer pipeline shipped but no
code path created the initial `game_states` row, so every events
call against a brand-new room returned 404 `snapshot-missing`. The
Lobby's `onBegin` was a placeholder. This closes that gap so the
multiplayer flow is end-to-end runnable for the first time —
modulo the multiplayer game page (separate ticket).

**Reviewer caught three significants — fixed in `07a2029`:**
- Orphan recovery: snapshot-insert-success + room-update-fail used
  to trap the host (next /start hit 23505). Route now rolls back
  the game_states row in the error branch; response carries
  `recovered: bool` so ops/UI can distinguish "we cleaned up" from
  "manual intervention needed."
- Double-click race: Begin button now disables itself via a new
  `beginning` prop on the Lobby component. Without it, fast
  double-clicks fired two POSTs and the second 409'd into a
  confusing error.
- Route-level coverage gap: `too-few-players` and
  `duplicate-soul-aspects` had no route-level tests asserting 422.
  Added both, plus tests for the rollback paths (recovered: true
  on success, false when rollback DELETE itself fails).

**Notes:**
- Stats default to 10-across-the-board for MP players + Soul
  Aspect's +2 bonus. Per-Sefirah blessing UI for MP is a follow-up;
  reviewer confirmed 10+2 is enough to attempt every challenge DC
  without soft-lock risk.
- Soul-aspect uniqueness is server-enforced; the lobby UI doesn't
  currently prevent picks (separate ticket).
- Atomicity: snapshot-insert + room-update aren't transactional;
  rollback covers the documented failure mode but a true two-phase
  fix lives in an edge function down the road. Same trap class as
  #34's event/snapshot writes.
- Error messages in the lobby surface the route's machine-readable
  rejection `kind` directly. Worth humanizing — flagged for QA.
- Gates green: typecheck ✓, lint ✓, test ✓ (564/564), build ✓,
  e2e ✓ (2/2). 19 new unit + route tests.

**Commit(s):** `c09dab8`, `42e2406`, `1d733da`, `07a2029`

## 2026-04-27T22:45:52-04:00 — #89: T3 root-cause + fix for players RLS false-positive

**Pushed:** lib/rooms.ts patch (drop `.select()` chain on players
insert paths in createRoom + joinRoom); rooms.test.ts mock surface
updated to allow a thenable insert; test/integration/createRoom.test.ts
restored to its clean shape (the diagnostic probes from earlier
pushes are gone); migration 0004_debug_whoami.sql removed.

**Why:** the integration test in CI kept failing with `42501 — new
row violates row-level security policy for table "players"` even
though `auth.uid()` proven equal to `id` in every probe (server-side
RPC, BEFORE INSERT trigger, equality-check function). Root cause:
PostgREST 12.2 + RLS policy `id = auth.uid()` + client-supplied PK
+ `Prefer: return=representation` (the header supabase-js sets when
you chain `.select()` on an insert) trips a false-positive WITH
CHECK rejection. The same code path against `rooms` works because
`rooms.id` has `default gen_random_uuid()` and the request shape
PostgREST emits is different. Curl probes with `Prefer: return=minimal`
or `return=headers-only` confirm: minimal succeeds, the other two
fail. The fix is to issue plain inserts on `players` and rely on
the values we already have client-side (we set `id = userId` and
know the seat).

**Notes:**
- Local stack iteration pace: ~5s vs ~3min via CI. After three CI
  iterations on the diagnostic probe migration I switched to
  `pnpm dlx supabase@1.226.4 start` and `db reset` locally, which
  is what unlocked the SQL-level traces (BEFORE INSERT trigger,
  pg_stat_statements dump). Keeping that in mind for the next
  Supabase-shaped ticket.
- The fix narrows the surface: createRoom + joinRoom now return
  `playerId: userId` and `seat: nextSeat` directly, skipping the
  RETURNING round-trip. `joined_at` was the only field that came
  back from the RETURNING and we never used it.
- pnpm typecheck ✓, lint ✓, test ✓ (628/628), test:integration ✓
  (1/1) all green locally.

**Commit(s):** `b586a91`

## 2026-04-27T23:18:36-04:00 — #128: meditate now actually draws cards

**Pushed:** `lib/turn-machine.ts` — `meditate` event now draws
`MEDITATE_DRAW` (2) cards capped at `HAND_CAP` (6) and advances to
`'end'` phase, skipping the separate `'draw'` phase. The pre-fix
contract — phase: `'draw'`, state unchanged — was the surface bug
behind playtest finding #128. Reducer + hook + RTL tests updated
to pin the new contract; new `PlayScreen.draw.test.tsx` integration
test asserts the DOM grows by 2 card slots after a Meditate click.

**Why:** `design/mechanics.md` § Drawing & gift handling — "Meditate
(the alternative to a move) draws 2 cards, but stops at 6." The
old reducer landed players in `'draw'` phase; `drawToHand` only
refilled toward `STARTING_HAND_SIZE` (4); a player at 4 cards saw
no change. Reframing meditate as a complete turn-action (draw+end)
matches the design and fixes the visible bug.

**Notes:**
- Refactored `drawToHand` to delegate to a new `drawNCards` helper
  so meditate's `drawCards(state, playerId, 2, HAND_CAP)` reuses
  the deck-recycle logic.
- Existing tests updated minimally to fit the new contract; one
  long-stub `expect(true).toBe(true)` test in use-turn.test.ts
  converted to `it.todo(...)` per code-reviewer guidance — pre-
  existing dead weight surfaced incidentally.
- `accept-setback → 'draw'` path still runs through the Draw
  button — the player's hand was reduced by the preceding move, so
  `drawToHand` has work to do there. Confirmed by reviewer.
- Gate green: typecheck ✓, lint ✓, test ✓ (632 passing + 1 todo /
  633), e2e ✓ (16/16).

**Commit(s):** `11fb9ef`

## 2026-04-27T22:57:08-04:00 — docs: playability prioritization

**Pushed:** new `design/playability-priorities.md` capturing the
playable-MVP punch list. Sequenced as: Tier 1 bugs (#128, #135, #136,
#56) → Tier 2 UX clarity (#129, #131, #134) → Tier 3 readability /
pacing (#132, #130, #133) → Tier 4 phased polish (#38, #39, #37, #99).
Defers Epics #117 / #118 / #119 / #125 explicitly until the gating
items merge.

**Why:** the user asked for a prioritization doc to make the path
to first-shippable MVP concrete. After they ran a 2-player hot-seat
playtest the same evening, nine new tickets (#128–#136) landed and
the doc was reordered to put bugs ahead of polish, which is its
v2 form.

**Notes:**
- Living doc — this is `docs/playability-priorities` not `design/v1`
  on purpose. Edit in place rather than appending.
- The 9 new tickets all carry the milestone "MVP: Playable web
  version" so the milestone view doubles as a prioritized list.
- Gate is vacuous (docs only): pnpm typecheck / lint / test all
  unchanged, no code touched.

**Commit(s):** `3bec6a9`

## 2026-04-27T23:27:13-04:00 — #135: hold the challenge reveal until Continue

**Pushed:** `components/challenge/ChallengeModal.tsx` — pass path
no longer auto-fires `onResolved` after the 800ms roll animation.
Both pass and fail land on the reveal panel; pass renders a
Continue button which is the only path to dismiss. `RollPanel`
gains an `onContinue` prop. Tests updated to drive Continue.

**Why:** Playtest finding — players rolled, the screen advanced
past the result, they couldn't tell what they rolled or by how
much. Reveal phase needs to actually be visible long enough to
read; gating dismissal on a click matches the design.

**Notes:**
- `handleContinue` throws (not silent return) if invoked on a
  failed outcome — defense-in-depth per code-reviewer feedback.
- Reverted `window.setTimeout` → `setTimeout` for idiomatic
  client-component code.
- Follow-up (NOT in this PR): focus management on reveal mount
  — keyboard users currently lose focus to body when the Continue
  button appears. Belongs in #39 a11y audit; the modal already
  carries `role="dialog" aria-modal="true"` and that contract
  needs honoring.
- Gate green: typecheck ✓, lint ✓, test ✓ (628/628), e2e not
  re-run (no UI flow changed at the screenshot level).

**Commit(s):** `4df102d`

## 2026-04-28T00:01:53-04:00 — #136: visible path numbers on the Tree of Life

**Pushed:** `components/tree/TreeBoard.tsx` — new
`<g data-layer="path-labels">` group renders a small dark disc with
the path number at each path's midpoint. Z-order:
paths < path-labels < players < nodes (so labels paint above
the path lines but cleanly below the Sefirah circles). Two
central-pillar paths get LABEL_OFFSETS to avoid colliding with
each other (paths 25/27) or sliding under Yesod's player tokens
(path 32).

**Why:** Playtest finding — path numbers were not visibly rendered,
only available via tooltip / `aria-label`. The contract from
`reference/paths.md` is that the 22 paths are identified by their
numeric index; the board needs to communicate that without a hover.

**Notes:**
- `aria-hidden="true"` on the labels group: each path's `<line>`
  element already carries the full aria-label (path number + Hebrew
  letter name + arcanum + endpoints). Duplicating on the `<text>`
  would double-announce.
- Reviewer caught two real geometric problems: paths 25 and 27
  share the central-pillar midpoint zone (collision), and path 32
  sits under both the Yesod node ring and any player token parked
  there. LABEL_OFFSETS (dx +22, dy 0) on those two paths nudges
  them off-pillar to clear both.
- Disc stroke opacity bumped from 0.5 → 0.7 per reviewer — disc
  fill is darker than the gradient backdrop in places, so the
  ring is the only thing defining the boundary.
- Z-order test now asserts paths < labels < nodes so a future
  refactor of layer order surfaces as a regression.
- Gate green: typecheck ✓, lint ✓, test ✓ (634 + 1 todo / 635).

**Commit(s):** `223d75b`

## 2026-04-28T00:22:02-04:00 — #56: hand-cap enforcement + shuffled discard recycle

**Pushed:** Engine-correctness Tier-1 ticket from the playability
priorities doc. Three behaviour fixes, all rooted in
`design/mechanics.md` § Drawing & gift handling:

- **Chesed-Grace** rejects with new `gift-rejected-cap-full` variant
  when the receiver is at HAND_CAP. Distinct from `payload-invalid`
  so an orchestrator can re-prompt the giver to pick a different
  recipient instead of treating it as a logic error.
- **Kether-Unity** skips at-cap players (their slot doesn't burn a
  card; the next under-cap player gets the top of the deck) AND
  recycles the discard pile if the deck empties mid-distribution.
- **Discard recycle is now SHUFFLED** in both Kether-Unity and the
  turn-machine's draw paths. New shared helper
  `engine/draws.ts:recycleDiscardIntoDeck(deck, discard, rng)` —
  Fisher-Yates via the seeded `Rng`. Pre-fix the recycle was
  order-preserving, which (per code-reviewer) let any player who
  memorised the discard predict every subsequent draw.

**Why:** `design/mechanics.md` calls for HAND_CAP=6 enforcement and
explicitly says the discard "shuffles face-down to form a new draw
pile." The engine had the cap as a constant in `lib/turn-machine.ts`
but didn't enforce it at gift sites; Kether-Unity blindly appended;
both recycle call sites copied verbatim with a `// TODO shuffle`
comment that had been there since first ship. With the playability
push moving toward 4-player games, exhaust-the-deck scenarios are
now reachable in a real session.

**Notes:**
- `HAND_CAP` and `STARTING_HAND_SIZE` are now exported from
  `engine/setup.ts` as the single source of truth. `lib/turn-machine.ts`
  re-exports for backward compat.
- `useSpark` signature gained a required `rng: Rng` argument. No
  production callers exist yet, so this is internal-only churn. 27
  test call sites updated mechanically with a node script that
  walked balanced parens.
- Two engine-internal `shuffle` implementations now exist —
  `engine/setup.ts:shuffle<T>` (private, used at game-init) and
  `engine/draws.ts:shuffleArray` (used at recycle). Reviewer flagged
  the duplication; consolidation is a follow-up, not a blocker.
- Stale JSDoc on `drawToHand` (saying recycle is order-preserving)
  fixed per reviewer.
- Gate green: typecheck ✓, lint ✓, test ✓ (636 passing + 1 todo /
  637), e2e not re-run (no UI flow changed).

**Commit(s):** `b3d372d`

## 2026-04-28T00:32:07-04:00 — #129: gate path highlights to move phase + plain-English phase hint

**Pushed:** Tier-2 UX clarity from the playability priorities.
`TreeBoard` gains `movesEnabled?: boolean` (defaults true for the
demo route's no-arg call); when false, all paths render
`data-valid="false"` and don't accept clicks. `PlayScreen` wires
`movesEnabled={turn.phase === 'move'}` so the board is only inviting
when moves are actually accepted. The phase-status panel now reads
"Pick a card and a path, or meditate" / "Resolve the challenge" /
"Draw to refill your hand" / "Move complete — end turn" instead of
the raw enum value.

**Why:** Playtest finding — after a player moved, paths still
LOOKED clickable and the player wasn't sure what to do next. With
`movesEnabled` off-during-non-move and a friendlier hint, the
panel below the board now answers "what should I click?" without
requiring engine-vocabulary knowledge.

**Notes:**
- `EMPTY_VALID_PATHS` uses `Object.freeze(new Set())` per code-
  reviewer — `ReadonlySet` is TS-only, freeze makes it actually
  immutable at runtime.
- Hand card-selection stays active across all phases on purpose:
  the player can preview which card unlocks which path on their
  next turn. The engine rejects out-of-phase moves at the reducer.
- Follow-up (NOT in this PR): `draw` phase shows "Draw to refill
  your hand" even when the hand is at HAND_CAP and the click is a
  no-op. Per reviewer, file a small ticket to add a "Hand full —
  end turn" branch in the hint when applicable.
- Gate green: typecheck ✓, lint ✓, test ✓ (636 passing + 1 todo /
  637), e2e not re-run (no new screenshot-relevant routes).

**Commit(s):** `d52a50c`

## 2026-04-28T00:42:05-04:00 — #134: embed player stat sheet inside the challenge modal

**Pushed:** Tier-2 UX from the playability priorities. `ChallengeModal`
gains optional `player` and `soulAspect` props. When `player` is
supplied, a compact `StatSheet` renders at the top of the dialog
with `activeStat` set to the challenged stat, so the player can
read their full stat row + Soul Aspect bonus + Sparks held without
dismissing the modal.

**Why:** Playtest finding — players couldn't see their stats
during a challenge, forcing them to dismiss the modal, glance at
the panel, and re-open. With the embedded sheet, "do I burn a card
or a spark here?" can be answered without leaving the dialog.

**Notes:**
- Both new props are optional; `/demo/challenge` keeps working
  unchanged.
- `activeStat` aligns at the type level (`Sefirah.stat: StatKey` →
  `StatSheet.activeStat?: StatKey`). No casts.
- `StatSheet` in compact mode adds zero tab stops (no interactive
  elements), so the dialog's focus order is unchanged. Per code-
  reviewer the implicit ARIA region landmark is fine inside a
  `role=dialog`.
- The redundant outer `activePlayer` guard in PlayScreen's modal
  spread block was simplified per reviewer.
- Follow-up (NOT in this PR): tests for `soulAspect` badge render
  and `activeStat` highlight inside the modal — reviewer flagged
  the gap. Belongs in a small follow-up.
- Gate green: typecheck ✓, lint ✓, test ✓ (640 + 1 todo / 641).

**Commit(s):** `bba8a1b`

## 2026-04-28T00:53:40-04:00 — #131: auto-advance turn after end-phase delay

**Pushed:** Tier-2 hot-seat cadence from the playability priorities.
PlayScreen schedules `turn.endTurn()` automatically 1500ms after
the active player lands in `'end'` phase (i.e., after meditate or
post-draw). Manual End Turn click still works and cancels the
pending timer.

**Why:** Playtest finding — the screen sat idle waiting for an
explicit End Turn click after the active player had already done
their meaningful action. In single-device hot-seat play that's
friction. 1500ms is long enough to read the result and short
enough not to feel like a stall.

**Notes:**
- `AUTO_ADVANCE_DELAY_MS` exported so tests reference the canonical
  value rather than hardcoding 1500.
- Stable callback ref via `useRef` + `useLayoutEffect`. Per code-
  reviewer: `turn.endTurn` is `useCallback` but its dep list
  includes the engine snapshot, so the function reference changes
  on every state update. Without the ref pattern the timer would
  re-arm on every unrelated render — fine in test, but Phase-5
  Supabase realtime pushes will trigger renders continuously and
  reset the countdown. The ref locks the effect's only dep to
  `turn.phase`.
- Auto-advance only fires on the two transitions into `'end'`:
  meditate (#128 made meditate → end direct) and post-draw click.
  Other paths (move → draw → end, challenge → draw → end) all
  pass through the user-input draw step before reaching `'end'`.
- Follow-up (NOT in this PR): a brief "Player N's turn" overlay
  during the 1500ms window. The current swap is abrupt; the
  overlay belongs with #37 animations or similar polish.
- Gate green: typecheck ✓, lint ✓, test ✓ (642 + 1 todo / 643).

**Commit(s):** `7910ccd`

## 2026-04-28T01:04:33-04:00 — #132: bigger cards + open/close hand toggle

**Pushed:** Tier-3 readability from the playability priorities. Card
width bumped from `w-24` (96px) → `w-36` (144px) per ticket — 1.5x
scale so the Hebrew letter / arcanum number / suggested action are
readable at arm's length on a 13" laptop. Hand also gains an
open/close toggle: a "×" close button in the open state, a
"N cards — tap to open" badge in the closed state. Mount runs a
`hand-fade-in` keyframe (Tailwind config) which `motion-reduce`
short-circuits.

**Why:** Playtest finding — players hesitate before each action
because they're squinting at tiny cards. The toggle gives them
control over the hand's screen real estate for downstream
multiplayer screens.

**Notes:**
- `defaultOpen` prop defaults true. PlayScreen currently doesn't
  override (so the hand renders open by default in production),
  matching existing tests + #128's PlayScreen integration test.
  Switching production to default-closed is a one-line follow-up
  if playtest confirms the tap-to-open UX is preferred.
- Reviewer found a real bug: keyframe-on-mount is the only way to
  animate a swap-rendered subtree; the previous `transition-opacity`
  on a freshly-mounted element was a no-op. Fixed via Tailwind's
  custom `keyframes` config + `animate-hand-fade-in` class.
- Reviewer also caught: empty-hand close-button gating left the
  open state stuck on a 0-card hand. Close button is now always
  rendered.
- Reviewer also caught: rotated rightmost card in a 6-card fan
  could occlude the close button. Added `z-10` + `bg-ground/80`.
- New `CARD_OVERLAP_PX = 56` constant replaces the magic `-36`
  literal (tuned for the new card width).
- Gate green: typecheck ✓, lint ✓, test ✓ (647 + 1 todo / 648).

**Commit(s):** `a572f5b`

## 2026-04-28T01:16:28-04:00 — #130: widen path hit-targets to 28 viewBox-units

**Pushed:** Tier-3 hit-target widening from the playability priorities.
Each TreeBoard path now renders a `<g>` containing an invisible
`<line data-path-hit>` (transparent stroke, `PATH_HIT_WIDTH = 28`)
plus the existing visible line (`pointerEvents="none"`). The `<g>`
is the interactive element (carries role/aria/tabIndex/handlers).
Visible appearance unchanged.

**Why:** Playtest finding — Yesod↔Malkuth path was finicky to click
even with a mouse, much less a finger. WCAG 2.5.8 wants ≥24 px
target spacing; 28 viewBox-units maps to 22.4 px at the 320 px
mobile mapping (passes at ≥343 px) and reaches 44 px at the ≥630 px
desktop mapping. 28 is the maximum value that doesn't cause
adjacent non-shared-endpoint paths to overlap their hit areas.

**Notes:**
- Reviewer caught a real critical: with the wider hit-lines, several
  path-label discs (#136 — paths 13/14/19/25/27/29/32) sit on or
  near a path's hit centerline. The labels group needed
  `pointerEvents="none"` so the decorative discs don't absorb
  clicks. New regression test pins that contract.
- Existing tests pass unchanged because data-path / role / aria /
  tabIndex moved to the `<g>` wrapper; `[data-path="N"]` queries
  still resolve. `fireEvent.click([data-path="N"])` still bubbles
  to the `<g>`'s handler.
- Type annotation on `handleKey` updated from `KeyboardEvent<SVGLineElement>`
  → `KeyboardEvent<SVGGElement>` per reviewer.
- JSDoc on `PATH_HIT_WIDTH` corrected to reference WCAG 2.5.8
  (target spacing) rather than 2.5.5 (target size).
- Gate green: typecheck ✓, lint ✓, test ✓ (647 + 1 todo / 648).

**Commit(s):** `d7c5b2e`

## 2026-04-28T01:23:19-04:00 — #133: skip-to-summary affordance for blessing ceremony

**Pushed:** Tier-3 pacing fix from the playability priorities.
`BlessingRitual` gains a small "Skip — roll all remaining" button
visible at every step. Click rolls fresh 3d6 for any unrolled
Sefirot, preserves stats already received, and jumps straight to
the summary panel.

**Why:** Playtest finding — the slow per-Sefirah ritual loses its
first-time wonder on repeat plays. The skip is additive and
visually de-emphasised so first-time players don't see it as the
primary path.

**Notes:**
- Per code-reviewer: RNG calls now live OUTSIDE the `setStats`
  functional updater. React StrictMode double-invokes updaters in
  dev, so RNG-inside-updater would advance the shared session RNG
  by 2× the expected number of rolls and silently desynchronize
  the engine. Fix: compute fresh rolls into a local map first,
  then `setStats(prev => ({ ...prev, ...computed }))`.
- The currently-displayed roll, if any, is already committed to
  `stats` at roll-time — the `!== undefined` guard preserves it.
  Comment updated accordingly per reviewer.
- Considered "parallel reveal" and "3-stats-per-tap" alternatives
  (per ticket Option A/B). Skip-button is the right tier-3
  primitive: additive, invisible to first-time players, minimal
  surface area. Cinematic fast-forward stays a follow-up.
- Gate green: typecheck ✓, lint ✓, test ✓ (651 + 1 todo / 652).

**Commit(s):** `63288ba`

## 2026-04-28T01:35:02-04:00 — #99: exclude Yesod from default fixture order

**Pushed:** Tier-4 small chore from the playability priorities.
`DEFAULT_SOUL_ASPECT_ORDER` in `test/fixtures.ts` reduced from 6
entries to 4 (`chesed`, `gevurah`, `tiferet`, `hod`). Yesod and
Netzach removed; JSDoc explains both removals.

**Why:** Per `design/mechanics.md` § Soul Aspects, Yesod's weakness
is "you start one Sefirah below Malkuth" — but `initializeGame`
places every player at Malkuth regardless. Until the engine
implements that offset (separate ticket, Option A), fixtures using
Yesod by default would silently misrepresent the starting state.
Netzach also excluded because `playerCount` is capped at 4 and the
5th/6th entries were never selected — phantom surface area.

**Notes:**
- Tests that explicitly want Yesod can still pass it via
  `soulAspects: [..., 'yesod']`.
- Reviewer flagged: ship as-is, the deferred Option A
  (engine offset implementation) is correctly scoped to a
  separate ticket.
- Gate green: typecheck ✓, lint ✓, test ✓ (652 + 1 todo / 653).

**Commit(s):** `238b659`

## 2026-04-28T01:46:33-04:00 — #38: mobile-responsive Hand + ChallengeModal + action panel

**Pushed:** Tier-4 mobile-responsive pass from the playability
priorities. Three coordinated changes:

- **Hand cards** are now `w-24 sm:w-36` (96 px / 144 px). Card
  overlap is `'-55%'` so the fan stays proportional. A 6-card hand
  fits inside a 320 px viewport (96 + 5 × 43.2 = 312 px) without
  horizontal scroll. `overflow-x-hidden` belt-and-braces guarantees
  no page-level scrollbar regardless of future card-size tweaks.
  Hand close-button gets `min-h-11 min-w-11` for WCAG 2.5.5.
- **ChallengeModal** goes full-screen on narrow viewports
  (`min-h-screen w-full sm:min-h-fit sm:max-w-md`). Overlay
  padding drops to `p-0 sm:p-4` so the dialog reaches screen edges.
  `overflow-auto` on the backdrop catches any modal that exceeds
  viewport height on a short phone.
- **PlayScreen action panel** stacks vertically on narrow
  (`flex-col items-stretch gap-2 sm:flex-row sm:items-center
  sm:justify-between`). Meditate / Draw / End-Turn buttons bumped
  to `min-h-11 px-3 py-2` (≥ 44 px tap target).

**Why:** Playtest finding — family-game-night usage = phones in
hands. The desktop-only layout doesn't fit a 320 px viewport.

**Notes:**
- Reviewer caught a real overflow at 5+ card hands on 320 px (the
  initial `w-28` + `-44%` math was wrong by ~135 px). Tightened to
  `w-24` + `-55%` and added overflow-x:hidden. Verified the math:
  6 cards mobile = 312 px ≤ 320 px ✓.
- Tap-target audit scoped to playtest-touched buttons (PlayScreen
  actions + Hand close). Stepper / Roll / Continue / Retry / Accept
  in ChallengeModal still small — file follow-up; out of scope here.
- Gate green: typecheck ✓, lint ✓, test ✓ (654 + 1 todo / 655),
  e2e not re-run (no new screenshot-relevant routes).

**Commit(s):** `d18e8e5`

## 2026-04-28T02:12:31-04:00 — #39: a11y foundation — axe-core static checks

**Pushed:** Tier-4 accessibility-foundation pass from the playability
priorities. Adds `vitest-axe` + `axe-core` as dev deps and a new
`components/__tests__/a11y.test.tsx` running axe on the major UI
surfaces:
- TreeBoard (static + interactive)
- Hand (open / collapsed / face-down)
- StatSheet (compact + expanded as separate tests per code-reviewer)
- TeamMeters
- ShellPanel
- ChallengeModal (with embedded StatSheet)
- BlessingRitual
- SoulAspectPicker (added per code-reviewer — critical setup flow)
- Lobby (added per code-reviewer — critical setup flow)

13 axe tests, all green. The components were already built with
`aria-label` / `role` / `tabIndex` from earlier tickets, so static
axe finds no violations on initial render.

**Why:** Playtest `phase:6-polish` ticket calls for keyboard nav +
ARIA roles + axe-core in CI. This PR is explicitly the FOUNDATION:
static axe baseline. Full keyboard / focus-order / live-region
sweep remains a follow-up — the JSDoc on the test file is clear
about the limit.

**Notes:**
- `vitest-axe` 0.1.0's `extend-expect` entrypoint is empty; the
  matcher pattern fights vitest 4's expect-context lifecycle. Used
  a private `expectNoViolations` helper that reads
  `axe(container).violations` directly. One-line migration if/when
  the upstream package ships a working extend-expect.
- Reviewer caught a real issue: the StatSheet test ran two
  consecutive `render()` calls without unmounting between, leaving
  duplicate ARIA landmarks in the DOM. Split into separate `it`
  blocks (RTL's `cleanup()` runs between tests).
- jsdom can't compute styles, so axe's color-contrast rules are
  effectively suppressed in this run. The keyboard-walkthrough
  follow-up belongs in a real browser via Playwright + axe-playwright.
- Out of scope (filed separately): `FinalThreshold`, `D20Roll`
  reveal phase, `ArcanumCard` standalone — the first needs a fuller
  fixture, the second needs the modal in a different state, the
  third is purely presentational with indirect coverage via Hand.
- Gate green: typecheck ✓, lint ✓, test ✓ (667 + 1 todo / 668).

**Commit(s):** `d6c5b0a`

## 2026-04-28T02:27:59-04:00 — #37: minimal CSS-keyframe animations (sefirah-clear pulse)

**Pushed:** Tier-4 lowest-risk-cut animation foundation from the
playability priorities. The ticket asked for framer-motion path /
card / sefirah animations; this PR ships CSS-only keyframes —
visually similar without committing to a new dep.

- New Tailwind keyframes: `path-travel-pulse`, `sefirah-clear-pulse`
  (plus existing `hand-fade-in`).
- TreeBoard wires `animate-sefirah-clear-pulse` on cleared
  Sefirah circles. `data-cleared="true|false"` exposed for tests.
- `motion-reduce:animate-none` on every animation per
  `prefers-reduced-motion`.

**Why:** Playtest finding — actions feel inert. The sefirah-clear
pulse gives positive visual feedback at the moment a check passes.
Path-travel and card-discard keyframes are defined but unwired
(call out below) so the orchestrator can opt in later.

**Notes:**
- Reviewer caught a real Firefox bug: CSS `transform-origin` in
  px on raw SVG elements is computed differently across browsers.
  Fixed via `transform-box: fill-box` + `transform-origin: center`.
- Reviewer also caught: `path-travel-pulse` keyframe used the
  camelCased `strokeOpacity` property, which Chrome accepts but
  Firefox / Safari drop. Switched to the spec-correct
  `stroke-opacity`.
- **Path-travel + card-discard animations are NOT shipped here.**
  The keyframes are defined and ready; wiring them needs an
  orchestrator-side data-attribute that toggles for ~600ms after
  a successful move / play. Belongs in a follow-up.
- CSS animations only run on initial paint of the class; once a
  Sefirah is cleared the pulse fires once and stays bright. On a
  page reload mid-game with already-cleared Sefirot, the pulse
  re-fires — acceptable per reviewer.
- Gate green: typecheck ✓, lint ✓, test ✓ (670 + 1 todo / 671).

**Commit(s):** `1b0d648`

## 2026-04-28T09:58:14-04:00 — #152 (Epic #118 wave 1): multi-viewport screenshot baselines

**Pushed:** New `e2e/screenshots.review.spec.ts` captures every
route at desktop (1280×800), tablet (768×1024), and mobile
(375×667) — 14 routes × 3 viewports = 42 PNGs under
`e2e/__screenshots__/baselines/`. New `pnpm screenshots` script
runs the sweep with both `PLAYWRIGHT_BROWSERS_INSTALLED=1` and
`PLAYWRIGHT_RUN_REVIEW=1` set.

**Why:** Sub-ticket 1 of Epic #118. The review doc (sub-ticket 2)
needs three-viewport captures so it can score every screen on
visual impact / fun / token consistency / information density and
spot screens that work at one size and break at another.

**Notes:**
- Two skip gates in the spec. `PLAYWRIGHT_BROWSERS_INSTALLED` is
  the global e2e gate; `PLAYWRIGHT_RUN_REVIEW` is local to this
  file so CI's `pnpm e2e` skips the 42 review captures silently.
  Tried `testIgnore` in `playwright.config.ts` first — it filters
  even when the spec is named explicitly, defeating `pnpm screenshots`.
- Mobile viewport is 375 × 667 (iPhone SE) per code-reviewer —
  320 px is the pathological edge already covered by #38's unit
  tests; review captures want a representative size.
- `fullPage: true` to catch below-the-fold issues.
- Baselines stay under the existing `e2e/__screenshots__/`
  gitignore — regenerated on demand. The review doc will
  reference observations rather than commit binaries.
- Pre-existing concern: `waitForLoadState('networkidle')` on
  `/play` may burn the timeout once Supabase Realtime is wired
  in production; carried forward from `screenshots.spec.ts`.
  Flagged for follow-up.
- Gate green: typecheck ✓, lint ✓, test ✓ (670 + 1 todo / 671),
  e2e ✓ (16 regular passed, 42 review skipped); local sweep
  produced 42/42 captures in 20s.

**Commit(s):** `188f8b4`

## 2026-04-28T10:18:19-04:00 — #154 (Epic #118 wave 2): UI review doc

**Pushed:** New `design/ui-review.md`. 14 routes scored on four
axes (Visual / Fun / Token consistency / Information density).
Ranked weakness list at the top. Per-route observations sorted
worst-first. Eight fan-out tickets named for Epic #118 wave 3.

**Why:** Sub-ticket 2 of Epic #118 — wave 1 (#152) captured the
multi-viewport baselines; wave 2 turns those captures into a
ranked, scoped, fan-out-ready audit.

**Notes:**
- Snapshot review against `pnpm screenshots` baselines from #152;
  not speculation. Each route observed at desktop / tablet /
  mobile.
- Strongest screen: `/demo/cards` (19/20). Weakest:
  `/play` + `/demo/ritual` (9/20 — the cosmic content drowning
  in void). The fan-out's #1 priority is the Blessing Ritual
  scene polish.
- Cross-cutting weakness — most pages have a "void below the
  fold" pattern. Filed as fan-out ticket 6 rather than as a
  per-screen item.
- Reviewer caught: D-axis ambiguity (1 = either too sparse OR
  too crowded) — disambiguated with a 1–5 scale per density
  level. Home title was misdescribed as gold; corrected to
  off-white. Tree layout was misdescribed as centred-square;
  corrected to left-55%-of-viewport. `/demo/soul-aspect` D5 → D4
  for consistency with how the same void pattern was scored
  elsewhere. `/demo/cards` D5 → D4 (8-wide grid leaves a ragged
  last row at 22 cards).
- `/rooms/[code]/lobby` not reviewed (requires live multiplayer
  session); explicit "not reviewed" section calls it out for
  follow-up once integration scaffolding supports a baseline
  fixture.
- Fan-out tickets carry explicit component-file references and
  scope boundaries so a future filer doesn't have to re-derive
  intent.
- Gate green: typecheck ✓, lint ✓, test ✓ (670 + 1 todo / 671).
  Doc-only PR; gate is vacuous.

**Commit(s):** `4ad4be7`

## 2026-04-28T10:39:14-04:00 — #162 (Epic #118 wave 3): SVG token audit

**Pushed:** New `data/colors.ts` exporting `GROUND`, `VEIL`,
`TIFERET_GOLD` constants. 10 SVG-rendering components updated to
import from `@/data/colors` and reference the constants instead of
literals: TreeBoard, SparkIcon, PlayerToken, D20, ShellIcon,
CardBack, Meter, ArcanumCard, TeamMeters, PillarMarker.

**Why:** Wave-3 ticket 7 of Epic #118. UI review token-consistency
scores were 4–5 across the board, but the remaining hand-coded
hex values lived inside SVG components where Tailwind classes
don't reach naturally. Centralised them.

**Notes:**
- `data/colors.ts` lives next to `data/sefirot.ts` (per-Sefirah
  colours). Keeping the split: structural / chrome here,
  per-Sefirah game data there.
- Reviewer caught two real misses I'd undercounted: `TeamMeters.tsx`
  passed a literal `'#ffd700'` to its Meter; `PillarMarker.tsx`
  had `balance: '#ffd700'` in its colour table. Both fixed.
- Reviewer also flagged: `'#1a1a1a'` glyph foreground in SparkIcon
  / TreeBoard is a separate token (dark contrast on light Sefirah)
  not the app background. Added explanatory JSDoc so a well-meaning
  future editor doesn't collapse them.
- Sync risk between `tailwind.config.ts` and `data/colors.ts`
  remains process-only (no test). Drift would require both files
  to change. Documented in PR; promoting to a structural sync
  (single source) is a follow-up if drift ever happens.
- Snapshots unchanged — same hex values reach the DOM.
- Gate green: typecheck ✓, lint ✓, test ✓ (670 + 1 todo / 671).

**Commit(s):** `e96b125`

## 2026-04-28T11:06:19-04:00 — #163: demo-page chrome polish (Epic #118 wave 3)

**Pushed:** Tighten outer padding on every `app/demo/*/page.tsx`. Eleven files, identical change: `min-h-screen bg-ground p-8 text-veil` → `min-h-screen bg-ground p-4 text-veil sm:p-8`. Mobile gets 16 px instead of 32 px on every side; `sm` breakpoint and up restore the original 32 px.
**Why:** #154 ui-review flagged `/demo/challenge` "Challenge Modal" wrapping to two lines on the 375 px capture — symptom of the demo wrapper's padding starving the embedded component. Same pattern bites every demo at mobile width. Wave-3 fan-out from Epic #118.
**Notes:**
- Mechanical bulk edit; no embedded component touched (out-of-scope per ticket).
- Reviewer flagged `sm` vs `md` breakpoint as worth scrutiny. Verified: `/demo/tree` and `/demo/challenge` use `max-w-md` (448 px cap, comfortably under 576 px usable at sm); `/demo/cards` is 3-col at sm with ~181 px cells. `sm:p-8` is the right restore threshold.
- Prettier `--check` flagged eight files for unrelated JSX reflow drift (project has no prettier CI gate). Reverted prettier-induced changes; kept only the className edit so the diff stays scoped to "tighten outer padding."
- Gate green: typecheck ✓, lint ✓, test ✓ (670 + 1 todo / 671).

**Commit(s):** _filled in after push_

## 2026-04-28T11:21:49-04:00 — #159: Sefirah-keyed Soul Aspect card accents (Epic #118 wave 3)

**Pushed:** Per-card accent on `SoulAspectPicker` keyed to each Soul Aspect's `sefirahKey`. Idle cards carry a 40 %-opacity border in the Sefirah hue (Heart→tiferet gold, Boundary-Keeper→gevurah crimson, Giver→chesed blue, Mind→hod orange, Feeler→netzach green, Dreamer→yesod violet); selected cards saturate to full and add a 15 %-tint background. Disabled "Taken by X" cards drop the accent to `border-veil/30` so the dim-grey state stays unmistakably distinct from any active Sefirah colour. New `data-accent-sefirah` attribute makes the accent assertable from tests.
**Why:** Wave-3 fan-out from Epic #118; #154 ui-review noted the picker's six cards were "the same dark-on-dark rectangle" with no Sefirah identity. Touching only the styling shells fits the ticket's narrow scope.
**Notes:**
- Static `ACCENT_BY_SEFIRAH` map with full Tailwind class literals (so the content scanner picks them up). Reviewer flagged that an unguarded indexed lookup would crash if data ever pointed at a non-personality Sefirah; added a `DEFAULT_ACCENT` fallback that mirrors the pre-#159 generic accent so the component degrades gracefully instead of throwing.
- Test additions: card-tagging, idle border class present, selected saturated (no `/40` dim), disabled accent suppressed. Total tests 670 → 674.
- Gate green: typecheck ✓, lint ✓, test ✓ (674 + 1 todo / 675).

**Commit(s):** _filled in after push_

## 2026-04-28T11:57:15-04:00 — #161: per-route ambient layer (Epic #118 wave 3, foundational)

**Pushed:** New `components/atmosphere/` sub-tree — `Starfield`, `ColorBloom`, `GlyphWash`. All three render as fixed-position, `pointer-events-none`, `aria-hidden` decorative layers that paint between the body's `bg-ground` and main's content. Global `<Starfield />` mounted in `app/layout.tsx` so every route inherits a sparse star scattering for free; the three D-axis-weak routes (`/play`, `/demo/ritual`, `/demo/meters`) get additional `<ColorBloom>` (and a `<GlyphWash>` on `/demo/ritual`). New `atmosphere-twinkle` keyframe in `tailwind.config.ts` for opt-in star twinkle, gated on `motion-safe:` so `prefers-reduced-motion` is honoured automatically.
**Why:** Foundational wave-3 ticket from Epic #118. UI review's #4 weakness: most routes have ⅔ of the viewport black-on-black. Atmosphere lets per-screen polish (#156, #157, #160) compose against a non-empty canvas instead of fighting flat indigo.
**Notes:**
- Reviewer caught a real rendering bug on the first pass: atmosphere components used `-z-10`, but with `<main>` carrying its own opaque `bg-ground`, the atmosphere painted *behind* main's bg and was invisible. Fix: removed redundant `bg-ground` from every `<main>` (body's globals.css already paints indigo) so the atmosphere shows through. Touches 15 page wrappers — purely additive (the visual is unchanged for routes without atmosphere; body provides the same indigo).
- Reviewer also flagged a latent footgun: the original `alpha()` helper concatenated hex digits to the colour string, which would silently break for any non-hex input. Replaced with `color-mix(in srgb, …, transparent)` — colour-format-agnostic and modern-browser native (Chrome 111+, Firefox 113+, Safari 16.2+).
- Twinkle uses `filter: brightness()` not `opacity` so each star's per-star inline opacity (the texture variation) is preserved. Updated JSDoc to reflect that — the original wording said "opacity" which was wrong.
- jsdom's CSS engine drops the gradient string from `style.background`. ColorBloom mirrors the gradient on a `data-bloom-css` attribute so tests can assert resolution; the data attribute is on an `aria-hidden` div and doesn't leak into production semantics.
- 12 new tests across the three components (decorative-layer semantics, density progression, twinkle gating, gradient resolution, opacity bounds, side mirroring). 670 → 686 tests.
- Gate green: typecheck ✓, lint ✓, test ✓ (686 + 1 todo / 687).

**Commit(s):** _filled in after push_

## 2026-04-28T12:11:59-04:00 — #157: home hero illustration band (Epic #118 wave 3)

**Pushed:** New `components/home/Hero.tsx` — a faint Tree of Life silhouette (10 sefirot circles + 22 paths in the canonical Hermetic-Qabalah arrangement, with a soft tiferet halo). Wired into `app/page.tsx` between the title block and the room-forms section, plus a tiferet-gold `<ColorBloom>` from the top for a warm halo. Promoted Hot-seat from a small inline link beneath the forms to a full-width CTA visually equivalent to the form's buttons; replaced the demoting "or play solo against the engine" caption with a horizontal "or" divider that mirrors the multi-option form idiom.
**Why:** Wave-3 fan-out from Epic #118; #154 ui-review marked the home page at 10/20 — striking title, then a CRUD form on a void. Hero fills the gap; promoted Hot-seat means the fastest path to actually playing isn't visually demoted under the room CTAs.
**Notes:**
- Hero is a still illustration (not interactive), distinct from `components/tree/TreeBoard.tsx`. Aria-hidden because the title + sub-copy already name the Tree; the Hero adds visual texture, not text.
- Layout is responsive: `h-48 sm:h-56 md:h-64` for the SVG so the Tree fills the gap at 375 / 768 / 1280 viewports.
- First reviewer pass caught spurious 23rd path (a chokmah→gevurah diagonal that's not part of the canonical 22). Fixed; the `expect(lines.length).toBe(22)` test now passes.
- ESLint flagged non-null assertions; rewrote with explicit narrowing (the SVG won't render orphan elements if NODES is unexpectedly empty).
- Reviewer noted the halo IIFE was unnecessary ceremony; replaced with a ternary.
- 5 new tests (decorative semantics, 11 circles = 10 sefirot + 1 halo, 22 paths, pointer-events-none, responsive heights). 686 → 691 tests.
- Gate green: typecheck ✓, lint ✓, test ✓ (691 + 1 todo / 692).

**Commit(s):** `1093ae7`

## 2026-04-28T12:20:10-04:00 — #160: card-back motif (Epic #118 wave 3)

**Pushed:** Replace the single-Tav-letter card back with a layered occult-bookbinding pattern: indigo gradient + outer/inner gold borders + four corner flourishes (90° arcs with short ticks) + concentric circles framing a central hexagram (Magen David, two overlaid triangles) + four Tetragrammaton letters (יהוה) at the cardinal points just outside the seal + faint diagonal lattice background. Same 200×320 viewBox so the Hand layout is unchanged. Eight new tests (aria pattern, viewBox, hexagram, corners, Tetragrammaton order, per-instance ID isolation).
**Why:** Wave-3 fan-out from Epic #118; #154 ui-review noted the prior card back read as "placeholder back" rather than "occult bookbinding" — a single repeated glyph in a void.
**Notes:**
- The illustration is intentionally data-only (no per-instance state) so a deck of face-downs reads as identical artefacts, not distinct cards.
- Reviewer's optional refinements applied: combined `useId()` calls under one prefix so two instances can never collide on `<defs>` ids; bumped Tetragrammaton font from 18→22 px and opacity 0.65→0.8 so the letters stay legible at the mobile floor (`w-24` ≈ 96 px screen width).
- Symbolic / cultural sanity check: Magen David and Tetragrammaton are on-brand for a Kabbalah-themed game — consistent with `design/`'s established vocabulary. Reviewer concurred.
- 8 new tests, total 686 → 694.
- Gate green: typecheck ✓, lint ✓, test ✓ (694 + 1 todo / 695).

**Commit(s):** _filled in after push_

## 2026-04-28T12:30:55-04:00 — #156: Blessing Ritual scene polish (Epic #118 wave 3)

**Pushed:** Three things land together: (1) `<SefirahHero>` — a 96 px circular medallion keyed to the active Sefirah's hex with the first Hebrew letter inscribed at high contrast (luminance-derived glyph colour, robust to future palette tweaks); replaces the prior `h-8 w-8` StatIcon as the focal point. (2) `RitualScene` — an ambient `<ColorBloom>` keyed to the active Sefirah colour so the room shifts hue as the player descends Kether → Malkuth. (3) `RitualLedger` — a running list of all 10 Sefirot below the active step, three states per row (blessed / active / pending) with rolled values filling in as the ritual progresses; active row carries a glowing dot in the Sefirah colour.
**Why:** Wave-3 fan-out from Epic #118; #154 ui-review marked the ritual at 9/20 — "cosmic content drowning in void." Hero badge addresses the V (visual identity) axis; ambient bloom + ledger fill the lower half so the page no longer reads as a CRUD form on darkness.
**Notes:**
- Reviewer's most useful catch: my first cut hardcoded a string-equality check on Kether's `#ffffff` and Chokmah's `#c0c0c0` to flip the glyph colour. Replaced with a relative-luminance threshold (>0.4 → dark glyph) so a palette tweak won't silently break legibility.
- Same pattern bit me on #161: hex-alpha by string concatenation. Pulled out a `hexAlpha(hex, alpha)` helper that throws on non-conforming input — visible regression instead of silent CSS garbage.
- `[...sefirah.hebrewName][0]` instead of `.charAt(0)` for the hero glyph: Hebrew is in the BMP so it's safe today, but Unicode-correct iteration is the right habit.
- Reviewer flagged the Ledger's `<section aria-label="…">` as duplicate landmark (the parent ritual `<section>` already scopes it). Switched to `<div>` so AT users navigating by landmarks don't see redundant entries.
- `RitualScene` returns `null` after the ritual completes — the per-route ambient layer from #161 paints the summary screen.
- 5 new tests (hero presence + Sefirah-keyed colour, hero ≥80 px via h-24, ledger 10 rows with state, blessed values vs "—" pending, ambient scene keyed to active Sefirah). 691 → 696 tests.
- Gate green: typecheck ✓, lint ✓, test ✓ (696 + 1 todo / 697).

**Commit(s):** _filled in after push_

## 2026-04-28T13:18:20-04:00 — local-CI tooling: pnpm ci:local + supabase devDep + pre-push hook

**Pushed:** Three pieces of dev-loop infrastructure: (1) `supabase` added as a project devDep with `pnpm.onlyBuiltDependencies` allowlist so the postinstall actually runs and lays down the binary at `node_modules/.bin/supabase` — the canonical Linux install path that doesn't need sudo or a global npm install (which the package explicitly refuses). (2) `scripts/ci-local.sh` mirrors the four CI jobs from `.github/workflows/ci.yml` (verify → build → e2e → integration) with fail-fast and skip-flag escape hatches; wired up as `pnpm ci:local` and `pnpm ci:local:fast`. (3) Native git hooks via `core.hooksPath = .githooks/`, installed idempotently by `scripts/install-git-hooks.mjs` from the standard `prepare` lifecycle script. The pre-push hook runs `pnpm ci:local:fast` (verify + build) so the obvious failures never reach GitHub.
**Why:** Codified `~/.claude/rules/local-ci-and-admin-merge.md` requires "all CI jobs run locally" before any merge — including admin merges when hosted CI is broken. Without `pnpm ci:local` the checklist is a copy-paste of four separate commands; with it, it's one command. The pre-push hook is the upstream-side version: a broken commit can't even reach GitHub. Together they make the rule tractable per-PR rather than a heroic effort.
**Notes:**
- Self-hosted GitHub Actions runner is the third leg (handles "the runner pool is down, but my push needs CI checks for the merge gate"). Deferring that to a follow-up — it's a one-time setup that touches system services, not a code change.
- Husky was considered and rejected: native `core.hooksPath` is dependency-free and equally good for a single-repo single-developer workflow.
- Verified `pnpm ci:local` end-to-end on this branch — all four jobs green. Supabase boot to teardown takes ~70 s on first run.
- Hosted CI on PR #173 hit the same runner-startup-failure pattern as the rest of wave 3 (4-second job failure with no step output, BlobNotFound on logs). Per the new rule, admin-merged because local CI was fully green and the hosted-CI failure was plausibly infrastructure, not a regression.
- Gate green: typecheck ✓, lint ✓, test ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** `6d72b7b`

## 2026-04-28T12:35:00-04:00 — #158: TeamMeters polish (Epic #118 wave 3, retro-filed)

**Pushed:** Replace TeamMeters' two thin (`w-4` = 16 px) flat-colour bars with `w-12` (48 px) gradient bars, centre the meters row (`flex justify-center gap-8`), and refactor PillarStreak from a body-text caption into three pillar columns (M/S/B) where the current pillar fills toward 3 in its pillar colour (mercy blue, severity crimson, balance gold). Illumination uses a tiferet-gold gradient (`#a87c00` → `#ffd700`); Separation uses a foggy-slate gradient (`#4a4a5a` → `#9a9aaa`) keyed to binah.
**Why:** Wave-3 fan-out from Epic #118; #154 ui-review marked `/demo/meters` at 11/20 — "two skinny ~12 px bars parked at the left edge, pillar streak as flat caption." Spec from ticket #158: ≥40 px wide bars, gradient fills, centred layout, pillar streak as columns.
**Notes:**
- Originally cut as commit `f90ca00` on `feat/158-team-meters` (PR #167) at 2026-04-28T11:33. That branch hit a Journal merge conflict against `main` that needed a `git push --force-with-lease` to resolve, but the user's per-action policy denies that; this resubmits the same code via cherry-pick onto current `main` as branch `feat/158-team-meters-v2`. PR #167 will be closed and superseded.
- Gradient backgrounds via inline `style.background` (CSS shorthand accepts gradient values; flat colour also works there). The shared `Meter` component is left untouched per ticket scope; TeamMeters carries its own `GradientMeterBar` helper to keep that boundary stable. Snapshot tests on `Meter` therefore unaffected.
- First reviewer pass flagged the original Separation gradient (`#1a1a1a` → `#5a5a7a`, pure binah charcoal at the bottom) as ~1.12:1 contrast against the indigo ground — early Separation would be invisible. Lifted the floor to `#4a4a5a` so 1–2 Separation reads from frame one; top stop preserves the binah-charcoal identity.
- Pillar streak column widget uses `data-pillar-column={pillar}`, `data-active`, `data-fill-ratio` attributes for tests; `aria-label` on the parent carries the full readout for screen readers. Letter labels (M/S/B) chosen over full names — full names won't fit at `w-3`.
- Test additions: bar widths (w-12), centred row, three columns, current column carries fill ratio, fresh streak inactive. After this lands the suite is 697 → 703.

**Commit(s):** `a46995c`

## 2026-04-28T13:52:46-04:00 — #174: visual regression spec (Epic #118 wave 4)

**Pushed:** New `e2e/visual-regression.spec.ts` using Playwright's `expect(page).toHaveScreenshot()`. Walks the same 14 routes as `screenshots.review.spec.ts` at desktop / tablet / mobile = 42 baselines committed under `e2e/visual-regression.spec.ts-snapshots/`. Animations disabled per-assertion; `maxDiffPixelRatio: 0.005` absorbs anti-aliasing variance without masking real regressions. Runs as part of `pnpm e2e` so it executes on every PR (and via the local `pnpm ci:local` chain).
**Why:** Wave-4 sub-ticket of Epic #118. Wave-3 just polished every UI surface; without pixel-diff regression locked in, a future "tighten this padding by 4 px" or "swap a gold for a different gold" silently breaks the look. This ticket turns those into failed tests.
**Notes:**
- Verified the assertion mechanism by deleting one baseline and re-running — Playwright fails loudly with "snapshot doesn't exist."
- Tried verifying the visual-diff path by sabotaging a source file, but the local Next dev server was being shared from the main repo (a stale `pnpm dev` running there) which Playwright's `reuseExistingServer: true` connected to instead of rebuilding from the worktree. The spec is still correct — CI doesn't reuse, and a clean dev machine doesn't have this problem. Documented in the spec comment.
- Reviewer flagged cross-platform baseline collision: contributors on macOS would generate `*-darwin.png` files alongside the `*-linux.png` ones; CI never compares against them. Added a `.gitignore` inside the snapshots directory blocking `*-darwin.png` and `*-win32.png` so the dead weight can't be committed accidentally.
- Reviewer flagged `networkidle` flakiness on future realtime / long-poll pages — added a sentinel-pattern note in the spec comment.
- Route-list duplication across three specs (`screenshots.spec.ts`, `screenshots.review.spec.ts`, `visual-regression.spec.ts`) noted as a follow-up; not in this ticket's scope.
- Gate green: typecheck ✓, lint ✓, test ✓, build ✓, e2e ✓ (42 visual-regression assertions pass clean), integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-28T14:14:41-04:00 — #176: doc-vs-code audit (Epic #119 sub-ticket 1)

**Pushed:** New `design/doc-audit-2026-04.md` (501 lines). Walks every Markdown file in the repo (18 docs) and classifies each against code at HEAD (`0cb0141`, post-#175) as `current` / `partial` / `stale` / `missing`. Each per-doc entry carries evidence of drift (specific file:line citations) plus a one-sentence remediation suggestion that fan-out tickets can copy as their AC.
**Why:** Keystone for Epic #119. Sub-ticket 2 (refresh fan-out) and sub-ticket 5 (anchor backfill) both depend on this audit existing. Without it, refresh tickets get filed by gut feel.
**Notes:**
- Top-3 drift findings (lead with these in the refresh PR): (1) `design/playability-priorities.md` is fully stale — every Tier 1–4 ticket it lists as in-flight is now CLOSED; (2) `CLAUDE.md` Test commands section omits the new `pnpm ci:local` and pre-push hook (added 2026-04-28 in #173) and step 5 of the Working agreement still hardcodes the old `typecheck && lint && test` triple; (3) `design/ui-review.md` is stale relative to the wave-3 polish merges it itself filed — every fan-out ticket #156–#163 shipped on 2026-04-28.
- Cross-checks performed: CLAUDE.md test commands → `package.json`; README route list → `app/**/page.tsx`; reference/* counts and key fields → `data/*.ts`; mechanics.md rules → `engine/*.ts` constants (DC table, separation loss threshold, shell activation step); playability-priorities.md ticket statuses → `gh issue view`; recent merges (45 commits since 2026-04-27) for features that shipped without doc updates.
- Reviewer caught three structural improvements: added `.claude/` to the audit's exclusion list with rationale; fixed the self-contradictory Chesed "no action needed but here's a caveat" in `reference/sefirot.md` entry (now `partial` with a concrete remediation); resolved the "or" ambiguity in `design/test-quality-baseline.md` remediation (picked the inline-update path).
- Format chosen: per-doc sections rather than a table — sub-ticket-2 author can copy a remediation block directly into a new ticket's AC.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓ (incl. 42 visual-regression assertions from #175), integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-28T14:23:30-04:00 — #178: refresh CLAUDE.md (Epic #119 sub-ticket 2)

**Pushed:** Two scoped edits to project CLAUDE.md. (1) Working agreement step 5 — replaced the bare `pnpm typecheck && pnpm lint && pnpm test` triple with a `pnpm ci:local` (full) and `pnpm ci:local:fast` (pre-push) section. Points at `~/.claude/rules/local-ci-and-admin-merge.md` for the per-PR checklist + admin-merge policy and notes the auto-installed pre-push git hook. (2) Test commands section — expanded from 8 commands to all 16 in `package.json` (every `scripts:` entry), each with a one-line purpose. Added a "skip flags for ci:local" subsection.
**Why:** Highest-leverage of the top-3 drift findings from the #176 audit. CLAUDE.md is auto-loaded into every Claude session — agents follow what it says verbatim. Without this refresh, future sessions skip the `pnpm ci:local` gate that we just codified as mandatory.
**Notes:**
- Code reviewer mistakenly flagged `e2e` and `e2e:screenshots` as phantom scripts; verified they DO exist in `package.json` (lines 17, 18) and the doc is correct.
- Reviewer correctly caught the "before review" → "before merge" wording regression in step 5. Restored to "before review (and again after any review-driven fix, before merge)" so the gate runs at both points.
- Pre-scaffold note (about pre-#6 tickets without `package.json`) dropped — ancient history; git log carries it for any agent who needs the context.
- Skip-flag info now lives in two places (CLAUDE.md + `scripts/ci-local.sh`); accepted the trade-off because CLAUDE.md is the discoverability surface and the script is the implementation. Drift risk is low (env-var rename would break CI loudly).
- Stay-scoped: only step 5 + Test commands section touched. Other doc-audit findings (playability-priorities.md, ui-review.md, etc.) are separate fan-out tickets.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-28T14:41:32-04:00 — #180: refresh playability-priorities.md (Epic #119 sub-ticket 2)

**Pushed:** Rewrite of `design/playability-priorities.md` to v3.0. The v2 doc framed the punch list as in-flight gating; the new doc reframes it as MVP-shipped (all 14 Tier 1–4 tickets closed 2026-04-27/28) and pivots to a forward-looking post-punch-list epic queue. Preserved the v2 sequencing rationale as a "v2 history" footer because the reasoning still holds; dropped the "Quick reference for the agent picking it up next" gh-issue-view block because that phase is over.
**Why:** Second fan-out from the #176 doc-audit (top-3 drift finding #1). The doc was the most stale surface in the repo — it claimed "13 open tickets" gating MVP when in fact every Tier 1–4 ticket had merged 2026-04-28.
**Notes:**
- Reviewer caught three real issues. (1) Ticket-count inconsistency: TL;DR said 13, sequence at the bottom listed 13 but the actual punch list was 14 (adding #128 which closed pre-v2.1). Reconciled to 14 with explicit framing. (2) Epic #84 marked "✅ done" but the tracking issue is OPEN on GitHub — softened to "sub-tickets closed; tracking issue still open." (3) Recommended-sequence step 5 was a 30-second admin action ("close #84"); demoted to a footnote so the numbered sequence only contains real dev initiatives.
- Reviewer's improvement: timestamp the "hosted CI is broken" risk-register entry with a self-expiry note ("Remove this entry once hosted CI has been green for 48 h"). Applied.
- Mid-run wart: `pnpm ci:local` hit a port-54322 conflict because a stray Supabase stack from a prior worktree's `ci:local` run was still bound. Trap-on-exit didn't fire (prior shell had exited). Ran `pnpm exec supabase stop --no-backup` manually; re-ran ci:local; clean. Filing a follow-up to make `ci-local.sh` reap stray stacks pre-start.
- Acceptance criterion ⏳ kept open (manual user-flow video on real device) — the only acceptance bar not covered by automated tests; honest to leave it pending.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓ (incl. 42 visual-regression assertions), integration ✓ (after the port-conflict cleanup).

**Commit(s):** _filled in after push_

## 2026-04-29T09:17:27-04:00 — #182: ci-local self-cleanup of stray Supabase stack

**Pushed:** One-line fix in `scripts/ci-local.sh`: run an idempotent `pnpm exec supabase stop --no-backup` immediately before `supabase start` in the integration step. Reaps any stray stack from a prior run that exited abruptly (terminal close, parent-process kill) where bash's EXIT trap didn't fire. The `supabase stop` CLI is a no-op when nothing is running, so unconditional pre-cleanup is safe.
**Why:** Surfaced during #180. The script's trap-on-EXIT/INT/TERM is correct for the success path and most failure paths, but bash doesn't propagate a parent-process kill into the EXIT trap. Result: `pnpm ci:local`'s integration step would error at `supabase start` with a port-54322 conflict, requiring a manual `supabase stop` to recover. With the rule being "run `pnpm ci:local` before every merge," that's a real friction point.
**Notes:**
- Verified by leaving a stack running (`pnpm exec supabase start`), then running `pnpm ci:local` — the integration step booted cleanly without intervention.
- Reviewer noted the stdout suppression on the pre-clean call masks the "Docker daemon not running" case; that error still surfaces from the immediately-following `supabase start` (just with a less-specific error message). Acceptable trade.
- The original trap-on-exit stays unchanged — it's still the right thing for clean shutdown.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-29T09:27:51-04:00 — #184: mark ui-review.md as pre-polish historical (Epic #119 sub-ticket 2)

**Pushed:** Three additions to `design/ui-review.md`, no original content overwritten. (1) Top banner explaining v1 status — wave-3 polish has shipped, scores describe the pre-polish surface, post-polish is locked in pixel-diff baselines by #175. (2) "Next review" subsection naming the trigger (re-score after Epic #118 wave 4 closes — motion pass + empty/error/loading states). (3) "What shipped since v1" section between TL;DR and Per-route scoring, with a route → PR mapping table covering all eight wave-3 polish merges plus the cross-cutting atmosphere (#161), SVG token (#162), and demo chrome (#163) work, plus the regression lock-in via #175.
**Why:** Third fan-out from the #176 doc-audit (top-3 finding #3). Doc was reviewed pre-polish; preserving the v1 scores as historical baselines (rather than overwriting) lets a future re-review compare deltas.
**Notes:**
- Reviewer caught a count error ("five routes not in this table" but eight listed) — dropped the count, kept the list. Also flagged inconsistent v1 labelling on the TL;DR vs the Fan-out section — added a parallel `> v1 pre-polish — historical.` callout block to TL;DR.
- Per-route prose (one paragraph per route, scoring the four axes) preserved verbatim so a future re-review can compare deltas.
- Did not re-score from PNGs — the visual regression baselines exist as the post-polish source of truth, but actual re-scoring requires fresh review captures and judgment that belongs to a future review pass when wave 4 closes.
- Self-cleanup from #182/#183 worked first run — `supabase start` no port-conflict, no manual intervention.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-29T09:40:37-04:00 — #186: doc-anchor drift-check (Epic #119 sub-ticket 3)

**Pushed:** New `tests/docs/anchors.test.ts`. Walks every `.md` file in the repo (skipping `node_modules`, `e2e`, `coverage`, `playwright-report`, `test-results`, `dist`, plus all dotfile dirs), parses `<!-- code-ref: path:symbol -->` HTML-comment anchors, and emits one `it()` per anchor that asserts the path exists and (when a symbol is given) that the file contains a top-level export of that symbol. Failure messages name the source `.md:line` plus the offending path / symbol so jumping to the bad anchor is one click.
**Why:** Sub-ticket 3 of Epic #119. The recent doc refreshes (#179 CLAUDE.md, #181 playability, #185 ui-review) cite specific paths and symbols; without a drift-check those claims rot silently. Same pattern as #175 (visual regression locks the polish surface) but for code-doc claims.
**Notes:**
- Verified by seeding three deliberate anchors against a clean Journal.md: missing path → fail with clear message; missing symbol → fail with clear message; valid `lib/use-lobby.ts:useLobby` → pass. All restored cleanly.
- Reviewer flagged a false-negative case in the `export { internalName as publicName }` regex — the inner name matches as a word and would silently pass. Documented as a known limitation in the JSDoc rather than complicated the regex; the failure mode is a doc-author misuse (anchoring the internal name) and the right fix would be adding a real named export.
- Reviewer suggested adding `dist` to the dir exclusion list proactively — done.
- `it.todo` shim for the "no anchors yet" case so the test file always has a passing assertion structure. Removed once sub-ticket 5 backfills anchors.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓ (711 + 2 todo / 713 incl. 1 new), build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-29T09:55:49-04:00 — #188: markdown link drift-check (Epic #119 sub-ticket 4 link half)

**Pushed:** New `tests/docs/links.test.ts`. Walks every Markdown file with the same exclusion list as `tests/docs/anchors.test.ts`, parses inline `[text](path)` and `![alt](path)` links, skips externals (`http(s)://`, `mailto:`, `ftp:`, `tel:`), pure fragments (`#section`), empty paths, fenced code blocks, and inline code spans. Each remaining relative path is asserted to resolve to an existing file or directory; one `it()` per link so failures point at the exact `mdPath:line :: link → target` drift.
**Why:** Sub-ticket 4 of Epic #119, link half. Sub-ticket's route-table half is deferred until the README has an explicit route list (the marketing-polish ticket that adds one will be the natural place to land both).
**Notes:**
- 25 relative links found across all docs at HEAD, all resolve.
- Verified by seeding a broken `[missing](does-not-exist.md)` link → fail with clear message; restored cleanly.
- Walker + exclusion list duplicated with `anchors.test.ts`. Comment in both files calls out the manual sync; will extract a shared helper if/when a third consumer arrives. Not yet.
- Treats files AND directories as "exists" — `[link](./design)` is fine if `design/` is a directory. Markdown renderers typically expand those to `index.md` or a directory listing.
- No fragment validation in this pass — `[link](./adjacent.md#section)` only checks `adjacent.md` exists. Documented.
- Reviewer suggested also documenting that reference-style links `[text][label]` are out of scope (none in this repo); added to the JSDoc.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓ (736 + 2 todo / 738), build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-29T10:09:08-04:00 — #190: backfill code-ref anchors (Epic #119 sub-ticket 5)

**Pushed:** Seeded 17 `<!-- code-ref: -->` anchors into the recently-refreshed docs to activate the drift-check from #186/#187 on load-bearing claims. Coverage: `CLAUDE.md` anchors `package.json` + the local-CI tooling (`scripts/ci-local.sh`, `scripts/install-git-hooks.mjs`, `.githooks/pre-push`); `design/mechanics.md` anchors `HAND_CAP`, `STARTING_HAND_SIZE`, `REQUIRED_ILLUMINATION_MARGIN`, `SEPARATION_LOSS_THRESHOLD`; `design/shells.md` anchors `SHELL_THRESHOLD_STEP`, `MAX_ACTIVATIONS`, and (per reviewer) `SEPARATION_LOSS_THRESHOLD` since the doc cites the 15 directly; `reference/sefirot.md` anchors `data/sefirot.ts` and `data/types.ts:SefirahKey`; `design/ui-review.md` anchors four wave-3 component files. Replaced the `it.todo` "no anchors yet" branch in `tests/docs/anchors.test.ts` with a real `it()` that asserts `allAnchors.length > 0` so accidentally fencing all anchors no longer silently neuters the suite.
**Why:** Sub-ticket 5 of Epic #119. Without seeded anchors, the drift-check from #186 ran but had nothing to verify. The next code rename / file move / constant change at any of these load-bearing claim sites now fails CI loud.
**Notes:**
- Reviewer spot-checked: `engine/setup.ts:HAND_CAP` line 42, `:STARTING_HAND_SIZE` line 30; `engine/endgame.ts:REQUIRED_ILLUMINATION_MARGIN` line 11, `:SEPARATION_LOSS_THRESHOLD` line 17; `engine/shells.ts:SHELL_THRESHOLD_STEP` line 11, `:MAX_ACTIVATIONS` line 14. All resolve. Component file paths exist on disk.
- Anchors placed after the prose claim or at section anchors so they survive normal doc edits without getting swallowed by paragraph rewrites.
- Reviewer flagged a meta-failure mode the new sanity gate now catches: if all anchors get accidentally fenced into code blocks, `allAnchors.length === 0` and the new `it()` fails loudly instead of passing.
- Reviewer also caught a missing anchor: `shells.md` cited Separation 15 directly but had no `SEPARATION_LOSS_THRESHOLD` anchor — added.
- Anchor count: 17 (up from 0). Test count: 18 = 17 anchor checks + 2 sanity gates (markdown-walker, anchor-count). 736 → 753 total tests.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-29T10:21:27-04:00 — #192: ingest screenshot pack to assets/marketing/ (Epic #119 sub-ticket 6)

**Pushed:** New `assets/marketing/` directory with 8 curated PNGs (~640 KB total) copied from the visual-regression baselines: home-desktop, home-mobile, play-desktop, demo-tree-desktop, demo-cards-desktop, demo-ritual-desktop, demo-meters-desktop, demo-soul-aspect-desktop. Plus an `assets/marketing/README.md` indexing each asset, documenting the refresh workflow, and setting a 1 MB size budget for the directory.
**Why:** First marketing-polish ticket of Epic #119 Part 2. Sub-tickets 7 (README hero), 8 (gameplay gallery), and 9 (animated GIFs) need a stable place to point at. Sourcing from the regression baselines (rather than re-capturing) means the marketing pack is always derived from the locked surface the visual regression test guards.
**Notes:**
- File-naming: stripped the `-chromium-linux` Playwright suffix (implementation detail of the regression harness; marketing assets are a public contract). Source-baseline mapping recorded in the README's index table for provenance.
- Reviewer flagged `demo-soul-aspect-desktop` as a worth-adding miss (the wave-3 character picker; sub-ticket 8 will need a "choose your aspect" gallery shot). Added.
- Reviewer also asked for an explicit size budget. Added — 1 MB ceiling, with an LFS / external-CDN escape hatch documented.
- Refresh workflow stays manual `cp` loop in the README rather than a `package.json` script — this is a rare, intentional operation, not something to encourage running by accident.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_

## 2026-04-29T10:32:00-04:00 — #194: README hero refresh (Epic #119 sub-ticket 7)

**Pushed:** Hero band added to the top of `README.md`. Tagline elevated to a blockquote ("A cooperative ascent up the Kabbalistic Tree of Life"). 4-badge row via shields.io: Status (MVP playable), Next.js 14, TypeScript strict, Node 20+. Hero screenshot embedded — `assets/marketing/home-desktop.png`, the landing surface (per reviewer recommendation; first-impression honesty beats mid-game richness for a README hero). CTA row with three links: Read the rules → `design/mechanics.md`, Run it locally → in-page `#running-the-web-app`, See the screenshots → `assets/marketing/README.md`. All existing prose below preserved unchanged.
**Why:** Sub-ticket 7 of Epic #119, second of the Part 2 marketing fan-out. README v0 was functional but read as a developer file with no visual signal that this is a game. The hero band is the surface a potential player or contributor sees first; this gives it teeth.
**Notes:**
- Skipped CI badge (hosted runners in the runner-startup-failure pattern; perpetually-red badge is worse than none).
- Skipped LICENSE badge — no LICENSE file. Reviewer flagged this as worth a separate ticket (no LICENSE = "all rights reserved" under copyright law, which may not be the intent). Filing as follow-up scope, not in #194.
- Anchor slug `#running-the-web-app` verified to match the H2's GitHub-rendered slug.
- Reviewer's substantive call: hero asset choice. Originally chose `play-desktop.png` (mid-game richness); reviewer argued `home-desktop.png` is more honest as a hero. Swapped — the home page IS the marketing surface (with the hero band added in #169).
- All 4 new relative links + 1 image embed pass `tests/docs/links.test.ts`. Drift-check earned its keep on the same PR it was used in.
- Gate green: typecheck ✓, lint ✓, test:coverage ✓, build ✓, e2e ✓, integration ✓.

**Commit(s):** _filled in after push_
