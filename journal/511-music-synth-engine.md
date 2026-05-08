# Journal — #511: feat(audio): synth-ambient music generator + lobby track (refs #125, #509)

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

---

## 2026-05-07T19:19:12-04:00 — push 1 (initial PR)

**Pushed:** synth toolkit (WAV writer, oscillators, envelopes, filters,
reverb, FM bell, KS pluck, equal-power pan, seeded PRNG); ffmpeg
encode pipeline; loop-seam / peak / silence / LUFS audio QA gates;
`scripts/music/render.ts` CLI + `pnpm music:render` script; lobby
track program (`scripts/music/tracks/lobby.ts`) with drone bed +
tolling FM bells + celesta-arpeggio twinkle layer + simple A-major
motif; rendered `public/audio/lobby.{mp3,ogg}`; license entry for
the music tracks; `tsx` added as a devDep so the TS entry runs
under pnpm.

**Why:** ticket #511 — first track in the per-route music engine,
also the aesthetic gate for the synth-ambient direction over
Suno/CC0. Auditioned with the user after each iteration; the
ascending-arpeggio motif on top of the drone+twinkle bed got the
"ship it" vote.

**Notes:**
- Loop-seam correlation passes at 1.000 because every oscillator
  and modulator is tuned to integer-cycle counts over the 114 s
  head-to-tail span (= duration − crossfade) and bell/melody/
  twinkle events are forbidden in any region whose audible tail
  reaches the tail crossfade window. After the linear head-into-
  tail crossfade, head and tail slices are sample-identical drone.
- The ticket AC names two values that can't both hold at 120 s
  duration: "≤ 250 KB" (bytes) and "96-128 kbps VBR" (bitrate).
  At 96-128 kbps × 120 s the file is necessarily 1.4-1.9 MB. The
  size cap was set to 2 MB so the bitrate target binds; flagged
  in the PR body for the user to update the AC.
- One-shot oscillators in the lobby render currently fire from
  inside the per-event loop (non-trivial allocations per bell /
  twinkle / melody note). It runs in ~2 s for 130 s of audio and
  the renders are deterministic, so this isn't a hot path — but
  if the toolkit grows it's worth pooling.

**Commit(s):** `236e458..2910604`

## 2026-05-07T19:42:36-04:00 — push 2 (review fixes)

**Pushed:** address code-reviewer findings from push 1 — wrap encode
ffmpeg calls in try/finally so the temp WAV is always unlinked,
clarify the loop-seam Pearson gate's semantics in a long comment
(it measures crossfade application, not the perceptual seam at the
wrap point), surface ffmpeg's `"-inf"` LUFS reading as -Infinity
instead of throwing, qualify the schroederReverb comment as
FreeVerb-style, and document the future-pass safety arithmetic for
the melody scheduler. Also caught while verifying determinism: the
ogg encoding wasn't byte-identical across runs (Ogg page serial is
randomized by ffmpeg per encode); added `-fflags +bitexact -flags
+bitexact` to both ffmpeg invocations so re-renders produce the same
bytes — required by the AC.

**Why:** code-reviewer returned a "fix" verdict on push 1 with two
SIGNIFICANT findings (the tempfile leak and the misleading gate
comment) plus several easy minors. Re-reviewed after fixes;
reviewer returned `ship` (no new issues, no regressions, all 2056
tests still passing).

**Notes:** re-reviewed after fixes, verdict ship. Minor residual
flagged by re-review (`writeFile` is outside the try/finally so a
mid-write failure could leave a partial tmpfile) — not a regression,
the OS cleans `/tmp`, deferred.

**Commit(s):** `730a51e`
