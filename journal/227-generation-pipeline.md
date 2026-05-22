# Journal — #227 feat(voice): generation pipeline script

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/227
PR: (to be opened)

---

## 2026-05-22 — push 1: generate-voices.ts + tests

**Pushed:** `scripts/voice/generate-voices.ts` (CLI generation script) +
`scripts/voice/__tests__/generate-voices.test.ts` (15 unit tests for pure helpers).

**Design decisions:**

- **Output goes directly to `public/audio/voice/`** rather than `assets/audio/voice/`
  + a copy step. Next.js serves `public/` as static root; no separate copy pass needed.
  Paths mirror `lib/voice/paths.ts` exactly (filename without the leading `/`).

- **Greeting text defined inline** (9 lines in `GREETINGS` constant). Short sting-style
  line per avatar. Could be moved to a data file later if voice direction needs iteration,
  but the simpler form is right for the script.

- **Response clips use the zodiac sign's voice** (from `voice-config.zodiac`), not the
  avatar's voice. The player's sign speaks for the player — the zodiac voice is the
  identity being expressed, not the avatar being addressed.

- **Sefirah key → character name mapping** derived at runtime from `avatarNames` in
  `data/pantheons/greco-roman/avatar-names.ts` rather than hardcoded. Keeps the script
  in sync with the data layer automatically.

**Code review findings addressed:**
- Retry loop restructured: dead `throw` after loop replaced with `lastErr` capture
- `streamToBuffer` typed as `ReadableStream<Uint8Array>` (not `unknown`)
- `loadVoiceConfig()` validates `avatars`/`zodiac` keys on load (fail-fast before API spend)
- `parseArgs()` exits with usage message on unrecognized `--only-type` value
- `main()` exits with helpful error when filter produces zero clips (typo protection)
