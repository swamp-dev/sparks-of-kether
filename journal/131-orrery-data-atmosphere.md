# Journal — #131: test(OrreryBackdrop): use data-atmosphere selector in className tests for consistency

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-20T21:55:00-04:00 — initial implementation

**Pushed:** test(OrreryBackdrop): use data-atmosphere selector in className tests for consistency (#131)
**Why:** Two className tests used `container.firstChild as Element` while every other test in the file uses `container.querySelector('[data-atmosphere="orrery-backdrop"]')`. The firstChild approach would silently select the wrong node if the component ever wraps in a fragment; the querySelector selector fails loudly in that case.
**Notes:** Two identical substitutions; no behavior change.
**Commit(s):** `9d6ae2becf99520fed2f40e8b66afba908133556`
