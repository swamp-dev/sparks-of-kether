# Journal — #448: refactor(tailwind): generic rotate-360 keyframe shared by shell + constellation

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T10:56:45-04:00 — push 1 (final): extract rotate-360 keyframe

**Pushed:** Add a generic `rotate-360` keyframe to `tailwind.config.ts` (`{0%: rotate(0deg), 100%: rotate(360deg)}`). Update both `shell-dormant-spin` (30s) and `constellation-rotate` (60s) animations to reference it. Drop the now-orphaned `shell-dormant-spin` keyframe. Move the Shell-specific intent comment from the deleted keyframe to the animation registration. Update the `constellation-rotate` doc-comment to drop the cross-keyframe reference. Seed `journal/448-generic-rotate-360-keyframe.md`.

**Why:** Final and only push for #448. Removes the silent coupling identified in the #406 review where the constellation animation referenced a Shell-domain keyframe by name — renaming or replacing `shell-dormant-spin` for Shell reasons would have silently broken the constellation art.

**Notes:** Pure refactor — no behaviour change. Animation utility class names (`animate-shell-dormant-spin`, `animate-constellation-rotate`) are unchanged, so the two consumer call sites — `components/tokens/ShellIcon.tsx:145` and `components/setup/sign-picker/Constellation.tsx` — need no edits. Local gate green: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` 1958 passed / 113 test files (no delta from main; this PR adds no tests because there's no behavioural surface to assert).

**Commit(s):** `03945ea` (refactor); journal entry committed alongside.
