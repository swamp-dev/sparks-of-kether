# Journal — #224 feat(voice): document 22 voice descriptions

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/224
PR: https://github.com/swamp-dev/sparks-of-kether/pull/260

---

## 2026-05-22 — push 1: initial spec + review fixes

**Pushed:** `design/voices.md` — full casting brief for all 22 voice characters.

**What changed:**
- New `design/voices.md` with specs for all 10 avatar voices (Athena → Kether)
  and all 12 zodiac player-response voices (Aries → Pisces).
- Each entry: voice character, register (gender + pitch texture), delivery traits,
  and a one-sentence ElevenLabs casting brief.
- Code review surfaced three substantive issues, all fixed before PR:
  - Hermes and Gemini had near-duplicate ElevenLabs briefs (both Mercury-ruled,
    both described as "nimble/quick/knowing-more"). Fixed by anchoring Hermes to
    the psychopomp/crossroads/purposeful-withholding angle and Gemini to the
    dual-voice/self-arguing/question-inflection angle.
  - All 12 zodiac Register fields were missing gender guidance — ElevenLabs search
    is gender-filtered; without this, casting has no direction. Fixed by adding
    "Any gender; [register preference]" to each zodiac Register line.
  - Demeter/Hestia/Taurus briefs risked collapsing to the same low-warm-female
    ElevenLabs voice. Fixed by sharpening: Demeter = grief-restraint/autumn-earth
    with silences that cost, Hestia = hearthfire companion that makes the room
    occupied, Taurus = sensory-material words with physical weight.

**Surprising:** Hermes/Gemini is the only Mercury-Mercury collision in the system —
the two characters guaranteed to share a voice type if the briefs don't nail the
distinction. Hermes (avatar, male) and Gemini (zodiac, any-gender) have completely
different roles and delivery patterns in the delivery-traits section, but the briefs
were summarising the same surface energy. The distinguisher is *why* each withholds
or pivots: Hermes withholds as guide/gatekeeper (purposeful, directional), Gemini
pivots as dual-self (structural, argumentative-with-itself). Once that's in the
brief the voice search should find genuinely different archetypes.

