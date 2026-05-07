# Journal — #403: feat(lobby): atmosphere treatment — Tree silhouette, quote, per-player glow, ready-up beat (refs #310)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-06T21:20:14-04:00 — push 1: atmosphere treatment (final / pre-PR)

**Pushed:** New `components/atmosphere/LobbyBackdrop.tsx` (faint Tree-of-Life silhouette, ~12% opacity, breathing under `motion-safe:`). `components/setup/Lobby.tsx` refactored to fill its container with the backdrop behind a `relative z-10` content stack; ceremonial subtitle quote in display-face italic; per-player ready+signed rows render an inline three-stack box-shadow tinted by the player's zodiac sign (computed from existing `attributionColor` source); host's Begin button gathers a Tiferet-gold aura via a sibling `<span>` carrying `shadow-glow-tiferet motion-safe:animate-breath` (separate element so the breath keyframe's opacity dip does not flicker the button text). Reduced-motion users see static halos. New unit tests cover backdrop / quote / per-row glow / Begin-aura DOM hooks; pre-existing axe-clean assertion in `components/__tests__/a11y.test.tsx` still passes against the augmented tree.

**Why:** First and final push for #403 — single coherent UI change; no intermediate scaffolding worth splitting.

**Notes:** No Lobby-specific entry exists in `e2e/visual-regression.spec.ts` (the `/play` baseline captures the sign-picker entry state, not the post-pick lobby — the page only enters the lobby phase after both players have signed in and readied up, which doesn't reproduce in a static GET). Considered adding a fixture-driven lobby route to the visual-regression spec, but that's broader than this ticket; flagging here so a follow-up can decide whether to widen the regression coverage to lobby state. The acceptance bullet "visual-regression baselines updated for desktop/tablet/mobile" is therefore a no-op — there are no Lobby baseline PNGs to refresh.

**Commit(s):** `9bb221f`

## 2026-05-06T21:32:15-04:00 — push 2: address code-reviewer significant findings

**Pushed:** Three significant findings from the first code-reviewer pass:
  1. **`nodeLayout` triplication** — extracted to `data/tree-layout.ts` (single record, exported as `treeNodeLayout` + `TREE_VIEW_W` / `TREE_VIEW_H` + the `NodeLayout` type). `TreeBoard.tsx`, `components/home/Hero.tsx`, and `components/atmosphere/LobbyBackdrop.tsx` all now read from there. Re-exported via `@/data` barrel.
  2. **`as ZodiacSignKey` cast on `Lobby.tsx:143`** — replaced the boolean intermediate (`glowOn`) with an inline narrowing at the use site (`p.ready && p.zodiacSign !== null`). TypeScript narrows directly; the cast is gone.
  3. **Viewport-fill gap** — Lobby `<section>` was `relative w-full` (content-height); on a tall viewport the void below the player rows was still visible, defeating acceptance criterion #1. Now `relative flex w-full min-h-[80vh] items-center justify-center`. Backdrop continues to fill the section via `absolute inset-0`; content sits vertically centered.

Also dropped redundant `role="presentation"` on the LobbyBackdrop SVG (parent's `aria-hidden="true"` already removes the subtree from the a11y tree). Pre-existing axe-clean assertion still passes.

**Why:** Code-reviewer's three significant findings — assessed honestly, all real (not defensive). Triplication was the load-bearing one: hero / play / silhouette all reference the same Tree geometry; pulling to `data/` kills the silent-drift footgun.

**Notes:** Re-review will run next per the skill's step-8a heuristic — new file + cross-file refactor + > 50 net lines moves this past the "minor formatting" threshold. Hero / TreeBoard imports re-pointed at the canonical export; behaviour is byte-identical (same coordinate values), but it's worth a fresh pair of eyes on the boundary.

**Commit(s):** `85f0779`
