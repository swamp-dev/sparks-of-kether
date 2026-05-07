# Journal — #411: feat(play): fit Tree of Life + hand on screen without scrolling at desktop+mobile

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T14:56:24-04:00 — push 1: viewport-height-aware Tree + tighter aside at lg+

**Pushed:** feat(play): fit Tree of Life + hand on screen at desktop without scrolling (#411)
**Why:** At 1280×800 the play surface scrolled — Tree at `max-w-xl` was ~893 px tall on its own, blowing past the viewport before the action bar + Hand stacked beneath it. Two-pronged fix that picks approach (a) from the ticket's three options ("smaller Tree + tighter HUD"): (1) wrap the Tree in an outer height-clamping container at lg+ that uses `aspect-[400/620] h-[calc(100vh-388px)] max-h-[440px]` so width auto-derives from height while preserving the 400/620 viewBox proportions; (2) tighten the right-column aside (`gap-6 → lg:gap-3`, `p-4 → lg:p-3` on each panel) and narrow the sidebar (`400px → 320px`) so the right column stops dominating the document height. Empirical measurement showed the aside (804.5 px tall) was the actual bottleneck, not the Tree (412 px) — fixing both was the difference between 837 px doc height and the target 800 px.
**Notes:** TreeBoard itself is unchanged — the early attempt to refactor its wrapper sizing (drop `inline-block` + inline `width:100%`) produced sub-pixel renders that broke the demo/tree visual-regression baselines, so the height clamp moved entirely into a new outer wrapper inside PlayScreen instead. Mobile preserved unchanged: every chrome change (gap, padding, sidebar narrowing) is gated to `lg:`. Three structural unit tests added (`PlayScreen.layout.test.tsx`) to lock the contract — they trip if a future refactor silently drops the lg+ aspect-ratio clamp or reverts the aside compaction.
**Commit(s):** single commit, this push

## 2026-05-07T15:09:40-04:00 — push 2: review fixes

**Pushed:** docs(play): correct gap-math in #411 wrapper comment; test(play): tighten layout-test brittleness (#411)
**Why:** Code-reviewer first pass on push 1 returned `ship` with one comment-math error and two test-quality improvements worth landing before merge. (1) The wrapper's offset breakdown comment said `16 px gap` twice but the actual `lg:gap-3` is 12 px — the 388 px total was empirically right, the breakdown was misleading. Fixed to read `12 px gap (lg:gap-3)` so the next person adjusting the offset doesn't add 8 px to their math by mistake. (2) The first layout test walks `[data-tree-root].parentElement` to find the #411 wrapper — added an explicit assertion that the parent is a `<div>` so a future TreeBoard restructuring fails loudly here instead of silently passing three vacuously-failing matches. (3) The aside-panel-count assertion changed from `>= 3` to `=== 3` with a comment naming the three expected panels (StatSheet conditional / TeamMeters / ShellPanel) so future drift surfaces.

The reviewer's other significant finding — the `/play` visual-regression baseline captures the sign-picker and never reaches the live PlayScreen, so a future regression of the layout work would not trip CI — is filed as tech-debt #492 (seed mid-game state for the VR spec). The reviewer's "scope creep" finding was incorrect (single commit, 3 files, all #411-relevant — investigated via `git log --oneline origin/main..HEAD`). Manual eyeball at the lg minimum (1024×768) per reviewer ask: doc height 789 px (21 px overflow), Tree 245×380 px — strictly improved versus main (which had unconstrained Tree); the AC explicitly targets 1280×800 where the fit is exact.
**Notes:** code-reviewer first-pass verdict ship; re-review fired to refresh the stamp at the new HEAD SHA after these fixes pushed.
**Commit(s):** single commit, this push