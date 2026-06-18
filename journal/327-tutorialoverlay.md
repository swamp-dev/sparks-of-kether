# Journal — #327: feat(hints): TutorialOverlay — full-screen overlay variant

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-18T14:00:00-04:00 — push 1: TutorialOverlay component + review fixes

**Pushed:** `components/hints/TutorialOverlay.tsx` (full-screen overlay for `kind: 'overlay'` hints, entrance animation, focus trap, Escape key dismiss, "Got it" button), `components/hints/__tests__/TutorialOverlay.test.tsx` (8 tests covering all AC items).
**Why:** Implements #327. One review pass + re-review after SIGNIFICANT fix.
**Notes:**
- Overlay variant: `fixed inset-0 z-[60] bg-void/80` backdrop, centered panel at `mt-[20vh]`, entrance animation `opacity-0 translate-y-2 → opacity-100 translate-y-0 duration-300 ease-emerge`.
- Reduced motion: `transition-opacity` base (opacity-only) + `motion-safe:transition-[opacity,transform]` (full) — same pattern as HintCallout (#326).
- Focus trap: `onKeyDown` on panel intercepts Tab/Shift+Tab, loops between first/last focusable — mirrors `SettingsButton.tsx` pattern. `panelRef.current?.focus()` on mount parks initial focus.
- Escape key dismisses only when `dismissibleVia` includes `'explicit-button'` (treat as confirmation per AC).
- Backdrop click does NOT dismiss — no onClick on the outer container.
- SIGNIFICANT review finding addressed: initial implementation used `panelRef.current?.focus()` alone — focus escaped via Tab. Fixed by adding `handleKeyDown` with querySelectorAll loop.
- Reviewer findings "duplicate handleDismiss" and "missing useHints.ts" were false positives (reviewer worked from pasted code, not the actual tree). Typecheck confirmed no duplicates; `lib/hooks/useHints.ts` exists from #325.
- `font-display` for copy (display context per `docs/typography.md`). "Got it" button mirrors setup CTA style: `bg-illumination text-ground`.
**Commit(s):** `e4f04ed..HEAD`
