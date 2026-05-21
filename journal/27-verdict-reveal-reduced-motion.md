# Journal — #27: test(verdict-reveal): assert RevealLine inherits reduced-motion snapshot

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T21:15:14-04:00 — initial implementation

**Pushed:** test(verdict-reveal): assert RevealLine inherits reduced-motion snapshot (#27)
**Why:** VerdictReveal passes `reducedMotionOverride={reducedMotion}` to RevealLine so the component uses the snapshot preference rather than the live hook. No test was pinning this wire-down; removing the prop would silently revert to live-read behavior without any test catching it.
**Notes:** Focused unit test in VerdictReveal.test.tsx — renders VerdictReveal with reducedMotion=true and asserts data-reveal-state="reduced" on the nested RevealLine. jsdom returns false from useReduceMotion() (matchMedia not available), so the assertion genuinely exercises the prop override path.
**Commit(s):** `2d56520030f8011ca5500c2a704ae01b548d9b00`
