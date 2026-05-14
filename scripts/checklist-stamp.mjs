#!/usr/bin/env node
/**
 * scripts/checklist-stamp.mjs
 *
 * Writes a per-PR checklist stamp file at
 * `<worktree>/.claude/state/checklist-<sanitized-branch>.json`
 * capturing the branch, the HEAD SHA the review ran against, and the
 * reviewer's verdict (ship / fix / block / rework). `/ship-ticket`
 * reads this stamp at merge moment to verify the per-PR checklist
 * actually ran for the current commit.
 *
 * **Single legitimate path: hook mode.** The script is wired as the
 * `PostToolUse:Agent` hook in `.claude/settings.json`. When the agent
 * dispatches the `code-reviewer` subagent, the harness invokes this
 * script with a JSON payload on stdin containing `tool_name`,
 * `tool_input`, `tool_response`, `cwd`, etc. The script verifies the
 * call was a code-reviewer dispatch, identifies the target worktree,
 * and writes the stamp there. The reviewer's verbatim output is
 * captured directly from `tool_response.content[].text` — the agent
 * never types it.
 *
 * **The explicit `--reviewer-output FILE` path was removed** (2026-05-14)
 * because it was the bypass surface: the agent could `Write` a file
 * containing fabricated "reviewer output" and stamp from that.
 * `/ship-ticket` now requires `written_via=hook` to merge, which
 * forecloses re-introducing explicit mode through other paths.
 *
 * **Worktree routing**: the harness reports `payload.cwd` as the
 * session's working directory, which is usually the main repo on
 * `main` — not the feature-branch worktree where the reviewer is
 * logically operating. The script enumerates `git worktree list`,
 * scans the reviewer's prompt and output for absolute paths matching
 * a known worktree, and writes the stamp into THAT worktree's
 * `.claude/state/`. Falls back to session cwd only when no worktree
 * reference is found.
 *
 * Stamp is overwritten on each invocation, so the re-review loop in
 * `/finish-ticket` step 8a naturally produces a fresh stamp at the
 * new HEAD SHA. `/ship-ticket` validates the stamp's `head_sha`
 * matches the PR's current `headRefOid`.
 *
 * Hook mode always exits 0 — hook failures must never block the
 * agent's tool call.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function readStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

export function parseVerdict(reviewerOutput) {
  // Reviewer output is markdown. Look for the "## Verdict" section.
  // The convention from `~/.claude/agents/code-reviewer.md` is one of
  // ship / fix / block / rework on the line(s) immediately following
  // the header — typically the first non-blank line, optionally
  // wrapped in markdown emphasis (`**Ship**`).
  //
  // Word-boundary matching matters. Naive `includes('block')` would
  // hit on "blockers" inside a sentence like "no new blockers found —
  // Ship.". Order matters too: block / rework are strictly stricter
  // than ship and must win first. Ship wins before fix because a
  // verdict that explicitly says "Ship" while mentioning "fix" in
  // prose (e.g. "Ship — the core fix is sound") is a clean ship,
  // not a request for further work. A "Fix issues then ship" verdict
  // doesn't say "Ship" as the headline verdict word; the word "ship"
  // is part of the conditional clause, not the standalone resolution.
  // We accept that compound phrasings like "Fix-then-ship" will be
  // classified as ship — that's defensible because the reviewer
  // explicitly used "ship" as a free-standing verdict word. The
  // word-boundary regex `\bship\b` matches "Ship" but not embedded
  // forms like "shipment".
  const verdictMatch = reviewerOutput.match(/##\s+Verdict\s*\n+([^\n]+)/i);
  if (!verdictMatch) return 'unknown';
  const line = verdictMatch[1].toLowerCase();
  if (/\bblock\b/.test(line)) return 'block';
  if (/\brework\b/.test(line)) return 'rework';
  // Ship-then-fix and clean-Ship-with-fix-in-prose both resolve to
  // ship. "Fix issues then ship" starts with "Fix" — the headline
  // word is "Fix", and we want that to classify as fix. We
  // distinguish by checking the *first* verdict word: if it's
  // Ship, it's a clean ship even when "fix" appears later in the
  // sentence. Strip leading markdown emphasis (`**`, `__`) before
  // matching.
  const stripped = line.trim().replace(/^[*_]+/, '');
  if (/^ship\b/.test(stripped)) return 'ship';
  if (/\bfix\b/.test(line)) return 'fix';
  if (/\bship\b/.test(line)) return 'ship';
  return 'unknown';
}

export function sanitizeBranch(branch) {
  // Replace `/` and other path-unsafe characters with `_`. Keeps the
  // stamp filename one-to-one with the branch name.
  return branch.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function gitOutput(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

/**
 * Parse `git worktree list --porcelain` output into structured records.
 * Each worktree block is `worktree <path>` / `HEAD <sha>` / either
 * `branch refs/heads/<name>` or `detached`. We skip detached worktrees
 * (no branch identity) and the main repo (branch === main/master).
 */
