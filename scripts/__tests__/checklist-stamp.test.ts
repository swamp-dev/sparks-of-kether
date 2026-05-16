import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseVerdict,
  sanitizeBranch,
  findReviewedBranchAmong,
  findTargetWorktreeAmong,
  verifyTranscript,
} from '../checklist-stamp.mjs';

/**
 * Tests for `scripts/checklist-stamp.mjs`. The script is the
 * mechanical gate for `/ship-ticket` — `verifyTranscript` and
 * `findTargetWorktreeAmong` are the load-bearing safety logic
 * that decide whether a hook payload is legitimate and where the
 * stamp should land.
 */

describe('parseVerdict', () => {
  it('parses Ship from a clean verdict header', () => {
    expect(parseVerdict('## Verdict\n\nShip')).toBe('ship');
  });

  it('parses Fix from "Fix issues then ship"', () => {
    // Stricter verdicts win first — "fix" before "ship" in the rule
    // order; otherwise a "Fix issues then ship" verdict would be
    // mis-classified as a clean ship.
    expect(parseVerdict('## Verdict\n\nFix issues then ship')).toBe('fix');
  });

  it('parses Block over Ship when "block" appears as a word', () => {
    expect(parseVerdict('## Verdict\n\nBlock — needs more work')).toBe('block');
  });

  it('does not mis-classify "blockers" as block', () => {
    // Word-boundary matching — "no new blockers found — Ship."
    // historically tripped the naive substring check; this verifies
    // the regex uses \b correctly.
    expect(parseVerdict('## Verdict\n\nNo new blockers — Ship.')).toBe('ship');
  });

  it('returns unknown when no verdict header is present', () => {
    expect(parseVerdict('All looks good!')).toBe('unknown');
  });

  it('returns unknown when verdict word is absent from the line', () => {
    expect(parseVerdict('## Verdict\n\nSomething unrelated')).toBe('unknown');
  });

  it('handles bolded verdict (e.g. **Ship**)', () => {
    expect(parseVerdict('## Verdict\n\n**Ship**')).toBe('ship');
  });

  it('parses Ship when "fix" appears later in the prose (the prose-bleed case)', () => {
    // The reviewer wrote a clean Ship verdict but mentioned "fix" in
    // an explanatory clause. Pre-fix this classified as 'fix' and
    // self-blocked the merge. Documented in memory entry
    // `feedback_stamp_parser_fix_prose.md` (2026-05-08).
    expect(parseVerdict('## Verdict\n\nShip — the core fix is sound')).toBe('ship');
    expect(parseVerdict('## Verdict\n\n**Ship** — the worktree-routing fix is clean')).toBe('ship');
  });

  it('distinguishes "Fix issues then ship" (fix) from "Ship after fix" (ship)', () => {
    // Headline-word disambiguation: the first verdict word determines
    // the verdict. "Fix issues then ship" starts with "Fix" — fix
    // verdict. "Ship after fix" starts with "Ship" — clean ship.
    expect(parseVerdict('## Verdict\n\nFix issues then ship')).toBe('fix');
    expect(parseVerdict('## Verdict\n\nShip after fix')).toBe('ship');
  });
});

describe('sanitizeBranch', () => {
  it('replaces slashes with underscores', () => {
    expect(sanitizeBranch('feat/554-egyptian-blessing-matrix')).toBe(
      'feat_554-egyptian-blessing-matrix',
    );
  });

  it('keeps allowed characters (letters, digits, dot, underscore, dash)', () => {
    expect(sanitizeBranch('fix/foo.bar_baz-1')).toBe('fix_foo.bar_baz-1');
  });

  it('replaces any other character', () => {
    expect(sanitizeBranch('feat/spaces are bad')).toBe('feat_spaces_are_bad');
  });
});

describe('findReviewedBranchAmong', () => {
  it('returns null for an empty branch list', () => {
    expect(findReviewedBranchAmong([], 'feat/526-music-engine appears here')).toBeNull();
  });

  it('returns null when no branch appears in the haystack', () => {
    const branches = ['feat/526-music-engine', 'fix/600-crash'];
    expect(findReviewedBranchAmong(branches, 'completely unrelated text')).toBeNull();
  });

  it('matches a branch name that appears in the haystack', () => {
    const branches = ['feat/526-music-engine', 'fix/600-crash'];
    const haystack = 'Reviewing changes on feat/526-music-engine for this PR.';
    expect(findReviewedBranchAmong(branches, haystack)).toBe('feat/526-music-engine');
  });

  it('prefers the longest match when multiple branches appear', () => {
    // feat/526-music-engine and feat/526 both appear; the longer one wins
    // so we don't get a prefix false-positive.
    const branches = ['feat/526', 'feat/526-music-engine', 'fix/600-crash'];
    const haystack = 'branch feat/526-music-engine is being reviewed';
    expect(findReviewedBranchAmong(branches, haystack)).toBe('feat/526-music-engine');
  });

  it('does not match main or master (caller must filter them out)', () => {
    // The pure function itself does no filtering — the caller (findReviewedBranch)
    // strips main/master before calling. This test verifies that when the
    // caller-supplied list already excludes them, the function behaves correctly.
    const branches = ['feat/526-music-engine'];
    const haystack = 'no branch references here, mentions main and master in prose';
    // main/master not in branches list → no match for them even if haystack mentions them
    expect(findReviewedBranchAmong(branches, haystack)).toBeNull();
  });
});

