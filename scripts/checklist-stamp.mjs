#!/usr/bin/env node
/**
 * scripts/checklist-stamp.mjs
 *
 * Writes a per-PR checklist stamp file at
 * `.claude/state/checklist-<sanitized-branch>.json` capturing the
 * branch, the HEAD SHA the review ran against, and the reviewer's
 * verdict (ship / fix / block / rework). `/ship-ticket` reads this
 * stamp at merge moment to verify the per-PR checklist actually ran
 * for the current commit. Mechanical replacement for the honor-system
 * Journal marker.
 *
 * Two invocation modes:
 *
 * 1. **Hook mode** (no args). Reads a `PostToolUse` payload from stdin
 *    as JSON. Filters: only acts when `tool_name === "Agent"` and
 *    `tool_input.subagent_type === "code-reviewer"`. Used by the
 *    `PostToolUse:Agent` hook in `.claude/settings.json` — automatic,
 *    fires on every code-reviewer invocation when settings.json is
 *    loaded at session start.
 *
 * 2. **Explicit mode** (`--reviewer-output FILE`). Reads the named
 *    file as the reviewer's response text, skipping JSON parsing and
 *    the subagent_type filter. Used by `/finish-ticket` step 8 — the
 *    agent invokes this directly after each `code-reviewer` call so
 *    the stamp is written even if the hook didn't fire (e.g. session
 *    that introduced settings.json itself; settings reload edge cases).
 *
 * Both modes write the same stamp file. Belt-and-suspenders: hook
 * fires when configured, explicit step fires regardless.
 *
 * Stamp is overwritten on each invocation, so the re-review loop in
 * `/finish-ticket` step 8a naturally produces a fresh stamp at the
 * new HEAD SHA. `/ship-ticket` validates the stamp's `head_sha`
 * matches the PR's current `headRefOid`.
 *
 * Hook mode always exits 0 — hook failures must never block the
 * agent's tool call. Explicit mode exits non-zero on failure so the
 * agent's `/finish-ticket` step sees the error.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

function parseVerdict(reviewerOutput) {
  // Reviewer output is markdown. Look for the "## Verdict" section.
  // The convention from `~/.claude/agents/code-reviewer.md` is one of
  // ship / fix / block / rework on the line(s) immediately following
  // the header — typically the first non-blank line, optionally
  // wrapped in markdown emphasis (`**Ship**`).
  //
  // Word-boundary matching matters. Naive `includes('block')` would
  // hit on "blockers" inside a sentence like "no new blockers found —
  // Ship." (encountered live during B1 v1's bootstrap). Naive
  // substring also mis-classifies compounds like "Fix-then-ship".
  // Order matters too: stricter / negative verdicts win first because
  // a "Fix-then-ship" verdict carries more risk than a clean ship.
  const verdictMatch = reviewerOutput.match(/##\s+Verdict\s*\n+([^\n]+)/i);
  if (!verdictMatch) return 'unknown';
  const line = verdictMatch[1].toLowerCase();
  if (/\bblock\b/.test(line)) return 'block';
  if (/\brework\b/.test(line)) return 'rework';
  if (/\bfix\b/.test(line)) return 'fix';
  if (/\bship\b/.test(line)) return 'ship';
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

function writeStamp({ cwd, reviewerText, modeLabel }) {
  const branch = gitOutput(['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']);
  const headSha = gitOutput(['-C', cwd, 'rev-parse', 'HEAD']);
  if (!branch || !headSha) {
    return { ok: false, reason: 'not in a git repo or no HEAD' };
  }
  if (branch === 'main' || branch === 'master') {
    return { ok: false, reason: 'on main/master — no PR work to gate' };
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

async function explicitMode(filePath) {
  let reviewerText;
  try {
    reviewerText = readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`checklist-stamp[explicit]: cannot read ${filePath}: ${e.message}`);
    process.exit(1);
  }
  if (!reviewerText.trim()) {
    console.error(`checklist-stamp[explicit]: ${filePath} is empty — refusing`);
    process.exit(1);
  }
  const result = writeStamp({
    cwd: process.cwd(),
    reviewerText,
    modeLabel: 'explicit',
  });
  logResult('explicit', result);
  // Explicit mode: surface failure so the agent's /finish-ticket step
  // sees a non-zero exit and can react.
  if (!result.ok) process.exit(1);
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

  if (!payload.cwd) {
    console.error(
      'checklist-stamp[hook]: payload missing cwd; falling back to process.cwd() — stamp may land in unexpected location',
    );
  }
  const cwd = payload.cwd || process.cwd();
  const result = writeStamp({ cwd, reviewerText, modeLabel: 'hook' });
  logResult('hook', result);
  // Hook mode: never propagate failure. Hooks must not block the
  // agent's tool call.
}

// Top-level mode flag so the catch handler knows whether to surface
// failures (explicit mode: agent must see errors) or swallow them
// (hook mode: never block the tool call).
let mode = 'hook';

async function main() {
  const args = process.argv.slice(2);
  const reviewerOutputIdx = args.indexOf('--reviewer-output');
  if (reviewerOutputIdx !== -1) {
    mode = 'explicit';
    const filePath = args[reviewerOutputIdx + 1];
    if (!filePath || filePath.startsWith('--')) {
      console.error(
        'checklist-stamp: --reviewer-output requires a file path argument',
      );
      process.exit(1);
    }
    await explicitMode(filePath);
    return;
  }
  await hookMode();
}

main().catch((e) => {
  console.error(`checklist-stamp[${mode}]: ${e.stack || e.message}`);
  // In explicit mode, propagate failure so the agent's /finish-ticket
  // step 8.5 sees a non-zero exit and stops. In hook mode, never
  // block the tool call regardless.
  if (mode === 'explicit') process.exit(1);
});
