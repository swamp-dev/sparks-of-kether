# Cinematic trailer — storyboard + script

Storyboard + script only. **Production is not part of this epic.**
This file is the brief any future editor / agent / collaborator would
work from to actually shoot, edit, score, and post a trailer.

Target runtime: **60–90 seconds**. Tighter is better — modern attention
spans, autoplay-muted on social.

---

## Brief

**Aesthetic shorthand: contemplative puzzle ritual.** Indigo void,
gold accents, hand-drawn Sefirot, Hebrew letters, atmospheric bloom.
Not fantasy combat. Not MMO chrome.

Sparks of Kether is a cooperative ascent up the Kabbalistic Tree of
Life. Two to four players move from Malkuth to Kether together,
gathering Sparks (lessons + abilities) that brighten a shared
**Illumination** meter. When the team fails challenges, hoards
resources, or takes the wrong shortcut, **Separation** rises and the
**Shells** awaken — thematic Qliphothic pressures, each the
inversion of a Sefirah's gift.

The trailer needs to land three things:

1. **It's cooperative.** Not "you against the dungeon" — "us against
   our own separation." Show hands working in concert, not a single
   player.
2. **The choices matter ethically as well as tactically.** Light vs
   shadow, illumination vs separation isn't decoration; it's the
   loop. Trust the shot list to carry this — don't have the brief
   re-argue it for the editor.
3. **Closing beat.** Team at Kether. Final Threshold passing.
   Illumination filling the screen.

---

## Music brief

**Tonal arc**: contemplative → tense → resolved.

- **Opening (0:00–0:25)** — slow, ambient pad. Hebrew vocal sample
  threaded through. Sets "this is a quiet, weighty thing."
- **Middle (0:25–0:55)** — tempo lift, percussion enters as the
  Shells start awakening. Tension builds. Don't go full battle
  music — keep it heavy and ritualistic, not action-movie.
- **Climax (0:55–1:10)** — Illumination passes Separation. Music
  resolves to a major-key chord. One pure tone.
- **Outro (1:10–1:30)** — silence with the title card and a
  three-second sting.

**Reference tracks** (vibe only, not for licensing):

- Olafur Arnalds' "saman" — the contemplative pad.
- Jóhann Jóhannsson's "Flight from the City" — the building tension
  without resolution.
- Max Richter's "On the Nature of Daylight" — the climax resolution.

A custom score is preferred. Stock library second choice. Avoid
recognizable game-trailer cues (Inception horns, Two Steps from Hell
percussion).

---

## Shot list

Each shot: visual / source / duration / voice-over (if any).

