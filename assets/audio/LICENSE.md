# Audio asset licensing

The 8 UI sound cues shipped under `public/audio/` (referenced by
[`lib/sound/cues.ts`](../../lib/sound/cues.ts)) are **synthesized
in-tree** from the script
[`scripts/generate-audio-cues.sh`](../../scripts/generate-audio-cues.sh).

Each cue is a deterministic ffmpeg-`aevalsrc` synthesis of a short
tonal expression with an exponential decay envelope. **The output of
that script is not copyrightable** under prevailing US / EU /
UK / WIPO consensus — synthetic audio derived from a deterministic
mathematical expression is no different from a generated colour
swatch or a piece of geometric line art whose primitives are
mechanical. There is no human authorship in the output of these
formulas, and Anthropic's tooling neither claims authorship of nor
asserts any rights over them.

We treat every file under `public/audio/` as **CC0 / public domain**
and explicitly waive any rights we might be deemed to hold. Anyone
may use, modify, redistribute, or rebuild them.

## Per-file inventory

| File | Cue | Synth recipe (summary) |
|---|---|---|
| `chime.spark-collected.mp3` | `spark-collected` | E5 + G5 sine sum, ~3 dB/s decay, 0.8 s |
| `chime.illumination-up.mp3` | `illumination-up` | G5 + C6 sine sum, faster decay, 0.6 s |
| `hum.separation-up.mp3` | `separation-up` | A♯2 + A♯3 with attack envelope, 1.2 s |
| `crackle.shell-awakened.mp3` | `shell-awakened` | 440 Hz × pseudorandom noise, 0.6 s |
| `seal.shell-banished.mp3` | `shell-banished` | F2 + F3 sine sum, fast decay, 0.7 s |
| `flip.card-drawn.mp3` | `card-drawn` | broadband noise pulse, 15 dB/s decay, 0.3 s |
| `chime.encounter-pass.mp3` | `encounter-pass` | C5 + E5 + G5 chord, slow decay, 0.9 s |
| `tone.encounter-fail.mp3` | `encounter-fail` | B4 + C5 minor-second cluster, 0.7 s |
| `avatar-arrives-athena.mp3` | `avatar-arrives-athena` | FM bell A6 + harmonic ping E7, sharp insight, 1.4 s |
| `avatar-arrives-demeter.mp3` | `avatar-arrives-demeter` | B♭ minor triad saw swell + lowpass + warm reverb, 1.5 s |
| `avatar-arrives-zeus.mp3` | `avatar-arrives-zeus` | C major detuned-saw burst, regal generous reverb, 1.4 s |
| `avatar-arrives-ares.mp3` | `avatar-arrives-ares` | F♯3 + C3 tritone FM hits, dry, 1.0 s |
| `avatar-arrives-apollo.mp3` | `avatar-arrives-apollo` | E major KS harp arp over sustained sine, 1.5 s |
| `avatar-arrives-aphrodite.mp3` | `avatar-arrives-aphrodite` | G major KS pluck cascade up-and-down, 1.5 s |
| `avatar-arrives-hermes.mp3` | `avatar-arrives-hermes` | quick FM strike + descending D-minor arpeggio, 1.0 s |
| `avatar-arrives-selene.mp3` | `avatar-arrives-selene` | dreamy KS pluck D5/A5 + long reverb, 1.5 s |
| `avatar-arrives-hestia.mp3` | `avatar-arrives-hestia` | C major sine triad swell, warm hearth, 1.5 s |

The 8 short SFX cues are mono, 22050 Hz, ~32 kbps (≤ 40 KB combined).
The 9 avatar stings are stereo synth-ambient, 44100 Hz, libmp3lame
-q 4 (~96-128 kbps VBR; ≤ 23 KB each, ≤ 140 KB combined). Total
audio-cue weight stays under 200 KB across both groups.

## Replacement policy

These cues are intentional placeholders — the synth recipes are
chosen to be semantically distinct (chimes vs hums vs noise bursts)
but they are not the final aesthetic. When higher-quality CC0 / OFL
/ permissively-licensed cues are sourced (Freesound CC0, BBC Sound
Effects, Soundsnap), they can land at the same paths in
`public/audio/` and the existing wiring in [`lib/sound/cues.ts`](../../lib/sound/cues.ts)
picks them up without any code change.

When a replacement lands, update this file with:

