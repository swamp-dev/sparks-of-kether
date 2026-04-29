#!/usr/bin/env bash
# scripts/ci-local.sh — run every CI job locally, in the same order
# as `.github/workflows/ci.yml`. Fails fast: any job that exits
# non-zero stops the script and the overall run is red.
#
# Used by `pnpm ci:local`. The point is the per-PR checklist in
# `~/.claude/rules/local-ci-and-admin-merge.md` — every PR runs this
# (or its equivalent jobs individually) before review-fixes are
# declared done.
#
# Skip flags via env var:
#   SKIP_E2E=1          — skip end-to-end (Playwright)
#   SKIP_INTEGRATION=1  — skip real-Supabase integration
#
# Both are escape hatches for local iteration; never set them when
# running the checklist for a PR that's about to merge.

set -euo pipefail

# Colour helpers (disable if not a TTY).
if [[ -t 1 ]]; then
  bold=$(tput bold); reset=$(tput sgr0); cyan=$(tput setaf 6); green=$(tput setaf 2); red=$(tput setaf 1)
else
  bold=""; reset=""; cyan=""; green=""; red=""
fi

step() {
  printf "\n%s%s━━━ %s ━━━%s\n" "$bold" "$cyan" "$1" "$reset"
}
ok() { printf "%s✓ %s%s\n" "$green" "$1" "$reset"; }
fail() { printf "%s✗ %s%s\n" "$red" "$1" "$reset"; exit 1; }

# 1. verify — typecheck + lint + test:coverage
step "verify (typecheck + lint + test:coverage)"
pnpm typecheck || fail "typecheck"
pnpm lint || fail "lint"
pnpm test:coverage || fail "test:coverage"
ok "verify passed"

# 2. build — production Next.js build
step "build (next build)"
pnpm build || fail "build"
ok "build passed"

# 3. e2e — Playwright (skip via SKIP_E2E=1)
if [[ "${SKIP_E2E:-}" == "1" ]]; then
  step "e2e — SKIPPED (SKIP_E2E=1)"
else
  step "e2e (Playwright)"
  # Install browsers idempotently. `--with-deps` needs sudo, which
  # the agent can't run; the user is expected to have run that
  # once locally. Without `--with-deps`, the binary install is
  # idempotent and quick.
  PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm exec playwright install chromium > /dev/null 2>&1 || true
  PLAYWRIGHT_BROWSERS_INSTALLED=1 pnpm e2e || fail "e2e"
  ok "e2e passed"
fi

# 4. integration — real-Supabase (skip via SKIP_INTEGRATION=1)
if [[ "${SKIP_INTEGRATION:-}" == "1" ]]; then
  step "integration — SKIPPED (SKIP_INTEGRATION=1)"
else
  step "integration (real-Supabase via local stack)"
  # Boot the full Supabase stack — Postgres + GoTrue + PostgREST +
  # Realtime — in Docker. Migrations apply automatically. `db
  # start` (just Postgres) is NOT enough; the integration tests
  # use `signInAnonymously` which needs GoTrue.
  #
  # Catch INT/TERM explicitly: bash's EXIT trap doesn't fire on
  # uncaught signals, so a Ctrl-C mid-run would otherwise leave the
  # Supabase containers running.
  trap 'pnpm exec supabase stop --no-backup > /dev/null 2>&1 || true' EXIT INT TERM
  # Reap any stray stack from a prior run that exited abruptly
  # (terminal close, parent-process kill — bash's EXIT trap doesn't
  # fire in those cases). Idempotent: `supabase stop` no-ops when
  # nothing is running, so this is safe to call unconditionally.
  pnpm exec supabase stop --no-backup > /dev/null 2>&1 || true
  pnpm exec supabase start || fail "supabase start"

  # `supabase status -o env` writes to a tmpfile that contains a
  # service-role JWT (admin bypass on the local stack). Source it,
  # promote to the names the test setup expects, then unlink — the
  # values live in env vars from this point on, no reason to leave
  # them on disk.
  envfile=$(mktemp -t sok-supabase.env.XXXXXX)
  pnpm exec supabase status -o env > "$envfile"
  # shellcheck disable=SC1090
  set -a; source "$envfile"; set +a
  rm -f "$envfile"
  export SUPABASE_URL="$API_URL"
  export SUPABASE_ANON_KEY="$ANON_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

  pnpm test:integration || fail "test:integration"
  ok "integration passed"
fi

printf "\n%s%s✓ ALL CI JOBS PASSED%s\n" "$bold" "$green" "$reset"
