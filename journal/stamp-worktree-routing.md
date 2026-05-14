# Journal — fix/stamp-worktree-routing

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

This branch fixes the per-PR-checklist mechanical gate. The
`PostToolUse:Agent` hook in `.claude/settings.json` had been
silently failing for code-reviewer dispatches because the harness
reports session cwd (usually the main repo on `main`) in the
payload, the script wrote to that cwd, and the "on main/master"
guard skipped without producing a stamp anywhere. Two compounding
gaps then opened: the `--reviewer-output FILE` CLI fallback let the
agent feed paraphrased reviewer text into the gate; even after
closing that, an agent with Bash access could pipe a fabricated
payload via `cat <<EOF | node scripts/checklist-stamp.mjs`.

Both bypasses are now closed: the script routes the stamp to the
correct worktree by scanning reviewer prompt + output for known
worktree paths/branches, cross-validates payloads against the
harness-written session transcript at `payload.transcript_path`,
and has no CLI fallback. `/ship-ticket` additionally requires
`written_via=hook` on the stamp.

---

## 2026-05-14T13:14:04-04:00 — push 1: stamp-gate hardening

**Pushed:** fix(gate): stamp script routes to worktree and rejects fabricated payloads
**Why:** During #553 PR 2 and #554, the agent shipped on stamps written via the `--reviewer-output FILE` CLI fallback. The reviewer text fed into the script was an agent-written paraphrase of the real reviewer output, not the verbatim response. Memory had recorded "PostToolUse:Agent hook silently does not fire"; debugging in this session shows the hook does fire but the script silently failed because the harness payload's `cwd` is the session cwd (main repo on `main`), and the script's "on main/master" guard short-circuited before writing anything. Two compounding gaps surfaced when the auto-mode classifier (correctly) blocked the agent-Write-the-reviewer-file pattern at the `/ship-ticket 616` invocation: closing the CLI fallback didn't fully close fabrication (bash pipe still works), and the agent had been writing the wrong stamp shape all along. The fix re-routes the hook's stamp to the right worktree, removes the CLI fallback, and cross-validates payloads against the harness-written transcript to close the bash-pipe path. Twenty-four unit tests cover the new logic. Skills updated to require `written_via=hook` and document that the agent must not work around hook failures.
**Notes:** none
**Commit(s):** `026779a`

---

## 2026-05-14T14:47:18-04:00 — push 2 + 3 + 4: round-by-round review fixes; drop racy sample-check

**Pushed:** fix(gate): address review findings — parseVerdict prose-bleed, JSON escape, retry race, simplify
**Why:** Three rounds of code-reviewer surfaced cascading issues:

- **Round 1** flagged the documented `parseVerdict` `\bfix\b`-before-`\bship\b` ordering bug (memory entry `feedback_stamp_parser_fix_prose.md` 2026-05-08). A verdict line like `"Ship — the core fix is sound"` self-classified as `fix` and would have blocked this PR's own merge. Fixed with a headline-word check: lowercase the first verdict word, strip leading markdown emphasis, return `ship` if it starts with `ship\b` — leaving "Fix issues then ship" correctly classified as `fix` because "Fix" is the headline word. Also flagged incomplete JSON escaping in the sample-check (manual `.replace` chain missed `\t`/`\r`/`\uXXXX`); replaced with `JSON.stringify(sample).slice(1, -1)`. Added 4 tests for the prose-bleed and stale-mtime cases. (Commit `5adb2b4`.)
- **Round 2** = Ship. (No new code, just verification.)
- **Round 3** = Ship (diagnostic call). Empirically discovered that legitimate code-reviewer responses ≥ 64 chars were being rejected as "sample not found in transcript" because the harness flushes the `tool_result` entry to the JSONL transcript *after* firing the hook. Added a 5×200ms retry loop using `Atomics.wait` for synchronous sleep. (Commit `e930146`.)
- **Round 4 + debug logging** = the retry didn't help. Empirical timing showed the harness writes the tool_result entry concurrently with / after the hook completes, not before. The reviewer text simply isn't present at hook-read time, ever. The whole sample-check design was based on a false premise about timing. Dropped sample-check entirely. Kept tool_use_id cross-check (the tool_use entry IS written when the call dispatches, before the hook fires, so this check works against synthetic-id fabrication). Added `process.getuid` typeof guard for non-POSIX safety. Updated ship-ticket adversarial-limits doc to honestly describe what the gate catches (synthetic-id payloads) and the residual replay-attack vector (same-session real tool_use_id + fabricated text; partially mitigated by head_sha at merge time; classifier is the primary defense against deliberate forgery). (Commit `d528315`.)
- **Round 5** = Ship. Confirmed the simplification is correct and timing diagnosis is sound. The hook wrote a legitimate `written_via=hook` stamp from this review for the first time in the PR's history.

The gate now works correctly: the hook fires on every code-reviewer dispatch (verified empirically), routes to the right worktree (via prompt+output scan against `git worktree list`), captures the reviewer's verbatim text from `tool_response.content[].text`, cross-checks `tool_use_id` against the live transcript to catch synthetic-id payloads, and writes a stamp with `written_via=hook` that `/ship-ticket`'s gate accepts.

The bootstrap concern documented in the PR body has been answered: this PR was reviewed multiple times, with each successive bootstrap install installing the new script into main's working tree (user-authorized one-time grants). The final ship-readiness review wrote a legitimate stamp for the current HEAD via the new hook logic. The PR can ship through `/ship-ticket` without admin override.
**Notes:** none
**Commit(s):** `5adb2b4`, `e930146`, `d528315`
