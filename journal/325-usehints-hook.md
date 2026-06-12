# Journal — #325: feat(hints): useHints hook + hint-storage utilities

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-12T19:55:00-04:00 — push 1: hook + storage + review fixes

**Pushed:** `lib/hooks/hint-storage.ts` (5 storage fns + `HINT_CHANGE_EVENT`), `lib/hooks/useHints.ts` (`useHints`, `getActiveHint`, re-exports), `lib/hooks/__tests__/useHints.test.ts` (17 tests covering all 8 AC + StrictMode regression).
**Why:** Implements #325 end-to-end. Two review passes; first returned Fix, second returned Ship.
**Notes:**
- No `turnNumber` on `GameState` — derived internally via a no-dep useEffect counting `end`→`move` phase transitions with `prevPhaseRef`.
- `_activeHint` module-level accessor is updated in a no-dep `useEffect` (not during render) to stay safe under Concurrent Mode abandoned renders. One-render stale window is acceptable: event handlers fire post-effect.
- Cleanup effect resets `prevPhaseRef`/`prevClearedSizeRef`/`prevHasPendingDiscardRef` on unmount so StrictMode's remount-cycle sees a clean slate. `turnNumberRef` intentionally excluded — must not regress.
- First review flagged: SSR guards missing on `clearAllHints`/`markFirstEventFired`/`markDismissed`; `_activeHint` written during render; phantom turn-increment under StrictMode. All three addressed in fix commit.
- StrictMode test: `draw-replenish` (trigger `turn-number:2`) surfaces after exactly one `end→move` cycle under `React.StrictMode` wrapper — fails if phantom-increment pushes counter to 3.
**Commit(s):** `814849c..6139d36`
