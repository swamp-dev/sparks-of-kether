/**
 * Resolve the seed for a hot-seat /play session.
 *
 * Honors a `?seed=N` query param so a player who hit an interesting
 * hand can paste the URL back to reproduce. Otherwise derives from
 * `Date.now()` so each fresh session deals a different hand — the
 * fixed-constant predecessor (`RNG_SEED = 1729`) made every replay
 * identical and was the right call only while /play was a demo
 * surface.
 *
 * The seed is **truncated to 32 bits** (`>>> 0`) before returning,
 * matching what `seededRng()` does internally. Without this the
 * logged "replay with ?seed=N" hint would carry the full
 * `Date.now()` (~1.7e12) but the RNG would silently truncate it,
 * so pasting the URL back would not reproduce the session.
 *
 * Logs the resolved seed and a replay URL hint via `console.info` so
 * the seed is recoverable from devtools without a UI affordance.
 *
 * `parseInt(value, 10)` deliberately stops at the first non-decimal
 * character, so `?seed=1e5` → 1 and `?seed=0x10` → 0. Hex and
 * scientific notation are not supported; users hand-crafting a URL
 * should pass the decimal integer directly.
 *
 * The /play page derives three RNGs from this single seed via
 * `seed + 0`, `seed + 1`, `seed + 2` (two ritual streams + one play
 * stream). If those offsets ever change in `app/play/page.tsx`, the
 * mapping should stay aligned here.
 */
export function resolvePlaySeed(searchParams?: URLSearchParams): number {
  const explicit = searchParams?.get('seed');
  if (explicit !== null && explicit !== undefined && explicit !== '') {
    const parsed = Number.parseInt(explicit, 10);
    if (Number.isFinite(parsed)) {
      const seed = parsed >>> 0;
      // eslint-disable-next-line no-console
      console.info(`[play] seed: ${seed} (from ?seed)`);
      return seed;
    }
  }
  const seed = Date.now() >>> 0;
  // eslint-disable-next-line no-console
  console.info(`[play] seed: ${seed} (replay with ?seed=${seed})`);
  return seed;
}
