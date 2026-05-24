# Journal — chore: commit voice assets, narrator clips, and manifest

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-24 — push 1: script fixes + 875 voice files + manifest

**What shipped:**
- `scripts/voice/generate-voices.ts` — extended to generate 2 Kether narrator clips
  (`narrator-kether-threshold-open.mp3`, `narrator-kether-threshold-close.mp3`) and write
  `public/audio/voice/manifest.json` after full (unfiltered) runs.
- `scripts/voice/build-manifest.ts` — updated module-level comment to document that
  `hashText` is shared infrastructure used by generate-voices.ts.
- `scripts/voice/__tests__/generate-voices.test.ts` — updated total count (873 → 875),
  added 4 narrator clip tests.
- `public/audio/voice/` — all 875 clips committed (576 verdicts + 288 responses +
  9 greetings + 2 narrator) plus `manifest.json`.

**Design decisions:**

- **Narrator clips use `config.avatars.kether`** — Kether is already in voice-config.json
  under `avatars`, so no new config section was needed. The narrator section checks
  `onlyAvatar === 'kether'` as the filter guard (matches by character name, not sefirah).

- **Manifest only written on unfiltered runs** — writing the manifest on a partial run
  (e.g. `--only-type narrator`) would overwrite it with a misleading timestamp claiming
  all 875 clips were "current" when only 2 were actually processed. The guard is
  `if (!onlyType && !onlyAvatar)`. Partial runs print a clear skip message.

- **Key extraction uses `basename`/`extname`** — more robust than string replace chains
  in case output paths ever change structure.

- **Narrator text:**
  - threshold-open: "All ten rise here. The final question opens."
  - threshold-close: "The threshold closes. What you have placed holds."
  Both lines are brief and cosmic, matching Kether's "gravitas without coldness" spec.

- **Greetings and narrator excluded from drift checking** — `buildExpectedClipMap` only
  covers the 864 verdict+response clips that have TypeScript source text. Greeting and
  narrator entries appear in manifest.json as orphans and are silently ignored by
  `detectDrift`, which only checks keys present in the expected map.
