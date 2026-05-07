# Journal — #443: refactor(lobby): extract LOBBY_QUOTE constant

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T11:16:53-04:00 — push 1 (final): extract LOBBY_QUOTE constant

**Pushed:** Add a module-scope `const LOBBY_QUOTE = 'Two seekers. One Tree. The light ascends together.'` near the top of `components/setup/Lobby.tsx`, just after the JSDoc block. Replace the inline string in the `<p data-lobby-quote>` JSX with `{LOBBY_QUOTE}`. Seed `journal/443-extract-lobby-quote-constant.md`.

**Why:** Final and only push for #443. Deferred from the #403 review: the lobby subtitle quote was hardcoded inline in JSX with no extraction point for future copy revisions, i18n, or per-playthrough variation. Extracting to a module-scope constant produces a single findable edit point without restructuring.

**Notes:** Pure refactor — no behaviour change. The rendered string and the `data-lobby-quote` selector are unchanged, so existing tests and selectors still match (no test asserts the literal text). Local gate green: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` 1958 passed / 113 test files (zero delta from main; no tests added — there's no behavioural surface to assert beyond what's already covered). Followup-shape note from the ticket body: if per-playthrough variation lands later, swap the constant for a `data/lobby-quotes.ts` array + small picker mirroring `data/sefirah-blessings.ts`.

**Commit(s):** `e2860f8` (refactor); journal entry committed alongside.
