# #41 — fix(hand): scope className prop on fixed-position overlay

## Push 1 — 1ac9d47

Fix: moved `className` from `outerClassName` to `innerClassName` in the floating-mode branch. The fixed `inset-x-0 bottom-0` wrapper is always full-viewport-width; layout-affecting consumer classes (e.g. `max-w-xl` from PlayScreen) should constrain the fan, not the overlay.

Tests updated:
- `#127` space-guard test: now queries `[data-hand-fan]`
- `#168` interior-space preservation: now queries `[data-hand-fan]`
- Added: no-trailing-space guard on `[data-hand-fan]`
- Added: positive routing test (`max-w-xl` on fan, not outer)
- Added: inline-mode regression (className still on outer wrapper)

Reviewer found significant gap (missing fan trailing-space test) and minor nits (test placement, JSDoc). All addressed in this commit.