describe('findTargetWorktreeAmong', () => {
  const worktrees = [
    {
      path: '/home/x/sok-554-egyptian-blessing-matrix',
      branch: 'feat/554-egyptian-blessing-matrix',
    },
    { path: '/home/x/sok-555-egyptian-framing-copy', branch: 'feat/555-egyptian-framing-copy' },
    { path: '/home/x/sok-5', branch: 'feat/5-tiny' },
  ];

  it('returns null when worktree list is empty', () => {
    expect(findTargetWorktreeAmong([], 'anything')).toBeNull();
  });

  it('returns null when no worktree appears in the haystack', () => {
    expect(findTargetWorktreeAmong(worktrees, 'completely unrelated text')).toBeNull();
  });

  it('matches worktree by absolute path in the haystack', () => {
    const haystack = 'Review the diff in /home/x/sok-554-egyptian-blessing-matrix.';
    expect(findTargetWorktreeAmong(worktrees, haystack)?.path).toBe(
      '/home/x/sok-554-egyptian-blessing-matrix',
    );
  });

  it('prefers longer path matches (avoids prefix false-positives)', () => {
    // Both /home/x/sok-5 and /home/x/sok-554-... are substrings of
    // the haystack. The longer one (the 554 worktree) should win.
    const haystack = 'Review /home/x/sok-554-egyptian-blessing-matrix.';
    expect(findTargetWorktreeAmong(worktrees, haystack)?.path).toBe(
      '/home/x/sok-554-egyptian-blessing-matrix',
    );
  });

  it('falls back to branch-name matching when no path appears', () => {
    const haystack = 'on branch feat/555-egyptian-framing-copy';
    expect(findTargetWorktreeAmong(worktrees, haystack)?.branch).toBe(
      'feat/555-egyptian-framing-copy',
    );
  });

  it('prefers path matches over branch matches when both exist', () => {
    // The haystack references 555's path but 554's branch. Path wins.
    const haystack = `worktree /home/x/sok-555-egyptian-framing-copy and branch feat/554-egyptian-blessing-matrix`;
    expect(findTargetWorktreeAmong(worktrees, haystack)?.path).toBe(
      '/home/x/sok-555-egyptian-framing-copy',
    );
  });
});

describe('verifyTranscript', () => {
  let dir: string;
  let transcriptPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'checklist-stamp-test-'));
    transcriptPath = join(dir, 'transcript.jsonl');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts payload without transcript_path when tool_use_id is present', () => {
    // The Claude Code harness does not include transcript_path in PostToolUse
    // payloads (empirically confirmed). The check is gracefully skipped when
    // absent; tool_use_id is the fallback anti-fabrication guard.
    const result = verifyTranscript({ tool_use_id: 'toolu_abc' });
    expect(result.ok).toBe(true);
  });

  it('rejects payload with neither transcript_path nor tool_use_id', () => {
    const result = verifyTranscript({});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: just asserted ok=false');
    expect(result.reason).toMatch(/missing tool_use_id/);
  });

  it('rejects payload when transcript file does not exist', () => {
    const result = verifyTranscript({
      transcript_path: join(dir, 'does-not-exist.jsonl'),
      tool_use_id: 'toolu_x',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: just asserted ok=false');
    expect(result.reason).toMatch(/not readable/);
  });

  it('rejects payload when tool_use_id is missing', () => {
    writeFileSync(transcriptPath, '{}\n');
    const result = verifyTranscript({ transcript_path: transcriptPath });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: just asserted ok=false');
    expect(result.reason).toMatch(/missing tool_use_id/);
  });

  it('accepts payload with a present tool_use_id (no content cross-check)', () => {
    // Transcript content does NOT need to contain the tool_use_id
    // — the harness flushes that entry post-hook. The script only
    // sanity-checks that the field is present in the payload.
    writeFileSync(transcriptPath, '{"some":"unrelated entry"}\n');
    const result = verifyTranscript({
      transcript_path: transcriptPath,
      tool_use_id: 'toolu_anything',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts payload even when transcript mtime is old', () => {
    // The harness writes transcript entries AFTER firing the hook, so
    // the transcript mtime at hook-fire time reflects the PREVIOUS
    // message, which may be many minutes old. The mtime check was
    // removed because it rejected every legitimate long-running
    // code-reviewer call. A "stale" transcript is normal.
    writeFileSync(transcriptPath, '{"tool_use_id":"toolu_x","content":"x"}\n');
    const oldTime = new Date(Date.now() - 10 * 60 * 1000);
    utimesSync(transcriptPath, oldTime, oldTime);
    const result = verifyTranscript({
      transcript_path: transcriptPath,
      tool_use_id: 'toolu_x',
    });
    expect(result.ok).toBe(true);
  });

  it('skips uid check when process.getuid is not a function (Windows fallback)', () => {
    // process.getuid is POSIX-only. The check guards on typeof so it
    // becomes a no-op on Windows rather than throwing. This test
    // simulates that environment by temporarily replacing getuid
    // with undefined on a typed-loose handle.
    writeFileSync(
      transcriptPath,
      '{"type":"assistant","content":[{"type":"tool_use","id":"toolu_x","name":"Agent"}]}\n',
    );
    const proc = process as unknown as { getuid: (() => number) | undefined };
    const originalGetuid = proc.getuid;
    proc.getuid = undefined;
    try {
      const result = verifyTranscript({
        transcript_path: transcriptPath,
        tool_use_id: 'toolu_x',
      });
      expect(result.ok).toBe(true);
    } finally {
      proc.getuid = originalGetuid;
    }
  });
});