function listWorktrees(sessionCwd) {
  const out = gitOutput(['-C', sessionCwd, 'worktree', 'list', '--porcelain']);
  if (!out) return [];
  const records = [];
  let current = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) records.push(current);
      current = { path: line.slice('worktree '.length), branch: null, detached: false };
    } else if (line.startsWith('branch refs/heads/')) {
      if (current) current.branch = line.slice('branch refs/heads/'.length);
    } else if (line === 'detached') {
      if (current) current.detached = true;
    }
  }
  if (current) records.push(current);
  return records.filter((w) => !w.detached && w.branch && w.branch !== 'main' && w.branch !== 'master');
}

/**
 * Verify the payload was emitted by an actual harness hook firing,
 * not constructed by an agent piping fabricated JSON to the script.
 *
 * The harness writes a JSONL transcript at `payload.transcript_path`
 * containing every assistant message and tool call in the session.
 * Each tool use has a stable `id` (the `tool_use_id` we get in the
 * payload), written to the transcript when the tool is dispatched.
 * If a payload's tool_use_id doesn't appear in the transcript, the
 * payload is fabricated.
 *
 * **What this catches**: payloads constructed via bash pipe with a
 * synthetic / made-up tool_use_id. The transcript only contains
 * tool_use_ids the harness actually dispatched.
 *
 * **What this does NOT catch**: replay attacks where the agent reuses
 * a real tool_use_id from an earlier session call. Mitigations:
 *   - `/ship-ticket` validates the stamp's head_sha matches the PR's
 *     current HEAD, so a replayed stamp from an earlier commit is
 *     refused at merge time.
 *   - Constructing the payload at all requires Bash, which the
 *     auto-mode classifier intercepts as a stamp-fabrication pattern.
 *
 * **Why no reviewer-text cross-check**: empirically, the harness
 * writes the tool_result entry to the transcript concurrently with /
 * after firing the hook, so the reviewer text isn't reliably present
 * in the transcript at hook-read time. A prior version of this
 * function tried to sample-match the reviewer text against the
 * transcript with retries; it consistently rejected legitimate calls
 * because the harness flushes the result after the hook completes.
 * The reviewer text comes from `payload.tool_response.content[].text`
 * which the harness puts in the payload directly — that's the
 * authoritative source.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, reason: ... }`
 * if verification fails.
 */
export function verifyTranscript(payload) {
  const path = payload.transcript_path;
  if (!path) return { ok: false, reason: 'payload missing transcript_path' };

  let stat;
  try {
    stat = statSync(path);
  } catch (e) {
    return { ok: false, reason: `transcript_path ${path} not readable: ${e.message}` };
  }
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    return { ok: false, reason: `transcript_path ${path} not owned by current user` };
  }
  const ageMs = Date.now() - stat.mtimeMs;
  if (ageMs > 5 * 60 * 1000) {
    return { ok: false, reason: `transcript_path ${path} hasn't been modified in ${Math.floor(ageMs / 1000)}s — stale, suggests fabricated payload` };
  }

  const toolUseId = payload.tool_use_id;
  if (!toolUseId) {
    return { ok: false, reason: 'payload missing tool_use_id — cannot cross-reference transcript' };
  }

  let transcript;
  try {
    transcript = readFileSync(path, 'utf8');
  } catch (e) {
    return { ok: false, reason: `cannot read transcript ${path}: ${e.message}` };
  }
  if (!transcript.includes(toolUseId)) {
    return { ok: false, reason: `tool_use_id ${toolUseId} not found in transcript — fabricated payload` };
  }

  return { ok: true };
}

/**
 * Pure-function match: given a list of worktree records and a
 * haystack string (typically prompt + reviewer output), return the
 * worktree whose path or branch appears in the haystack, preferring
 * absolute-path matches over branch-name matches and longest matches
 * within each category (so `/home/x/sok-554` wins over `/home/x/sok-5`).
 *
 * Exported for testing.
 */
