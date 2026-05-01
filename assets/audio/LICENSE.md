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

All files are mono, 22050 Hz, encoded at 32 kbps. Total weight ≤ 40 KB.

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
bash scripts/generate-audio-cues.sh
```

Requires `ffmpeg` ≥ 4 with `lavfi` enabled. The script is
deterministic — running it twice on the same machine produces
byte-identical output, so a developer who wants to inspect or
modify the recipes can regenerate without Git churn.
