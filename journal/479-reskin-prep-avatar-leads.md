# Journal — #479: feat(encounter): re-skin EncounterScreen prep so avatar leads, modifier UI secondary

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T16:24:58-04:00 — push 1: initial implementation

**Pushed:** chore(assets): land initial Greek-pantheon portrait set (refs #476); feat(encounter): re-skin prep so avatar leads, modifier UI secondary
**Why:** Encounter prep sub-state now leads with the avatar at stage centre in an oval crop with the commissioned half-body portrait from #476. Trial-framing line renders above the modifier panel in font-display italic; Hod and Yesod (the two Sefirot with shipped per-Sefirah mechanics, #353/#354) get a Twist banner naming the rule per `design/per-sefirah-mechanics.md` § 2.2. Layout-only — no engine touch, no multiplayer dispatcher churn. Bundles 10 AI-generated portraits at `public/portraits/<character>/{large,small}.webp` (~600KB total, 16:9 source) plus `assets/portraits/LICENSE.md` mirroring the audio-cues CC0 policy. AvatarPortrait gains a `size: 'small' | 'stage'` prop; the stage variant renders the commissioned image via plain `<img>` (next/image not used elsewhere in the repo) and falls back to the Hebrew-letter placeholder on asset-load error.
**Notes:** Local gate clean (typecheck, lint, all 2002 tests). `pnpm build` green. Acceptance-criterion test for "framing line above modifier UI" pinned via `compareDocumentPosition`. Twist banner tests pin Hod/Yesod presence and Gevurah absence. Hot-seat collapse + multiplayer dispatcher tests pass without modification.
**Commit(s):** `2c5ad9f..eb882b4`

## 2026-05-07T16:38:00-04:00 — push 2: address review findings

**Pushed:** fix(encounter): address review — fallback test + visual-regression baselines (#479); docs(journal): entry for #479 push 2
**Why:** First-pass code-review on `d920bed` returned `fix` with two significant findings. (1) The `AvatarPortrait` `onError → setImageFailed` fallback path had no test coverage — jsdom does not fire `<img>` `error` events automatically, so the existing `[data-avatar-portrait-image]` assertion confirmed the happy path but a regression breaking the fallback wire would have shipped silent. New `components/game/encounter/__tests__/AvatarPortrait.test.tsx` drives `fireEvent.error(img)` explicitly and asserts the Hebrew-letter placeholder appears, plus coverage for small-size always rendering the placeholder, the per-character `src` shape, and the `data-player-response` prep-only attribute. (2) Visual-regression baselines for `/demo/challenge` were stale — regenerated all three (desktop / tablet / mobile) via `PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e visual-regression --update-snapshots`. Visual inspection of the desktop baseline confirms the intent: Ares portrait at stage centre in Gevurah-tinted oval, framing line in font-display italic, modifier UI subordinate.
**Notes:** Re-reviewed at `29e63da` (verdict: `ship`); no critical/significant findings, two trivial minors deferred to the PR body's untracked-minors section. Per-PR checklist complete (review → address → re-review → ship). Stamp written at this push's HEAD.
**Commit(s):** `29e63da..HEAD`
