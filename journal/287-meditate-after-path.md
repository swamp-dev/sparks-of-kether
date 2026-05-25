# Journal — #287: feat(play): meditate after path into cleared sefirah

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-25T11:15:00Z — push 1: implementation + tests + review fixes

**Context:** After playing a path into a cleared Sefirah, the player lands
in `'end'` phase with only an End Turn button. There was no meditate window,
even though meditating from 'move' (pre-#503) used to be the primary way to
draw cards. This meant clearing a second sefirah on a turn silently denied the
player the card draw that a normal-sefirah turn would give them via the post-
encounter react phase.

**What shipped:**

- **Engine (`lib/turn-machine.ts`)** — `meditate` case now accepts
  `phase === 'end'` in addition to `phase === 'move'`. When fired from
  `'end'`, phase stays `'end'` (cannot play the drawn cards), and
  `lastAction` is explicitly set to `undefined` (clears the auto-advance
  signal from the path play). The `meditatedThisTurn` flag prevents a
  second meditation regardless of which phase it fired from.

- **Room actions (`lib/room-actions.ts`)** — Critical bug fix: meditate
  arm previously hardcoded `phase: 'move'` in the produced state, which
  would clobber a multiplayer client's `'end'` phase when the Realtime
  broadcast arrived. Fixed to `phase: state.phase` with `lastAction:
  undefined` when `state.phase === 'end'`.

- **Auto-advance (`components/game/PlayScreen.tsx`)** — Guard changed from
  `meditatedThisTurn === true` to `meditatedThisTurn === true && lastAction
  === undefined`. Precise discriminator: end-phase meditate clears
  `lastAction` (so the guard fires, requiring manual End Turn); move-phase
  meditate preserves `lastAction` (set to `'move-draw'` by the path play),
  so auto-advance fires normally — the player already saw the drawn cards.

- **UI (`components/game/PlayScreen.tsx`)** — Meditate button rendered in
  both `'move'` and `'end'` phases. Disabled when `meditatedThisTurn` is
  true. Post-meditate callout extended to cover `'end'` phase with copy
  "End your turn when ready." (vs the move-phase copy "You may still play
  a card, or end your turn.").

- **Design doc (`design/mechanics.md`)** — Added step 5 under turn order:
  after arriving at a cleared Sefirah the player may meditate once before
  ending their turn if they have not already meditated this turn.

- **Tests** — 4 engine tests in `turn-machine.test.ts` (end-phase meditate
  stays in end, sets meditatedThisTurn, clears lastAction; double-meditate
  rejected; challenge-phase meditate still rejected). 6 PlayScreen tests
  across two files: 2 auto-advance tests in `PlayScreen.autoAdvance.test.tsx`
  (end-phase meditate suppresses auto-advance; End Turn after end-phase
  meditate rotates seat); 4 UI tests in `PlayScreen.meditateFromEnd.test.tsx`
  (button visible/enabled; disabled after meditating; callout copy; move-phase
  meditate then end via path → button disabled + auto-advance fires).

**Surprised by:**
- `room-actions.ts` is a complete server-side mirror of `turn-machine.ts`
  and the meditate case had an independent `phase: 'move'` hardcode. This
  is a structural brittleness — any future meditate-phase change needs to
  be applied in both files. The comment block in room-actions.ts already
  calls this out ("Mirrors the meditate path in turn-machine.ts") but the
  guard was still wrong.
- The `lastAction` discriminator turned out to be exactly the right tool:
  end-phase meditate is the only event that (a) sets `meditatedThisTurn`
  and (b) clears `lastAction`. Using `meditatedThisTurn` alone would have
  suppressed auto-advance in the "move-phase meditate then path to cleared
  sefirah" case, forcing a manual End Turn click for no UX reason.
