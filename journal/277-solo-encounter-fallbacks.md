# Journal — #277: feat(solo): encounter fallbacks and Final Threshold abbreviated coda for 1 player

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T03:15:00Z — push 1 solo action guards + Final Threshold coda UI

**Pushed:** Engine-level solo guards for `assist-request` and `gift-card` PrepModifiers, abbreviated coda UI for `FinalThresholdScreen` in solo play, and a journal entry.

- `lib/turn-machine.ts` — added `solo-no-allies` and `solo-no-gift-recipient` to `TurnReducerError`; both guards fire before their respective per-Sefirah gates (`binah-no-assists` and `chesed-hoarding`) so the UI receives a precise rejection reason. Solo guard fires at engine level to close the bypass path from a stale client or malformed wire event, independent of the UI hiding the ally/gift fieldsets.
- `components/game/FinalThresholdScreen.tsx` — `TrialPanel` now derives `isSolo = state.players.length === 1`; adds `data-coda-mode` attribute (`solo` | `chorus`) to the panel root; hides the round-robin chorus ribbon (`data-trial-order`) for solo. All other trial UI (roll button, whose-turn status, results log) remains unchanged — the solo player's turn loops correctly via the existing `(currentIdx + 1) % players.length` modulo.
- `engine/kether.ts` — comment-only: expanded to explain that for 5–6 players `% TRIAL_SEFIROT.length` wraps (two or three players share a repeated sefirah challenge) — intentional gauntlet adaptation to team size.
- Tests: failing-first commit added 3 solo action guard tests (`solo-no-allies`, `solo-no-gift-recipient`, control path with 2 players) and 4 solo coda UI tests (`data-coda-mode="solo"`, no chorus ribbon, Roll button active, no "Waiting for team" text). The fourth test pins the `PreRitualHoldView` unreachability invariant for solo — `maybeTriggerKetherRitual` fires immediately at `applyMove` time when the only player reaches Kether, so `phase === 'kether'` is always true before the component renders and neither hold-view path fires.

**Code review finding (addressed):** Reviewer noted the `kether.ts` comment was incomplete about 5–6 player wrap behavior; expanded to explain intentional wrap. Reviewer noted no test enforced that solo can't see "Waiting for team" text; added regression test. Second review returned Ship.
**Why:** Solo play is a first-class mode per the extended player-count range (#271–#275). Without these guards, a solo player could submit an `assist-request` or `gift-card` event from a stale client state and receive a confusing generic rejection. The abbreviated coda removes the multiplayer chorus ribbon that makes no sense as a "chorus of one."
**Commit(s):** `48718bd`, `8c93ed0`, `8ffdfb4`
