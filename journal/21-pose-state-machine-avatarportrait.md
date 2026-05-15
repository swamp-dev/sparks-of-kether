# Journal — #21: feat(encounter): pose state machine in AvatarPortrait

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-15T19:32:03-04:00 — push 1 · pose state machine + AvatarSilhouette

**Pushed:** feat(encounter): pose state machine in AvatarPortrait (#21)
**Why:** Wire the avatar's visual articulation to the encounter sub-phase — speaking during framing reveal, watching during d20 spin, pass/fail on verdict — so the silhouette communicates encounter state rather than sitting static.
**Notes:** `CheckOutcome` fixture in `encounter-pose.test.ts` initially used wrong field names (`roll`/`dc` → `rolled`/`effectiveDC`); caught by typecheck. Stage-size `AvatarPortrait` now renders `AvatarSilhouette` SVG as fallback instead of the Hebrew letter; two existing `AvatarPortrait` tests updated to check `[data-avatar-silhouette]` instead of `[data-avatar-placeholder-letter]`.
**Commit(s):** `ae46c84`
