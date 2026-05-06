#!/usr/bin/env node
/**
 * scripts/checklist-stamp.mjs
 *
 * PostToolUse:Agent hook handler. Writes a stamp file whenever the
 * `code-reviewer` subagent completes, capturing the branch, the HEAD
 * SHA the review ran against, and the reviewer's verdict (ship / fix).
 *
 * `/ship-ticket` reads this stamp at merge moment to verify the per-PR
 * checklist actually ran for the current commit. Mechanical replacement
 * for the honor-system Journal marker — the agent can still write a
 * Journal entry saying "code-reviewer clean", but the stamp file is
 * created by the hook in response to a real `code-reviewer` invocation
 * and can't be forged by the agent without actually invoking the
 * reviewer.
 *
 * Hook contract:
 * - Reads the PostToolUse payload from stdin (JSON).
 * - No-op (exit 0) if `tool_name !== "Agent"` or
 *   `tool_input.subagent_type !== "code-reviewer"`.
 * - Otherwise: parse the reviewer's verdict from `tool_response`,
 *   write `.claude/state/checklist-<sanitized-branch>.json`.
 *
 * Stamp is overwritten on each invocation, so the re-review loop in
 * `/finish-ticket` step 8a naturally produces a fresh stamp at the new
 * HEAD SHA. `/ship-ticket` validates the stamp's `head_sha` matches
 * the PR's current `headRefOid`.
 *
 * Exit always 0 — hook failures should never block the agent's tool
 * call. Errors are logged to stderr for observability.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

function parseVerdict(reviewerOutput) {
  // Reviewer output is markdown. Look for the "## Verdict" section.
  // The convention from `~/.claude/agents/code-reviewer.md` is one of
  // ship / fix / block / rework on the line(s) immediately following
  // the header — typically the first non-blank line, optionally
  // wrapped in markdown emphasis (`**Ship**`).
  //
  // Order matters: check stricter / negative verdicts first because
  // the reviewer occasionally emits compounds like "Fix-then-ship".
  // Naive `includes('ship')` would mis-classify those as ship.
  const verdictMatch = reviewerOutput.match(/##\s+Verdict\s*\n+([^\n]+)/i);
  if (!verdictMatch) return 'unknown';
  const line = verdictMatch[1].toLowerCase();
  // Stricter verdicts checked first; the first match wins.
  if (line.includes('block')) return 'block';
  if (line.includes('rework')) return 'rework';
  if (line.includes('fix')) return 'fix';
  if (line.includes('ship')) return 'ship';
  return 'unknown';
}

function sanitizeBranch(branch) {
  // Replace `/` and other path-unsafe characters with `_`. Keeps the
  // stamp filename one-to-one with the branch name.
  return branch.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function gitOutput(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error(`checklist-stamp: malformed payload: ${e.message}`);
    return;
  }

  // Filter: only stamp on code-reviewer Agent calls.
  if (payload.tool_name !== 'Agent') return;
  const toolInput = payload.tool_input || {};
  if (toolInput.subagent_type !== 'code-reviewer') return;

  // Extract reviewer output text from the tool_response.
  // The shape is a content array of text blocks; concatenate.
  const response = payload.tool_response || {};
  const content = Array.isArray(response.content) ? response.content : [];
  const reviewerText = content
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
  if (!reviewerText) {
    console.error('checklist-stamp: no text content in tool_response — skipping');
    return;
  }

  if (!payload.cwd) {
    console.error(
      'checklist-stamp: payload missing cwd; falling back to process.cwd() — stamp may land in unexpected location',
    );
  }
  const cwd = payload.cwd || process.cwd();
  const branch = gitOutput(['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']);
  const headSha = gitOutput(['-C', cwd, 'rev-parse', 'HEAD']);
  if (!branch || !headSha) {
    console.error('checklist-stamp: not in a git repo or no HEAD — skipping');
    return;
  }
  if (branch === 'main' || branch === 'master') {
    // No PR work happens directly on main; nothing to gate.
    return;
  }
  if (branch === 'HEAD') {
    // Detached HEAD — no branch identity to key the stamp against.
    // Don't write a `checklist-HEAD.json` that would shadow whatever
    // branch later checks out on top.
    console.error('checklist-stamp: detached HEAD — skipping');
    return;
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
  };

  writeFileSync(stampPath, JSON.stringify(stamp, null, 2) + '\n');
  console.error(
    `checklist-stamp: wrote ${stampPath} (verdict=${verdict}, head=${headSha.slice(0, 8)})`,
  );
}

main().catch((e) => {
  console.error(`checklist-stamp: ${e.stack || e.message}`);
  // Still exit 0 — hook failures must not block the agent.
});
