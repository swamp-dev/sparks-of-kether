# 32 — fix(play): keep #411 fit-on-screen invariant after DiscardPile addition

## Push 1 — ddaf063

**What**: Restored the 1280×800 fit-on-screen invariant (#411) after the
DiscardPile panel added in #507 pushed the desktop capture to 1280×858.

**Changes**:
- `DrawDeck.tsx`: added `lg:w-12` so the card preview shrinks from 80 → 48 px
  at desktop breakpoint only (mobile/tablet stay at `w-20`).
- `DiscardPile.tsx`: same `lg:w-12` on the button.
- `PlayScreen.tsx`: cluster wrapper padding tightened from `lg:p-3` → `lg:p-2`.
- `PlayScreen.layout.test.tsx`: updated layout assertion to expect `lg:p-2` on
  the cluster panel and `lg:p-3` on the remaining three.
- `play-mid-game-desktop-chromium-linux.png`: baseline regenerated; new
  dimensions 1280×800 (restored). Tablet/mobile unchanged (responsive
  breakpoint didn't affect those viewports).

**Why it worked**: card height scales with width (5:8 aspect ratio). Dropping
from 80 px → 48 px saves ~51 px in cluster content height; the padding
tightening saves another ~8 px. Total ~59 px reduction against the 58 px
overage.

**Surprising**: the previous baseline was 858 px (not the 968 px cited in the
ticket body), because `lg:gap-3` was already in place on `origin/main` before
this branch.
