# Journal — #523: test(turn): cap-check test for stale-pendingDiscard re-entry

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T13:56:24-04:00 — push 1: stale-pendingDiscard re-entry test

**Pushed:** test(turn): cover stale-pendingDiscard cap-check re-entry (#523)
**Why:** the post-#503 cap-check arm in `turnReducer`'s `'end-turn'` case (`lib/turn-machine.ts:1443–1454`) carries a `(state.pendingDiscard?.count ?? 0) === 0` guard so a stale-snapshot retry can't double-write the prompt count. The reducer falls through to `endTurnReducer`'s no-advance branch, which returns the input state unchanged. Pre-#523 there was no test pinning that exact path. Added one in `lib/__tests__/turn-machine.test.ts` next to the existing #503 over-cap end-turn test.
**Notes:** none — pure additive engine test (1 new case alongside the existing cap-check group). Asserts pendingDiscard count preservation, no seat rotation, phase preservation, and object identity (`turned === state`). The identity assertion is the surface that catches a future refactor synthesizing a "structurally equal but new" state — that subtle change would break the `turned === state` no-op detection in the dispatcher (`lib/room-actions.ts`). Local gate green: typecheck + lint + full vitest (2189 passed | 1 todo, 132 files).
**Commit(s):** `3587538`

## 2026-05-08T14:00:35-04:00 — push 2: clarify identity-comment dependency graph

**Pushed:** test(turn): clarify the parallel turn-machine + room-actions identity guards (#523)
**Why:** review pass 1 verdict was `Ship` but flagged one SIGNIFICANT comment imprecision — the test comment described `room-actions.ts`'s `if (turned === state)` guard as if it were a downstream consumer of `turn-machine.ts`'s result, when they're actually two parallel paths that each call the engine primitive directly. Reworded the comment to say the identity-preserving contract benefits both paths (since either independently breaks if the engine returns a clone instead of the input reference).
**Notes:** pure comment edit; no test logic touched. Local gate not re-run — comment-only diff in a test file, no behaviour can change.
**Commit(s):** `0241db4`

