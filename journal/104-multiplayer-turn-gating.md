# Journal — #104: fix(multiplayer): gate hand visibility and actions to active player only

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-16T20:07:19-04:00 — initial implementation push

**Pushed:** test(multiplayer): failing tests for turn-gating — hand privacy + action disabling; fix(multiplayer): gate hand visibility and actions to active player only (#104)
**Why:** PlayScreen had no viewer identity in multiplayer — always rendered activePlayer.hand and had no per-viewer action gates. Added currentPlayerId prop, derived viewerPlayer/isMyTurn, gated hand rendering, all callbacks, movesEnabled, Meditate/End Turn, EncounterScreen, handlePathClick, and handleCardDrop on isMyTurn. Wired currentPlayerId from useLobby in the multiplayer play page.
**Notes:** TDD — failing tests committed first (35e36bf), implementation second (c5a13f5). Reviewer-found critical fixes applied in same session before push: handlePathClick/handleCardDrop/showChallenge gated on isMyTurn, onPathClick conditionally wired, viewerPlayer fallback changed from activePlayer to undefined to prevent hand leak when player not yet in snapshot.
**Commit(s):** `35e36bf..c5a13f5`
