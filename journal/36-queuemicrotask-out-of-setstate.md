# Journal — #36: refactor(card-drag): move queueMicrotask out of setState updater

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-22T02:00:00Z — push 1 StrictMode-safe effect dispatch

**Pushed:** Replace `queueMicrotask(() => onEffectRef.current(effect))` inside the `setState` updater with a `pendingEffectRef` written in the updater + `useEffect([state])` that consumes it after commit. The write is now unconditional (`pendingEffectRef.current = step.effect`) to keep the "pendingEffectRef always reflects the latest step" invariant explicit. Stale test comments referring to `queueMicrotask` timing updated to reflect `useEffect`.
**Why:** React's `setState` updater contract requires purity; calling `queueMicrotask` inside violated it. StrictMode double-invokes updaters — the old code would have fired every effect twice. The ref write is idempotent under double-invoke (both calls write the same effect), so `useEffect` fires the effect exactly once.
**Notes:** `drag-move` batching caveat documented in code — if React batches multiple `pointer-move` dispatches, only the last `drag-move` effect survives in `pendingEffectRef`. `drag-move` has no active consumer today (#412 no-op path), so not observable. Pre-existing `synth.test.ts` PRNG flake confirmed on main — not related.
**Commit(s):** `d006942`