export function findTargetWorktreeAmong(worktrees, haystack) {
  if (!worktrees || worktrees.length === 0) return null;

  const pathMatches = worktrees.filter((w) => haystack.includes(w.path));
  if (pathMatches.length > 0) {
    pathMatches.sort((a, b) => b.path.length - a.path.length);
    return pathMatches[0];
  }

  const branchMatches = worktrees.filter((w) => haystack.includes(w.branch));
  if (branchMatches.length > 0) {
    branchMatches.sort((a, b) => b.branch.length - a.branch.length);
    return branchMatches[0];
  }

  return null;
}

/**
 * Find the worktree the reviewer was operating on by scanning the
 * reviewer's prompt and output for any feature worktree's absolute
 * path or branch name.
 */
function findTargetWorktree(sessionCwd, prompt, reviewerText) {
  const worktrees = listWorktrees(sessionCwd);
  const haystack = `${prompt || ''}\n${reviewerText || ''}`;
  return findTargetWorktreeAmong(worktrees, haystack);
}

function writeStamp({ cwd, reviewerText, modeLabel }) {
  const branch = gitOutput(['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']);
  const headSha = gitOutput(['-C', cwd, 'rev-parse', 'HEAD']);
  if (!branch || !headSha) {
    return { ok: false, reason: `not in a git repo or no HEAD at ${cwd}` };
  }
  if (branch === 'main' || branch === 'master') {
    return { ok: false, reason: `target cwd ${cwd} is on ${branch} — no PR work to gate` };
  }
  if (branch === 'HEAD') {
    return { ok: false, reason: 'detached HEAD — no branch identity' };
  }

  const verdict = parseVerdict(reviewerText);
  const verdictHash = createHash('sha256').update(reviewerText).digest('hex');

  const stampDir = join(cwd, '.claude', 'state');
  mkdirSync(stampDir, { recursive: true });
  const stampPath = join(stampDir, `checklist-${sanitizeBranch(branch)}.json`);

  const stamp = {
    branch,
    head_sha: headSha,
    ran_at: new Date().toISOString(),
    verdict,
    // SHA-256 of the reviewer's full output text. Never validated by
    // the merge gate; kept for forensic audit — if a verdict is
    // disputed later, capturing the reviewer's output and re-hashing
    // proves whether what's recorded matches what was reviewed.
    verdict_hash: verdictHash,
    reviewer_text_length: reviewerText.length,
    written_via: modeLabel,
  };

  writeFileSync(stampPath, JSON.stringify(stamp, null, 2) + '\n');
  return { ok: true, stampPath, verdict, headSha };
}

function logResult(modeLabel, result) {
  if (result.ok) {
    console.error(
      `checklist-stamp[${modeLabel}]: wrote ${result.stampPath} (verdict=${result.verdict}, head=${result.headSha.slice(0, 8)})`,
    );
  } else {
    console.error(`checklist-stamp[${modeLabel}]: skipped — ${result.reason}`);
  }
}

async function hookMode() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error(`checklist-stamp[hook]: malformed payload: ${e.message}`);
    return;
  }
  if (payload.tool_name !== 'Agent') return;
  const toolInput = payload.tool_input || {};
  if (toolInput.subagent_type !== 'code-reviewer') return;

  const response = payload.tool_response || {};
  const content = Array.isArray(response.content) ? response.content : [];
  const reviewerText = content
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
  if (!reviewerText) {
    console.error('checklist-stamp[hook]: no text content in tool_response — skipping');
    return;
  }

  // Cross-validate the payload against the session transcript. This
  // catches payloads constructed by an agent piping JSON to the
  // script with a synthetic tool_use_id — the harness-written
  // transcript only contains tool_use_ids it actually dispatched.
  const verify = verifyTranscript(payload);
  if (!verify.ok) {
    console.error(`checklist-stamp[hook]: refusing fabricated payload — ${verify.reason}`);
    return;
  }

  const sessionCwd = payload.cwd || process.cwd();
  // Route to the worktree the reviewer was operating on. The session
  // cwd is usually the main repo on `main`, but reviewer prompts/
  // output reference the worktree by absolute path or branch name.
  // First-match wins.
  const target = findTargetWorktree(sessionCwd, toolInput.prompt, reviewerText);
  const targetCwd = target ? target.path : sessionCwd;

  const result = writeStamp({ cwd: targetCwd, reviewerText, modeLabel: 'hook' });
  if (target) {
    console.error(
      `checklist-stamp[hook]: routed to worktree ${target.path} (branch ${target.branch})`,
    );
  }
  logResult('hook', result);
  // Hook mode: never propagate failure. Hooks must not block the
  // agent's tool call.
}

async function main() {
  await hookMode();
}

main().catch((e) => {
  console.error(`checklist-stamp[hook]: ${e.stack || e.message}`);
  // Hook mode: never block the tool call regardless of failure.
});
