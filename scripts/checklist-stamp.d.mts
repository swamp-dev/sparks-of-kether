// Type declarations for `scripts/checklist-stamp.mjs`. The
// implementation is plain ESM JavaScript so it runs directly under
// `node` without a build step; this `.d.mts` provides the types its
// consumers (the unit test) need.
//
// Keep in sync with the JSDoc on the matching exports in the `.mjs`
// file.

export type Verdict = 'ship' | 'fix' | 'block' | 'rework' | 'unknown';

export function parseVerdict(reviewerOutput: string): Verdict;

export function sanitizeBranch(branch: string): string;

export interface WorktreeRecord {
  readonly path: string;
  readonly branch: string;
}

/**
 * Pure-function match: given a list of worktree records and a
 * haystack string, return the worktree whose path or branch appears
 * in the haystack, preferring path matches over branch matches and
 * longest matches within each category.
 */
export function findTargetWorktreeAmong(
  worktrees: readonly WorktreeRecord[],
  haystack: string,
): WorktreeRecord | null;

export interface HookPayload {
  readonly transcript_path?: string;
  readonly tool_use_id?: string;
  readonly cwd?: string;
  readonly tool_name?: string;
  readonly tool_input?: {
    readonly subagent_type?: string;
    readonly prompt?: string;
  };
  readonly tool_response?: {
    readonly content?: ReadonlyArray<{ type: string; text?: string }>;
  };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Sanity-check the payload looks like a real harness hook fire.
 * Stat-checks `payload.transcript_path` (exists, owned, recent
 * mtime) and validates `payload.tool_use_id` is present. Does NOT
 * cross-reference transcript file content — the harness flushes
 * transcript entries post-hook, so the cross-check can't work.
 */
export function verifyTranscript(payload: HookPayload): VerifyResult;
