# Journal — #34: feat(settings): pantheon toggle in settings popover

Append-only. Never edit or delete past entries. One entry per `git push` on this branch.

---

## 2026-05-21T22:53:00-04:00 — push 1: implementation + review fixes

**Pushed:** feat(settings): add pantheon radio group to settings popover (#34); fix(settings): address review — tabIndex fallback for unknown pantheonId + tests
**Why:** Ticket #34 — players had no way to switch pantheon (Greco-Roman vs Egyptian) from within the game. Added a radio group to the settings popover after the Music toggle, using the existing `usePantheon()` hook for persistence.
**Notes:** TDD: failing tests first (10 tests, all red), then implementation. Code reviewer returned `fix` with two significant issues: (1) unknown stored `pantheonId` → all radios get `tabIndex=-1` → group unreachable via Tab; fixed by computing `pantheonFocusId` that falls back to first option when no match. (2) Focus-trap Tab-cycling behavior (modified by this PR) had zero test coverage; added `tabIndex=0/−1` correctness test, unknown-id fallback test, and 3-Tab traversal test. Also added ArrowLeft test (explicit ticket criteria gap) and switched from `aria-label` to `aria-labelledby` for single source of truth on visible label. Re-review after fixes returned `ship`.
**Commit(s):** `c141859..b62fa74`
