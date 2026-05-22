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

## Push 2 — fcd4c0f

Revised approach after E2E regression. First approach (routing className to inner fan) changed the hand's position from left-aligned to centered, causing pointer-events-auto cards to block button clicks.

Correct fix: keep className on the outer wrapper (runtime unchanged), remove the misleading `className="w-full max-w-xl"` from PlayScreen (it was a no-op due to `inset-x-0`), update JSDoc to document the limitation. Tests updated to reflect actual routing (outer wrapper).

Reviewer finding: JSDoc suggestion to use `layout="inline"` was misleading — removed.

## Push 3 — 2a59d4c

Restored `className="w-full max-w-xl"` to PlayScreen. It is NOT a no-op: `position:fixed + inset-x-0 + max-w-xl` resolves to a 576px left-aligned wrapper. Removing it shifted the hand to center, breaking E2E Meditate-button click-through. Updated JSDoc to accurately describe the floating-mode CSS constraint behavior instead of calling it a no-op.
