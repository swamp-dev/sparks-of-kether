# Journal — #481: feat(motion): avatar-emerge entrance animation for the encounter screen

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T17:53:00-04:00 — push 1: initial implementation

**Pushed:** feat(motion): avatar-emerge entrance animation for the encounter screen (#481)
**Why:** New `avatar-emerge` keyframe + `animate-avatar-emerge` Tailwind utility (600ms `ease-emerge` `forwards`, opacity 0→1 + 12px translateY + 0.92→1 scale). Applied at the outermost `AvatarPortrait` wrapper so the entire component animates as one unit; the inner frame keeps its `animate-breath` halo independently because Tailwind's `animation` CSS property is last-class-wins on a single element. Only the `stage` size variant gets the entrance — small variants appear mid-encounter where an emerge would feel like re-arrival. `motion-safe:` gates both animations so reduced-motion users see a static portrait. Re-trigger semantics: stage avatar mounts only when prep is visible; prep→resolve unmounts the stage avatar so the small header avatar (no entrance) takes over; react→prep (retry) re-mounts the stage avatar so the entrance fires fresh — intentional, a retry is a fresh round.
**Notes:** Local gate clean — `pnpm typecheck` clean, `pnpm lint` clean, full `pnpm test` 2026 passed + 1 todo, `pnpm build` green, `pnpm e2e visual-regression` 57/57 pass without baseline updates (Playwright's `animations: 'disabled'` mode skips the entrance, identical visual to pre-#481). `docs/motion.md` Durations § extended with a "Named one-shot animations" sub-section documenting `animate-avatar-emerge` alongside `animate-shell-awaken` / `animate-shell-banish`.
**Commit(s):** `e92d282`

## 2026-05-07T18:01:00-04:00 — push 2: address review

**Pushed:** docs(motion): correct forwards rationale + tighten test prefix matching
**Why:** Code-review at `7809c0c` returned `fix` — one significant: the `forwards` fill-mode rationale in both `tailwind.config.ts` and `docs/motion.md` mis-described the breath halo as a "sibling element" needing a "clean baseline," when in fact the breath halo lives on a child element of the wrapper and is unaffected by the wrapper's fill-mode. The actual reason for `forwards` is to keep the wrapper at the 100% keyframe state — without it the element would snap back to opacity 0 / 12px-down / 0.92-scale when the animation ends. Both comment blocks rewritten to state the correct reason. One minor: the breath-halo test's negative assertion checked the substring `"animate-breath"` rather than the full `"motion-safe:animate-breath"`, blurring the "absent" vs "present-under-prefix" distinction. Tightened to use the full `motion-safe:` prefix on both negative assertions.
**Notes:** Re-review skipped under skill 8a heuristic — fixes are comment-only edits + one test-string tightening; no new files, no net code lines, no behavior change, no new exported symbols. Stamp re-written at the new HEAD.
**Commit(s):** `<this commit>`
