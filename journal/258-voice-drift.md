# Journal — #258 feat(voice): text-audio drift detection

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/258
PR: https://github.com/swamp-dev/sparks-of-kether/pull/262

---

## 2026-05-22 — push 1: implementation + review fixes

**Pushed:** `scripts/voice/build-manifest.ts`, `scripts/voice/check-drift.ts`,
`scripts/voice/__tests__/drift.test.ts`, `pnpm voice:check-drift` script, CI soft gate.

**What changed:**
- `buildExpectedClipMap()` — enumerates 864 clips from `sefirahVerdicts` +
  `sefirahPlayerResponses` and returns key → `{text, textHash}`. Greeting clips (9)
  are excluded: no TypeScript source text file exists yet.
- `detectDrift()` — pure comparison function: manifest hash vs. recomputed hash.
  Extracted from `main()` specifically for testability. The module-level `main()`
  call is guarded by a `fileURLToPath(import.meta.url) === resolve(process.argv[1])`
  check so importing the module in tests doesn't fire the CLI entry point.
- CI step: `continue-on-error: true` initially so a missing manifest doesn't block
  the verify job during development. Becomes a hard gate once manifest.json is
  committed.

**Surprising:** The TOCTOU pattern (`existsSync` + `readFileSync`) is both
unnecessary and subtly wrong in the error case — if the file disappears between
the check and the read, you get a confusing ENOENT message from the catch block
that says "Failed to parse" not "No manifest found." Fixing to a single `readFileSync`
+ ENOENT branch makes the error path both simpler and more accurate. The review
caught this, and the fix is one of those "strictly better and shorter" cases.

The `process.exit()` calls inside `main()` required a guard to prevent test failures
from firing the CLI entry point when the test imports the module. The standard Node.js
ESM pattern (`fileURLToPath(import.meta.url) === resolve(process.argv[1])`) works
correctly with `tsx` because tsx executes the file as the entry point, making
`process.argv[1]` the resolved script path.

