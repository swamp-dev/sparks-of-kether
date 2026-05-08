# Journal — #549: refactor(avatars): migrate consumers to usePantheon

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-08T12:22:40-04:00 — push 1: migrate consumers to usePantheon

**Pushed:** refactor(avatars): migrate consumers to usePantheon (#549)
**Why:** Phase A3 of Epic #293. Consumer code stops importing the top-level greco-roman exports directly and starts reading through `usePantheon()`. Pure migration — no behaviour change in the greco-roman default. EncounterScreen + AvatarPortrait now read `pantheon.avatarNames`; SefirahDetail (converted to client component) reads `pantheon.sefirahCodexAvatar`; `lib/sound/cues.ts` couples to greco-roman by design (cue keys are greek-name-based). Drops the `avatar` field from `SefirahCodexContent`; inlines codex-avatar literals; deletes the `data/avatar-names.ts` shim. AC #1 grep is empty under `components app lib engine`.
**Notes:** none
**Commit(s):** `5151319`

## 2026-05-08T12:33:21-04:00 — push 2: address review (revert SefirahDetail to server component; fix footer; cross-assertion)

**Pushed:** fix(codex): revert SefirahDetail to server component; address review findings (#549)
**Why:** Code-reviewer flagged two SIGNIFICANTs and three actionable MINORs.

SIGNIFICANT 1 — `SefirahDetail` was converted to a client component to use `usePantheon()`, but the page has no interactivity that needs the active pantheon (codex pages are statically prerendered). Reviewer's argument was compelling: the `cues.ts` pattern (read `pantheons['greco-roman']` directly via the registry) is strictly better for static pages — zero JS cost, no hydration flash, Phase C1 (#557) re-introduces a client boundary at a higher level if/when codex pages need to track the active pantheon at runtime. **Reverted** to server component.

SIGNIFICANT 2 — User-visible footer text on codex pages still said "From `reference/sefirot.md` and `data/codex-content.ts`". The Voice row no longer comes from `codex-content.ts` after this PR. Updated to also list `data/pantheons/`.

MINOR fixes: added a Phase-B TODO to `lib/sound/cues.ts` documenting that the greco-roman cue-key coupling means alternate-pantheon audio requires extending `SoundCue`/`CUE_FILES` first; added a cross-assertion to the registry test that `sefirahCodexAvatar[k]` agrees with `avatarNames[k].greek` for the 8 encounter Sefirot (so future drift between the two greco-roman maps gets caught); refreshed a stale comment in AvatarPortrait test.

Skipped MINOR: AvatarPortrait inline cast warning ("three-place update"). Reviewer themselves marked this as "low risk, just note it" — leaving as-is.
**Notes:** Re-review fires per step 8a (fixes touched the SIGNIFICANT-flagged area). Local typecheck/lint/test green.
**Commit(s):** `1b7adde` (fix); journal entry committed alongside.
