# Journal — #507: feat(play): visible discard pile — clickable, browsable

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T01:07:00Z — push 1: implementation + tests + e2e

**Pushed:**
- `components/game/DiscardPile.tsx` — small face-up top-of-pile + count
  badge + offset stack shadow when > 1 card. Empty state is a muted
  "No discards yet" placeholder; button is `aria-disabled` and click
  is a no-op against an empty pile.
- `components/game/DiscardBrowseOverlay.tsx` — modal listing every
  card oldest-to-newest. `role="dialog"` + `aria-modal="true"` +
  Esc/backdrop/X close. Same `useRef`/`onClose` pattern as
  `SefirahInfoPopover` so the keydown listener mounts once instead of
  churning every parent render.
- Mounted in `PlayScreen.tsx` at the top of the right-column aside,
  above StatSheet. Updated `PlayScreen.layout.test.tsx` to expect 4
  panels (was 3).
- Unit tests (`DiscardPile.test.tsx`) cover empty/populated/singular-
  vs-plural/stack-shadow/Esc-and-backdrop close. Integration test
  (`PlayScreen.discardPile.test.tsx`) drives a state with a pre-seeded
  `discardPile` to validate the live-snapshot read.
- e2e (`discard-pile.spec.ts`) walks the meditate→end-turn over-cap
  flow per the post-#503 reducer (cap check fires on end-turn, not on
  Meditate) and verifies the pile + browse overlay both reflect the
  discarded cards.

**Why:** ticket #507 — visible discard pile. The pile lives in
`GameState.discardPile` but had no on-screen representation; players
couldn't see how close the recycle was, what the discard contained
for Yesod-Spark recovery, or where their over-cap shed cards landed.
This is the visualization. Drag-to-discard (#462) and Yesod recovery
clickability are explicitly out of scope.

**Notes:**
- The screenshots-review helper used a stale "skip... roll all
  remaining" regex — the actual button text is "Hasten the rite".
  Used `[data-action="skip-ceremony"]` instead, which is stable.
- Confirmed via the engine reducer that pendingDiscard is set on
  END-TURN, not on Meditate (post-#503). The e2e flow reflects that:
  P1 meditate → P1 end-turn (no overflow at 6/6) → P2 meditate → P2
  end-turn → P1 turn 2 meditate (6→8) → P1 end-turn (excess=2 →
  prompt fires). Catches a future regression where someone re-attaches
  the cap-check to Meditate instead.
- The pile mounting bumps the right-column-aside panel count from 3
  to 4. Updated `PlayScreen.layout.test.tsx` accordingly so the
  `p-4 lg:p-3` invariant still trips on drift.

**Commit(s):** `70c67ff`

## 2026-05-08T01:30:00Z — push 2: review fixes (focus restoration + z-index)

**Pushed:**
- `DiscardBrowseOverlay`: capture `document.activeElement` on mount,
  restore focus to it on unmount (WCAG 3.2.2). The pile button is
  always the opener in practice, but the implementation captures
  whatever had focus rather than hard-coding the pile button — it
  composes cleanly if a future caller mounts the overlay from a
  different trigger.
- `DiscardBrowseOverlay`: bumped backdrop / overlay from `z-40` to
  `z-50` so the overlay paints above the `DiscardPrompt` bottom-sheet
  (also `z-40`). Without the bump, a player with prior-turn discards
  who lands in the over-cap reconciliation flow could click the pile
  button and the overlay would render under the prompt sheet.
- `DiscardBrowseOverlay`: moved `useId()` to the top of the hook
  block (alongside `useRef`) so all hooks are grouped before the
  effects, matching the conventional React layout.
- `DiscardPile.test.tsx`: added a focus-restoration regression test —
  focuses the pile button, opens the overlay, asserts focus is on the
  dialog, presses Escape, asserts focus has returned to the pile
  button.

**Why:** code-reviewer first pass on `70c67ff` returned `fix` with two
Significant findings (focus-restoration + z-index collision) and one
Improvement (useId placement). All addressed. Other improvements
(`aria-disabled` + `disabled` redundancy, kether-phase AC interpretation,
recycle-when-empty test) are documented in the PR body — the first
two are pre-existing project patterns, the third is a minor test gap
filed as a follow-up.

**Notes:** none — all fixes are mechanical and small (≈30 net lines).

**Commit(s):** `43447ef`

## 2026-05-08T01:58:00Z — push 3: rebase onto current origin/main

**Pushed:**
- Rebased the three #507 commits onto current `origin/main` (which had
  moved 2 commits ahead — `9e6cf75` and `a45c6c6` — between push 2 and
  the would-be-push-3 moment). Clean rebase, no conflicts. The rebase
  was driven by the diff-against-main showing files that aren't from
  this branch (visual-regression PNG deletions, `hex-to-rgb-triplet`
  file move) — those were on origin/main but not on my fork point.
- Re-ran the local gate post-rebase: typecheck / lint / vitest /
  e2e — all green (2058 tests pass; e2e covers the pile + meditate-
  over-cap flow).

**SHA mapping after rebase:**
- `70c67ff` → `b44c7bb` (push 1: implementation)
- `43447ef` → `a593ee4` (push 2: focus/z-index fix)
- `cba14a5` → `20e09d6` (this entry's commit)

**Why:** keeping the branch current with `origin/main` so the local CI
parity check + the merge later are against the diff that'll actually
land. Also avoids the diff-against-main showing unrelated drift that
makes review harder.

**Notes:** rebase was clean; no test or build breakage. SHAs in push 1
and push 2 entries above refer to pre-rebase commits.

**Commit(s):** `30441fa`

## 2026-05-08T02:15:00Z — push 4: refresh play-mid-game VR baselines

**Pushed:**
- Refreshed `e2e/visual-regression.spec.ts-snapshots/play-mid-game-{desktop,tablet,mobile}-chromium-linux.png`
  to reflect the new DiscardPile panel at the top of the right-column
  aside.

**Why:** hosted CI's e2e job failed on the visual-regression spec —
the baselines were 800px tall (desktop) but the new aside renders at
968px. The growth is real (the 4th panel adds ~160px of vertical
content), not infrastructure flakiness. Admin-merge bypass was NOT
justified per the user's `feedback_inspect_ci_artifact_before_admin_merge`
memo: the diff showed a layout shift caused by my change, not an
infra ghost.

**Notes:** the desktop play-mid-game capture exceeds the original #411
fit-on-screen invariant of 1280×800 — the page scrolls 168px past the
viewport. That's a polish concern worth a follow-up (compact the pile
or relocate to the Tree column per the ticket's alternative-placement
suggestion). Tracking as a tech-debt issue.

**Commit(s):** filled at push time.

