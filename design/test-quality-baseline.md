# Test quality baseline — engine/ mutation pilot

Captured: 2026-04-27. Scope: `engine/` (8 files, 801 mutants generated, 780 scored after `ignoreStatic: true` filtered out 21 static mutants, ~5 minute run).

## Aggregate

| Metric | Value |
|---|---|
| **Mutation score (total)** | **89.36%** |
| Mutation score (covered) | 91.23% |
| Killed | 693 |
| Survived | 67 |
| Timeouts | 4 |
| No coverage | 16 |
| Errors | 0 |

## Per-file

| File | Total | Covered | Killed | Timeout | Survived | No cov | Targets | Result |
|---|---|---|---|---|---|---|---|---|
| `engine/checks.ts` | 94.59% | 98.59% | 70 | 0 | 1 | 3 | ≥ 70% | ✓ |
| `engine/counters.ts` | 92.59% | 92.59% | 50 | 0 | 4 | 0 | (capture) | — |
| `engine/endgame.ts` | 84.94% | 87.04% | 139 | 2 | 21 | 4 | ≥ 60% | ✓ |
| `engine/movement.ts` | 98.99% | 98.99% | 98 | 0 | 1 | 0 | (capture) | — |
| `engine/setup.ts` | 72.73% | 78.43% | 39 | 1 | 11 | 4 | (capture) | — |
| `engine/shells.ts` | 85.26% | 86.17% | 80 | 1 | 13 | 1 | (capture) | — |
| `engine/sparks.ts` | 92.20% | 93.06% | 201 | 0 | 15 | 2 | (capture) | — |
| `engine/turn.ts` | 84.21% | 94.12% | 16 | 0 | 1 | 2 | ≥ 80% | ✓ |

## Reading the table

- **Total mutation score** = (killed + timeout) / (killed + survived + timeout + no-cov). Timeouts count as detected (they're still a signal that *something* broke). No-coverage stays in the denominator so the score penalizes uncovered code.
- **Covered mutation score** = (killed + timeout) / (killed + survived + timeout). Excludes no-cov so the score reflects how well *covered* code is verified.
- **No coverage** = mutants in code paths no test ever executes. These are coverage gaps, not test-quality gaps.
- **Survived** = a mutation slipped through the test suite. These are test-quality gaps — a real regression in that line would not be caught.

## Target outcomes

All three pilot targets met:

- `engine/turn.ts` ≥ 80% — actual 84.21%
- `engine/checks.ts` ≥ 70% — actual 94.59%
- `engine/endgame.ts` ≥ 60% — actual 84.94%

No follow-up tickets filed for surviving mutants in this pilot. Modules where score is below 90% (`endgame.ts`, `shells.ts`, `setup.ts`, `turn.ts`) are candidates for future test strengthening; the testability-refactor audit (#94 / T8) will look at the underlying code structure.

`engine/setup.ts` at 72.73% is the lowest. The empty-players guard added in #35 (PR for #35 — `if (!firstPlayer) throw`) introduced branches the existing test fixtures don't exercise, which likely accounts for several of the surviving mutants there. Worth confirming as the first thing T8 looks at.

## How to reproduce

```
pnpm mutation
```

The HTML report is generated at `reports/mutation/mutation.html` (gitignored). Stryker config is `stryker.conf.json`. Pilot scope is `engine/` only — `lib/`, `components/`, and `app/api/` are intentionally not mutated yet; expanding scope is a follow-up once the pilot proves out in CI.

`stryker.conf.json` hardcodes `concurrency: 4`, sized for a developer laptop. GitHub Actions `ubuntu-latest` runners are 2 vCPU; if a future ticket adds `pnpm mutation` to CI, the concurrency should drop to `2` (or be omitted entirely so Stryker uses its `n-1` default).

`break: null` in the thresholds block means CI/local runs never exit non-zero on a low mutation score. The pilot is intentionally an audit tool, not a gate.

## Future expansions

- Add `lib/` to the mutate set. `lib/use-turn.ts`, `lib/grace.ts` are good candidates — both have light test coverage and would benefit from mutation-driven hardening.
- Add `app/api/**/route.ts`. Route logic mutations would catch off-by-one in status-code mappings and missing branches in error paths.
- Run mutation in CI on a nightly schedule (not per-PR — too slow). Threshold a regression below the current aggregate score.
