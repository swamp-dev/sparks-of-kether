# Journal — #463: feat(hand): Mac-dock-style magnification on hover/focus (refs #411)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T22:18:49-04:00 — push 1: dock-magnify implementation + tests

**Pushed:** feat(hand): Mac-dock-style magnification on hover/focus (#463)
**Why:** Cards in the post-#411 hand fan are smaller than the pre-fit version — players need a reliable way to read individual cards on demand without scrolling. The Mac-dock pattern (active card scales, neighbours nudge aside) keeps the fan dense at rest and readable on intent. Focus and hover share one active slot so keyboard users get the same affordance as mouse users.
**Notes:** none
**Commit(s):** `a84329d`

## 2026-05-07T22:25:00-04:00 — push 2: address review findings

**Pushed:** fix(hand): scope magnify transition + hoist activeIndex (#463)
**Why:** code-reviewer first pass returned `fix` with one SIGNIFICANT and four MINOR findings. Significant: `MAGNIFY_TRANSITION` was applied to every card on every render, so unrelated state changes (focus-index nav, selection, open toggle) animated the base fan transform on cards that weren't participating in the magnify. Scoped the transition to active + flanking pairs (`inMagnifySet`). Fixed two minors (hoisted `activeIndex` derivation outside the `.map()`; added a comment explaining the intentional pre-scale `translateY` order). Added a regression test pinning the transition-scoping fix and a final-blur assertion to the hover-wins-over-focus round-trip. Deferred two minors: legacy `addListener`/`removeListener` cleanup in `stubMatchMedia` (harmless test stub), per defensive-vs-real assessment.
**Notes:** re-review fires per step-8a heuristic (fix landed in an area the first pass flagged SIGNIFICANT); will be invoked after this push.
**Commit(s):** `2a5e75b`

## 2026-05-07T22:35:00-04:00 — push 3: animate the magnify exit

**Pushed:** fix(hand): keep magnify transition for one render past leave (#463)
**Why:** Re-review caught a regression in push 2's transition-scoping fix. Removing both `transform` and `transition` in the same render meant CSS skipped the exit animation — the active card snapped from `scale(1.3)` to `scale(1.0)` instantly instead of easing back. The reviewer was right: the feature's value proposition is "smooth dock magnification"; jank on exit contradicts that as clearly as jank on entry. Fix tracks the previous render's `activeIndex` via a `useRef` updated in a `useEffect` after commit. Cards that *were* in the magnify set keep the transition for one render past the leave, so the exit transform change animates. Test extended to assert the transition persists after `mouseLeave` (the half of the invariant the previous test did not pin).
**Notes:** re-review will fire again — fix is in the same SIGNIFICANT-flagged area.
**Commit(s):** `0923698`
