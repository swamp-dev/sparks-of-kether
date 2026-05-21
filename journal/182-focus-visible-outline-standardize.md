# Journal — #182: fix(a11y): standardize focus-visible:outline-none over focus:outline-none in newer components

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-21T03:34:25-04:00 — push 1 implementation

**Pushed:** fix(a11y): standardize focus-visible:outline-none across older components (#182)
**Why:** Replaces `focus:outline-none` with `focus-visible:outline-none` on interactive elements that also carry `focus-visible:ring-*`, restricting outline suppression to keyboard/AT focus only (matching PrimaryCTA, DiscardPile, D20Button, Hand). SefirahInfoPopover line 97 (no ring companion — intentional full-suppress) left unchanged. BlessingRitual.test.tsx assertions updated to match new class names.
**Notes:** none
**Commit(s):** `f1d753f`
