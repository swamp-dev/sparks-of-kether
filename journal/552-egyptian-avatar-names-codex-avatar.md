# Journal — #552: feat(pantheon): Egyptian avatar names + codex avatar

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T14:44:53-04:00 — push 1: Egyptian avatar names + codex avatar + AvatarName rename

**Pushed:** feat(pantheon): Egyptian avatar names + codex avatar (#552)
**Why:** Phase B2 of Epic #293. First Egyptian content reaching real surfaces — flipping `localStorage.sok.pantheonId = 'egyptian'` shows Egyptian deity names on the codex Voice row and in the EncounterScreen verdict line. Renames `AvatarName.greek/roman` → `primary/secondary` (load-bearing change; secondary made optional) so the type is pantheon-neutral. Egyptian data files (`data/pantheons/egyptian/{avatar-names,codex-avatar,index}.ts`) wire the registry entry; verdict / blessing / framing slots fall back to greco-roman with TODO comments pointing at B3/B4/B5. Updated `lib/settings/__tests__/pantheon.test.tsx` AC #2 fallback test (`'egyptian'` → `'norse'`, since egyptian is now a real registry entry).
**Notes:** none
**Commit(s):** `454aa4e`

## 2026-05-08T14:57:28-04:00 — push 2: address review (TODO comments; Amun secondary; reference doc § 1.1; sentinel id)

**Pushed:** docs(pantheon): refine Egyptian avatar data + flag B/C-phase author traps (#552)
**Why:** Code-reviewer (verdict: ship) flagged two SIGNIFICANTs as "future-author traps" — both free TODO-comment fixes — plus 3 actionable MINORs. Applied:

- **SIGNIFICANT** — Added a TODO comment block to `EncounterScreen.tsx`'s picker imports flagging that `pickVerdict` / `pickPlayerResponse` / `pickFraming` import via `@/data/pantheons/greco-roman/` even though they're matrix-parameterised post-#550. B3/B4/B5 are the natural moments to relocate them to a neutral path. Comment makes the trap legible.
- **SIGNIFICANT** — Added a `TODO(#557)` comment to `SefirahDetail.tsx`'s hardcoded `pantheons['greco-roman']` read. After C1's toggle ships, codex pages will need to track active pantheon — visible bug otherwise. The comment names the two implementation options (client conversion vs higher-level boundary).
- **MINOR** — Dropped Amun's `secondary: 'Amun-Ra'`. Reviewer's point is correct: Amun-Ra is a *syncretic* (newer) form, not the older Egyptian-language root that other entries follow (Aset, Wesir, Djehuti, Heru, …). The consonantal Egyptian root `Imn` doesn't transliterate cleanly with vowels in modern English, so leaving `secondary` undefined is honest. The `secondary?: string` optionality the rename added covers this case.
- **MINOR** — Added `### 1.1 Older Egyptian-language forms` to `reference/pantheons/egyptian.md`. Lists the seven secondary names alongside the canonical primaries plus an explicit "—" for Amun. Reference doc is now the source of truth for both forms; data-layer audit can cross-check from there.
- **MINOR** — Replaced `'norse'` with a `__test_unknown_pantheon__` sentinel in the pantheon hook test (AC #2 fallback test + the AC #3 forward-compat assertion). Reviewer's point: any real pantheon name will eventually become a registry entry; the sentinel won't.

Skipped (reviewer-tagged "noting it as the correct mechanical consequence"): the `'use client'` directive on `AvatarPortrait.tsx` was added in #549 (when the hook was introduced) — not new in this PR.
**Notes:** Re-review fires per step 8a (fixes touched both SIGNIFICANT-flagged areas). Local typecheck + lint + test all green at HEAD.
**Commit(s):** `58b8da7` (fix); journal entry committed alongside.
