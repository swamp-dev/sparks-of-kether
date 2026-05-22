# Journal — #116: fix(settings): move focus to Confirm button when quit confirmation appears

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T12:45:00Z — push 1 Focus management for quit confirmation

**Pushed:** Add `confirmBtnRef` + `useEffect([confirmingQuit])` to move keyboard focus to the Confirm button whenever the quit confirmation UI appears. Add test asserting `document.activeElement === Confirm` after clicking Leave Game. Also add `PantheonSettingsProvider` to the quit test helper (was missing, silencing future pantheon-related failures in that file) and extend the focus-trap selector comment to document the `tabindex="-1"` DOM-attribute string-matching assumption.
**Why:** Keyboard users had to Tab through the Cancel button to reach Confirm after clicking Leave Game. The existing pattern for the popover-open case already uses `useEffect` + a ref — this ticket applies the same pattern to the confirmation sub-state. The `PantheonSettingsProvider` gap was a latent trap caught in code review.
**Commit(s):** `816e6c9`, `<post-fix sha>`
