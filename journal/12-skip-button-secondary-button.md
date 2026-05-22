# Journal — #12: feat(blessing): skip-to-end affordance as proper secondary button (refs #413)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T23:39:55-04:00 — initial push

**Pushed:** feat(blessing): skip-to-end affordance as proper secondary button (#12)
**Why:** Restyle skip affordance from unstyled text to secondary button shape with border, padding, and focus ring per #413 playtest finding
**Notes:** none
**Commit(s):** `bfb46ed`

## 2026-05-21T17:28:00-04:00 — baseline update push

**Pushed:** test(e2e): update demo-ritual-mobile baseline for styled skip button (#12)
**Why:** CI visual-regression caught that the bordered skip button adds 34px height at mobile viewport; updated the Playwright snapshot to match the intentional layout change
**Notes:** none
**Commit(s):** `437f39f`
