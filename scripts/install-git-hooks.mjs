#!/usr/bin/env node
// scripts/install-git-hooks.mjs — point git at the in-repo
// `.githooks/` directory the first time someone runs `pnpm install`.
//
// Why: native git hooks live in `.git/hooks/` which is not tracked.
// `core.hooksPath` lets us track them in `.githooks/` instead so
// every clone gets the same hooks. Plain dependency-free
// alternative to Husky.
//
// Idempotent: if `core.hooksPath` is already set to anything, we
// don't overwrite (respect any custom workflow). If it's unset, we
// point it at `.githooks` and log a one-line note.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Skip in CI — the workflow runs `pnpm install --frozen-lockfile`
// and we don't want to mutate git config there.
if (process.env.CI) {
  process.exit(0);
}

// Skip if not inside a git work tree (e.g. installing inside a
// tarball, npm publish staging, etc.).
try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
} catch {
  process.exit(0);
}

if (!existsSync('.githooks')) {
  // No hooks tracked yet; nothing to install.
  process.exit(0);
}

const existing = (() => {
  try {
    return execSync('git config --local --get core.hooksPath', {
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
})();

if (existing && existing !== '.githooks') {
  console.log(
    `[install-git-hooks] core.hooksPath already set to "${existing}"; leaving it alone.`,
  );
  process.exit(0);
}
if (existing === '.githooks') {
  process.exit(0); // already installed
}

execSync('git config --local core.hooksPath .githooks');
console.log('[install-git-hooks] core.hooksPath → .githooks (pre-push hook is now active)');
