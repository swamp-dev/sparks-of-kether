# Journal — #444: refactor: move attribution-colors out of components/cards into shared lib

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T11:34:21-04:00 — push 1 (final): move attribution-colors into data/

**Pushed:** `git mv components/cards/attribution-colors.ts data/attribution-colors.ts` (rename detected, history preserved). Re-export `attributionColor` and `attributionLabel` from the `data/index.ts` barrel. Update both consumers — `components/cards/ArcanumCard.tsx` and `components/setup/Lobby.tsx` — to import from `@/data` instead of reaching across `components/<domain>/`. The two consumer imports collapse into the existing `@/data` import line in each file. Internal type-only import in the moved file switched from `@/data` to `./types` to match peer `data/*.ts` convention and avoid a barrel-self-import. Seed `journal/444-move-attribution-colors-to-data.md`.

**Why:** Final and only push for #444. Deferred from the #403 review: the attribution-colors module was originally local to the card-rendering domain, but PR #446 (lobby atmosphere treatment) added a cross-domain consumer (`components/setup/Lobby.tsx` reaching into `components/cards/`). The underlying ELEMENT/PLANET/SIGN_COLORS tables are symbolic-data-table-shaped — they belong with the canonical palette in `data/`, alongside `data/sefirot.ts` and `data/zodiac-signs.ts`.

**Notes:** Pure refactor — no behaviour change. Net diff is `+10 -5` across 5 files (rename + 4 line-level edits). Local gate green: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` 1958 passed / 113 test files (zero delta from main; existing tests cover both consumers and the moved module — `ArcanumCard.test.tsx` for the cards consumer, `Lobby.test.tsx` for the lobby per-row glow which still asserts the rendered `box-shadow` against the sign's hex). Comment references in `Lobby.tsx:144-145` and `Lobby.test.tsx:271` say "attribution-colors.ts" without a path — still accurate after the move (the basename is unchanged).

**Commit(s):** `a991292` (refactor); journal entry committed alongside.
