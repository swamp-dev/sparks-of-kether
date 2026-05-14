# Journal — #526: Ambient music engine + sound-toggle fixes

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-14T16:41:02-04:00 — push 1: feature

**Pushed:** fix(hand): centre magnified card on screen, reduce scale, add fan pan; feat(sound): autoplay unlock + ambient music engine (#526)
**Why:** TDD session — user reported no audio playing. Root cause: two issues: (1) browser autoplay policy silently rejects `audio.play()` calls outside the user-gesture chain (useEffect is too late); (2) no ambient music engine existed. Fixed both. Also corrected sound toggle visual (wrong Tailwind opacity + knob colour when ON) and added `onError` warn to AvatarPortrait + portrait-asset existence test.
**Notes:** The audio unlock (`new Audio().play()` inside `setSoundEnabled`) must stay synchronous inside the click handler to remain within Chrome/Safari's user-activation window. The `fix(hand)` commit was uncommitted work on main that was carried into the branch at creation time.
**Commit(s):** `9aab1bb..ca3caad`

## 2026-05-14T17:09:08-04:00 — push 2: lint fixes

**Pushed:** fix(sound): lint clean — hooks before returns, interface not type, drop unused import
**Why:** `pnpm lint` caught three issues introduced in push 1: `react-hooks/rules-of-hooks` (useMusic placed after early returns in PlayScreen), `@typescript-eslint/consistent-type-definitions` (type alias instead of interface in test), and `@typescript-eslint/no-unused-vars` (stale ReactNode import).
**Notes:** useMusic moved to line ~235 in PlayScreen, before any early return, using `activePlayer.position` directly instead of waiting for `challengeContext`. The synth.test.ts PRNG uniformity test times out (pre-existing on main, unrelated to this branch).
**Commit(s):** `97d04f0`
