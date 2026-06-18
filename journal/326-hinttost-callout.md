# Journal — #326: feat(hints): HintCallout — toast and region callout variants

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-18T13:35:00-04:00 — push 1: HintCallout component + review fixes

**Pushed:** `components/hints/HintCallout.tsx` (region callout + toast variants, entrance/exit animations, pulse ring, auto-dismiss timer), `components/hints/__tests__/HintCallout.test.tsx` (8 tests covering all AC items).
**Why:** Implements #326. One review pass: Fix verdict, four findings addressed.
**Notes:**
- Toast variant: `dismissibleVia` includes `{ kind: 'timeout' }` → pill style, auto-dismiss, entrance + exit animations. Region callout: anchored above/below anchor via `getBoundingClientRect`, 4px CSS triangle pointer, pulse ring on anchor.
- CRITICAL fixed: double-subtract of 8px gap — `position.top` in layout effect already contained the gap; `positionStyle` was subtracting 8px again. Fixed by using `position.top` directly in `positionStyle`.
- SIGNIFICANT fixed: bare `setTimeout` in `handleDismiss` had no cleanup; added `exitTimerRef` to store and clear the 200ms exit-animation delay. `useLayoutEffect` → `useEffect` (SSR warning suppression).
- SIGNIFICANT fixed: region callout `transition-[opacity,transform]` was unconditional → reduced-motion users saw stuck `scale-95`; fixed with `transition-opacity` base + `motion-safe:transition-[opacity,transform]`.
- MINOR taken: "Got it" button routes through `handleDismiss` for consistency with future exit animations.
- Deferred: keyboard dismiss on tap-anywhere backdrop (no `onKeyDown` / Escape handling) — low priority for game context.
- `where.kind === 'overlay'` intentionally not rendered (→ #327 TutorialOverlay).
- `where.kind === 'element'` returns null; no `element` hints in current registry.
**Commit(s):** `cfffcef..HEAD`
