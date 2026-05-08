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
| `encounter-kether.mp3` / `encounter-kether.ogg` | [`scripts/music/tracks/encounter-kether.ts`](../../scripts/music/tracks/encounter-kether.ts) | Pure sine drone @ A4 + chorus-detuned A major triad pad across A5/C♯6/E6/A6 + 8 s wide Schroeder reverb (55 % wet). No events. 36 s loop. Vibe: white, unity, source, pure being. |
| `encounter-chokmah.mp3` / `encounter-chokmah.ogg` | [`scripts/music/tracks/encounter-chokmah.ts`](../../scripts/music/tracks/encounter-chokmah.ts) | Single saw drone @ G2 + dense FM strikes (~5 s avg) drawn from {G5, B♭5, D6, F♯6} with short envelopes + dry 1 s reverb. 36 s loop. Vibe: gray, raw creative flash, lightning. |
| `encounter-binah.mp3` / `encounter-binah.ogg` | [`scripts/music/tracks/encounter-binah.ts`](../../scripts/music/tracks/encounter-binah.ts) | Wide-detuned saws + sub-sine @ B♭1 + B♭ minor pad on D♭4/F4/B♭4/B♭3 + sparse low FM bell @ B♭3/D♭5 + very deep cathedral reverb (10 s tail, 55 % wet). 36 s loop. Vibe: black, form, structure, sorrow. |
| `encounter-chesed.mp3` / `encounter-chesed.ogg` | [`scripts/music/tracks/encounter-chesed.ts`](../../scripts/music/tracks/encounter-chesed.ts) | Lush detuned saws @ C2 + C major triad pad across two octaves + Karplus-Strong arpeggio (C5/E5/G5/C6) + warm 7 s reverb (42 % wet). 36 s loop. Vibe: blue, love, abundance, generosity. |
| `encounter-gevurah.mp3` / `encounter-gevurah.ogg` | [`scripts/music/tracks/encounter-gevurah.ts`](../../scripts/music/tracks/encounter-gevurah.ts) | Square wave drone @ F♯2 + tight FM strikes on tritone pairs (C/F♯ across octaves) + nearly-dry 0.6 s reverb (10 % wet). No pad. 36 s loop. Vibe: red, discipline, judgment, sacred No. |
| `encounter-tiferet.mp3` / `encounter-tiferet.ogg` | [`scripts/music/tracks/encounter-tiferet.ts`](../../scripts/music/tracks/encounter-tiferet.ts) | Detuned saws @ C2 + C major triad pad on C4/E4/G4/C5 + lyrical KS celesta on C5/E5/G5/C6 + 8-note C major arch melody (G4-C5-E5-G5-C6-G5-E5-C5, 2 passes) + balanced 4 s reverb (32 % wet). 36 s loop. Vibe: gold, harmony, the heart-centre. C major = traditional Hermetic Sun key. |
| `encounter-netzach.mp3` / `encounter-netzach.ogg` | [`scripts/music/tracks/encounter-netzach.ts`](../../scripts/music/tracks/encounter-netzach.ts) | Detuned saws @ F2 + F major triad pad on F4/A4/C5/F5 + cascading KS arpeggios on F5/A5/C6/F6 (~3 s avg) + wave-shaped 8-note F major motif (2 passes) + 3.5 s reverb (32 % wet). 36 s loop. Vibe: passion, art, nature, sensual flow. F major = traditional Hermetic Venus key. |
| `encounter-hod.mp3` / `encounter-hod.ogg` | [`scripts/music/tracks/encounter-hod.ts`](../../scripts/music/tracks/encounter-hod.ts) | Static thin saw @ D2 + tightly-quantised FM bell pulses on D5/F♯5/A5/D6/F♯6/A6 (~4 s avg) + 8-note geometric music-box motif (D5-F♯5-A5-D6-A5-F♯5-D5-A4, 2 passes) + dry 1.6 s reverb (22 % wet). No pad, no LFO. 36 s loop. Vibe: orange, intellect, language, geometric clockwork. D major = bright fast Mercury feel. |

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
