# Journal — #9: Home CTA portal glow + Tree-light surge on focus/hover

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T01:00:00+00:00 — push 1: TDD + implementation + review fixes

**Pushed:** Complete implementation of the home CTA focus glow and Middle Pillar
surge animation.

- Failing tests first (`test(home)`: data-surge-path on 3 paths, focus glow class,
  data-home-cta attribute)
- Implementation: `tailwind.config.ts` → `shadow-glow-tiferet-focus` token;
  `Hero.tsx` → `data-surge-path` on paths 13/25/32; `PrimaryCTA.tsx` → focus-visible
  glow class + data attribute; `globals.css` → `@keyframes path-surge` + `:has()`
  rules with 0/150/300 ms stagger, reduced-motion fallback
- Review fixes: moved `@keyframes` inside the `no-preference` media block,
  added fire-once design intent note, tightened Hero test to `svg [data-layer="paths"]`

**Why:** CSS `:has()` cross-sibling trick avoids React state lifting — Hero and
PrimaryCTA are siblings inside `[data-home-hero-band]`, so no server-component →
client-component conversion needed for Hero.

**Notes:** The "fire-once" animation (surge passes, then paths return to dim) was
flagged by code-reviewer as potentially ambiguous. Confirmed as intentional design
metaphor ("lightning ascending the pillar"). Documented in the CSS block comment.
The `animation-fill-mode: both` + 100%-keyframe-returns-to-dim combo is correct.

**Commit(s):** `a023538..0ee38f2`
