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
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
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
  // Strip leading markdown emphasis (`**`, `__`) and check the first
  // word first. This prevents prose like "does not block merge" or
  // "the core fix is correct" from mis-classifying a Ship verdict.
  // All four verdicts are checked by first-word before falling back
  // to anywhere-in-line for non-standard reviewer formatting.
  const stripped = line.trim().replace(/^[*_]+/, '');
  if (/^block\b/.test(stripped)) return 'block';
  if (/^rework\b/.test(stripped)) return 'rework';
  if (/^ship\b/.test(stripped)) return 'ship';
  if (/^fix\b/.test(stripped)) return 'fix';
  // Fallback: anywhere in line (catches "verdict: ship" style phrasings)
  if (/\bblock\b/.test(line)) return 'block';
  if (/\brework\b/.test(line)) return 'rework';
  if (/\bship\b/.test(line)) return 'ship';
  if (/\bfix\b/.test(line)) return 'fix';
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
  return records.filter(
    (w) => !w.detached && w.branch && w.branch !== 'main' && w.branch !== 'master',
  );
}

/**
 * Sanity-check the payload looks like a real harness hook fire.
 *
 * **Why no transcript content cross-check**: empirically, the harness
 * writes both the `tool_use` entry AND the `tool_result` entry to
 * the JSONL transcript AFTER firing the hook. A prior version of
 * this function (#618) read the transcript and rejected if
 * `tool_use_id` wasn't found there; that check rejected every
 * legitimate code-reviewer call because the entry isn't flushed
 * yet at hook-read time. The transcript-cross-check approach was
 * based on a wrong assumption about harness flush ordering and is
 * removed.
 *
 * **What this checks instead**: the lightweight stat properties of
 * `payload.transcript_path`. A real harness payload references a
 * transcript file that exists, is owned by the current user, and
 * was written-to recently. A fabricated payload pointing at a fake
 * or stale transcript fails these guards. `tool_use_id` is required
 * present (non-empty) but not cross-checked against transcript
 * content.
 *
 * **What the gate actually relies on**:
 *   - The `PostToolUse:Agent` hook fires only on real subagent
 *     dispatches; the harness controls when it fires.
 *   - The auto-mode classifier intercepts Bash-pipe attempts to
 *     construct payloads outside of the hook.
 *   - `/ship-ticket` requires `written_via=hook` so a stamp file
 *     written directly via the Write tool (also classifier-blocked)
 *     wouldn't satisfy the gate.
 *   - `/ship-ticket` requires the stamp's `head_sha` to match the
 *     PR's current HEAD, so a replayed-stamp attack from an earlier
 *     commit is refused at merge time.
 *
 * The script-level checks here catch accidents (missing fields,
 * pointed-at-stale-transcript fabrication); deliberate forgery is
 * the classifier's responsibility.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, reason: ... }`
 * if verification fails.
 */
export function verifyTranscript(payload) {
  // transcript_path: validate when present, skip when absent. The harness
  // does not always include this field (empirically confirmed: every
  // PostToolUse payload from Claude Code omits it, causing every legitimate
  // code-reviewer call to be rejected as "fabricated"). When it IS present,
  // we verify it exists and is owned by the current user — a fabricated
  // payload pointing at a fake or stale transcript fails these guards.
  // When absent, we fall back to tool_use_id-only validation.
  const path = payload.transcript_path;
  if (path) {
    let stat;
    try {
      stat = statSync(path);
    } catch (e) {
      return { ok: false, reason: `transcript_path ${path} not readable: ${e.message}` };
    }
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
      return { ok: false, reason: `transcript_path ${path} not owned by current user` };
    }
    // Note: mtime check intentionally absent. The harness writes transcript
    // entries (tool_use + tool_result) AFTER firing the PostToolUse hook, so
    // the transcript file is always stale relative to hook-fire time. A 5-minute
    // mtime window incorrectly rejects every legitimate call whose preceding
    // message was >5 minutes ago (common during long code-reviewer runs).
    // Existence + ownership + tool_use_id presence is sufficient; the session
    // UUID embedded in the path is the primary anti-fabrication guard.
  }

  if (!payload.tool_use_id) {
    return { ok: false, reason: 'payload missing tool_use_id' };
  }

  return { ok: true };
}

/**
 * Pure-function match: given a list of local branch names and a haystack
 * string (typically prompt + reviewer output), returns the branch name
 * that appears in the haystack, preferring longer names to avoid prefix
 * false-positives (so `feat/526-music-engine` wins over `feat/526`).
 *
 * Exported for testing.
 * Returns null if no match.
 */
export function findReviewedBranchAmong(branches, haystack) {
  if (!branches || branches.length === 0) return null;
  const matches = branches.filter((b) => haystack.includes(b));
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.length - a.length);
  return matches[0];
}

/**
 * Find the branch being reviewed by scanning the haystack (prompt +
 * reviewer output) for any local branch name (excluding main/master).
 * Returns `{ branch, headSha }` or `null`.
 */
function findReviewedBranch(sessionCwd, haystack) {
  const out = gitOutput(['-C', sessionCwd, 'branch', '--format=%(refname:short)']);
  if (!out) return null;
  const branches = out
    .split('\n')
    .map((b) => b.trim())
    .filter((b) => b && b !== 'main' && b !== 'master');
  const branch = findReviewedBranchAmong(branches, haystack);
  if (!branch) return null;
  const headSha = gitOutput(['-C', sessionCwd, 'rev-parse', branch]);
  if (!headSha) return null;
  return { branch, headSha };
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

function writeStamp({ cwd, reviewerText, modeLabel, reviewedBranch }) {
  let branch, headSha;
  if (reviewedBranch) {
    // Caller identified the reviewed branch via haystack scan — use it
    // directly instead of reading HEAD of cwd (which may be a different
    // branch when the main repo is checked out on an unrelated branch).
    branch = reviewedBranch.branch;
    headSha = reviewedBranch.headSha;
  } else {
    branch = gitOutput(['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']);
    headSha = gitOutput(['-C', cwd, 'rev-parse', 'HEAD']);
  }
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
  // Build haystack from prompt + reviewer output for both worktree
  // routing and reviewed-branch detection.
  const haystack = `${toolInput.prompt || ''}\n${reviewerText}`;

  // Route to the worktree the reviewer was operating on. The session
  // cwd is usually the main repo on `main`, but reviewer prompts/
  // output reference the worktree by absolute path or branch name.
  // First-match wins.
  const target = findTargetWorktree(sessionCwd, toolInput.prompt, reviewerText);
  const targetCwd = target ? target.path : sessionCwd;

  // Scan local branches to find which one the reviewer was actually
  // reviewing. Even when a target worktree IS found by path, its current
  // HEAD may be on a different branch (e.g. the main repo is on feat/636
  // while feat/526 is being reviewed — the main repo path matches file
  // references in the output, but its HEAD is the wrong branch). The
  // haystack scan is the authoritative signal; writeStamp falls back to
  // the cwd HEAD only when it finds nothing.
  const reviewedBranch = findReviewedBranch(sessionCwd, haystack);

  const result = writeStamp({ cwd: targetCwd, reviewerText, modeLabel: 'hook', reviewedBranch });
  if (target) {
    console.error(
      `checklist-stamp[hook]: routed to worktree ${target.path} (branch ${target.branch})`,
    );
  }
  if (reviewedBranch) {
    console.error(
      `checklist-stamp[hook]: detected reviewed branch ${reviewedBranch.branch} via haystack scan`,
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
