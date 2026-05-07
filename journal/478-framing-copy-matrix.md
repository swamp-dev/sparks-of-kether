# Journal — #478: feat(data): sefirah-framing.ts trial-framing copy matrix

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T17:11:31-04:00 — push 1: initial implementation

**Pushed:** feat(data): sefirah-framing.ts trial-framing copy matrix (#478); test(playscreen): rebase shortcut-fail seed onto post-#478 rng draws
**Why:** Replaces the per-Sefirah static-line placeholder shipped in #496 with the full sign-aware multi-variant matrix — 8 challenge avatars × 12 zodiac signs × 3 variants = 288 strings. Each cell authored against `design/avatars.md` § 2 voice specs (Hermes wit, Demeter weighed, Ares martial, Apollo oracular, Aphrodite candid, Zeus magnanimous, Athena strategic, Selene tidal) + § 3 sign capsules. Picker `pickFraming(sefirah, sign, rng)` mirrors `pickVerdict` shape (single seeded `rng.int` call, throws loud on missing-cell drift). EncounterScreen consumer wired via lazy `useState` initializer parallel to the existing `playerResponse` pattern (#277), so the line stays stable across prep ↔ resolve ↔ react and react-retry loopbacks. Sign-less callers (demo / tests) fall back to the `sefirahFramingPlaceholder` map. Second commit rebases the `PlayScreen.shortcut.test.tsx` seed (7→13) onto the new pre-d20 draw sequence — the test now expects two `rng.int(0, 2)` draws (pickPlayerResponse + pickFraming) before the d20, with seed 13 producing d20=2 → guaranteed fail vs DC 12 + stat 1.
**Notes:** Local gate clean — `pnpm typecheck` clean, `pnpm lint` clean, full `pnpm test` 2023 passed + 1 todo, `pnpm build` green, `pnpm e2e visual-regression` 57/57 pass without baseline updates (the placeholder fallback is unchanged so `/demo/challenge` baselines stay valid). Tests pin: every cell has ≥3 distinct variants (cheap canary against future copy revisions), picker determinism + seed-variation sanity, voice-consistency canaries (Hermes lines lean on language/wordplay; Demeter on weight/sorrow/earth; Ares on cost/payment).
**Commit(s):** `d6364dd..b48d597`

## 2026-05-07T17:18:00-04:00 — push 2: address review

**Pushed:** docs(encounter): warn pre-d20 rng-draw ordering matters for seeded tests
**Why:** Code-review at `4e4d63a` returned `ship` with no critical/significant blockers, three minor observations: (a) `pickFraming` outer guard is structurally dead under the type-safe Record (cosmetic; left in), (b) no bad-sign throw test mirroring the bad-sefirah test (parallel gap to `pickVerdict`'s test file — not a regression), (c) the rng draw ordering between `pickPlayerResponse` and `pickFraming` is fragile — only enforced by the comment in `PlayScreen.shortcut.test.tsx`, with no cross-reference at the draw site. Item (c) is the most actionable: added a comment block in `EncounterScreen.tsx` near the draw site explaining the ordering and pointing future agents at the seed-rebase site if they add another pre-Roll rng draw. Items (a) + (b) + the three weak-cell author-polish notes filed as tech-debt #497 / #498 / #499.
**Notes:** Re-review skipped under skill 8a heuristic — fix is a pure-comment one-liner, no new files, no new lines beyond the comment, no new exported symbols, no behavior change. Stamp re-written at the new HEAD. Per-PR checklist complete (review → address → ship).
**Commit(s):** `<this commit>`
