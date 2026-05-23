# Journal — #229 feat(voice): zodiac player response narration

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/229
PR: (to be opened)

---

## 2026-05-22 — push 1: player response voice wiring + tests

**Pushed:** `EncounterScreen.tsx` player response voice wiring + new
`EncounterScreen.playerResponse.voice.test.tsx` (4 tests). Rebased onto
post-#228 main to get `stopVoice` in loopback block and clean diff.

**Design decisions:**

- **`playerResponseVariantIndex` via lazy `useState`** — `pickPlayerResponse`
  returns the string, not the index. Recovered by `variants.indexOf(playerResponse)`
  in a second lazy initializer that runs after `playerResponse` is bound. No RNG
  draw, so the RNG ordering invariant noted in the framing comment is unaffected.

- **Effect fires on every prep entry (including retry)** — the player hears their
  response preamble before each roll attempt. `stopVoice` in the loopback block
  (from #228) ensures any verdict audio stops before the response voice starts.

- **Merged `useVoice()` call after rebase** — both #228 (verdict wiring) and
  #229 (response wiring) used `useVoice`. After rebase, the duplicate call was
  removed so both `playVoice` and `stopVoice` come from the single declaration
  added by #228 (line ~274).

**Code review findings addressed:**
- Silent indexOf miss: added `console.warn` in dev mode when `idx < 0` so data
  wiring errors surface instead of silently playing variant 0
- Removed empty no-op `act(() => {})` block from test helper
- Fixed test title to match its assertion ("Roll button is present" vs misleading
  "renders player response text")
- Removed unused `act` import after removing the only call site
