# Journal — #320: fix(play): mobile discard banner bottom offset

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-11T01:03:42-04:00 — initial fix + review fixes + PR

**Pushed:** Two commits:
1. `6e5f19b` — `bottom-36` → `bottom-20` for mobile; `sm:bottom-32` unchanged for desktop. Responsive copy: "Tap" on mobile, "Hover" on `sm:+`.
2. `7a4f567` — Review fixes: `sm:` → `min-[768px]:` everywhere (matches the actual `isMobile` boundary at 768px — `sm:` fires at 640px, leaving 640–767px with wrong offset/copy); `bottom-20` → `bottom-24` (MobileHud can grow to ~96px with ShellStrip warnings; 80px would overlap).
**Why:** Tech-debt ticket from PR #15 review. The 640–767px breakpoint mismatch was a real correctness bug found by the reviewer.
**Notes:** Reviewer (code-reviewer) also flagged a MINOR: the dual-span a11y pattern is correct (`display:none` is honored by screen readers) but an `aria-label` on the `<p>` would be cleaner — deferred; not worth a follow-up ticket given the existing pattern is correct.
**Commit(s):** `6e5f19b`..`7a4f567`
