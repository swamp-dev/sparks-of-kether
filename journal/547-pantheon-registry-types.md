# Journal — #547: feat(pantheon): introduce Pantheon registry + types

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T00:13:45-04:00 — push 1: pantheon registry foundation

**Pushed:** test(pantheon): add parity assertions for greco-roman registry entry (#547); feat(pantheon): introduce Pantheon registry with greco-roman entry (#547)
**Why:** Phase A1 of Epic #293 — first child of the pantheons epic. Adds `data/pantheons/{types,greco-roman,index}.ts` with the `Pantheon` interface and the Greco-Roman registry entry. `data/avatar-names.ts` becomes a re-export shim so consumers compile unchanged; A3 (#549) migrates them to read via the registry. Verdicts/blessings/framing slots reference the existing top-level exports — A4 (#550) moves the data into per-pantheon files.
**Notes:** none
**Commit(s):** `371869d..b7ea19d`

## 2026-05-08T00:21:59-04:00 — push 2: address review (move EncounterAvatarKey, tighten test)

**Pushed:** fix(pantheon): move EncounterAvatarKey to data/types.ts to break latent type-only import cycle (#547)
**Why:** Code-reviewer flagged the type-only import chain `pantheons/types.ts → sefirah-framing.ts → avatar-names.ts (shim) → pantheons/types.ts` as a latent cycle. All `import type` today (TS erases), but a future value import in any link would surface it as a runtime cycle. Moved `EncounterAvatarKey` to `data/types.ts` (its semantic home — `Exclude<SefirahKey, ...>` is Sefirah-domain, pantheon-agnostic). `pantheons/types.ts` re-exports for callers reading "pantheon types"; the shim re-exports both. Slight deviation from the ticket's literal "put it in pantheons/types.ts" — captured in PR body. Also: tightened AC #3 test from `toEqual` to `toBe` (the AC says "same object" — identity, not deep-equal); expanded `PantheonId` doc-comment to call out the registry-must-update invariant.
**Notes:** re-reviewed after fixes; verdict from re-review captured in step 8.5 stamp.
**Commit(s):** `47f751f` (fix); journal entry committed alongside.

## 2026-05-08T00:30:44-04:00 — push 3: re-review polish (doc-comment precision)

**Pushed:** docs(types): clarify EncounterAvatarKey co-location rationale (#547)
**Why:** Re-review (verdict: ship) flagged a MINOR doc-comment imprecision in `data/types.ts`: the comment claimed the matrix files import `EncounterAvatarKey` directly from `./types`, but in fact they still go through the shim — it's the shim's redirect that closes the cycle, not a change to the matrix files' import paths. Comment-only fix; functional code untouched.
**Notes:** Re-review at HEAD `516884b` returned `ship` with one non-blocking MINOR (this doc-wording nit). Cycle was traced and confirmed broken. Per step 8a heuristic, the doc-only fix doesn't trigger another re-review (no new files, no new exports, no critical/significant area). Local typecheck + lint clean; full test suite green at `47f751f` (no behavioural delta).
**Commit(s):** `d53a2e1` (doc fix); journal entry committed alongside.
