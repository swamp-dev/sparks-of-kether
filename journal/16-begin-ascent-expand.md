# #16 — Begin-the-ascent expand-in-place transition

## Push 1 — 2026-05-22

**Branch:** `feat/16-begin-ascent-expand`
**Commit:** `e4aecd1`

### What shipped

Replaced the no-op `transition-opacity` on the PrimaryCTA disclosure panel
with a proper CSS keyframe animation (`portal-emerge`).

The panel is conditionally mounted — `{isOpen ? <div> : null}` — so a CSS
transition has no "from" state to interpolate FROM. The element mounts at full
opacity already; the transition class silently does nothing. This is the same
problem `hand-fade-in` solves in tailwind.config.ts (noted there). Fix: a
`@keyframes portal-emerge` (opacity 0 + 6px translateY → full) with
`animation-fill-mode: both`, gated under `motion-safe:` so reduced-motion
users see an instant reveal with no translate effect.

**Files changed:**
- `tailwind.config.ts`: `portal-emerge` keyframe + `animate-portal-emerge`
  animation utility (350ms, `ease-emerge` / out-expo cubic-bezier)
- `components/home/PrimaryCTA.tsx`: panel div gains
  `motion-safe:animate-portal-emerge`, replacing the previous
  `transition-opacity duration-300 ease-emerge`
- `components/home/__tests__/PrimaryCTA.test.tsx`: new describe block
  `#16 — expand-in-place transition` pins that the panel carries
  `motion-safe:animate-portal-emerge` after mount
- `e2e/home.spec.ts`: new test — expand → click Hot-seat link → assert
  `/play` route (satisfies AC: "e2e: home → expand → pick → land on the
  correct downstream flow")

### Surprises / decisions

- `motion-safe:animate-*` Tailwind prefix gates the keyframe so the translate
  effect is entirely absent for `prefers-reduced-motion: reduce` users — the
  panel just appears instantly, which is the correct reduced-motion contract.
- The e2e test navigates via the real Hot-seat `<a href="/play">` link rather
  than mocking the router, giving us a real route-change assertion.
- All 3199 unit tests pass; typecheck and lint clean.
