# #42 — fix(hand): smooth transform-origin flip on un-magnify

## Push 1 — 664cf9c

Fix: hold `transformOrigin: 'center'` always instead of switching between `'bottom center'` and `'center'` on magnify state. `transform-origin` is not a transitionable property, so the switch was a discrete snap. At scale=1 any origin is equivalent — the fan curve is unaffected.

Removed the now-stale comment block that explained the two-state origin logic.

Reviewer verdict: ship. Noted the `parentElement` traversal pattern is pre-existing fragile coupling, not introduced here.

## Push 2 — ccaeafc

Visual regression baseline updated for `demo-hand-tablet`: the `transformOrigin` change from `'bottom center'` to `'center'` at rest altered the fan card positions slightly. The new render is the correct, intentional appearance.
