# Journal — #537: test(screenshots): refresh stale skip-ceremony selector in walkToPlayScreen

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T22:09:37-04:00 — push 1: open PR

**Pushed:** test(screenshots): swap stale skip-ceremony regex for stable selector
**Why:** The `walkToPlayScreen` helper in `e2e/screenshots.review.spec.ts` matched the BlessingRitual skip button by regex (`/skip.*roll all remaining/i`); the button copy was renamed to "Hasten the rite — roll the rest at once" so the regex no longer matched. The screenshots spec runs only under `PLAYWRIGHT_RUN_REVIEW=1` (dev tooling, not CI), so the breakage went unnoticed. #492 already adopted the stable `data-action="skip-ceremony"` selector in `e2e/visual-regression.spec.ts`; mirror that here so the walker matches production copy and can't rot with future button-text changes.
**Notes:** none
**Commit(s):** `67172f9`
