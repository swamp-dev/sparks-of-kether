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