| # | Visual | Source | Duration | VO |
|---|---|---|---|---|
| 1 | Black screen. A single dot of gold light pulses in the centre, then expands into the Sefirah of Malkuth (#8b4513 brown). | Animated illustration. The pulse echoes the actual `path-travel-pulse` keyframe in the game. | 4 s | "Some games are about winning." |
| 2 | The Tree of Life materialises path-by-path from Malkuth upward. Each path lights briefly as it draws, in pillar colour (mercy blue, severity crimson, balance gold). | Animated illustration based on `assets/marketing/demo-tree-desktop.png`. Could use the live `<TreeBoard>` component with a "draw-on" SCSS animation. | 8 s | "This one's about ascending." |
| 3 | The Soul Aspect picker, two players' cursors hovering over different aspects, finally settling: one on Heart (tiferet gold), one on Boundary-Keeper (gevurah crimson). | `assets/marketing/demo-soul-aspect-desktop.png` + after-effects cursor overlay. | 4 s | "Together." |
| 4 | The Blessing Ritual mid-step, atmospheric Sefirah-keyed bloom, dice tumbling on the table-side. | `assets/marketing/demo-ritual-desktop.png` + a 3d6 roll captured from a live session. Add the gold-glow halo from the SefirahHero component. | 5 s | (silence) |
| 5 | A timelapse from Malkuth to Kether — players' tokens climb the Tree, paths lighting as they go. Speed up over 6 s, then slow as the team approaches Tiferet. | Future capture: record an actual hot-seat session from setup → mid-game and timelapse. Falls back to animated illustration. | 6 s | "Each Sefirah gives you a Spark — a lesson you carry up." |
| 6 | Cut to the team meters. Illumination at 7, Separation at 4. The Separation gradient bar climbs to 6 with a soft thump. | `assets/marketing/demo-meters-desktop.png` + the live `<TeamMeters>` animation captured. | 4 s | "But every time you hoard, every time you fail, the Shells awaken." |
| 7 | A Shell awakens at Hod. The Shell icon (orange) materialises with the existing `sefirah-clear-pulse` keyframe inverted — pulse inward, not outward. The screen tints slightly amber. | Future capture: trigger Shell awakening in a live session. Falls back to a still + animated overlay. | 5 s | (silence — let the visual carry separation) |
| 8 | Quick cuts, gathering pace: a card play, a path traverse, a challenge roll passing, a Spark added to a player's inventory. Each beat ~0.8 s, pulse with the music. | Future captures from live sessions. **Hard production dependency** — no static fallback. Capture before edit begins. If captures slip, replace with 8 s of slow camera drift across `assets/marketing/play-desktop.png` (degraded but unblocked). | 8 s | "Good is illumination. Unity. Returning to source." |
| 9 | The team converges at Kether. All four player tokens ringing the Crown. Illumination meter rising past Separation by the +5 margin. | Future capture: the actual Final Threshold UI mid-resolution. **Cross-ticket dependency** — Epic #119 sub-ticket 9 (animated GIFs) is the natural source. Fallback if neither lands in time: a still composite of `assets/marketing/play-desktop.png` with the meter overlaid via After Effects. | 5 s | "Reach the Crown together. Earn it together." |
| 10 | Final Threshold passes. The screen floods with gold. Hold on the gold for a beat. | Animated illustration over the Kether screen. | 4 s | (silence — let the music resolve) |
| 11 | Title card: **Sparks of Kether** in the Fraunces display face, off-white on indigo. Tagline "A cooperative ascent up the Kabbalistic Tree of Life." underneath. URL (TBD) at the bottom. | **Deliverable** — title card to be designed from scratch in production; no existing asset. Match Fraunces + indigo `#0e0a1f` + gold `#ffd700` from the live game. (See `docs/typography.md`.) | 6 s | (sting only) |

**Total: 59 seconds.** That's 1 second below the 60–90 s target;
extend shot 5 (timelapse) or shot 8 (quick cuts) by 1–4 s during
edit to land at 60+. Both shots are designed to flex.

---

## Voice-over script (clean)

> Some games are about winning.
>
> This one's about ascending.
>
> Together.
>
> Each Sefirah gives you a Spark — a lesson you carry up.
>
> But every time you hoard, every time you fail, the Shells awaken.
>
> Good is illumination. Unity. Returning to source.
>
> Reach the Crown together. Earn it together.

Tone: contemplative, second-person, no hype. Read slowly. The line
"Returning to source" is the load-bearing one — it's where the
trailer's thesis lands, and the music should breathe under it. The
order is deliberate: the visual of the Shells awakening (shot 7,
held silent) carries the "separation" beat without narration; the
VO returns on shot 8 to deliver the positive thesis as resolution.

**This trailer is VO primary.** The shot-list timings assume the
VO carries the thesis. A no-VO cut is possible but would need a
different edit rhythm (the silent shots 4 and 10 would need to be
rebalanced and the gathering-pace section would need new music
cues to compensate). Treat that as a separate brief if pursued —
do not produce both from a single shot list.

---

## Open questions

These need decisions before production. (Two earlier opens — VO vs
no-VO, and shell-awakening visual fidelity — were resolved in this
brief; see the VO-script footer and shot 7 source notes.)

1. **Multiplayer prominence.** The game is hot-seat-playable AND
   multiplayer-ready. Showing the multiplayer surface (a real lobby
   with two human players) is honest but adds a "it's a web app"
   register that might pull against the contemplative vibe. Decide
   whether the trailer features online play as a beat or stays in
   the symbolic / single-table register.
2. **Title card music sting.** A custom three-second sting is the
   "right" answer; a stock sting is the "fast" answer. Decide.
3. **Closing call to action.** Trailer ends on the title card; what
   does the URL point at? `swamp-dev/sparks-of-kether` (GitHub),
   a future itch.io page, or a marketing landing page (sub-ticket
   10 of Epic #119 — the `/about` route)?

---

## What this storyboard does NOT decide

- Aspect ratio (16:9 web vs 9:16 social).
- Final cut tooling (DaVinci, Premiere, After Effects).
- Caption language and burned-in subtitle policy.
- Distribution channels.

These are production concerns. The brief above gives an editor
enough to draft a v1; the open questions list gives the user enough
to refine the brief into a v2.
