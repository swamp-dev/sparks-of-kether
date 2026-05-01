#!/usr/bin/env bash
#
# generate-audio-cues.sh — synthesize the 8 UI sound cues for #321.
#
# Generated tones (`aevalsrc` filter, fade envelope) are not
# copyrightable — they're trivially-derived synthetic audio. Using
# this approach means the project ships with placeholder cues that
# carry zero licence risk and can be replaced with curated CC0 /
# permissively-licensed assets later without code changes (the path
# in `public/audio/` is the same).
#
# Usage:
#   bash scripts/generate-audio-cues.sh
#
# Output: 8 mp3 files in `public/audio/`. Total ≤500KB.

set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/public/audio"
mkdir -p "$OUT"

# Parameters: name → expression / duration / volume. Each uses the
# `aevalsrc` synth source with an exponential decay so the cue feels
# "tactile" rather than droning. mp3 is encoded at 32kbps mono — well
# below the ≤500KB target with 8 files.
#
# Frequencies are chosen for semantic distinctness:
#   - chimes (Spark / Illumination / Encounter pass) sit in the bright
#     2–3 octave above middle C range (rising third interval reads as
#     resolution).
#   - hums (Separation / Encounter fail) sit at A2 / A#2 (~110–117 Hz)
#     for a low-cello swell.
#   - crackle (Shell awakened) is a noise burst with a band-pass.
#   - seal (Shell banished) is a low-resonance thud with mid attack.
#   - flip (Card drawn) is a noise envelope with high-pass — paper-flip.

encode_mp3 () {
  local name="$1"
  local filter="$2"
  ffmpeg -y -hide_banner -loglevel error -f lavfi -i "$filter" \
    -ac 1 -ar 22050 -b:a 32k "$OUT/$name.mp3"
}

# 1. Spark collected — soft bell, rising third (E5 → G5), ~800ms
encode_mp3 "chime.spark-collected" \
  "aevalsrc=exprs='(sin(2*PI*659.25*t) + 0.7*sin(2*PI*783.99*t))*exp(-3*t)':d=0.8"

# 2. Illumination up — same family, more vertical (G5 → C6), ~600ms
encode_mp3 "chime.illumination-up" \
  "aevalsrc=exprs='(sin(2*PI*783.99*t) + 0.6*sin(2*PI*1046.5*t))*exp(-4*t)':d=0.6"

# 3. Separation up — low cello swell (A#2), ~1.2s
encode_mp3 "hum.separation-up" \
  "aevalsrc=exprs='(0.6*sin(2*PI*116.54*t) + 0.4*sin(2*PI*233.08*t))*(1-exp(-2*t))*exp(-1*t)':d=1.2"

# 4. Shell awakened — electrical crackle (band-passed noise), ~600ms
encode_mp3 "crackle.shell-awakened" \
  "aevalsrc=exprs='0.6*(random(0)-0.5)*sin(2*PI*440*t)*exp(-5*t)':d=0.6"

# 5. Shell banished — wax-seal stamp + low resonance, ~700ms
encode_mp3 "seal.shell-banished" \
  "aevalsrc=exprs='(sin(2*PI*87.31*t) + 0.4*sin(2*PI*174.61*t))*exp(-6*t)':d=0.7"

# 6. Card drawn — paper flip (filtered noise pulse), ~300ms
encode_mp3 "flip.card-drawn" \
  "aevalsrc=exprs='0.8*(random(0)-0.5)*exp(-15*t)':d=0.3"

# 7. Encounter pass — major-third resolution (C5 → E5 → G5), ~900ms
encode_mp3 "chime.encounter-pass" \
  "aevalsrc=exprs='(sin(2*PI*523.25*t) + 0.7*sin(2*PI*659.25*t) + 0.5*sin(2*PI*783.99*t))*exp(-2.5*t)':d=0.9"

# 8. Encounter fail — minor-second tension (B4 → C5), ~700ms
encode_mp3 "tone.encounter-fail" \
  "aevalsrc=exprs='(sin(2*PI*246.94*t) + 0.6*sin(2*PI*261.63*t))*exp(-3*t)':d=0.7"

echo "Generated 8 cues in $OUT:"
ls -lh "$OUT"
echo
echo "Total size:"
du -ch "$OUT"/*.mp3 | tail -1
