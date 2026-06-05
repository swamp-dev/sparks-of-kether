# Journal — #299: feat(ui): turn-state modes — atmospheric phase overlays + peer narrative toasts

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-05T01:35:00+00:00 — push 1: implementation + review fixes

**Pushed:** Full implementation of all four acceptance criteria: `lib/use-peer-events.ts` (pure diff + debounced hook, 15 unit tests for `diffPeerEvent`), `TurnBanner.tsx` (full-screen Tiferet-gold overlay), `GameEventToast.tsx` (peer narrative pills), PlayScreen wiring (TurnBanner on turn rotation, amber discard wash + prominent banner, GameEventToast), EncounterScreen ColorBloom backdrop. Two rounds of code-review fixes.

**Why:** Closes all four modes from ticket #299 — Turn Start, Discard, Encounter, Peer toasts.

**Notes:** Two critical findings addressed: `z-60` → `z-[60]` (Tailwind v3 has no default z-60 utility); inline `onDismiss` arrow → stable `useCallback` to prevent timer reset on Realtime pushes. Two significant findings addressed: debounce cleanup restructured to always return from the effect (not conditionally); `>` → `>=` for equal-priority event accumulation. The amber wash uses `bg-amber-400/8` — a low-opacity fixed overlay. `GameEventToast` always mounts (even in hot-seat) but the live region is empty when `peerEvent` is null; future cleanup could gate the mount on `roomCode !== undefined`.

**Commit(s):** `43ac33d..06dddae`
