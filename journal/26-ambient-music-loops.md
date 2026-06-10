# Journal — #26: feat(audio): per-route ambient music loops

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-06-10 — initial implementation (push 1)

**What shipped:** Singleton `MusicProvider` at app-layout level owning one
`<audio>` element with 1.5 s crossfade (15 × 100 ms), tab-visibility
pause/resume, `musicEnabled` toggle, and same-track no-op. Thin `useMusic(track)`
hook delegates to the provider. `HomeMusic` client boundary for the
server-rendered home page. Provider wired into `app/layout.tsx`; home and
lobby pages call `useMusic('lobby')`.

**Design choice:** provider pattern (not per-hook audio) — React's
cleanup-before-new-effect ordering means a pure hook can't crossfade because
cleanup nulls `audioRef` before the new effect can reference the outgoing
element. The provider persists audio at the layout level, outside per-component
lifecycle.

**Bug found and fixed in review:** mid-crossfade `musicEnabled=false` then
`true` left the incoming audio at its interrupted volume (e.g. 10% of 35%).
Fixed by resetting `audio.volume = MUSIC_VOLUME` in the enabled→true branch of
the toggle effect.

**Not in this PR:** the four CC0 audio files (lobby, play, blessing,
encounter-<sefirah>) are already committed to `public/audio/` from a prior
push. This PR is the code half only; sourcing final CC0 replacements from
Freesound/Suno/Udio is a follow-up TODO per the ticket.
