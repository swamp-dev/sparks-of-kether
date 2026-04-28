# Doc-vs-Code Audit — 2026-04-28

_Captured-at: 2026-04-28T14:10-04:00. Status as of `main` HEAD = `0cb0141` (post-#175)._

Sub-ticket 1 of Epic #119 (`docs(update): Update All documentation
after dev complete`). Walks every Markdown file in the repo and
classifies it against the code at HEAD.

**Excluded:** `node_modules`, `e2e/__screenshots__`, `.next`,
`coverage`, and `.claude/` (the latter is agent tooling scaffolding,
not repo documentation; `SKILL.md` files there are not user-facing).

Cross-checks performed:

1. `CLAUDE.md` test commands → `package.json` scripts.
2. `README.md` directory layout / setup → `app/`, route map.
3. `reference/sefirot.md`, `paths.md`, `arcana.md`, `hebrew-letters.md`
   → `data/sefirot.ts`, `data/paths.ts`, `data/arcana.ts`,
   `data/letters.ts` exports (counts + key fields).
4. `design/mechanics.md` rules → `engine/checks.ts`,
   `engine/endgame.ts`, `engine/shells.ts`, `engine/setup.ts`,
   `engine/counters.ts` constants.
5. `design/playability-priorities.md` ticket statuses → `gh issue view`
   for each referenced ticket.
6. `git log --oneline origin/main --since="2026-04-27"` (45 commits)
   → which features shipped without doc updates.

---

## Top-3 drift findings (lead with these in the refresh PR)

1. **`design/playability-priorities.md` is fully stale — every Tier 1–4
   ticket it lists is now CLOSED**, and the doc still reads "13 open
   tickets" / "**4 Tier-1 bugs, 3 Tier-2 UX-clarity items, 3 Tier-3
   readability/pacing items, 4 Tier-4 phased-polish items**." Verified
   via `gh issue view` for #56, #99, #37, #38, #39, #128–#136 (all
   CLOSED). The doc's "MVP shipped" acceptance criteria (lines 128–137)
   are met in code but not reflected in the doc — the next agent who
   reads it will think there is a punch-list to walk when there isn't.
   This is the single most-misleading doc in the repo.

2. **`CLAUDE.md` § Test commands omits `pnpm ci:local` and
   `pnpm ci:local:fast`** (added 2026-04-28 in #173, alongside a native
   pre-push hook installed by `prepare`). The file also doesn't
   acknowledge the `prepare` script (which auto-installs the git
   hooks). Agents following CLAUDE.md verbatim will skip the
   single-command local CI gate and won't know the pre-push hook is
   the gatekeeper. Lesser drift in the same section: `package.json`
   exposes `pnpm test:coverage`, `pnpm test:integration`, `pnpm
   mutation`, `pnpm format`, `pnpm format:check`, `pnpm screenshots`,
   `pnpm e2e:screenshots` — none mentioned.

3. **`design/ui-review.md` is stale relative to wave-3 polish merges** it
   itself filed. The doc snapshot is dated `2026-04-28, post-#37
   merge`, but every fan-out it lists at the bottom (tickets 1–8,
   §"Fan-out tickets to file (Epic #118 wave 3)") has shipped:
   #156 (Blessing Ritual scene), #157 (Home hero), #158 (TeamMeters
   polish), #159 (Soul Aspect accents), #160 (card-back motif), #161
   (ambient layer), #162 (SVG token audit), #163 (demo padding) — all
   merged 2026-04-28. The per-route scoring (e.g. `/play` V2 F2 T4 D1
   = 9/20, `/` V2 F2 T4 D2 = 10/20, `/demo/meters` V2 F3 T4 D2 =
   11/20) was captured against the pre-polish UI; those numbers no
   longer reflect what a fresh `pnpm screenshots` would render. A
   refresh ticket should re-score against the post-wave-3 baselines
   committed by #175.

---

## Per-doc audit

### `./CLAUDE.md`

- **Status:** `partial`
- **Evidence:**
  - § Test commands (lines 156–169) lists 7 scripts. Missing from
    `package.json`: `test:coverage`, `test:integration`, `mutation`,
    `format`, `format:check`, `ci:local`, `ci:local:fast`,
    `screenshots`, `e2e:screenshots`, `prepare`. The two `ci:local*`
    scripts are the most material — they are the canonical local-CI
    gate per the 2026-04-28 Journal entry for #173 and the new
    `~/.claude/rules/local-ci-and-admin-merge.md`.
  - § Working agreement step 5 hardcodes `pnpm typecheck && pnpm lint
    && pnpm test` as the local gate (line 74). Reality after #173:
    `pnpm ci:local` (or `ci:local:fast` for verify+build only) is the
    one-command equivalent that also runs build / e2e / integration.
  - § Working agreement step 8 still says "Stop. The user merges on
    their own schedule" — this remains true and matches policy.
  - § Do NOT § "Never bump pnpm in `package.json` without also
    updating `.github/workflows/ci.yml` in the same commit" — still
    accurate; verified `packageManager: "pnpm@10.33.2"` is in
    `package.json:61`.
  - The pre-scaffold note (lines 76–79) about tickets #2–#5 not
    having `pnpm` scripts available is now historical noise — every
    referenced ticket is closed and the package exists.
- **Remediation:** Add `pnpm ci:local` / `ci:local:fast` to the test
  commands table; replace the step-5 gate with `pnpm ci:local:fast`
  as the canonical pre-push command; mention the `prepare`-installed
  pre-push hook; drop the historical pre-scaffold note (or move to
  Journal cross-reference).

### `./CONTRIBUTING.md`

- **Status:** `partial`
- **Evidence:**
  - Quick-start (line 12) reads "`pnpm install` # once the scaffold
    exists; see Epic #1 for status" — the scaffold has existed since
    #6 and a contributor encountering this caveat will be confused.
  - Otherwise the file is short and accurate — workflow pointer to
    `CLAUDE.md` is still correct.
- **Remediation:** Drop the "once the scaffold exists" caveat; the
  scaffold has existed for the entire post-#6 history.

### `./Journal.md`

- **Status:** `current`
- **Evidence:** Spot-checked the last entries (2026-04-28T13:18 #173
  local-CI tooling, 2026-04-28T12:35 #158 TeamMeters, 2026-04-28T13:52
  #174 visual regression). Each entry follows the template at the top
  of the file. The file is append-only by policy (CLAUDE.md § Working
  agreement step 7) and the rule is being followed. No content drift —
  this file is incident memory by design, not a spec.
- **Remediation:** No action needed.

### `./KabballahGame.md`

- **Status:** `current`
- **Evidence:** CLAUDE.md § Project snapshot and § Do NOT explicitly
  pin this file as historical: "Long-form ideation archive,
  preserved for history. The source of truth is `design/` and
  `reference/`." So the file's accuracy against current code is
  intentionally not a constraint. Spot-checked the header (Apr 24,
  2026 thread metadata) — matches the documented frame.
- **Remediation:** No action needed (do not update; doing so would
  violate the historical-archive contract).

### `./README.md`

- **Status:** `partial`
- **Evidence:**
  - § Running the web app gate command (line 56): `pnpm typecheck
    && pnpm lint` — narrower than CLAUDE.md (no `pnpm test`), and
    doesn't mention `pnpm ci:local`. Either both files should agree,
    or README should defer to CLAUDE.md.
  - Directory layout table (lines 60–69) lists `app/`, `components/`,
    `engine/`, `data/`, `lib/`, `test/`. Missing from the actual
    repo: `e2e/`, `tests/`, `scripts/`, `supabase/` (migrations),
    `reference/`, `design/`. Some of those are mentioned elsewhere
    in the README; the directory table itself is incomplete.
  - The README does NOT list routes per se — it points to "the Epic
    issue" for implementation tracking. Cross-check against
    `app/**/page.tsx` (15 routes today): `/`, `/play`,
    `/rooms/[code]/lobby`, `/tokens`, plus `/demo/{cards, challenge,
    hand, icons, meters, ritual, shell-panel, soul-aspect,
    stat-sheet, tokens, tree}`. The Multiplayer-setup section is
    accurate (Supabase env, `0001_init.sql`, RLS).
  - The "edge functions in a later ticket" line (line 100) is
    overtaken — `app/api/rooms/[code]/start/route.ts` and
    `events/route.ts` exist as App-Router route handlers (not
    Supabase edge functions, but the equivalent). Worth updating
    so a new contributor doesn't go looking for `supabase/functions/`.
- **Remediation:** Reconcile the README gate with CLAUDE.md (or use
  `pnpm ci:local:fast`); add `e2e/`, `tests/`, `scripts/`, `supabase/`
  to the directory table (or note that more dirs exist); replace the
  "later ticket" wording with a pointer to `app/api/rooms/`.

### `./design/mechanics.md`

- **Status:** `current`
- **Evidence:** Cross-checked the rules tables against the engine
  constants:
  - Stat-check DCs (lines 190–200): Yesod 10, Hod 12, Netzach 12,
    Tiferet 14, Gevurah 15, Chesed 13, Binah 16, Chokmah 16. All
    match `data/sefirot.ts:36–127` exactly.
  - Card-burn bonus +3, spark-burn +5 (lines 207–210) match
    `engine/checks.ts:9–13` (`CARD_BURN_BONUS = 3`,
    `SPARK_BURN_BONUS = 5`).
  - Shortcut DC penalty +3 (line 292) matches
    `engine/checks.ts:16` (`SHORTCUT_DC_PENALTY = 3`).
  - Shortcut failure +2 Separation (line 296) matches
    `engine/events.ts:78` (`event.shortcut ? 2 : 1`).
  - Hand cap = 6, starting hand = 4 (lines 56, 110) match
    `engine/setup.ts:30, 42` (`STARTING_HAND_SIZE = 4`,
    `HAND_CAP = 6`).
  - Pillar streak threshold = 3 (lines 304–307) matches
    `engine/counters.ts:11` (`STREAK_THRESHOLD = 3`).
  - Separation-15 loss (line 387) matches
    `engine/endgame.ts:17` (`SEPARATION_LOSS_THRESHOLD = 15`).
  - Win margin (Illumination ≥ Separation + 5, line 364) matches
    `engine/endgame.ts:11` (`REQUIRED_ILLUMINATION_MARGIN = 5`).
  - Soul Aspects: 6 personality Sefirot listed in § Soul Aspects
    (line 316). `data/types.ts:182` declares `SoulAspectKey` with
    exactly those six keys; `data/soul-aspects.ts` has 6 entries.
- **Remediation:** No action needed.

### `./design/playability-priorities.md`

- **Status:** `stale`
- **Evidence:** Document declares "13 open tickets" punch list
  (line 14) and a four-tier table (lines 60–93). Verified each via
  `gh issue view` on 2026-04-28 — the count of open tickets named in
  the punch list is **0**:
  - Tier 1: #128 (already noted closed in v2.1), #135, #136, #56 —
    all CLOSED (#138, #139, #140, #141 respectively).
  - Tier 2: #129, #131, #134 — all CLOSED (#142, #144, #143).
  - Tier 3: #132, #130, #133 — all CLOSED (#145, #146, #147).
  - Tier 4: #38, #39, #37, #99 — all CLOSED (#149, #150, #151,
    #148).
  - Deferred Epics referenced in § What is explicitly deferred:
    #84 (Testing & QA Hardening) is OPEN as expected; #117, #118,
    #119, #120, #125 also OPEN as expected. But the implication "the
    five MUST NOT start until the punch list closes" — the punch list
    has closed, so the gating premise has flipped. The doc's
    sequencing rationale (lines 97–112) is now history, not
    guidance.
  - The "MVP shipped" acceptance criteria (lines 128–137) — all
    Tier 1–4 closed; multiplayer flow walkable; one-pass user-flow
    video recorded — bullet 1 is met in code; bullets 2–3 are
    statements about playtesting/recording that the doc cannot verify
    on its own.
- **Remediation:** Replace the punch-list with a "closed log" (or
  archive the doc and replace with a fresh "post-MVP polish backlog"
  pointing at Epics #117/#118/#119/#125). At minimum, update the TL;DR
  to acknowledge the punch list shipped 2026-04-28.

### `./design/qa-smoke.md`

- **Status:** `partial`
- **Evidence:**
  - Header (line 114) says "Last updated: 2026-04-27 (initial)." Many
    UI surfaces named in §1–§9 have been polished since then —
    e.g. §1 "no flashing the wrong font" / Hebrew display font
    expectation; §2 challenge / hand surface; §6 demo pages — without
    invalidating the smoke checks themselves. The checklist still
    represents what a manual run should verify.
  - §3 line 48 acknowledges "the Soul Aspect picker UI is not wired
    into multiplayer yet." This is **still true** for the
    multiplayer flow — verified that the lobby page consumes the
    picker but the cross-tab sync is not part of any closed ticket.
    OK.
  - §1 line 13 "`SUPABASE_SERVICE_ROLE_KEY` set in `.env.local` if
    smoking the multiplayer flow. Without it, the `/start` route
    throws at request time." — still accurate (`lib/supabase.ts:235`
    reads the var; `app/api/rooms/[code]/start/route.ts` uses the
    service client).
  - §2 line 34 "fresh game, all Sefirot except Malkuth start
    uncleared" — still accurate per `engine/setup.ts:146`.
  - The new `pnpm ci:local` and pre-push hook (#173) are not
    referenced — but qa-smoke.md is explicitly the manual-only
    checklist (§ How to use line 6: "NOT executed in CI"), so the
    omission is by design.
- **Remediation:** Refresh the snapshot date and add a §1 line about
  the new ambient layer / Hebrew font fallback to call out
  post-#161 / post-#171 surfaces; otherwise leave the steps as-is —
  the checklist is medium-agnostic enough to survive UI polish.

### `./design/shells.md`

- **Status:** `current`
- **Evidence:**
  - § Awakening (lines 27–32) describes "+3 threshold (3, 6, 9, 12,
    15…) — Shell of the Sefirah with the fewest Sparks; tie-break
    toward lower Sefirah" — matches `engine/shells.ts:11` (`SHELL_THRESHOLD_STEP = 3`),
    `engine/shells.ts:14` (`MAX_ACTIVATIONS = 4`), and the tie-break
    logic in `pickNextShellTarget` (engine/shells.ts:80–93,
    "tie-break by Sefirah number descending — lower-on-tree wins").
  - § Banishment (lines 41–48) — matches `banishShell` and the
    stillborn-on-cleared logic in `maybeActivateShell`
    (engine/shells.ts:155).
  - § Naming rule (lines 9–18) — CLAUDE.md § Do NOT (line 132)
    enforces this and there are no proper-name leaks in the code or
    other docs (verified via `grep` — none found).
  - § The ten Shells (lines 50–112) — keywords match
    `data/sefirot.ts` `shellKeyword` field for all 10. Mechanic
    descriptions are flavor and the engine implements activation /
    banishment uniformly; per-Shell effects (Hoarding gates gifts,
    Cruelty drops Strength, etc.) are partially implemented in
    application code, but the doc's "ongoing pressure until banished"
    framing is consistent with the engine.
- **Remediation:** No action needed.

### `./design/test-quality-baseline.md`

- **Status:** `partial`
- **Evidence:**
  - Captured 2026-04-27 against `engine/` only (8 files, 801 mutants).
    Aggregate score 89.36% etc.
  - The numbers reported are a point-in-time snapshot, explicitly
    framed as such by the doc itself — so "drift" is the wrong frame.
    The risk is reader-side: a reader in 2026-05-01 may not realise
    the 89.36% figure refers to a historical run.
  - `engine/setup.ts` 72.73% commentary (line 47) refers to the
    empty-players guard from #35. That guard now has fixture coverage
    (#110 closed in #113, ticket text "test(setup): cover the empty-
    players guard"), so a re-run would likely produce a higher
    `setup.ts` score. The doc is not lying — it's a captured snapshot
    — but a reader will not know the gap has been addressed without
    running `pnpm mutation` themselves.
  - § Future expansions (lines 62–66) is still aspirational and
    accurate (mutation is not in CI as of HEAD; `lib/use-turn.ts` was
    refactored in #121 / closes #106 to extract `turnReducer`, which
    *enables* the listed expansion but the expansion itself hasn't
    landed).
- **Remediation:** Rerun `pnpm mutation` and update the inline numbers.
  The doc is presented as a baseline, not a log; freshening the inline
  scores keeps the simpler structure. (If the user later wants a
  longitudinal view, file a follow-up to convert it to a log format
  — but that's out of scope for the docs refresh fan-out.)

### `./design/testability-refactors.md`

- **Status:** `partial`
- **Evidence:**
  - Five candidates filed as sub-tickets (#106–#110, lines 178–185).
    Cross-checked against `git log` and `gh`:
    - #106 — refactor(use-turn): closed in #121 (commit `58767ba`).
    - #107 — refactor(presence): closed in #116 (commit `34efd18`).
    - #108 — refactor(lobby): closed in #115 (commit `166f723`).
    - #109 — refactor(supabase): closed in #114 (commit `38d9b1f`).
    - #110 — test(setup): closed in #113 (commit `a607f23`).
  - The doc presents the refactors as proposals ("Filing as a sub-
    ticket"); the work has shipped. A reader hitting this doc today
    will reasonably believe these are still in-flight.
  - The "Captured: 2026-04-27 against commit `ace5fd4`" framing (line
    3) is honest about the freeze date, but the doc's recommendations
    section reads as forward-looking when it's now history.
- **Remediation:** Add a closing § "Outcome" linking each filed
  sub-ticket to the merging PR with a one-line note (e.g. "#106 →
  #121 merged 2026-04-28: turnReducer extracted; hook is a thin
  `useReducer` wrapper now"). Do not modify the candidate analysis —
  it's the historical record of why the refactors happened.

### `./design/ui-review.md`

- **Status:** `stale`
- **Evidence:**
  - Snapshot date "2026-04-28, post-#37 merge" (line 3) — but #37
    merged 2026-04-28 in commit `73a01d8`, and so did #38, #39 and
    seven wave-3 polish PRs. The doc captured a brief window
    *before* wave-3 landed.
  - Per-route scoring against post-#37 baselines (`/play` V2 F2 T4 D1,
    `/` V2 F2 T4 D2, `/demo/meters` V2 F3 T4 D2): all three were the
    primary targets of wave-3 fan-out tickets which have since shipped:
    - #156 Blessing Ritual scene (closes #156, commit `91617fb`) —
      `/play` and `/demo/ritual`.
    - #157 Home hero illustration band (commit `cd7bb18`) — `/`.
    - #158 TeamMeters polish (commit `7df2e38`) — `/demo/meters`.
    - #159 Soul Aspect accents (commit `34b8976`) —
      `/demo/soul-aspect`.
    - #160 Card-back motif (commit `1970258`) — `/demo/hand`.
    - #161 Per-route ambient layer (commit `0a15ffe`) —
      cross-cutting, addresses the empty-space pattern at lines
      64–73.
    - #162 SVG token literals (commit `e87c5c4`) — addresses the
      cross-cutting Sefirah-colour-discipline note at lines 297–301.
    - #163 Demo padding (commit `eafaad6`) — addresses
      `/demo/challenge` mobile note at lines 74–80.
  - Pixel-diff regression baselines (#175 / commit `0cb0141`) now
    pin the post-wave-3 visuals at desktop / tablet / mobile, so a
    re-score against `e2e/visual-regression.spec.ts-snapshots/` is
    mechanically straightforward.
  - § Routes not reviewed (line 280) `/rooms/[code]/lobby` —
    integration test scaffolding (#88, #89) has now landed, so the
    "re-review once the scaffolding supports a baseline lobby
    fixture" condition is met but the re-review hasn't happened.
- **Remediation:** Re-score every route against the post-wave-3
  screenshots and update the per-route table; cross out the eight
  fan-out tickets at the bottom (or move them to a § Wave 3 outcomes
  appendix); add the lobby route to per-route scoring now that
  fixtures exist.

### `./reference/README.md`

- **Status:** `current`
- **Evidence:** Files listed (sefirot, hebrew-letters, arcana, paths,
  correspondences) all exist. The interlink diagram (lines 18–22) and
  authority note (lines 31–34) match the data's Golden-Dawn /
  Hermetic attributions (verified He = Aries, Tzaddi = Aquarius in
  `data/letters.ts:62, 198`). The data layer's 10 sefirot / 22 letters
  / 22 arcana / 22 paths counts match.
- **Remediation:** No action needed.

### `./reference/arcana.md`

- **Status:** `current`
- **Evidence:** Master table 22 cards 0–21. Cross-check against
  `data/arcana.ts` — 22 entries, numbers 0..21, names match exactly
  (The Fool, The Magician, …, The World), letterKeys match, pathNumbers
  match (0→11, 1→12, 2→13, … 21→32), attributions match (Air, Mercury,
  Moon, Venus, Aries, Taurus, …, Saturn). Per-card capsules (lines
  37–120) are flavor and consistent with the master table.
- **Remediation:** No action needed.

### `./reference/correspondences.md`

- **Status:** `current`
- **Evidence:** Four cross-tables verified:
  - Sefirot → planet/color/body/stat (table 1) — matches
    `data/sefirot.ts` planet/bodyPart/stat fields. The body/colour
    free-text is verbatim with `reference/sefirot.md`.
  - Letters → astrology → path (table 2) — matches `data/letters.ts`
    attribution+pathNumber for all 22 letters.
  - Tarot → letter → path → astrology (table 3) — matches
    `data/arcana.ts`.
  - Four Worlds → suits → realms (table 4) — design content, no
    code dependency.
  - Sefirot → Shell keyword (table 5) — matches `data/sefirot.ts`
    `shellKeyword` for all 10 entries.
- **Remediation:** No action needed.

### `./reference/hebrew-letters.md`

- **Status:** `current`
- **Evidence:** Master table 22 letters with Sepher Yetzirah
  classification — 3 mothers + 7 doubles + 12 simples. Cross-check
  against `data/letters.ts`: `grep -c "class: 'mother'"` = 3,
  `'double'` = 7, `'simple'` = 12. Path numbers, attributions,
  glyphs, gematria values match. The note on Crowley vs Golden
  Dawn (Tzaddi/He swap) is documented in `data/letters.ts:13–15`.
- **Remediation:** No action needed.

### `./reference/paths.md`

- **Status:** `current`
- **Evidence:** Master table 22 paths numbered 11–32. Cross-check
  against `data/paths.ts`: 22 entries; `from`/`to`/`letterKey`/
  `arcanumNumber`/`attribution`/`pillarsCrossed` for every path
  match the table. Sub-structures (Path of the Arrow:
  Malkuth→Yesod→Tiferet→Kether via paths 32, 25, 13) verified.
  Three abyss-crossings (14, 19, 27) verified. Three paths into
  Kether (11, 12, 13) verified.
- **Remediation:** No action needed.

### `./reference/sefirot.md`

- **Status:** `partial`
- **Evidence:** Master table 10 sefirot, plus per-Sefirah game blocks.
  Cross-check against `data/sefirot.ts`: 10 entries, hebrewName,
  englishName, pillar, planet, color (free-text), bodyPart, stat,
  shellKeyword fields all match. Three pillars table (lines 85–89)
  matches the `pillar` field assignments.
  - Note: `data/sefirot.ts` carries the **English glyph names** as
    `englishName` ("Crown", "Wisdom", "Understanding", "Mercy",
    "Severity", "Beauty", "Victory", "Splendor", "Foundation",
    "Kingdom") matching the master table's "English" column.
  - Game-block § Chesed (line 41): "Its challenge can never fail —
    only unfold." The engine implements Chesed as a normal DC-13
    check (`data/sefirot.ts:62`), so the "can never fail" framing
    contradicts the actual rule and risks reader confusion.
- **Remediation:** Edit the Chesed game-block to either rephrase the
  flavor (e.g. "feels generous in play — DC 13 is the second-lowest
  on the Tree") or remove the line.

---

## Recently merged (since 2026-04-27) without doc updates

`git log --oneline origin/main --since="2026-04-27"` (45 commits).
Already covered in the per-doc analysis above — restated here for the
fan-out filer:

| Commit | Title | Doc impact |
|---|---|---|
| `0cb0141` | #175 visual-regression baselines | qa-smoke.md should mention `pnpm e2e` covers visual diff now (low priority — qa-smoke is for manual only). |
| `7df2e38` | #172/#158 TeamMeters polish | ui-review.md `/demo/meters` score (currently 11/20). |
| `6d72b7b` | #173 ci:local + supabase devDep + pre-push hook | **CLAUDE.md § Test commands and § Working agreement step 5; README.md gate**. |
| `91617fb` | #171/#156 Blessing Ritual scene | ui-review.md `/play` and `/demo/ritual` scores (both 9/20). |
| `1970258` | #170/#160 card-back motif | ui-review.md `/demo/hand` score and "T-back placeholder" critique. |
| `cd7bb18` | #169/#157 Home hero band | ui-review.md `/` score (10/20). |
| `0a15ffe` | #168/#161 ambient layer | ui-review.md cross-cutting "empty-space / void problem". |
| `34b8976` | #166/#159 Soul Aspect accents | ui-review.md `/demo/soul-aspect` (16/20). |
| `eafaad6` | #165/#163 demo padding | ui-review.md `/demo/challenge` mobile note. |
| `e87c5c4` | #164/#162 SVG token audit | ui-review.md cross-cutting "Sefirah colour discipline". |
| `73a01d8` | #151/#37 sefirah-clear pulse | playability-priorities.md Tier 4. |
| `433ce00` | #150/#39 axe-core a11y | playability-priorities.md Tier 4. |
| `0b6e91c` | #149/#38 mobile-responsive | playability-priorities.md Tier 4. |
| `3107782` | #148/#99 Yesod fixture exclusion | playability-priorities.md Tier 4. |
| `e8dc70b` | #147/#133 ritual pacing | playability-priorities.md Tier 3. |
| `e65ebf0` | #146/#130 path hit-targets | playability-priorities.md Tier 3. |
| `effb27b` | #145/#132 bigger cards | playability-priorities.md Tier 3. |
| `517a15d` | #144/#131 auto-advance turn | playability-priorities.md Tier 2. |
| `0e86828` | #143/#134 stat-sheet in modal | playability-priorities.md Tier 2. |
| `6e89b29` | #142/#129 phaseHint affordances | playability-priorities.md Tier 2. |
| `f252702` | #141/#56 hand-cap + recycle | playability-priorities.md Tier 1; mechanics.md already describes the rule (current). |
| `47a2837` | #140/#136 path numbers visible | playability-priorities.md Tier 1; ui-review.md `/demo/tree` ("path numbers (#136) read cleanly"). |
| `cf1e99a` | #139/#135 hold roll reveal | playability-priorities.md Tier 1; qa-smoke.md §2 "challenge modal" is unaffected by the timing fix. |
| `10f15c4` | #138/#128 meditate draws 2 | playability-priorities.md Tier 1 (already noted closed); engine matches. |
| `e87f7e9` | #127/#89 real-Supabase integration | testability-refactors.md candidate context; playability-priorities.md note ("T3 #89 shipped"). |
| `bf458bd` / `58767ba` / `34efd18` / `166f723` / `38d9b1f` / `a607f23` / `fb602e4` / `f7baed5` | refactor / test fan-out | testability-refactors.md candidates 1–5 closed. |
| `5b234fe` | #105/#93 fast-check property tests | test-quality-baseline.md note about properties on hooks (now reachable post-#106). |

---

## Audit blockers

None. Every cross-check ran cleanly:

- Issue statuses fetched via `gh issue view` (all referenced tickets
  resolved their status, no rate-limit hits).
- Engine constants verified by direct file reads.
- Reference data counts verified by `grep -c` against the data files.
- Git log queried via `git log --oneline origin/main --since=`.

The Vitest / Playwright / Stryker test commands were **not executed**
per task constraints — only the static doc/code cross-check was
performed. If a follow-up doc-author wants the rerun mutation numbers
for `test-quality-baseline.md`, that's a separate ticket scope.
