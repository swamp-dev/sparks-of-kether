# Journal — #117: feat(settings): add aria-live announcement for quit confirmation state

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T13:02:00Z — push 1 role=alert on quit confirmation paragraph

**Pushed:** Add `role="alert"` (implicit `aria-live="assertive"`) to the "Leave this game?" paragraph inside the `confirmingQuit` sub-UI in `SettingsButton`. Initially used `aria-live="polite"` — changed to `role="alert"` after code review identified that `aria-live` on a freshly-injected node with pre-existing text content is unreliable in NVDA/Firefox and other AT combinations. `role="alert"` triggers on element injection itself, making it the correct and reliable choice. Also added `PantheonSettingsProvider` to the quit test helper (was missing) and updated the new test to use `screen.getByRole('alert')` with a comment noting the jsdom-only boundary.
**Why:** Screen-reader users received no announcement when the quit confirmation UI appeared. The `confirmingQuit` state flip mounts the paragraph fresh — the live-region mutation model requires the container to be present before content changes, so `aria-live` on the element at injection time is unreliable.
**Commit(s):** `befd541`, `9fac73c`