- The file name (one of the 8 paths above).
- The source URL.
- The licence (CC0 / CC-BY / OFL / etc.) and any required attribution.
- The author / curator credit.

## Rebuilding the in-tree cues

```bash
bash scripts/generate-audio-cues.sh   # the original 8 SFX cues
pnpm sfx:render-stings                # the 9 avatar-arrival stings (#484)
```

Both pipelines are deterministic — running either one twice on the
same machine produces byte-identical output, so a developer who
wants to inspect or modify the recipes can regenerate without Git
churn. The shell script requires `ffmpeg` ≥ 4 with `lavfi` enabled;
the stings pipeline shells out to libmp3lame + libvorbis via the
music-engine encode path.

---

## Music tracks

Per-route ambient music (referenced by the music engine in #509) is
also synthesized in-tree — same legal posture as the cues above. The
synthesis programs are TypeScript files under
[`scripts/music/tracks/`](../../scripts/music/tracks/); each file is
the canonical source of its track. Mathematical-expression output, no
human-authorship copyright; we waive any rights and treat every file
under `public/audio/` as **CC0 / public domain**.

| File | Track program | Synthesis recipe (summary) |
|---|---|---|
| `lobby.mp3` / `lobby.ogg` | [`scripts/music/tracks/lobby.ts`](../../scripts/music/tracks/lobby.ts) | Two detuned saws @ A2 + LFO-modulated lowpass + sparse FM bells in {A5, C♯6, E6, A6} + Schroeder reverb. 120 s loop with 6 s head-into-tail crossfade. |
| `encounter-yesod.mp3` / `encounter-yesod.ogg` | [`scripts/music/tracks/encounter-yesod.ts`](../../scripts/music/tracks/encounter-yesod.ts) | Detuned saws + sub-sine @ D2 + LFO-modulated lowpass + AM-pulsed sine triad on D-F-A around D5/F5/A5 + sparse Karplus-Strong drops at A5/D6 + long Schroeder reverb (6 s tail, 45 % wet). 36 s loop with 3 s head-into-tail crossfade. Vibe: violet, dreams, subconscious, intuition. |
| `play.mp3` / `play.ogg` | [`scripts/music/tracks/play.ts`](../../scripts/music/tracks/play.ts) | Three-octave detuned-saw cello drone (C2/C3/C4) + Cm9 voicing pad (C-E♭-G-B♭-D, lowpass @ 600 Hz) + sparse Karplus-Strong harp plucks at C5/E♭5/G5/B♭5 (every 18-25 s) + 6 s cathedral reverb (40 % wet). 120 s loop with 6 s head-into-tail crossfade. Vibe: meditative home, the Tree of Life. |
| `encounter.mp3` / `encounter.ogg` | [`scripts/music/tracks/encounter.ts`](../../scripts/music/tracks/encounter.ts) | Detuned-saw drone @ A1 + A2 + bandpass-formant choir pad on A3/E4 ("Ah" vowel) + sparse FM-bell felt-mallets on A3/C♯4/E4 every 6-10 s + bandpass-noise "thinking" pulses every ~3.43 s + 2 s medium-room reverb (25 % wet). 100 s loop with 4 s head-into-tail crossfade. Vibe: heightened presence, dialogue with a Sefirah avatar. |
| `blessing.mp3` / `blessing.ogg` | [`scripts/music/tracks/blessing.ts`](../../scripts/music/tracks/blessing.ts) | Warm detuned-saw bass strings (C2 + G2, lowpass @ 800 Hz) + bandpass-formant C major triad choir spread across two octaves ("Oo" vowel) + Karplus-Strong harp arpeggio C-E-G-B at 60 BPM panning L-R-L-R + distant E7 FM bell every 30-60 s + 8 s cathedral reverb (50 % wet). 120 s loop with 6 s head-into-tail crossfade. Vibe: gentle catharsis, resolution. |

### Rebuilding tracks

```bash
pnpm music:render lobby      # render one track
pnpm music:render            # render every track
```

Requires `ffmpeg` on PATH (libmp3lame + libvorbis). Renders are
deterministic — same code, same audio bytes — so the script can be
run on any machine without producing a diff. Each track also runs
its own automated QA pass (loop-seam Pearson, peak dBFS, integrated
LUFS via `loudnorm`, contiguous silence detection) before encode.
