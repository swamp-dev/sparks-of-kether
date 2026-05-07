# Journal — #406: feat(sign-picker): wire constellation background art per #314 acceptance § 2 — faint SVG, slow rotation, prefers-reduced-motion gate

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-06T22:51:38-04:00 — push 1: rotate the focused-sign constellation (final / pre-PR)

**Pushed:** Add `constellation-rotate` animation to `tailwind.config.ts` (60 s linear infinite, reuses `shell-dormant-spin` 0→360 keyframe at half cadence). Swap the SVG class on `Constellation.tsx` from `motion-safe:animate-breath` to `motion-safe:animate-constellation-rotate`. Update Constellation.test.tsx with a rotation-class assertion (drop / class-rename catches at test time). Doc-comment refreshed to explain the rotation-vs-breath choice and transform-origin defaults.

**Why:** First and final push for #406 — single mechanical change. The constellation art + Constellation component + SignStage wire-up were all already shipped from #314; the only missing piece was the explicit "Slow rotation visible at default motion settings" acceptance bullet. Opacity-twinkle alone (the prior `animate-breath`) didn't satisfy the brief.

**Notes:** Single commit; no intermediate scaffolding. Not gate-introducing (touches no checklist mechanism). Keyframe reuse is intentional — `shell-dormant-spin`'s 0→360 linear loop is exactly the shape we want; the only difference is duration.

**Commit(s):** `9d21586`
