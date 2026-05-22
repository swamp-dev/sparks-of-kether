# Journal — #35: refactor(tree): combine GLOW + HOVER_GLOW maps into one per-key record

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T04:20:00Z — push 1 combine parallel glow maps

**Pushed:** Replace `GLOW_CLASS_BY_KEY` and `HOVER_GLOW_CLASS_BY_KEY` with a single `GLOW_BY_KEY` record carrying `{ base, peer }` per Sefirah.
**Why:** The two parallel maps had identical key domains; combining them halves the per-Sefirah maintenance surface. Tailwind JIT still sees all literal class names.
**Notes:** One test failure during gate run (`scripts/music/synth.test.ts` PRNG distribution) — confirmed pre-existing: same failure on `main`, zero relation to glow maps. Double-space alignment padding in initial `peer` strings was the root cause of a brief test failure (test checked `toContain` for exact class tokens). Fixed before commit.
**Commit(s):** `76b16f4` (rebased onto main after #124 merged)

---

## 2026-05-22T01:05:00Z — push 2 fix prettier format check

**Pushed:** Run `pnpm format` on `TreeBoard.tsx` to satisfy CI `format:check` job.
**Why:** The aligned inline form of `GLOW_BY_KEY` was valid but Prettier's print-width threshold expanded it to multi-line. CI failed on the format check step; local gate didn't include `format:check` in the prior run.
**Notes:** Semantic behaviour unchanged — just whitespace reformatting. Stamp updated to new HEAD.
**Commit(s):** `1bf8c8d`
