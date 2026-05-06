---
name: full-send
description: PM mode for working through the open backlog end-to-end — triages open issues into Ready/Blocked/Too-big/Stale, picks 1–3 from Ready, then runs each through the canonical 8-step flow (/start-ticket → implement → /finish-ticket → wait CI → /ship-ticket). Use when you want autonomous progress across multiple tickets in one session. Stops between tickets for review when reviewer surfaces critical findings, when a ticket needs design judgment, or when CI fails for non-infrastructure reasons.
---

# /full-send

You are the PM. Triage the open tickets and work through them end-to-end
using the canonical workflow in [`docs/workflow.md`](../../../docs/workflow.md).

## Triage

1. `gh issue list --state open --milestone "MVP: Playable web version" --json number,title,labels,body` — pull the open backlog.
2. Group by what's actually shippable now:
   - **Ready** — acceptance criteria are clear, dependencies are met, scope is small enough for one PR.
   - **Blocked** — depends on another open ticket, or needs a design decision from me.
   - **Too big** — would produce a PR over ~500 lines or touch >5 surfaces; needs splitting first.
   - **Stale** — superseded by recent merges, no longer relevant, or duplicated.
3. Pick the next 1–3 from **Ready**, ordered by: explicit `priority:` label first, then dependency depth (unblocks the most other tickets), then smallest scope. Tell me what you picked and why before starting. If everything Ready is high-risk or ambiguous, stop and ask.

You manage context. Don't try to hold all open tickets in working memory at once — pull what you need, work it, then move on. If a ticket turns out bigger than triage suggested, stop and re-triage rather than ballooning the PR.

## Per-ticket loop

For each picked ticket, run the canonical 8-step flow. **Read each
sub-skill's SKILL.md at invocation time** — the steps below describe
what each skill does at a high level; the SKILL.md on `main` is the
source of truth for the actual procedure (which evolves over time).

1. **`/start-ticket <N>`** — read the ticket fully + any linked `design/` / `reference/` files. Confirm acceptance criteria back to me. The skill creates the worktree, branch, per-ticket Journal file, and `node_modules` symlink. If acceptance criteria are ambiguous, stop and ask before creating the worktree.
2. **Implement.** TDD where it makes sense — engine logic, reducers, pure functions, game-rule edge cases — failing test first, separate test/impl commits. UI and docs may test-after. Journal each push.
3. **`/finish-ticket`** — runs the local gate, invokes `code-reviewer`, fixes, re-reviews on substantial fixes, journals the final push, pushes, opens the PR. The skill handles the per-PR-checklist mechanics (including any mechanical-stamp invocation if the gate is configured). Follow whatever the current SKILL.md documents — don't assume specific step numbers from this skill's text. Stop after the PR opens.
4. **Wait for hosted CI green.** Use `/loop` to poll `gh pr checks <P>` at a sensible cadence (don't poll faster than the prompt-cache window). Path-filtered jobs that legitimately skip count as success-equivalent.
5. **`/ship-ticket <P>`** — verifies the per-PR checklist completed (mechanism per the current SKILL.md — Journal-marker, mechanical stamp, or whatever evolves), confirms CI green against current HEAD SHA, squash-merges, comments closeouts, removes the worktree, deletes the local branch.

`/ship-ticket` is one PR per invocation. Never sweep multiple PRs in one shot — that's the explicit anti-11-PR-incident guardrail in the skill, and bypassing it loses the self-merge authority the project grants.

**Gate-introducing PRs** (anything that changes the per-PR checklist's mechanism — `.claude/settings.json` hooks, `scripts/checklist-stamp.mjs` if present, `/finish-ticket` review-stamp wiring, or `/ship-ticket`'s checklist-verification step) are a structural exception: they require human merge because the agent satisfying the gate's input itself is indistinguishable from the bypass pattern that got #437 reverted. Ship the PR, hand off to the user.

## When to stop

- After each `/ship-ticket`, give me a one-line summary: shipped #N, next up #M (or "queue empty / re-triaging").
- Stop and ask if: a ticket needs design judgment, code-reviewer returns critical findings I should see, hosted CI fails for non-infrastructure reasons, or two consecutive tickets in your queue turn out to be Blocked / Too big.
- If hosted CI fails for what looks like infrastructure (no logs, BlobNotFound, identical-shape failures across unrelated PRs), surface that to me — admin-merge bypass is the user's call per `~/.dotfiles/.claude/rules/local-ci-and-admin-merge.md`, never auto-applied.
- If `/ship-ticket` refuses (per-PR-checklist gate failure — missing Journal marker, missing/stale mechanical stamp, whatever the current gate is), stop and ask. **Never** hand-fabricate the gate's input to satisfy it; that's the bypass pattern that got #437 reverted.

## Out of scope for this run

- Don't open new tickets unless I ask. Triage findings ("this one is stale", "these two should be split") become a comment on the relevant ticket via `gh issue comment`, not a state change.
- Don't reorder priority labels or close pre-existing tickets — comment-only.
- Don't change stack choices (framework, DB, test runner). If a ticket needs that, it's Blocked until the Epic is updated.

## Invariants

- One ticket = one branch = one PR.
- Triage outputs explicit grouping; no silent skips.
- Per-ticket flow follows `docs/workflow.md` exactly. If the doc and this skill diverge, the doc wins.
- Gate-introducing PRs require human merge.
